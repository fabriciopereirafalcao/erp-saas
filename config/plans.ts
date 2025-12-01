/* =========================================================================
 * CONFIGURAÇÃO DE PLANOS - ERP CLOUD PRO
 * ========================================================================= */

import { Plan, PlanTier } from '../types/subscription';

/* =========================================================================
 * DEFINIÇÃO DOS PLANOS
 * ========================================================================= */

export const PLANS: Record<PlanTier, Plan> = {
  /* =======================================================================
   * PLANO BÁSICO - R$ 49,90
   * ======================================================================= */
  basico: {
    id: 'basico',
    name: 'Básico',
    description: 'Ideal para começar',
    price: {
      monthly: 49.90,
      quarterly: 47.41,      // 5% desconto
      semiannual: 44.91,     // 10% desconto
      yearly: 39.92,         // 20% desconto
    },
    discount: {
      quarterly: 5,
      semiannual: 10,
      yearly: 20,
    },
    limits: {
      maxUsers: 1,                     // APENAS 1 USUÁRIO
      maxProducts: 500,
      maxCustomers: 200,
      maxSuppliers: 50,
      maxSalesOrders: 100,             // 100 pedidos/mês
      maxPurchaseOrders: 50,           // 50 compras/mês
      maxInvoices: 0,                  // ❌ SEM NF-e
      maxTransactions: 0,              // ❌ SEM Transações Financeiras
      maxStorageMB: 512,               // 512 MB
      maxFileUploadMB: 5,              // 5 MB por arquivo
      features: {
        fiscalModule: false,           // ❌ SEM NF-e
        multipleWarehouses: false,
        advancedReports: true,
        apiAccess: false,
        whiteLabel: false,
        prioritySupport: false,
        customIntegrations: false,
        auditLog: false,
        bulkImport: true,
        customFields: false,
      },
    },
    features: [
      '👤 1 usuário',
      '📦 Até 500 produtos',
      '👥 Até 200 clientes',
      '📋 Até 100 pedidos/mês',
      '❌ Sem NF-e',
      '❌ Sem módulo financeiro',
      '❌ Sem contas a pagar/receber',
      '❌ Sem conciliações',
      '❌ Sem fluxo de caixa',
      '📊 Relatórios básicos',
      '💾 512 MB de armazenamento',
      '📧 Suporte por email',
    ],
  },

  /* =======================================================================
   * PLANO INTERMEDIÁRIO - R$ 69,90
   * ======================================================================= */
  intermediario: {
    id: 'intermediario',
    name: 'Intermediário',
    description: 'Para pequenas empresas',
    price: {
      monthly: 69.90,
      quarterly: 66.41,      // 5% desconto
      semiannual: 62.91,     // 10% desconto
      yearly: 55.92,         // 20% desconto
    },
    discount: {
      quarterly: 5,
      semiannual: 10,
      yearly: 20,
    },
    limits: {
      maxUsers: 3,                     // ATÉ 3 USUÁRIOS
      maxProducts: 2000,
      maxCustomers: 1000,
      maxSuppliers: 200,
      maxSalesOrders: 300,             // 300 pedidos/mês
      maxPurchaseOrders: 150,          // 150 compras/mês
      maxInvoices: 100,                // ✅ 100 NF-es/mês
      maxTransactions: 200,            // ✅ 200 Transações/mês
      maxStorageMB: 2048,              // 2 GB
      maxFileUploadMB: 20,             // 20 MB por arquivo
      features: {
        fiscalModule: true,            // ✅ NF-e INCLUSA
        multipleWarehouses: false,
        advancedReports: true,
        apiAccess: false,
        whiteLabel: false,
        prioritySupport: false,
        customIntegrations: false,
        auditLog: true,
        bulkImport: true,
        customFields: false,
      },
    },
    features: [
      '👥 Até 3 usuários',
      '✅ Emissão de NF-e (100/mês)',
      '💰 Transações financeiras',
      '📦 Até 2.000 produtos',
      '👥 Até 1.000 clientes',
      '📋 Até 300 pedidos/mês',
      '❌ Sem contas a pagar/receber',
      '❌ Sem conciliações',
      '❌ Sem fluxo de caixa',
      '📊 Relatórios avançados',
      '📥 Importação em massa',
      '🔍 Log de auditoria',
      '💾 2 GB de armazenamento',
      '📧 Suporte por email',
    ],
    popular: true,                     // Badge "MAIS POPULAR"
  },

  /* =======================================================================
   * PLANO AVANÇADO - R$ 109,90
   * ======================================================================= */
  avancado: {
    id: 'avancado',
    name: 'Avançado',
    description: 'Todos os módulos inclusos',
    price: {
      monthly: 109.90,
      quarterly: 104.41,     // 5% desconto
      semiannual: 98.91,     // 10% desconto
      yearly: 87.92,         // 20% desconto
    },
    discount: {
      quarterly: 5,
      semiannual: 10,
      yearly: 20,
    },
    limits: {
      maxUsers: 10,                    // ATÉ 10 USUÁRIOS
      maxProducts: 10000,
      maxCustomers: 5000,
      maxSuppliers: 1000,
      maxSalesOrders: 1000,            // 1000 pedidos/mês
      maxPurchaseOrders: 500,          // 500 compras/mês
      maxInvoices: 500,                // 500 NF-es/mês
      maxTransactions: 2000,           // 2000 transações/mês
      maxStorageMB: 10240,             // 10 GB
      maxFileUploadMB: 50,             // 50 MB por arquivo
      features: {
        fiscalModule: true,            // ✅ NF-e
        multipleWarehouses: true,      // ✅ Múltiplos depósitos
        advancedReports: true,
        apiAccess: true,               // ✅ API REST
        whiteLabel: false,
        prioritySupport: true,         // ✅ Suporte prioritário
        customIntegrations: false,
        auditLog: true,
        bulkImport: true,
        customFields: true,            // ✅ Campos customizados
      },
    },
    features: [
      '👥 Até 10 usuários',
      '✅ TODOS OS MÓDULOS INCLUSOS',
      '✅ Emissão de NF-e (500/mês)',
      '💰 Transações financeiras',
      '💳 Contas a pagar/receber',
      '🔄 Conciliações bancárias',
      '📊 Fluxo de caixa',
      '📦 Até 10.000 produtos',
      '👥 Até 5.000 clientes',
      '🏢 Múltiplos depósitos',
      '🔌 API REST completa',
      '🎨 Campos customizados',
      '📊 Relatórios avançados',
      '📥 Importação em massa',
      '🔍 Log de auditoria',
      '💾 10 GB de armazenamento',
      '🚀 Suporte prioritário',
    ],
    highlighted: true,                 // Badge "RECOMENDADO"
  },

  /* =======================================================================
   * PLANO ILIMITADO - R$ 139,90
   * ======================================================================= */
  ilimitado: {
    id: 'ilimitado',
    name: 'Ilimitado',
    description: 'Sem limites para crescer',
    price: {
      monthly: 139.90,
      quarterly: 132.91,     // 5% desconto
      semiannual: 125.91,    // 10% desconto
      yearly: 111.92,        // 20% desconto
    },
    discount: {
      quarterly: 5,
      semiannual: 10,
      yearly: 20,
    },
    limits: {
      maxUsers: 999999,                // ILIMITADO
      maxProducts: 999999,             // ILIMITADO
      maxCustomers: 999999,            // ILIMITADO
      maxSuppliers: 999999,            // ILIMITADO
      maxSalesOrders: 999999,          // ILIMITADO
      maxPurchaseOrders: 999999,       // ILIMITADO
      maxInvoices: 999999,             // ILIMITADO
      maxTransactions: 999999,         // ILIMITADO
      maxStorageMB: 102400,            // 100 GB
      maxFileUploadMB: 200,            // 200 MB por arquivo
      features: {
        fiscalModule: true,            // ✅ Tudo incluso
        multipleWarehouses: true,
        advancedReports: true,
        apiAccess: true,
        whiteLabel: true,              // ✅ White label
        prioritySupport: true,
        customIntegrations: true,      // ✅ Integrações custom
        auditLog: true,
        bulkImport: true,
        customFields: true,
      },
    },
    features: [
      '🚀 TUDO ILIMITADO',
      '👥 Usuários ilimitados',
      '📦 Produtos ilimitados',
      '👥 Clientes ilimitados',
      '📋 Pedidos ilimitados',
      '✅ NF-e ilimitadas',
      '💰 Transações ilimitadas',
      '💳 Contas a pagar/receber',
      '🔄 Conciliações bancárias',
      '📊 Fluxo de caixa',
      '🏢 Múltiplos depósitos',
      '🔌 API REST completa',
      '🎨 Campos customizados',
      '🎯 White label (sua marca)',
      '🔧 Integrações customizadas',
      '📊 Relatórios avançados',
      '📥 Importação em massa',
      '🔍 Log de auditoria completo',
      '💾 100 GB de armazenamento',
      '🌟 Suporte VIP 24/7',
      '👨‍💼 Gerente de conta dedicado',
    ],
  },
};

/* =========================================================================
 * UTILITÁRIOS
 * ========================================================================= */

/**
 * Retorna o plano pelo ID
 */
export function getPlan(planId: PlanTier): Plan {
  return PLANS[planId];
}

/**
 * Retorna todos os planos em array
 */
export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

/**
 * Retorna planos disponíveis para compra
 */
export function getPaidPlans(): Plan[] {
  return getAllPlans();
}

/**
 * Calcula preço com desconto baseado no ciclo
 */
export function getPriceForCycle(plan: Plan, cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'): number {
  return plan.price[cycle];
}

/**
 * Calcula economia em relação ao mensal
 */
export function calculateSavings(plan: Plan, cycle: 'quarterly' | 'semiannual' | 'yearly'): number {
  const monthlyEquivalent = {
    quarterly: plan.price.monthly * 3,
    semiannual: plan.price.monthly * 6,
    yearly: plan.price.monthly * 12,
  };
  
  const cyclePrice = {
    quarterly: plan.price.quarterly * 3,
    semiannual: plan.price.semiannual * 6,
    yearly: plan.price.yearly * 12,
  };
  
  return monthlyEquivalent[cycle] - cyclePrice[cycle];
}

/**
 * Formata preço em BRL
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

/**
 * Verifica se é upgrade ou downgrade
 */
export function isPlanUpgrade(fromPlan: PlanTier, toPlan: PlanTier): boolean {
  const planOrder: PlanTier[] = ['basico', 'intermediario', 'avancado', 'ilimitado'];
  return planOrder.indexOf(toPlan) > planOrder.indexOf(fromPlan);
}

/**
 * Retorna label do ciclo de cobrança
 */
export function getBillingCycleLabel(cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'): string {
  const labels = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    yearly: 'Anual',
  };
  return labels[cycle];
}

/* =========================================================================
 * CONSTANTES
 * ========================================================================= */

export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_PLAN: PlanTier = 'ilimitado';  // Trial usa plano Ilimitado
export const DEFAULT_CURRENCY = 'BRL';
export const TAX_RATE = 0; // Sem taxa adicional por enquanto
