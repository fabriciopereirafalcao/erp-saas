/**
 * 🌍 CONFIGURAÇÃO DE AMBIENTE - META ERP
 * 
 * Este arquivo centraliza todas as configurações de ambiente (staging vs production).
 * 
 * ⚠️ COMO USAR:
 * 
 * 1. STAGING/DEVELOP:
 *    - ENV = 'staging'
 *    - Usa chaves de teste do Stripe (price_test_...)
 *    - Usa projeto Supabase staging
 * 
 * 2. PRODUCTION/MAIN:
 *    - ENV = 'production'
 *    - Usa chaves LIVE do Stripe (price_1...)
 *    - Usa projeto Supabase production
 * 
 * ⚠️ IMPORTANTE: 
 * - NÃO commite secrets no Git!
 * - Secrets do Stripe/Supabase ficam em variáveis de ambiente do servidor
 * - Este arquivo só tem IDs públicos (project IDs, price IDs, anon keys)
 */

type Environment = 'staging' | 'production';

// ============================================================
// ⚠️ MUDAR PARA 'production' QUANDO FIZER DEPLOY NA BRANCH MAIN
// ============================================================
const ENV: Environment = 'staging';

// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================
const SUPABASE_CONFIG = {
  staging: {
    projectId: 'bhykkiladzxjwnzkpdwu',
    url: 'https://bhykkiladzxjwnzkpdwu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWtraWxhZHp4anduemtwZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTM4OTUsImV4cCI6MjA3NzgyOTg5NX0.x0i30Z8lqJjjtm_y0rJ6LGA85nk5GAPXFQC8tzmNaK4',
  },
  production: {
    // ⚠️ ATUALIZAR ESTES VALORES QUANDO CRIAR O PROJETO PRODUCTION:
    // 1. Criar projeto em: https://supabase.com/dashboard
    // 2. Copiar Project Reference ID de: Settings > General
    // 3. Copiar Anon Key de: Settings > API > Project API keys > anon/public
    projectId: 'yxaqwtvuvbtyvpmccxlw', // ⚠️ Exemplo: 'xyzabc123def'
    url: 'https://yxaqwtvuvbtyvpmccxlw.supabase.co', // ⚠️ Mesma URL do projectId
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YXF3dHZ1dmJ0eXZwbWNjeGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTI0OTgsImV4cCI6MjA3OTIyODQ5OH0.uuYTum3xuWbkBvLwB9xYTJ15RwIH1v1gm2STdEKWweY', // ⚠️ Começa com 'eyJhbGc...'
  },
};

// ============================================================
// CONFIGURAÇÃO STRIPE
// ============================================================
const STRIPE_CONFIG = {
  staging: {
    // ✅ TEST MODE - Price IDs de teste do Stripe Dashboard
    // Extraídos do dashboard: https://dashboard.stripe.com/test/products
    priceIds: {
      basico: {
        monthly: 'price_1Sa6SqRyrexM1yHBRXPxDyo3',      // Básico Mensal
        semiannual: 'price_1Sa6SqRyrexM1yHB5Omvn8F9',   // Básico Semestral
        yearly: 'price_1Sa6SqRyrexM1yHBA06baOgZ',       // Básico Anual
      },
      intermediario: {
        monthly: 'price_1Sa6U0RyrexM1yHBaTbjtcwA',      // Intermediário Mensal
        semiannual: 'price_1Sa6WGRyrexM1yHBP5vVWStp',   // Intermediário Semestral
        yearly: 'price_1Sa6WGRyrexM1yHBzp6j660N',       // Intermediário Anual
      },
      avancado: {
        monthly: 'price_1Sa6WnRyrexM1yHBEzgDLFPK',      // Avançado Mensal
        semiannual: 'price_1Sa6YXRyrexM1yHBNqQltgjN',   // Avançado Semestral
        yearly: 'price_1Sa6YXRyrexM1yHBJemzgpwt',       // Avançado Anual
      },
      ilimitado: {
        monthly: 'price_1Sa6ZCRyrexM1yHBKAj1KJOi',      // Ilimitado Mensal
        semiannual: 'price_1Sa6brRyrexM1yHBG5lIFLKT',   // Ilimitado Semestral
        yearly: 'price_1Sa6brRyrexM1yHBynXXCukW',       // Ilimitado Anual
      },
    },
  },
  production: {
    // ✅ LIVE MODE - Price IDs REAIS do Stripe Live
    // Copiados de /supabase/functions/server/stripe.tsx para manter sincronização
    priceIds: {
      basico: {
        monthly: 'price_1SaqXnRrWDoIBh95EWJnxW0n',
        semiannual: 'price_1SaqXnRrWDoIBh95vSktBCW3',
        yearly: 'price_1SaqXnRrWDoIBh958kZdKacI',
      },
      intermediario: {
        monthly: 'price_1SaqXsRrWDoIBh95izmKfRFT',
        semiannual: 'price_1SaqXsRrWDoIBh95EmhReIdL',
        yearly: 'price_1SaqXsRrWDoIBh95tCFen5Wk',
      },
      avancado: {
        monthly: 'price_1SaqXwRrWDoIBh95F5XYJjae',
        semiannual: 'price_1SaqXvRrWDoIBh9551qy12q2',
        yearly: 'price_1SaqXvRrWDoIBh95dswnRkDa',
      },
      ilimitado: {
        monthly: 'price_1SaqXzRrWDoIBh95vduYD9BN',
        semiannual: 'price_1SaqXzRrWDoIBh95p7x5JGBS',
        yearly: 'price_1SaqXzRrWDoIBh950p5oWoBK',
      },
    },
  },
};

// ============================================================
// CONFIGURAÇÃO DE FEATURES (Opcional)
// ============================================================
const FEATURES_CONFIG = {
  staging: {
    // Em staging, pode habilitar features experimentais
    enableDebugLogs: true,
    enableTestMode: true,
    enableMockPayments: false, // Nunca mockar, sempre usar Stripe real (mesmo em test mode)
  },
  production: {
    // Em produção, tudo deve ser estável
    enableDebugLogs: false,
    enableTestMode: false,
    enableMockPayments: false,
  },
};

// ============================================================
// EXPORTS
// ============================================================

export const config = {
  // Ambiente atual
  environment: ENV,
  isProduction: ENV === 'production',
  isStaging: ENV === 'staging',

  // Configurações específicas do ambiente
  supabase: SUPABASE_CONFIG[ENV],
  stripe: STRIPE_CONFIG[ENV],
  features: FEATURES_CONFIG[ENV],
};

// ============================================================
// EXPORTS DE COMPATIBILIDADE (para código existente)
// ============================================================

// Para /utils/supabase/info.tsx
export const projectId = config.supabase.projectId;
export const publicAnonKey = config.supabase.anonKey;

// Helper para verificar ambiente
export const isProd = () => ENV === 'production';
export const isDev = () => ENV === 'staging';

// ============================================================
// VALIDAÇÃO (executa ao importar)
// ============================================================

// Validar se production está configurado corretamente
if (ENV === 'production') {
  if (
    config.supabase.projectId.includes('yxaqwtvuvbtyvpmccxlw') ||
    config.supabase.anonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4YXF3dHZ1dmJ0eXZwbWNjeGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTI0OTgsImV4cCI6MjA3OTIyODQ5OH0.uuYTum3xuWbkBvLwB9xYTJ15RwIH1v1gm2STdEKWweY') ||
    config.stripe.priceIds.basico.includes('price_1SaqX')
  ) {
    console.error('❌ [CONFIG] ERRO: Ambiente em PRODUCTION mas valores não foram atualizados!');
    console.error('❌ Atualize /config/environment.ts com valores reais antes de fazer deploy!');
    throw new Error('Production config not updated! Check /config/environment.ts');
  }
  
  console.log('✅ [CONFIG] Production environment configurado corretamente');
} else {
  console.log('🔧 [CONFIG] Staging environment ativo');
}

// Log da configuração (apenas em staging)
if (ENV === 'staging') {
  console.log('[CONFIG] Supabase Project:', config.supabase.projectId);
  console.log('[CONFIG] Stripe Price IDs:', config.stripe.priceIds);
}