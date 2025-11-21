import { Hono } from "npm:hono@4.6.14";
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from "npm:@supabase/supabase-js@2.49.2";

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
// KV STORE UTILITIES (inline)
// =====================================================

const kvClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const kvSet = async (key: string, value: any): Promise<void> => {
  const supabase = kvClient()
  const { error } = await supabase.from("kv_store_686b5e88").upsert({
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
};

const kvGet = async (key: string): Promise<any> => {
  const supabase = kvClient()
  const { data, error } = await supabase.from("kv_store_686b5e88").select("value").eq("key", key).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.value;
};

const kvDel = async (key: string): Promise<void> => {
  const supabase = kvClient()
  const { error } = await supabase.from("kv_store_686b5e88").delete().eq("key", key);
  if (error) {
    throw new Error(error.message);
  }
};

const kvGetByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = kvClient()
  const { data, error } = await supabase.from("kv_store_686b5e88").select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
};

// =====================================================
// EMAIL SERVICE (inline)
// =====================================================

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

const VERIFIED_TEST_EMAIL = 'fabriciopereirafalcao@gmail.com';
let isTestMode = true;

async function sendEmail(params: SendEmailParams): Promise<ResendResponse> {
  const { to: originalTo, subject, html, from = 'Sistema ERP <onboarding@resend.dev>' } = params;
  
  const apiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não configurada');
    throw new Error('Serviço de email não configurado. Configure a API key do Resend.');
  }

  let to = originalTo;
  if (isTestMode && originalTo !== VERIFIED_TEST_EMAIL) {
    console.log(`🧪 MODO DE TESTE: Redirecionando email de ${originalTo} para ${VERIFIED_TEST_EMAIL}`);
    to = VERIFIED_TEST_EMAIL;
  }

  try {
    console.log('📧 Enviando email para:', to);
    if (to !== originalTo) {
      console.log('   → Email original era para:', originalTo);
    }
    console.log('📝 Assunto:', subject);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: isTestMode && to !== originalTo 
          ? `[TESTE para ${originalTo}] ${subject}` 
          : subject,
        html: isTestMode && to !== originalTo
          ? `<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
              <strong>⚠️ MODO DE TESTE DO RESEND</strong><br/>
              Este email deveria ter sido enviado para: <strong>${originalTo}</strong><br/>
              Mas foi redirecionado para você porque o Resend está em modo de teste.<br/>
              <em>Para enviar emails reais, verifique um domínio em: resend.com/domains</em>
            </div>
            ${html}`
          : html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro do Resend:', errorData);
      
      if (response.status === 403 && errorData.message?.includes('testing emails')) {
        console.log('🔍 Detectado modo de teste do Resend');
        isTestMode = true;
        
        if (to === originalTo && originalTo !== VERIFIED_TEST_EMAIL) {
          console.log('🔄 Tentando novamente com email verificado...');
          return await sendEmail({ ...params, to: VERIFIED_TEST_EMAIL });
        }
      }
      
      if (response.status === 401) {
        throw new Error('API key do Resend inválida. Verifique a configuração.');
      } else if (response.status === 422) {
        throw new Error(`Dados inválidos: ${errorData.message || 'Verifique o email de destino'}`);
      } else if (response.status === 429) {
        throw new Error('Limite de emails excedido. Aguarde antes de enviar novamente.');
      }
      
      throw new Error(`Erro ao enviar email: ${errorData.message || response.statusText}`);
    }

    const result: ResendResponse = await response.json();
    console.log('✅ Email enviado com sucesso! ID:', result.id);
    
    return result;

  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error.message);
    throw error;
  }
}

function inviteEmailTemplate(data: {
  invitedEmail: string;
  inviterName: string;
  companyName: string;
  roleName: string;
  inviteLink: string;
  expiresAt: string;
}): { subject: string; html: string } {
  const { invitedEmail, inviterName, companyName, roleName, inviteLink, expiresAt } = data;
  
  const expirationDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return {
    subject: `Você foi convidado para ${companyName}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c4f7c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🎉 Você foi convidado!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá! 👋
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> convidou você para fazer parte da equipe <strong>${companyName}</strong> em nosso sistema ERP.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #1e3a5f; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Detalhes do Convite
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">📧 Email:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${invitedEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">👤 Nível de Acesso:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${roleName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">🏢 Empresa:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${companyName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">⏰ Validade:</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #111827; font-size: 14px; font-weight: 600;">${expirationDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(30, 58, 95, 0.2);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      ⚠️ <strong>Importante:</strong> Este convite expira em <strong>${expirationDate}</strong>. Após esta data, será necessário solicitar um novo convite.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se o botão acima não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin: 10px 0 0; color: #1e3a5f; font-size: 14px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                ${inviteLink}
              </p>
              
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                Você recebeu este email porque ${inviterName} convidou você para ${companyName}.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
              
              <div style="margin: 20px auto; width: 50px; height: 1px; background-color: #d1d5db;"></div>
              
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Sistema ERP. Todos os direitos reservados.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
    `.trim()
  };
}

async function sendInviteEmail(data: {
  to: string;
  inviterName: string;
  companyName: string;
  roleName: string;
  inviteLink: string;
  expiresAt: string;
}) {
  const { to, inviterName, companyName, roleName, inviteLink, expiresAt } = data;
  
  const { subject, html } = inviteEmailTemplate({
    invitedEmail: to,
    inviterName,
    companyName,
    roleName,
    inviteLink,
    expiresAt,
  });

  return await sendEmail({
    to,
    subject,
    html,
    from: `${companyName} <onboarding@resend.dev>`,
  });
}

function isEmailServiceConfigured(): boolean {
  return !!Deno.env.get('RESEND_API_KEY');
}

// =====================================================
// AUTH ROUTES
// =====================================================

app.post("/make-server-686b5e88/auth/signup", async (c) => {
  try {
    const { email, password, name, companyName, cnpj } = await c.req.json();

    if (!email || !password || !name || !companyName) {
      return c.json({ error: 'Campos obrigatórios faltando' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      console.error('Erro ao criar usuário no auth:', authError);
      
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

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

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
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar empresa: ${companyError.message}` }, 500);
    }

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
      await supabase.from('companies').delete().eq('id', companyData.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

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

  } catch (error: any) {
    console.error('Erro geral no signup:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// =====================================================
// USER MANAGEMENT & INVITES ROUTES
// =====================================================

app.get("/make-server-686b5e88/users", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para listar usuários' }, 403);
    }

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

  } catch (error: any) {
    console.error('Erro ao listar usuários:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

app.post("/make-server-686b5e88/users/invite", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { email, role } = await c.req.json();

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para convidar usuários' }, 403);
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', profile.company_id)
      .single();

    if (existingUser) {
      return c.json({ error: 'Este email já está cadastrado na empresa' }, 400);
    }

    const allInvites = await kvGetByPrefix('invite:');
    const existingInvite = allInvites.find((invite: any) => {
      try {
        const inviteData = typeof invite.value === 'string' ? JSON.parse(invite.value) : invite.value;
        return (
          inviteData.email === email &&
          inviteData.company_id === profile.company_id &&
          inviteData.status === 'pending' &&
          new Date(inviteData.expires_at) > new Date()
        );
      } catch {
        return false;
      }
    });

    if (existingInvite) {
      return c.json({ error: 'Este e-mail já foi convidado' }, 400);
    }

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteData = {
      email,
      role,
      company_id: profile.company_id,
      company_name: profile.company_id,
      invited_by: user.id,
      invited_by_name: profile.name,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    };

    console.log('💾 Salvando convite no KV store com chave:', `invite:${inviteToken}`);
    console.log('📦 Dados do convite:', inviteData);
    await kvSet(`invite:${inviteToken}`, JSON.stringify(inviteData));
    console.log('✅ Convite salvo com sucesso!');
    
    const baseUrl = c.req.url.split('/make-server')[0];
    const inviteLink = `${baseUrl}?token=${inviteToken}`;

    if (isEmailServiceConfigured()) {
      try {
        const roleNames: Record<string, string> = {
          admin: 'Administrador',
          manager: 'Gerente',
          salesperson: 'Vendedor',
          buyer: 'Comprador',
          financial: 'Financeiro',
          viewer: 'Visualizador',
        };

        await sendInviteEmail({
          to: email,
          inviterName: profile.name,
          companyName: profile.company_id,
          roleName: roleNames[role] || role,
          inviteLink,
          expiresAt: expiresAt.toISOString(),
        });

        console.log('✅ Email de convite enviado com sucesso para:', email);
      } catch (emailError: any) {
        console.error('❌ Erro ao enviar email de convite:', emailError.message);
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

  } catch (error: any) {
    console.error('Erro ao criar convite:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

app.get("/make-server-686b5e88/invites", async (c) => {
  console.log('🔍 Endpoint /invites chamado!');
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('🔑 Access token:', accessToken ? 'Presente' : 'Ausente');

    if (!accessToken) {
      console.error('❌ Token de autenticação não fornecido');
      return c.json({ error: 'Token de autenticação não fornecido' }, 401);
    }

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

    const allInvites = await kvGetByPrefix('invite:');
    console.log('📋 Total de convites no sistema:', allInvites.length);
    
    if (allInvites.length > 0) {
      console.log('🔍 Convites encontrados no KV store:');
      allInvites.forEach((invite: any, index: number) => {
        console.log(`  ${index + 1}. Key: ${invite.key}`);
        try {
          const data = JSON.parse(invite.value);
          console.log(`     Email: ${data.email}, Company ID: ${data.company_id}, Status: ${data.status}`);
        } catch (e: any) {
          console.log(`     ⚠️ Erro ao parsear: ${e.message}`);
        }
      });
    } else {
      console.log('⚠️ Nenhum convite encontrado no KV store!');
    }
    
    const companyInvites = allInvites
      .filter((invite: any) => {
        try {
          const inviteData = typeof invite.value === 'string' ? JSON.parse(invite.value) : invite.value;
          const matches = inviteData.company_id === companyId;
          console.log(`🔍 Comparando: ${inviteData.company_id} === ${companyId} ? ${matches}`);
          return matches;
        } catch (e: any) {
          console.log(`❌ Erro ao processar convite ${invite.key}: ${e.message}`);
          return false;
        }
      })
      .map((invite: any) => {
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
      .sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    console.log('✅ Convites da empresa filtrados:', companyInvites.length);

    return c.json({
      success: true,
      invites: companyInvites,
      total: companyInvites.length
    });

  } catch (error: any) {
    console.error('❌ Erro ao listar convites:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

app.post("/make-server-686b5e88/users/accept-invite", async (c) => {
  try {
    const { token, name, password } = await c.req.json();

    if (!token || !name || !password) {
      return c.json({ error: 'Token, nome e senha são obrigatórios' }, 400);
    }

    const inviteDataStr = await kvGet(`invite:${token}`);
    if (!inviteDataStr) {
      return c.json({ error: 'Convite inválido ou expirado' }, 400);
    }

    const inviteData = JSON.parse(inviteDataStr);

    if (inviteData.status !== 'pending') {
      return c.json({ error: 'Este convite já foi utilizado' }, 400);
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      return c.json({ error: 'Este convite expirou' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

    inviteData.status = 'accepted';
    inviteData.accepted_at = new Date().toISOString();
    await kvSet(`invite:${token}`, JSON.stringify(inviteData));

    return c.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role: inviteData.role,
      },
    });

  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

app.delete("/make-server-686b5e88/users/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdToDelete = c.req.param('userId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    if (profile.role !== 'owner') {
      return c.json({ error: 'Apenas o proprietário pode excluir usuários' }, 403);
    }

    if (userIdToDelete === user.id) {
      return c.json({ error: 'Você não pode excluir sua própria conta desta forma' }, 400);
    }

    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdToDelete)
      .single();

    if (fetchError || !userToDelete) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    if (userToDelete.company_id !== profile.company_id) {
      return c.json({ error: 'Usuário não pertence à sua empresa' }, 403);
    }

    if (userToDelete.role === 'owner') {
      return c.json({ error: 'Não é possível excluir outro proprietário' }, 403);
    }

    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userIdToDelete);

    if (deleteProfileError) {
      console.error('Erro ao deletar perfil:', deleteProfileError);
      return c.json({ error: `Erro ao deletar perfil: ${deleteProfileError.message}` }, 500);
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      console.error('Erro ao deletar do auth:', deleteAuthError);
    }

    return c.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

app.patch("/make-server-686b5e88/users/:userId/role", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdToUpdate = c.req.param('userId');
    const { role } = await c.req.json();

    const validRoles = ['admin', 'manager', 'salesperson', 'buyer', 'financial', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Role inválida. Use: admin, manager, salesperson, buyer, financial ou viewer' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    if (profile.role !== 'owner') {
      return c.json({ error: 'Apenas o proprietário pode alterar permissões' }, 403);
    }

    const { data: userToUpdate, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdToUpdate)
      .single();

    if (fetchError || !userToUpdate) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    if (userToUpdate.company_id !== profile.company_id) {
      return c.json({ error: 'Usuário não pertence à sua empresa' }, 403);
    }

    if (userToUpdate.role === 'owner') {
      return c.json({ error: 'Não é possível alterar a permissão do proprietário' }, 403);
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userIdToUpdate);

    if (updateError) {
      console.error('Erro ao atualizar role:', updateError);
      return c.json({ error: `Erro ao atualizar role: ${updateError.message}` }, 500);
    }

    return c.json({ success: true, role });

  } catch (error: any) {
    console.error('Erro ao atualizar role:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// =====================================================
// COMPANY SETTINGS ROUTES
// =====================================================

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

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

  } catch (error: any) {
    console.error('Erro ao buscar empresa:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return c.json({ error: 'Perfil não encontrado' }, 404);
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return c.json({ error: 'Sem permissão para editar dados da empresa' }, 403);
    }

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

  } catch (error: any) {
    console.error('Erro ao atualizar empresa:', error);
    return c.json({ error: `Erro interno: ${error.message}` }, 500);
  }
});

// =====================================================
// HEALTH & TEST ROUTES
// Force deploy: v2024-11-21
// =====================================================

console.log('🚀 Registrando rotas...');

// Rota raiz - Health check (para teste no dashboard)
app.get("/", (c) => {
  console.log('✅ Rota / chamada');
  return c.json({ 
    status: "ok", 
    service: "make-server-686b5e88",
    timestamp: new Date().toISOString(),
    message: "Edge Function is running!"
  });
});

// Rota com prefixo - Para teste no dashboard do Supabase
app.get("/make-server-686b5e88", (c) => {
  console.log('✅ Rota /make-server-686b5e88 chamada');
  return c.json({ 
    status: "ok", 
    service: "make-server-686b5e88",
    timestamp: new Date().toISOString(),
    message: "Edge Function is running!"
  });
});

app.get("/make-server-686b5e88/health", (c) => {
  console.log('✅ Rota /health chamada');
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/make-server-686b5e88/email/status", (c) => {
  console.log('✅ Rota /email/status chamada');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const configured = isEmailServiceConfigured();
  
  console.log('🔍 ========== DEBUG EMAIL STATUS ==========');
  console.log('📧 RESEND_API_KEY existe:', !!apiKey);
  console.log('📧 RESEND_API_KEY valor:', apiKey ? `${apiKey.substring(0, 8)}...` : 'UNDEFINED');
  console.log('📧 RESEND_API_KEY length:', apiKey ? apiKey.length : 0);
  console.log('📧 isEmailServiceConfigured():', configured);
  
  return c.json({ 
    configured,
    service: 'resend',
    hasKey: !!apiKey,
    keyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    keyLength: apiKey ? apiKey.length : 0,
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

app.post("/make-server-686b5e88/email/test", async (c) => {
  try {
    const { to } = await c.req.json();

    if (!to) {
      return c.json({ error: 'Email de destino é obrigatório' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return c.json({ error: 'Email inválido' }, 400);
    }

    if (!isEmailServiceConfigured()) {
      return c.json({ 
        error: 'Serviço de email não configurado. Configure a RESEND_API_KEY primeiro.' 
      }, 400);
    }

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

console.log('✅ Todas as rotas registradas!');
console.log('🚀 Iniciando servidor Hono...');

Deno.serve(app.fetch);