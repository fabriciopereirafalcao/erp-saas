/**
 * Serviço de Email usando Resend
 * 
 * Resend: https://resend.com
 * 
 * Características:
 * - Free tier: 100 emails/dia, 3.000 emails/mês
 * - API simples e moderna
 * - Suporte a HTML rico
 * - Boa deliverability
 * 
 * MODO DE TESTE:
 * - Sem domínio verificado: emails vão para fabriciopereirafalcao@gmail.com
 * - Com domínio verificado: emails vão para destinatários reais
 */

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

// Email do desenvolvedor (único permitido em modo de teste)
const VERIFIED_TEST_EMAIL = 'fabriciopereirafalcao@gmail.com';

// Detecta se estamos em modo de teste (sem domínio verificado)
// Em modo de teste, Resend só permite enviar para o email verificado
let isTestMode = true; // Assume modo de teste por padrão

/**
 * Envia um email usando Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<ResendResponse> {
  const { to: originalTo, subject, html, from = 'Sistema ERP <onboarding@resend.dev>' } = params;
  
  // Obter API key do ambiente
  const apiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não configurada');
    throw new Error('Serviço de email não configurado. Configure a API key do Resend.');
  }

  // Em modo de teste, redireciona todos os emails para o email verificado
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
      
      // Detectar erro de validação de email (403)
      if (response.status === 403 && errorData.message?.includes('testing emails')) {
        console.log('🔍 Detectado modo de teste do Resend');
        isTestMode = true;
        
        // Se não estava em modo de teste, tentar novamente
        if (to === originalTo && originalTo !== VERIFIED_TEST_EMAIL) {
          console.log('🔄 Tentando novamente com email verificado...');
          return await sendEmail({ ...params, to: VERIFIED_TEST_EMAIL });
        }
      }
      
      // Erros comuns
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

/**
 * Envia email de convite
 */
export async function sendInviteEmail(data: {
  to: string;
  inviterName: string;
  companyName: string;
  roleName: string;
  inviteLink: string;
  expiresAt: string;
}) {
  const { to, inviterName, companyName, roleName, inviteLink, expiresAt } = data;
  
  // Importar template
  const { inviteEmailTemplate } = await import('./emailTemplates.tsx');
  
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
    from: `${companyName} <onboarding@resend.dev>`, // Pode customizar
  });
}

/**
 * Envia email de boas-vindas (opcional)
 */
export async function sendWelcomeEmail(data: {
  to: string;
  userName: string;
  companyName: string;
  roleName: string;
  loginUrl: string;
}) {
  const { to, userName, companyName, roleName, loginUrl } = data;
  
  // Importar template
  const { welcomeEmailTemplate } = await import('./emailTemplates.tsx');
  
  const { subject, html } = welcomeEmailTemplate({
    userName,
    companyName,
    roleName,
    loginUrl,
  });

  return await sendEmail({
    to,
    subject,
    html,
    from: `${companyName} <onboarding@resend.dev>`,
  });
}

/**
 * Valida se o serviço de email está configurado
 */
export function isEmailServiceConfigured(): boolean {
  return !!Deno.env.get('RESEND_API_KEY');
}

/**
 * Testa conexão com Resend (útil para debug)
 */
export async function testEmailService(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY não configurada');
      return false;
    }

    // Fazer uma requisição simples para validar a API key
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'test@resend.dev',
        to: ['delivered@resend.dev'], // Email de teste do Resend
        subject: 'Test Email',
        html: '<p>This is a test</p>',
      }),
    });

    if (response.ok) {
      console.log('✅ Serviço de email configurado corretamente');
      return true;
    } else {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Erro ao testar serviço:', error);
      return false;
    }

  } catch (error: any) {
    console.error('❌ Erro ao testar serviço de email:', error.message);
    return false;
  }
}