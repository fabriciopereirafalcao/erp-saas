/**
 * Configuração de Ambiente do Sistema
 * 
 * Define o ambiente de execução e controla features disponíveis
 */

// Tipo de ambiente
export type Environment = 'development' | 'production' | 'staging';

/**
 * Detecta o ambiente atual
 * Ordem de prioridade:
 * 1. Variável de ambiente APP_ENV
 * 2. process.env.NODE_ENV
 * 3. Default: production (segurança)
 */
export const getEnvironment = (): Environment => {
  // Tentar APP_ENV primeiro (configuração específica do app)
  if (typeof window !== 'undefined') {
    // @ts-ignore - variável pode não existir
    const appEnv = window.APP_ENV || import.meta.env?.VITE_APP_ENV;
    if (appEnv === 'development' || appEnv === 'staging') {
      return appEnv as Environment;
    }
  }
  
  // Tentar NODE_ENV (padrão do build)
  // @ts-ignore
  const nodeEnv = process.env.NODE_ENV || import.meta.env?.MODE;
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  // Default para produção (segurança first)
  return 'production';
};

/**
 * Ambiente atual do sistema
 */
export const ENVIRONMENT = getEnvironment();

/**
 * Flags de ambiente
 */
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_STAGING = ENVIRONMENT === 'staging';

/**
 * Features habilitadas por ambiente
 */
export const FEATURES = {
  // Auditoria técnica do sistema (apenas dev)
  SYSTEM_AUDIT: IS_DEVELOPMENT,
  
  // Logs detalhados (dev e staging)
  DEBUG_LOGS: IS_DEVELOPMENT || IS_STAGING,
  
  // Dados de exemplo/mock (apenas dev)
  MOCK_DATA: IS_DEVELOPMENT,
  
  // Performance monitoring (todos)
  PERFORMANCE_MONITORING: true,
  
  // Error tracking (produção e staging)
  ERROR_TRACKING: IS_PRODUCTION || IS_STAGING,
  
  // 🔓 BYPASS AUTH - Desabilitar autenticação temporariamente (apenas dev)
  // ⚠️ ATENÇÃO: Mude para false para reativar autenticação completa
  BYPASS_AUTH: IS_DEVELOPMENT && true, // Mude para "false" quando quiser autenticação real
};

/**
 * Configurações específicas por ambiente
 */
export const ENV_CONFIG = {
  development: {
    apiUrl: 'http://localhost:3000',
    enableDevTools: true,
    logLevel: 'debug',
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    enableDevTools: true,
    logLevel: 'info',
  },
  production: {
    apiUrl: 'https://api.example.com',
    enableDevTools: false,
    logLevel: 'error',
  },
};

/**
 * Configuração atual do ambiente
 */
export const CONFIG = ENV_CONFIG[ENVIRONMENT];

/**
 * Logger condicional baseado no ambiente
 */
export const devLog = (...args: any[]) => {
  if (FEATURES.DEBUG_LOGS) {
    console.log('[DEV]', ...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (FEATURES.DEBUG_LOGS) {
    console.warn('[DEV]', ...args);
  }
};

export const devError = (...args: any[]) => {
  if (FEATURES.DEBUG_LOGS) {
    console.error('[DEV]', ...args);
  }
};

/**
 * Informações do ambiente (para debug)
 */
export const getEnvironmentInfo = () => ({
  environment: ENVIRONMENT,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
  isStaging: IS_STAGING,
  features: FEATURES,
  config: CONFIG,
});

// Log do ambiente ao carregar (apenas dev)
if (IS_DEVELOPMENT) {
  console.log('🔧 Ambiente:', ENVIRONMENT);
  console.log('⚙️ Features:', FEATURES);
}