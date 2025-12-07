// =====================================================
// EMAIL SERVICE
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

// =====================================================
// CONFIGURAÇÃO DE MODO DE TESTE
// =====================================================
// Por padrão, o sistema está em PRODUÇÃO (isTestMode = false)
// 
// Para ativar modo de teste, configure as variáveis de ambiente:
//   EMAIL_TEST_MODE=true
//   TEST_EMAIL=seu-email-verificado@exemplo.com
//
// MODO DE TESTE:
//   - Todos os emails são redirecionados para TEST_EMAIL
//   - Útil para desenvolvimento/staging
//   - NUNCA usar em produção!
//
// MODO PRODUÇÃO (padrão):
//   - Emails são enviados para os destinatários reais
//   - Obrigatório para ambiente de produção
//
// CONFIGURAÇÃO DE REMETENTE:
//   EMAIL_FROM_DOMAIN=metaerp.com.br (domínio verificado no Resend)
//   EMAIL_FROM_ADDRESS=contato (parte antes do @)
//   EMAIL_FROM_NAME=META ERP (nome que aparece no email)
// =====================================================

const EMAIL_TEST_MODE = Deno.env.get('EMAIL_TEST_MODE') === 'true';
const TEST_EMAIL = Deno.env.get('TEST_EMAIL') || 'fabriciopereirafalcao@gmail.com';

// Configuração do remetente (com fallback para resend.dev em desenvolvimento)
const EMAIL_FROM_DOMAIN = Deno.env.get('EMAIL_FROM_DOMAIN') || 'resend.dev';
const EMAIL_FROM_ADDRESS = Deno.env.get('EMAIL_FROM_ADDRESS') || 'onboarding';
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'META ERP';
const DEFAULT_FROM_EMAIL = `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}@${EMAIL_FROM_DOMAIN}>`;

// Log de inicialização para debug
console.log('📧 Email Service Inicializado:');
console.log(`   → Modo de Teste: ${EMAIL_TEST_MODE ? '🧪 ATIVO' : '🚀 PRODUÇÃO'}`);
console.log(`   → Remetente padrão: ${DEFAULT_FROM_EMAIL}`);
if (EMAIL_TEST_MODE) {
  console.log(`   → Emails redirecionados para: ${TEST_EMAIL}`);
  console.log('   ⚠️  ATENÇÃO: Modo de teste ativo! Desative em produção!');
}

export async function sendEmail(params: SendEmailParams): Promise<ResendResponse> {
  const { to: originalTo, subject, html, from = DEFAULT_FROM_EMAIL } = params;
  
  const apiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não configurada');
    throw new Error('Serviço de email não configurado. Configure a API key do Resend.');
  }

  let to = originalTo;
  if (EMAIL_TEST_MODE && originalTo !== TEST_EMAIL) {
    console.log(`🧪 MODO DE TESTE ATIVO: Redirecionando email de ${originalTo} para ${TEST_EMAIL}`);
    to = TEST_EMAIL;
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
        subject: EMAIL_TEST_MODE && to !== originalTo 
          ? `[TESTE para ${originalTo}] ${subject}` 
          : subject,
        html: EMAIL_TEST_MODE && to !== originalTo
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
        
        if (to === originalTo && originalTo !== TEST_EMAIL) {
          console.log('🔄 Tentando novamente com email verificado...');
          return await sendEmail({ ...params, to: TEST_EMAIL });
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

export async function sendInviteEmail(data: {
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

  // Usar remetente configurado via env vars
  // Se não configurado, usa o padrão (onboarding@resend.dev)
  return await sendEmail({
    to,
    subject,
    html,
    // from será automaticamente DEFAULT_FROM_EMAIL se não especificado
  });
}

export function isEmailServiceConfigured(): boolean {
  return !!Deno.env.get('RESEND_API_KEY');
}