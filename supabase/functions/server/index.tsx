import { Hono } from "npm:hono@4.6.14";
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from "npm:@supabase/supabase-js@2.49.2";
import * as kv from './kv_store.tsx';
import { sendInviteEmail, sendEmail, isEmailServiceConfigured } from './emailService.tsx';

/**
 * 🛡️ MIDDLEWARE DE AUTENTICAÇÃO DISPONÍVEL
 * 
 * Para adicionar autenticação e autorização em novas rotas, importe:
 * 
 * import { requireAuth, requireRole, requireCompanyAccess } from './auth-middleware.ts';
 * 
 * Exemplos de uso:
 * 
 * // Qualquer usuário autenticado
 * app.get('/make-server-686b5e88/protected', requireAuth, async (c) => {
 *   const user = c.get('user');
 *   return c.json({ message: 'OK', user });
 * });
 * 
 * // Apenas owner e admin
 * app.delete('/make-server-686b5e88/admin/data', requireAuth, requireRole(['owner', 'admin']), async (c) => {
 *   return c.json({ message: 'Deletado' });
 * });
 * 
 * // Isolamento multi-tenant
 * app.get('/make-server-686b5e88/companies/:companyId/data', requireAuth, requireCompanyAccess, async (c) => {
 *   return c.json({ data: [] });
 * });
 * 
 * ⚠️ IMPORTANTE: A segurança REAL está no backend. Nunca confie apenas no frontend!
 */

console.log('='.repeat(60));
console.log('🚀 ERP SYSTEM - BACKEND STARTING');
console.log('📅 Deploy Version: 2024-11-29 - ROTAS ESPECÍFICAS v1.0');
console.log('='.repeat(60));
console.log('[INDEX] 🔍 INÍCIO - Antes de importar módulo fiscal...');

// Force deploy v1.3 - Diagnóstico robusto
try {
  console.log('[INDEX] 🔍 Tentando import estático do fiscal...');
  var fiscal = await import('./fiscal/routes.ts');
  console.log('[INDEX] ✅ Import fiscal bem-sucedido!', typeof fiscal.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO FATAL no import fiscal:', error);
  console.error('[INDEX] ❌ Mensagem:', error.message);
  console.error('[INDEX] ❌ Stack:', error.stack);
  throw error;
}

console.log('[INDEX] 🔍 Tentando import estático do SEFAZ...');
let sefaz;
try {
  sefaz = await import('./sefaz/routes.ts');
  console.log('[INDEX] ✅ Import SEFAZ bem-sucedido!', typeof sefaz.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO FATAL no import SEFAZ:', error);
  console.error('[INDEX] ❌ Mensagem:', error.message);
  console.error('[INDEX] ❌ Stack:', error.stack);
  console.error('[INDEX] ❌ Tipo do erro:', Object.prototype.toString.call(error));
  console.error('[INDEX] ❌ Nome do erro:', error.name);
  
  // Continuar mesmo com erro no SEFAZ para não derrubar todo o servidor
  console.log('[INDEX] ⚠️ Continuando sem módulo SEFAZ...');
  sefaz = null;
}

console.log('[INDEX] 🔍 Tentando import estático de NFE Persistence...');
let nfePersistence;
try {
  nfePersistence = await import('./nfe-persistence.tsx');
  console.log('[INDEX] ✅ Import NFE Persistence bem-sucedido!', typeof nfePersistence.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO no import NFE Persistence:', error);
  console.log('[INDEX] ⚠️ Continuando sem módulo NFE Persistence...');
  nfePersistence = null;
}

console.log('[INDEX] 🔍 Tentando import estático de NFE Statistics...');
let nfeStatistics;
try {
  nfeStatistics = await import('./nfe-statistics.tsx');
  console.log('[INDEX] ✅ Import NFE Statistics bem-sucedido!', typeof nfeStatistics.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO no import NFE Statistics:', error);
  console.log('[INDEX] ⚠️ Continuando sem módulo NFE Statistics...');
  nfeStatistics = null;
}

console.log('[INDEX] 🔍 Tentando import estático de DANFE...');
let danfe;
try {
  danfe = await import('./danfe/routes.ts');
  console.log('[INDEX] ✅ Import DANFE bem-sucedido!', typeof danfe.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO no import DANFE:', error);
  console.log('[INDEX] ⚠️ Continuando sem módulo DANFE...');
  danfe = null;
}

console.log('[INDEX] 🔍 Tentando import estático de Certificado...');
let certificado;
try {
  certificado = await import('./certificado/routes.ts');
  console.log('[INDEX] ✅ Import Certificado bem-sucedido!', typeof certificado.default);
} catch (error) {
  console.error('[INDEX] ❌ ERRO no import Certificado:', error);
  console.error('[INDEX] ❌ Detalhes:', error.message);
  console.log('[INDEX] ⚠️ Continuando sem módulo Certificado...');
  certificado = null;
}

console.log('[INDEX] 🔍 DEPOIS dos imports - continuando...');

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "stripe-signature"],
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
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // Trial de 7 dias

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

    // 4. Criar assinatura padrão (Trial com plano Ilimitado)
    try {
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7 dias de trial

      const defaultSubscription = {
        userId: authData.user.id,
        planId: "ilimitado", // Plano padrão: Ilimitado (para testes completos)
        billingCycle: "monthly",
        status: "trial",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        trialEnd: trialEnd.toISOString(),
        usage: {
          users: 1, // Conta o owner
          products: 0,
          customers: 0,
          nfe: 0,
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Salvar no KV store
      await kv.set(`subscription:${authData.user.id}`, defaultSubscription);
      
      console.log(`✅ Assinatura criada para usuário ${authData.user.id} - Plano: ${defaultSubscription.planId} (Trial)`);
    } catch (subError) {
      console.error('⚠️ Erro ao criar assinatura padrão:', subError);
      // Não fazer rollback - assinatura pode ser criada depois
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

    // ✅ Auto-gerar códigos para usuários que não têm (migração automática)
    const usersWithoutCode = users.filter(u => !u.code);
    if (usersWithoutCode.length > 0) {
      console.log(`[USERS] 🔢 ${usersWithoutCode.length} usuários sem código - gerando automaticamente...`);
      
      for (const user of usersWithoutCode) {
        // Buscar maior código existente
        const { data: maxCodeUser } = await supabase
          .from('users')
          .select('code')
          .eq('company_id', profile.company_id)
          .like('code', 'USR-%')
          .order('code', { ascending: false })
          .limit(1);

        let codeCounter = 1;
        if (maxCodeUser && maxCodeUser.length > 0 && maxCodeUser[0].code) {
          const match = maxCodeUser[0].code.match(/^USR-(\d+)$/);
          if (match) {
            codeCounter = parseInt(match[1], 10) + 1;
          }
        }

        const newCode = `USR-${String(codeCounter).padStart(3, '0')}`;
        
        await supabase
          .from('users')
          .update({ code: newCode })
          .eq('id', user.id);

        console.log(`[USERS] ✅ Código ${newCode} atribuído a ${user.name}`);
        
        // Atualizar no array de retorno
        user.code = newCode;
      }
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

    // Buscar nome da empresa (prioridade: KV store > Tabela companies)
    let companyName = profile.company_id; // Fallback para o ID
    
    try {
      // 1. Tentar buscar dados completos do KV store (se usuário preencheu Configurações)
      const companyDataKV = await kv.get(`company:${profile.company_id}`);
      if (companyDataKV) {
        const company = typeof companyDataKV === 'string' ? JSON.parse(companyDataKV) : companyDataKV;
        // Priorizar nome fantasia, depois razão social
        if (company.nomeFantasia) {
          companyName = company.nomeFantasia;
          console.log('✅ Nome fantasia encontrado no KV store:', companyName);
        } else if (company.razaoSocial) {
          companyName = company.razaoSocial;
          console.log('✅ Razão social encontrada no KV store:', companyName);
        }
      } else {
        console.log('⚠️ Dados detalhados não encontrados no KV store. Buscando na tabela companies...');
        
        // 2. Buscar da tabela companies (dados do signup)
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        
        if (!companyError && companyData?.name) {
          companyName = companyData.name;
          console.log('✅ Nome da empresa encontrado na tabela companies:', companyName);
        } else {
          console.log('⚠️ Empresa não encontrada na tabela companies. Usando company_id.');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar nome da empresa:', error);
      console.log('⚠️ Usando company_id como fallback');
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
      company_name: companyName, // Agora usa o nome real da empresa
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
    
    // Construir link de convite usando o domínio do frontend
    // PRODUÇÃO: https://metaerp.com.br?token=xxx
    // STAGING: Pode ser detectado dinamicamente ou usar variável de ambiente
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://metaerp.com.br';
    const inviteLink = `${frontendUrl}?token=${inviteToken}`;
    console.log('🔗 Link de convite gerado:', inviteLink);

    // Verificar se o serviço de email está configurado
    if (isEmailServiceConfigured()) {
      try {
        console.log('📧 Serviço de email configurado! Iniciando envio...');
        console.log('📧 Email destino:', email);
        
        // Mapear role para nome legível
        const roleNames: Record<string, string> = {
          admin: 'Administrador',
          manager: 'Gerente',
          salesperson: 'Vendedor',
          buyer: 'Comprador',
          financial: 'Financeiro',
          viewer: 'Visualizador',
        };

        console.log('📧 Preparando dados do email...');
        console.log('📧 Inviter:', profile.name);
        console.log('📧 Company:', profile.company_id);
        console.log('📧 Role:', roleNames[role] || role);
        console.log('📧 Link:', inviteLink);

        // Enviar email com link de convite
        console.log('📧 Chamando sendInviteEmail...');
        await sendInviteEmail({
          to: email,
          inviterName: profile.name,
          companyName: companyName, // Agora usa o nome real da empresa
          roleName: roleNames[role] || role,
          inviteLink,
          expiresAt: expiresAt.toISOString(),
        });

        console.log('✅ Email de convite enviado com sucesso para:', email);
      } catch (emailError: any) {
        console.error('❌ Erro ao enviar email de convite:', emailError.message);
        console.error('❌ Stack do erro:', emailError.stack);
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

    // Gerar código do usuário (USR-XXX)
    const { data: maxCodeUser } = await supabase
      .from('users')
      .select('code')
      .eq('company_id', inviteData.company_id)
      .like('code', 'USR-%')
      .order('code', { ascending: false })
      .limit(1);

    let codeCounter = 1;
    if (maxCodeUser && maxCodeUser.length > 0 && maxCodeUser[0]?.code) {
      const match = maxCodeUser[0].code.match(/^USR-(\d+)$/);
      if (match) {
        codeCounter = parseInt(match[1], 10) + 1;
      }
    }

    const userCode = `USR-${String(codeCounter).padStart(3, '0')}`;
    console.log(`[INVITE] 🔢 Código gerado para usuário: ${userCode}`);

    // Criar perfil do usuário na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: inviteData.email,
        name,
        company_id: inviteData.company_id,
        role: inviteData.role,
        code: userCode,
        is_active: true
      });

    if (profileError) {
      console.error('Erro ao criar perfil do convite:', profileError);
      // Rollback: deletar usuário
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

    // ✅ INTEGRAÇÃO AUTOMÁTICA: Criar vendedor ou comprador se role for salesperson/buyer
    if (inviteData.role === 'salesperson') {
      console.log(`[INVITE] 🎯 Criando vendedor automaticamente para ${name}...`);
      
      // Gerar código sequencial SP-XXX
      const { data: existingSalespeople } = await supabase
        .from('salespeople')
        .select('code')
        .eq('company_id', inviteData.company_id)
        .like('code', 'SP-%')
        .order('code', { ascending: false })
        .limit(1);

      let codeCounter = 1;
      if (existingSalespeople && existingSalespeople.length > 0) {
        const match = existingSalespeople[0].code.match(/^SP-(\d+)$/);
        if (match) {
          codeCounter = parseInt(match[1], 10) + 1;
        }
      }
      const salespersonCode = `SP-${String(codeCounter).padStart(3, '0')}`;

      // Inserir vendedor
      const { error: salespersonError } = await supabase
        .from('salespeople')
        .insert({
          company_id: inviteData.company_id,
          code: salespersonCode,
          name: name,
          email: inviteData.email,
          is_active: true
        });

      if (salespersonError) {
        console.error('[INVITE] ⚠️ Erro ao criar vendedor (não crítico):', salespersonError);
      } else {
        console.log(`[INVITE] ✅ Vendedor ${salespersonCode} criado com sucesso`);
      }
    } else if (inviteData.role === 'buyer') {
      console.log(`[INVITE] 🎯 Criando comprador automaticamente para ${name}...`);
      
      // Gerar código sequencial BY-XXX
      const { data: existingBuyers } = await supabase
        .from('buyers')
        .select('code')
        .eq('company_id', inviteData.company_id)
        .like('code', 'BY-%')
        .order('code', { ascending: false })
        .limit(1);

      let codeCounter = 1;
      if (existingBuyers && existingBuyers.length > 0) {
        const match = existingBuyers[0].code.match(/^BY-(\d+)$/);
        if (match) {
          codeCounter = parseInt(match[1], 10) + 1;
        }
      }
      const buyerCode = `BY-${String(codeCounter).padStart(3, '0')}`;

      // Inserir comprador
      const { error: buyerError } = await supabase
        .from('buyers')
        .insert({
          company_id: inviteData.company_id,
          code: buyerCode,
          name: name,
          email: inviteData.email,
          is_active: true
        });

      if (buyerError) {
        console.error('[INVITE] ⚠️ Erro ao criar comprador (não crítico):', buyerError);
      } else {
        console.log(`[INVITE] ✅ Comprador ${buyerCode} criado com sucesso`);
      }
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

// Rota de teste SEFAZ (debug)
app.get("/make-server-686b5e88/sefaz-test", (c) => {
  return c.json({ 
    status: "ok", 
    message: "SEFAZ module is loaded",
    sefazLoaded: !!sefaz,
    sefazDefaultType: typeof sefaz?.default,
    timestamp: new Date().toISOString() 
  });
});

// Rota de teste POST direto (bypass sub-router) - TEMPORÁRIO PARA DEBUG
app.post("/make-server-686b5e88/sefaz/nfe/transmitir-test", async (c) => {
  console.log('[INDEX] 🧪 Rota de teste direta chamada!');
  return c.json({ 
    success: true,
    message: "Rota de teste direta funcionando!",
    timestamp: new Date().toISOString() 
  });
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
app.route('/make-server-686b5e88/fiscal', fiscal.default);

// =====================================================
// SEFAZ ROUTES - Transmissão NF-e
// =====================================================
if (sefaz) {
  console.log('[INDEX] 🔍 Importando módulo SEFAZ...');
  console.log('[INDEX] ✅ SEFAZ importado:', typeof sefaz.default);
  app.route('/make-server-686b5e88/sefaz', sefaz.default);
  console.log('[INDEX] ✅ Rotas SEFAZ registradas!');
}

// =====================================================
// NFE STATISTICS ROUTES - Estatísticas de NF-es
// =====================================================
// IMPORTANTE: DEVE VIR ANTES DO NFE PERSISTENCE para evitar que /:id capture /estatisticas
if (nfeStatistics) {
  console.log('[INDEX] 🔍 Registrando módulo NFE Statistics...');
  app.route('/make-server-686b5e88', nfeStatistics.default);
  console.log('[INDEX] ✅ Rotas NFE Statistics registradas em /make-server-686b5e88/nfe/estatisticas!');
}

// =====================================================
// DANFE ROUTES - Geração de DANFE
// =====================================================
// IMPORTANTE: DEVE VIR ANTES DO NFE PERSISTENCE para evitar que /nfe/:id capture /danfe/nfe/:id
if (danfe) {
  console.log('[INDEX] 🔍 Registrando módulo DANFE...');
  app.route('/make-server-686b5e88/danfe', danfe.default);
  console.log('[INDEX] ✅ Rotas DANFE registradas!');
}

// =====================================================
// NFE PERSISTENCE ROUTES - Persistência de NF-es
// =====================================================
if (nfePersistence) {
  console.log('[INDEX] 🔍 Registrando módulo NFE Persistence...');
  app.route('/make-server-686b5e88/nfe', nfePersistence.default);
  console.log('[INDEX] ✅ Rotas NFE Persistence registradas em /make-server-686b5e88/nfe');
} else {
  console.error('[INDEX] ❌ MÓDULO NFE PERSISTENCE NÃO CARREGADO!');
}

// =====================================================
// CERTIFICADO ROUTES - Gerenciamento de Certificados
// =====================================================
if (certificado) {
  console.log('[INDEX] 🔍 Registrando módulo Certificado...');
  console.log('[INDEX] 🔐 Certificado módulo tipo:', typeof certificado);
  console.log('[INDEX] 🔐 Certificado default tipo:', typeof certificado.default);
  app.route('/make-server-686b5e88/certificado', certificado.default);
  console.log('[INDEX] ✅ Rotas Certificado registradas em /make-server-686b5e88/certificado');
} else {
  console.error('[INDEX] ❌ MÓDULO CERTIFICADO NÃO CARREGADO! As rotas não serão registradas.');
}

// =====================================================
// DATA ROUTES - Rotas Específicas de Persistência
// =====================================================
console.log('[INDEX] 🔍 Carregando módulo de rotas de dados...');

let dataRoutes;
try {
  dataRoutes = await import('./data-routes.tsx');
  console.log('[INDEX] ✅ Módulo data-routes carregado com sucesso');
} catch (error) {
  console.error('[INDEX] ❌ ERRO ao carregar data-routes:', error);
}

if (dataRoutes?.default) {
  console.log('[INDEX] 🔍 Registrando rotas de dados específicas...');
  app.route('/make-server-686b5e88/data', dataRoutes.default);
  console.log('[INDEX] ✅ Rotas de dados registradas em /make-server-686b5e88/data/*');
  console.log('[INDEX] 📋 Exemplos: /data/customers, /data/suppliers, /data/inventory');
} else {
  console.error('[INDEX] ❌ MÓDULO DATA ROUTES NÃO CARREGADO! As rotas não serão registradas.');
}

// =====================================================
// SUBSCRIPTION ROUTES - Gestão de Assinaturas
// =====================================================
console.log('[INDEX] 🔍 Carregando módulo de assinaturas...');

let subscriptionRoutes;
try {
  subscriptionRoutes = await import('./subscription.tsx');
  console.log('[INDEX] ✅ Módulo subscription carregado com sucesso');
} catch (error) {
  console.error('[INDEX] ❌ ERRO ao carregar subscription:', error);
}

if (subscriptionRoutes?.default) {
  console.log('[INDEX] 🔍 Registrando rotas de assinaturas...');
  app.route('/make-server-686b5e88/subscription', subscriptionRoutes.default);
  console.log('[INDEX] ✅ Rotas de assinaturas registradas em /make-server-686b5e88/subscription/*');
  console.log('[INDEX] 💳 Exemplos: /subscription/current, /subscription/upgrade');
} else {
  console.error('[INDEX] ❌ MÓDULO SUBSCRIPTION ROUTES NÃO CARREGADO!');
}

// =====================================================
// STRIPE ROUTES - Gateway de Pagamento
// =====================================================
console.log('[INDEX] 🔍 Carregando módulo Stripe...');

let stripeRoutes;
try {
  stripeRoutes = await import('./stripe.tsx');
  console.log('[INDEX] ✅ Módulo Stripe carregado com sucesso');
} catch (error) {
  console.error('[INDEX] ❌ ERRO ao carregar Stripe:', error);
}

if (stripeRoutes?.default) {
  console.log('[INDEX] 🔍 Registrando rotas do Stripe...');
  app.route('/make-server-686b5e88/stripe', stripeRoutes.default);
  console.log('[INDEX] ✅ Rotas do Stripe registradas em /make-server-686b5e88/stripe/*');
  console.log('[INDEX] 💳 Exemplos: /stripe/create-checkout-session, /stripe/webhook');
} else {
  console.error('[INDEX] ❌ MÓDULO STRIPE ROUTES NÃO CARREGADO!');
}

// =====================================================
// DATA PERSISTENCE ROUTES (LEGADO) - KV Store Genérico
// =====================================================
console.log('[INDEX] 🔍 Registrando rotas de persistência legadas (fallback)...');

// GET - Carregar dados de uma chave específica
app.get("/make-server-686b5e88/data/:key", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const key = c.req.param('key');
    
    console.log(`[DATA_GET] 🔍 Requisição: key=${key}, token=${accessToken ? 'presente' : 'ausente'}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.log(`[DATA_GET] ❌ Autenticação falhou: ${authError?.message}`);
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[DATA_GET] ✅ User autenticado: ${user.id}`);

    // Buscar company_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log(`[DATA_GET] ❌ Perfil não encontrado: ${profileError?.message}`);
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    console.log(`[DATA_GET] ✅ Company ID: ${profile.company_id}`);

    // Montar chave com company_id para isolamento
    const fullKey = `erp_${profile.company_id}_${key}`;
    
    console.log(`[DATA_GET] 🔍 Buscando no KV: ${fullKey}`);
    
    // 🔍 DEBUG: Listar TODAS as keys com mesmo prefixo para debug
    const debugPrefix = `erp_${profile.company_id}_`;
    const allCompanyKeys = await kv.getByPrefix(debugPrefix);
    console.log(`[DATA_GET] 🔍 Total de keys do company ${profile.company_id}: ${allCompanyKeys.length}`);
    if (allCompanyKeys.length > 0) {
      console.log(`[DATA_GET] 📋 Keys disponíveis:`, allCompanyKeys.map(k => k.key).slice(0, 10));
    }
    
    // 🔍 DEBUG: Verificar se há dados no sistema antigo (erp_system_*)
    const systemKey = `erp_system_${key}`;
    const systemValue = await kv.get(systemKey);
    if (systemValue) {
      console.warn(`[DATA_GET] ⚠️  ATENÇÃO: Dados encontrados na key ANTIGA: ${systemKey}`);
      console.warn(`[DATA_GET] ⚠️  Esses dados deveriam estar em: ${fullKey}`);
      console.log(`[DATA_GET] ℹ️  Dados antigos (tamanho): ${JSON.stringify(systemValue).length} bytes`);
    }
    
    // Buscar do KV store
    let value = await kv.get(fullKey);
    
    // 🔧 MIGRAÇÃO AUTOMÁTICA: Se não encontrou na key correta, tentar migrar da key antiga
    if (!value && systemValue) {
      console.log(`[DATA_GET] 🔧 MIGRANDO dados da key antiga para a correta...`);
      console.log(`[DATA_GET]    DE: ${systemKey}`);
      console.log(`[DATA_GET]    PARA: ${fullKey}`);
      
      // Salvar na key correta
      await kv.set(fullKey, systemValue);
      
      // OPCIONAL: Remover key antiga (comentado por segurança)
      // await kv.del(systemKey);
      
      value = systemValue;
      console.log(`[DATA_GET] ✅ MIGRAÇÃO CONCLUÍDA! Dados agora estão na key correta`);
    }
    
    if (!value) {
      console.log(`[DATA_GET] ⚠️  Dados NÃO ENCONTRADOS na key correta: ${fullKey}`);
      console.log(`[DATA_GET] ℹ️  Isso é normal se for a primeira vez`);
      return c.json({ data: null });
    }
    
    const dataSize = JSON.stringify(value).length;
    console.log(`[DATA_GET] ✅ Dados encontrados e retornados: ${dataSize} bytes`);
    
    return c.json({ 
      success: true, 
      data: value,
      key: fullKey 
    });
    
  } catch (error) {
    console.error('[DATA] Erro ao carregar dados:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Salvar dados em uma chave específica
app.post("/make-server-686b5e88/data/:key", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const key = c.req.param('key');
    const { data } = await c.req.json();
    
    console.log(`[DATA_POST] 🔍 Requisição: key=${key}, token=${accessToken ? 'presente' : 'ausente'}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.log(`[DATA_POST] ❌ Autenticação falhou: ${authError?.message}`);
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[DATA_POST] ✅ User autenticado: ${user.id}`);

    // Buscar company_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log(`[DATA_POST] ❌ Perfil não encontrado: ${profileError?.message}`);
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    console.log(`[DATA_POST] ✅ Company ID: ${profile.company_id}`);

    // Montar chave com company_id para isolamento
    const fullKey = `erp_${profile.company_id}_${key}`;
    
    const dataSize = JSON.stringify(data).length;
    console.log(`[DATA_POST] 💾 Salvando no KV: ${fullKey} (${dataSize} bytes)`);
    
    // Salvar no KV store
    await kv.set(fullKey, data);
    
    console.log(`[DATA_POST] ✅ Dados salvos com sucesso!`);
    
    return c.json({ 
      success: true, 
      key: fullKey,
      saved: true 
    });
    
  } catch (error) {
    console.error('[DATA] Erro ao salvar dados:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Remover dados de uma chave específica
app.delete("/make-server-686b5e88/data/:key", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const key = c.req.param('key');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Buscar company_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    // Montar chave com company_id para isolamento
    const fullKey = `erp_${profile.company_id}_${key}`;
    
    // Remover do KV store
    await kv.del(fullKey);
    
    console.log(`[DATA] 🗑️ Dados removidos: ${fullKey}`);
    
    return c.json({ 
      success: true, 
      key: fullKey,
      deleted: true 
    });
    
  } catch (error) {
    console.error('[DATA] Erro ao remover dados:', error);
    return c.json({ error: error.message }, 500);
  }
});

console.log('[INDEX] ✅ Rotas de persistência registradas!');
console.log('Todas as rotas registradas!');

// =====================================================
// EXPORT APP (usado pelo entry point em make-server-686b5e88)
// =====================================================
console.log('[INDEX] 🚀 Exportando app Hono...');
export default app;