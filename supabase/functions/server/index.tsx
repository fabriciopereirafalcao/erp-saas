import { Hono } from "npm:hono@4.6.14";
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from "npm:@supabase/supabase-js@2.49.2";
import * as kv from './kv_store.tsx';
import { sendInviteEmail, sendEmail, isEmailServiceConfigured } from './emailService.tsx';

console.log('[INDEX] 🔍 Tentando importar módulo fiscal...');
let fiscal;
try {
  fiscal = (await import('./fiscal/routes.ts')).default;
  console.log('[INDEX] ✅ Módulo fiscal importado com sucesso!');
} catch (error) {
  console.error('[INDEX] ❌ ERRO ao importar módulo fiscal:', error);
  console.error('[INDEX] ❌ Stack trace:', error.stack);
  throw error;
}

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// =====================================================
// AUTH ROUTES
// =====================================================

// Rota de signup - Criar nova conta
app.post("/make-server-686b5e88/auth/signup", async (c) => {
  try {
    const { email, password, name, companyName, cnpj } = await c.req.json();

    // Validações básicas
    if (!email || !password || !name || !companyName) {
      return c.json({ error: 'Campos obrigatórios faltando' }, 400);
    }

    // Criar cliente Supabase com SERVICE_ROLE_KEY (bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email (sem servidor de email configurado)
      user_metadata: { name },
    });

    if (authError) {
      console.error('Erro ao criar usuário no auth:', authError);
      
      // Mensagem amigável para email duplicado
      if (authError.code === 'email_exists' || authError.message?.includes('already been registered')) {
        return c.json({ 
          error: 'Este email já está cadastrado. Use outro email ou faça login com sua conta existente.' 
        }, 400);
      }
      
      return c.json({ error: `Erro ao criar usuário: ${authError.message}` }, 400);
    }

    if (!authData.user) {
      return c.json({ error: 'Falha ao criar usuário' }, 500);
    }

    // 2. Criar empresa (company)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // Trial de 14 dias

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        plan: 'trial',
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError);
      // Rollback: deletar usuário criado
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar empresa: ${companyError.message}` }, 500);
    }

    // 3. Criar perfil do usuário na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        company_id: companyData.id,
        role: 'owner',
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Rollback: deletar empresa e usuário
      await supabase.from('companies').delete().eq('id', companyData.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

    // Sucesso!
    return c.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      company: {
        id: companyData.id,
        name: companyData.name,
      },
    });

  } catch (error) {
    console.error('Erro geral no signup:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// =====================================================
// USER MANAGEMENT & INVITES ROUTES
// =====================================================

// Listar usuários da empresa (apenas owner/admin)
app.get("/make-server-686b5e88/users", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Verificar se é owner ou admin
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para listar usuários' }, 403);
    }

    // Buscar todos os usuários da empresa
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      return c.json({ error: `Erro ao buscar usuários: ${usersError.message}` }, 500);
    }

    return c.json({ users });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Criar convite para novo usuário (apenas owner/admin)
app.post("/make-server-686b5e88/users/invite", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { email, role } = await c.req.json();

    // Validações
    if (!email || !role) {
      return c.json({ error: 'Email e role são obrigatórios' }, 400);
    }

    const validRoles = ['admin', 'manager', 'salesperson', 'buyer', 'financial', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Role inválida. Use: admin, manager, salesperson, buyer, financial ou viewer' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Verificar se é owner ou admin
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para convidar usuários' }, 403);
    }

    // Verificar se email já está cadastrado na empresa
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', profile.company_id)
      .single();

    if (existingUser) {
      return c.json({ error: 'Este email já está cadastrado na empresa' }, 400);
    }

    // Verificar se já existe um convite pendente para este email na empresa
    const allInvites = await kv.getByPrefix('invite:');
    const existingInvite = allInvites.find((invite: any) => {
      try {
        const inviteData = typeof invite.value === 'string' ? JSON.parse(invite.value) : invite.value;
        return (
          inviteData.email === email &&
          inviteData.company_id === profile.company_id &&
          inviteData.status === 'pending' &&
          new Date(inviteData.expires_at) > new Date() // Ainda não expirado
        );
      } catch {
        return false;
      }
    });

    if (existingInvite) {
      return c.json({ error: 'Este e-mail já foi convidado' }, 400);
    }

    // Criar token único para o convite
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Convite válido por 7 dias

    // Salvar convite no KV store
    const inviteData = {
      email,
      role,
      company_id: profile.company_id,
      company_name: profile.company_id, // Você pode buscar o nome real da company se quiser
      invited_by: user.id,
      invited_by_name: profile.name,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    };

    console.log('💾 Salvando convite no KV store com chave:', `invite:${inviteToken}`);
    console.log('📦 Dados do convite:', inviteData);
    await kv.set(`invite:${inviteToken}`, JSON.stringify(inviteData));
    console.log('✅ Convite salvo com sucesso!');
    
    // Construir link de convite
    const baseUrl = c.req.url.split('/make-server')[0];
    const inviteLink = `${baseUrl}?token=${inviteToken}`;

    // Verificar se o serviço de email está configurado
    if (isEmailServiceConfigured()) {
      try {
        // Mapear role para nome legível
        const roleNames: Record<string, string> = {
          admin: 'Administrador',
          manager: 'Gerente',
          salesperson: 'Vendedor',
          buyer: 'Comprador',
          financial: 'Financeiro',
          viewer: 'Visualizador',
        };

        // Enviar email com link de convite
        await sendInviteEmail({
          to: email,
          inviterName: profile.name,
          companyName: profile.company_id, // TODO: Buscar nome real da empresa
          roleName: roleNames[role] || role,
          inviteLink,
          expiresAt: expiresAt.toISOString(),
        });

        console.log('✅ Email de convite enviado com sucesso para:', email);
      } catch (emailError: any) {
        console.error('❌ Erro ao enviar email de convite:', emailError.message);
        // Não falhar a requisição se email falhar, apenas logar
      }
    } else {
      console.log('⚠️ Serviço de email não configurado. Convite criado, mas email não enviado.');
    }
    
    return c.json({
      success: true,
      invite: {
        email,
        role,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        invite_link: inviteLink,
        email_sent: isEmailServiceConfigured(),
      },
    });

  } catch (error) {
    console.error('Erro ao criar convite:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Listar convites da empresa (apenas owner/admin)
// Endpoint que retorna todos os convites da empresa do usuário logado
app.get("/make-server-686b5e88/invites", async (c) => {
  console.log('🔍 Endpoint /invites chamado!');
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('🔑 Access token:', accessToken ? 'Presente' : 'Ausente');

    if (!accessToken) {
      console.error('❌ Token de autenticação não fornecido');
      return c.json({ error: 'Token de autenticação não fornecido' }, 401);
    }

    // Validar token e obter usuário
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError);
      return c.json({ error: 'Token inválido ou expirado' }, 401);
    }

    console.log('✅ Usuário autenticado:', user.id);

    // Buscar dados do usuário da tabela users (não do KV store!)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ Erro ao buscar dados do usuário:', userError);
      return c.json({ error: 'Dados do usuário não encontrados' }, 404);
    }

    console.log('✅ Company ID encontrado:', userData.company_id);

    const companyId = userData.company_id;

    // Buscar todos os convites da empresa do KV store
    const allInvites = await kv.getByPrefix('invite:');
    console.log('📋 Total de convites no sistema:', allInvites.length);
    
    // Debug: Mostrar todos os convites encontrados
    if (allInvites.length > 0) {
      console.log('🔍 Convites encontrados no KV store:');
      allInvites.forEach((invite: any, index: number) => {
        console.log(`  ${index + 1}. Key: ${invite.key}`);
        try {
          const data = JSON.parse(invite.value);
          console.log(`     Email: ${data.email}, Company ID: ${data.company_id}, Status: ${data.status}`);
        } catch (e) {
          console.log(`     ⚠️ Erro ao parsear: ${e.message}`);
        }
      });
    } else {
      console.log('⚠️ Nenhum convite encontrado no KV store!');
    }
    
    // Filtrar convites da empresa
    const companyInvites = allInvites
      .filter((invite: any) => {
        try {
          // O value já vem como objeto (JSONB) do banco, não precisa parse
          const inviteData = typeof invite.value === 'string' ? JSON.parse(invite.value) : invite.value;
          const matches = inviteData.company_id === companyId;
          console.log(`🔍 Comparando: ${inviteData.company_id} === ${companyId} ? ${matches}`);
          return matches;
        } catch (e) {
          console.log(`❌ Erro ao processar convite ${invite.key}: ${e.message}`);
          return false;
        }
      })
      .map((invite: any) => {
        // O value já vem como objeto (JSONB) do banco, não precisa parse
        const inviteData = typeof invite.value === 'string' ? JSON.parse(invite.value) : invite.value;
        const token = invite.key.replace('invite:', '');
        
        return {
          id: token,
          email: inviteData.email,
          role: inviteData.role,
          status: inviteData.status,
          company_id: inviteData.company_id,
          invited_by: inviteData.invited_by,
          inviter_name: inviteData.inviter_name || inviteData.invited_by_name,
          created_at: inviteData.created_at,
          expires_at: inviteData.expires_at,
          accepted_at: inviteData.accepted_at || null,
          invite_link: `${c.req.url.split('/functions')[0]}?token=${token}`
        };
      })
      // Ordenar por data de criação (mais recentes primeiro)
      .sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    console.log('✅ Convites da empresa filtrados:', companyInvites.length);

    return c.json({
      success: true,
      invites: companyInvites,
      total: companyInvites.length
    });

  } catch (error) {
    console.error('❌ Erro ao listar convites:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Aceitar convite e criar conta
app.post("/make-server-686b5e88/users/accept-invite", async (c) => {
  try {
    const { token, name, password } = await c.req.json();

    // Validações
    if (!token || !name || !password) {
      return c.json({ error: 'Token, nome e senha são obrigatórios' }, 400);
    }

    // Buscar convite no KV store
    const inviteDataStr = await kv.get(`invite:${token}`);
    if (!inviteDataStr) {
      return c.json({ error: 'Convite inválido ou expirado' }, 400);
    }

    const inviteData = JSON.parse(inviteDataStr);

    // Verificar se já foi usado
    if (inviteData.status !== 'pending') {
      return c.json({ error: 'Este convite já foi utilizado' }, 400);
    }

    // Verificar expiração
    if (new Date(inviteData.expires_at) < new Date()) {
      return c.json({ error: 'Este convite expirou' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: inviteData.email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      console.error('Erro ao criar usuário do convite:', authError);
      
      if (authError.code === 'email_exists' || authError.message?.includes('already been registered')) {
        return c.json({ 
          error: 'Este email já possui uma conta. Faça login normalmente.' 
        }, 400);
      }
      
      return c.json({ error: `Erro ao criar usuário: ${authError.message}` }, 400);
    }

    if (!authData.user) {
      return c.json({ error: 'Falha ao criar usuário' }, 500);
    }

    // Criar perfil do usuário na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: inviteData.email,
        name,
        company_id: inviteData.company_id,
        role: inviteData.role,
      });

    if (profileError) {
      console.error('Erro ao criar perfil do convite:', profileError);
      // Rollback: deletar usuário
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

    // Marcar convite como usado
    inviteData.status = 'accepted';
    inviteData.accepted_at = new Date().toISOString();
    await kv.set(`invite:${token}`, JSON.stringify(inviteData));

    return c.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role: inviteData.role,
      },
    });

  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Deletar usuário (apenas owner)
app.delete("/make-server-686b5e88/users/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdToDelete = c.req.param('userId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário que está fazendo a requisição
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Apenas owner pode deletar usuários
    if (profile.role !== 'owner') {
      return c.json({ error: 'Apenas o proprietário pode excluir usuários' }, 403);
    }

    // Não pode deletar a si mesmo
    if (userIdToDelete === user.id) {
      return c.json({ error: 'Você não pode excluir sua própria conta desta forma' }, 400);
    }

    // Buscar usuário a ser deletado
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdToDelete)
      .single();

    if (fetchError || !userToDelete) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    // Verificar se pertence à mesma empresa
    if (userToDelete.company_id !== profile.company_id) {
      return c.json({ error: 'Usuário não pertence à sua empresa' }, 403);
    }

    // No pode deletar outro owner
    if (userToDelete.role === 'owner') {
      return c.json({ error: 'Não é possível excluir outro proprietário' }, 403);
    }

    // Deletar perfil
    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userIdToDelete);

    if (deleteProfileError) {
      console.error('Erro ao deletar perfil:', deleteProfileError);
      return c.json({ error: `Erro ao deletar perfil: ${deleteProfileError.message}` }, 500);
    }

    // Deletar do Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      console.error('Erro ao deletar do auth:', deleteAuthError);
      // Já deletou do perfil, então vamos continuar
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Atualizar role de usuário (apenas owner)
app.patch("/make-server-686b5e88/users/:userId/role", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdToUpdate = c.req.param('userId');
    const { role } = await c.req.json();

    // Validações
    const validRoles = ['admin', 'manager', 'salesperson', 'buyer', 'financial', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Role inválida. Use: admin, manager, salesperson, buyer, financial ou viewer' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário que está fazendo a requisição
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Apenas owner pode alterar roles
    if (profile.role !== 'owner') {
      return c.json({ error: 'Apenas o proprietário pode alterar permissões' }, 403);
    }

    // Buscar usuário a ser atualizado
    const { data: userToUpdate, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdToUpdate)
      .single();

    if (fetchError || !userToUpdate) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    // Verificar se pertence à mesma empresa
    if (userToUpdate.company_id !== profile.company_id) {
      return c.json({ error: 'Usuário não pertence à sua empresa' }, 403);
    }

    // Não pode alterar role de owner
    if (userToUpdate.role === 'owner') {
      return c.json({ error: 'Não é possível alterar a permissão do proprietário' }, 403);
    }

    // Atualizar role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userIdToUpdate);

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return c.json({ error: `Erro ao atualizar role: ${updateError.message}` }, 500);
    }

    return c.json({ success: true, role });

  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// =====================================================
// COMPANY SETTINGS ROUTES
// =====================================================

// Buscar dados da empresa do usuário logado
app.get("/make-server-686b5e88/company", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token de autenticação não fornecido' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário para obter company_id
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (companyError) {
      console.error('Erro ao buscar empresa:', companyError);
      return c.json({ error: `Erro ao buscar empresa: ${companyError.message}` }, 500);
    }

    if (!company) {
      return c.json({ error: 'Empresa não encontrada' }, 404);
    }

    return c.json({ 
      success: true,
      company 
    });

  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Atualizar dados da empresa (apenas owner/admin)
app.patch("/make-server-686b5e88/company", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const updates = await c.req.json();

    if (!accessToken) {
      return c.json({ error: 'Token de autenticação não fornecido' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Verificar permissão (apenas owner e admin podem editar)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para editar dados da empresa' }, 403);
    }

    // Atualizar empresa
    const { data: company, error: updateError } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', profile.company_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar empresa:', updateError);
      return c.json({ error: `Erro ao atualizar empresa: ${updateError.message}` }, 500);
    }

    return c.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// Health check
app.get("/make-server-686b5e88/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Verificar status do serviço de email
app.get("/make-server-686b5e88/email/status", (c) => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const configured = isEmailServiceConfigured();
  
  // Log DETALHADO para debug
  console.log('🔍 ========== DEBUG EMAIL STATUS ==========');
  console.log('📧 RESEND_API_KEY existe:', !!apiKey);
  console.log('📧 RESEND_API_KEY valor:', apiKey ? `${apiKey.substring(0, 8)}...` : 'UNDEFINED');
  console.log('📧 RESEND_API_KEY length:', apiKey ? apiKey.length : 0);
  console.log('📧 isEmailServiceConfigured():', configured);
  
  // Verificar outras variáveis de ambiente (sem expor valores sensíveis)
  console.log('🔐 Variáveis de ambiente disponíveis:');
  console.log('  - SUPABASE_URL:', !!Deno.env.get('SUPABASE_URL'));
  console.log('  - SUPABASE_ANON_KEY:', !!Deno.env.get('SUPABASE_ANON_KEY'));
  console.log('  - SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  console.log('  - SUPABASE_DB_URL:', !!Deno.env.get('SUPABASE_DB_URL'));
  console.log('  - RESEND_API_KEY:', !!Deno.env.get('RESEND_API_KEY'));
  console.log('🔍 ========================================');
  
  return c.json({ 
    configured,
    service: 'resend',
    hasKey: !!apiKey,
    keyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    keyLength: apiKey ? apiKey.length : 0,
    allEnvVars: {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_DB_URL: !!Deno.env.get('SUPABASE_DB_URL'),
      RESEND_API_KEY: !!Deno.env.get('RESEND_API_KEY'),
    },
    message: configured 
      ? 'Email service is configured and ready' 
      : 'Email service not configured. Set RESEND_API_KEY to enable.',
    debugInfo: {
      timestamp: new Date().toISOString(),
      platform: 'Deno',
      runtime: 'Edge Functions',
    }
  });
});

// Testar envio de email
app.post("/make-server-686b5e88/email/test", async (c) => {
  try {
    const { to } = await c.req.json();

    if (!to) {
      return c.json({ error: 'Email de destino é obrigatório' }, 400);
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return c.json({ error: 'Email inválido' }, 400);
    }

    // Verificar se está configurado
    if (!isEmailServiceConfigured()) {
      return c.json({ 
        error: 'Serviço de email não configurado. Configure a RESEND_API_KEY primeiro.' 
      }, 400);
    }

    // Enviar email de teste
    await sendEmail({
      to,
      subject: '✅ Teste de Email - Sistema ERP',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
                ✅ Email Funcionando!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Parabéns! 🎉
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Seu serviço de email está configurado corretamente e funcionando perfeitamente!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #374151; font-size: 14px;">
                      ✅ <strong>API Key:</strong> Configurada<br>
                      ✅ <strong>Serviço:</strong> Resend<br>
                      ✅ <strong>Status:</strong> Ativo<br>
                      ✅ <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                A partir de agora, quando você convidar novos usuários, eles receberão automaticamente um email profissional com o link de convite.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Sistema ERP. Este é um email de teste.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    console.log('✅ Email de teste enviado para:', to);

    return c.json({ 
      success: true, 
      message: `Email de teste enviado para ${to}` 
    });

  } catch (error: any) {
    console.error('❌ Erro ao enviar email de teste:', error);
    return c.json({ 
      error: `Erro ao enviar email: ${error.message}` 
    }, 500);
  }
});

// =====================================================
// FISCAL ROUTES - Módulo de Faturamento
// =====================================================
console.log('Inicializando servidor Hono...');
console.log('Registrando rotas...');
app.route('/make-server-686b5e88/fiscal', fiscal);
console.log('Todas as rotas registradas!');

Deno.serve(app.fetch);