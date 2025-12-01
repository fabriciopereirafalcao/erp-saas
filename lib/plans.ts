/* =========================================================================
 * CONFIGURAÇÃO DE PLANOS - COMPATIBILIDADE
 * Arquivo simplificado para uso nos componentes de subscription
 * ========================================================================= */

export type PlanId = "basico" | "intermediario" | "avancado" | "ilimitado";

export interface PlanLimits {
  users: number | null;
  products: number | null;
  customers: number | null;
  suppliers: number | null;
  invoices: number | null; // NF-e/mês
  transactions: number | null; // Transações/mês
}

export interface PlanFeatures {
  basicModules: boolean; // Inventário, Vendas, Compras
  fiscalModule: boolean; // NF-e
  financialModule: boolean; // Transações financeiras
  advancedReports: boolean;
}

export interface PlanConfig {
  name: string;
  description: string;
  limits: PlanLimits;
  features: PlanFeatures;
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  basico: {
    name: "Básico",
    description: "Ideal para começar",
    limits: {
      users: 1,
      products: 500,
      customers: 200,
      suppliers: 50,
      invoices: 0, // SEM NF-e
      transactions: 0, // SEM Financeiro
    },
    features: {
      basicModules: true,
      fiscalModule: false,
      financialModule: false,
      advancedReports: false,
    },
  },
  intermediario: {
    name: "Intermediário",
    description: "Para pequenas empresas",
    limits: {
      users: 3,
      products: 2000,
      customers: 1000,
      suppliers: 200,
      invoices: 100,
      transactions: 200,
    },
    features: {
      basicModules: true,
      fiscalModule: true,
      financialModule: true,
      advancedReports: true,
    },
  },
  avancado: {
    name: "Avançado",
    description: "Todos os módulos inclusos",
    limits: {
      users: 10,
      products: 10000,
      customers: 5000,
      suppliers: 1000,
      invoices: 500,
      transactions: 2000,
    },
    features: {
      basicModules: true,
      fiscalModule: true,
      financialModule: true,
      advancedReports: true,
    },
  },
  ilimitado: {
    name: "Ilimitado",
    description: "Sem limites para crescer",
    limits: {
      users: null, // Ilimitado
      products: null,
      customers: null,
      suppliers: null,
      invoices: null,
      transactions: null,
    },
    features: {
      basicModules: true,
      fiscalModule: true,
      financialModule: true,
      advancedReports: true,
    },
  },
};
