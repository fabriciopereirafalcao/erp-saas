/* =========================================================================
 * TIPOS E INTERFACES - SISTEMA DE ASSINATURAS
 * ========================================================================= */

export type PlanTier = 'basico' | 'intermediario' | 'avancado' | 'ilimitado';

export type SubscriptionStatus = 
  | 'trial'           // Período de teste (14 dias) - usa plano Ilimitado
  | 'active'          // Assinatura ativa e paga
  | 'past_due'        // Pagamento atrasado
  | 'canceled'        // Cancelada (ainda tem acesso até fim do período)
  | 'expired'         // Expirada (sem acesso)
  | 'paused';         // Pausada temporariamente

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/* =========================================================================
 * INTERFACE: PLANO DE ASSINATURA
 * ========================================================================= */

export interface Plan {
  id: PlanTier;
  name: string;
  description: string;
  price: {
    monthly: number;
    quarterly: number;
    semiannual: number;
    yearly: number;
  };
  discount?: {
    quarterly: number;
    semiannual: number;
    yearly: number;
  };
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
  highlighted?: boolean;
}

/* =========================================================================
 * INTERFACE: LIMITES POR PLANO
 * ========================================================================= */

export interface PlanLimits {
  // USUÁRIOS
  maxUsers: number;                    // Máximo de usuários no sistema
  
  // CADASTROS
  maxProducts: number;                 // Máximo de produtos no estoque
  maxCustomers: number;                // Máximo de clientes
  maxSuppliers: number;                // Máximo de fornecedores
  
  // TRANSAÇÕES MENSAIS
  maxSalesOrders: number;              // Pedidos de venda por mês
  maxPurchaseOrders: number;           // Pedidos de compra por mês
  maxInvoices: number;                 // NF-es por mês
  maxTransactions: number;             // Transações financeiras por mês
  
  // STORAGE
  maxStorageMB: number;                // Armazenamento em MB
  maxFileUploadMB: number;             // Tamanho máximo por arquivo
  
  // FUNCIONALIDADES
  features: {
    fiscalModule: boolean;             // Módulo de NF-e
    multipleWarehouses: boolean;       // Múltiplos depósitos
    advancedReports: boolean;          // Relatórios avançados
    apiAccess: boolean;                // Acesso à API
    whiteLabel: boolean;               // White label / marca própria
    prioritySupport: boolean;          // Suporte prioritário
    customIntegrations: boolean;       // Integrações customizadas
    auditLog: boolean;                 // Log de auditoria completo
    bulkImport: boolean;               // Importação em massa
    customFields: boolean;             // Campos personalizados
  };
}

/* =========================================================================
 * INTERFACE: ASSINATURA DO USUÁRIO
 * ========================================================================= */

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  
  // DATAS
  trialStartDate?: string;             // Data de início do trial
  trialEndDate?: string;               // Data de fim do trial
  startDate: string;                   // Data de início da assinatura paga
  currentPeriodStart: string;          // Início do período atual
  currentPeriodEnd: string;            // Fim do período atual
  canceledAt?: string;                 // Data de cancelamento
  pausedAt?: string;                   // Data de pausa
  
  // PAGAMENTO
  amount: number;                      // Valor pago
  currency: string;                    // Moeda (BRL)
  paymentMethod?: string;              // Método de pagamento (credit_card, pix, boleto)
  isRecurring?: boolean;               // true = cartão (auto-renova), false = PIX/Boleto (manual)
  stripeCustomerId?: string;           // ID do cliente no Stripe
  stripeSubscriptionId?: string;       // ID da assinatura no Stripe (null para PIX/Boleto)
  stripePaymentIntentId?: string;      // ID do payment intent (PIX/Boleto)
  
  // USO (resetado mensalmente)
  usage: {
    salesOrders: number;
    purchaseOrders: number;
    invoices: number;
    transactions: number;
    storageMB: number;
  };
  
  // METADATA
  createdAt: string;
  updatedAt: string;
}

/* =========================================================================
 * INTERFACE: FATURA
 * ========================================================================= */

export interface Invoice {
  id: string;
  subscriptionId: string;
  userId: string;
  
  // VALORES
  amount: number;
  currency: string;
  tax?: number;
  total: number;
  
  // STATUS
  status: PaymentStatus;
  
  // DATAS
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  
  // PAGAMENTO
  paymentMethod?: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  
  // DADOS DA COBRANÇA
  billingPeriod: {
    start: string;
    end: string;
  };
  planId: PlanTier;
  billingCycle: BillingCycle;
  
  // METADATA
  createdAt: string;
  updatedAt: string;
}

/* =========================================================================
 * INTERFACE: MÉTODO DE PAGAMENTO
 * ========================================================================= */

export interface PaymentMethod {
  id: string;
  userId: string;
  
  type: 'credit_card' | 'debit_card' | 'pix' | 'boleto';
  
  // DADOS DO CARTÃO (últimos 4 dígitos)
  last4?: string;
  brand?: string;                      // visa, mastercard, etc
  expMonth?: number;
  expYear?: number;
  
  // STATUS
  isDefault: boolean;
  isValid: boolean;
  
  // STRIPE
  stripePaymentMethodId?: string;
  
  // METADATA
  createdAt: string;
  updatedAt: string;
}

/* =========================================================================
 * INTERFACE: USO DO PLANO (para analytics)
 * ========================================================================= */

export interface PlanUsage {
  subscriptionId: string;
  period: string;                      // YYYY-MM
  
  // CONTADORES
  salesOrders: number;
  purchaseOrders: number;
  invoices: number;
  transactions: number;
  storageMB: number;
  
  // PERCENTUAIS
  percentages: {
    salesOrders: number;
    purchaseOrders: number;
    invoices: number;
    transactions: number;
    storageMB: number;
  };
  
  // ALERTAS
  warnings: {
    nearLimit: boolean;
    limitReached: boolean;
    features: string[];                // Features que atingiram limite
  };
}

/* =========================================================================
 * INTERFACE: HISTÓRICO DE UPGRADES/DOWNGRADES
 * ========================================================================= */

export interface PlanChange {
  id: string;
  subscriptionId: string;
  userId: string;
  
  fromPlan: PlanTier;
  toPlan: PlanTier;
  
  type: 'upgrade' | 'downgrade';
  reason?: string;
  
  // FINANCEIRO
  proratedAmount?: number;             // Valor proporcional (se houver)
  
  // DATAS
  effectiveDate: string;
  createdAt: string;
}