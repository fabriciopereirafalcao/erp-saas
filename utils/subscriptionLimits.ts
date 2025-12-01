/* =========================================================================
 * UTILITÁRIOS - VALIDAÇÃO DE LIMITES DE ASSINATURA
 * ========================================================================= */

import { Subscription, PlanLimits } from '../types/subscription';
import { getPlan } from '../config/plans';

/* =========================================================================
 * VALIDAÇÃO DE LIMITES
 * ========================================================================= */

export interface LimitCheckResult {
  allowed: boolean;
  limitReached: boolean;
  current: number;
  max: number;
  percentage: number;
  feature: string;
  message?: string;
}

/**
 * Verifica se pode criar mais pedidos de venda
 */
export function canCreateSalesOrder(
  subscription: Subscription,
  currentCount: number
): LimitCheckResult {
  const plan = getPlan(subscription.planId);
  const max = plan.limits.maxSalesOrders;
  const current = subscription.usage.salesOrders;
  const percentage = (current / max) * 100;

  return {
    allowed: current < max,
    limitReached: current >= max,
    current,
    max,
    percentage,
    feature: 'Pedidos de Venda',
    message: current >= max
      ? `Limite de ${max} pedidos/mês atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode criar mais pedidos de compra
 */
export function canCreatePurchaseOrder(
  subscription: Subscription,
  currentCount: number
): LimitCheckResult {
  const plan = getPlan(subscription.planId);
  const max = plan.limits.maxPurchaseOrders;
  const current = subscription.usage.purchaseOrders;
  const percentage = (current / max) * 100;

  return {
    allowed: current < max,
    limitReached: current >= max,
    current,
    max,
    percentage,
    feature: 'Pedidos de Compra',
    message: current >= max
      ? `Limite de ${max} pedidos de compra/mês atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode emitir mais NF-es
 */
export function canCreateInvoice(
  subscription: Subscription,
  currentCount: number
): LimitCheckResult {
  const plan = getPlan(subscription.planId);
  const max = plan.limits.maxInvoices;
  const current = subscription.usage.invoices;
  
  // Plano Free não tem acesso a NF-e
  if (!plan.limits.features.fiscalModule) {
    return {
      allowed: false,
      limitReached: true,
      current: 0,
      max: 0,
      percentage: 100,
      feature: 'Emissão de NF-e',
      message: 'Módulo fiscal não disponível no seu plano. Faça upgrade para Starter ou superior.',
    };
  }

  // Planos com NF-e ilimitada
  if (max >= 99999) {
    return {
      allowed: true,
      limitReached: false,
      current,
      max,
      percentage: 0,
      feature: 'Emissão de NF-e',
    };
  }

  const percentage = (current / max) * 100;

  return {
    allowed: current < max,
    limitReached: current >= max,
    current,
    max,
    percentage,
    feature: 'Emissão de NF-e',
    message: current >= max
      ? `Limite de ${max} NF-es/mês atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode criar mais transações financeiras
 */
export function canCreateTransaction(
  subscription: Subscription,
  currentCount: number
): LimitCheckResult {
  const plan = getPlan(subscription.planId);
  const max = plan.limits.maxTransactions;
  const current = subscription.usage.transactions;
  const percentage = (current / max) * 100;

  return {
    allowed: current < max,
    limitReached: current >= max,
    current,
    max,
    percentage,
    feature: 'Transações Financeiras',
    message: current >= max
      ? `Limite de ${max} transações/mês atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode adicionar mais produtos
 */
export function canCreateProduct(
  currentCount: number,
  limits: PlanLimits
): LimitCheckResult {
  const max = limits.maxProducts;
  const percentage = (currentCount / max) * 100;

  return {
    allowed: currentCount < max,
    limitReached: currentCount >= max,
    current: currentCount,
    max,
    percentage,
    feature: 'Produtos',
    message: currentCount >= max
      ? `Limite de ${max} produtos atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode adicionar mais clientes
 */
export function canCreateCustomer(
  currentCount: number,
  limits: PlanLimits
): LimitCheckResult {
  const max = limits.maxCustomers;
  const percentage = (currentCount / max) * 100;

  return {
    allowed: currentCount < max,
    limitReached: currentCount >= max,
    current: currentCount,
    max,
    percentage,
    feature: 'Clientes',
    message: currentCount >= max
      ? `Limite de ${max} clientes atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode adicionar mais fornecedores
 */
export function canCreateSupplier(
  currentCount: number,
  limits: PlanLimits
): LimitCheckResult {
  const max = limits.maxSuppliers;
  const percentage = (currentCount / max) * 100;

  return {
    allowed: currentCount < max,
    limitReached: currentCount >= max,
    current: currentCount,
    max,
    percentage,
    feature: 'Fornecedores',
    message: currentCount >= max
      ? `Limite de ${max} fornecedores atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se pode adicionar mais usuários
 */
export function canCreateUser(
  currentCount: number,
  limits: PlanLimits
): LimitCheckResult {
  const max = limits.maxUsers;
  const percentage = (currentCount / max) * 100;

  return {
    allowed: currentCount < max,
    limitReached: currentCount >= max,
    current: currentCount,
    max,
    percentage,
    feature: 'Usuários',
    message: currentCount >= max
      ? `Limite de ${max} usuários atingido. Faça upgrade do plano.`
      : undefined,
  };
}

/**
 * Verifica se tem espaço de armazenamento
 */
export function canUploadFile(
  currentStorageMB: number,
  fileSizeMB: number,
  limits: PlanLimits
): LimitCheckResult {
  const maxStorage = limits.maxStorageMB;
  const maxFileSize = limits.maxFileUploadMB;
  const newTotal = currentStorageMB + fileSizeMB;
  const percentage = (currentStorageMB / maxStorage) * 100;

  // Verificar tamanho do arquivo
  if (fileSizeMB > maxFileSize) {
    return {
      allowed: false,
      limitReached: true,
      current: fileSizeMB,
      max: maxFileSize,
      percentage: 100,
      feature: 'Tamanho de Arquivo',
      message: `Arquivo muito grande. Máximo permitido: ${maxFileSize} MB.`,
    };
  }

  // Verificar espaço total
  if (newTotal > maxStorage) {
    return {
      allowed: false,
      limitReached: true,
      current: currentStorageMB,
      max: maxStorage,
      percentage,
      feature: 'Armazenamento',
      message: `Espaço insuficiente. Disponível: ${(maxStorage - currentStorageMB).toFixed(2)} MB.`,
    };
  }

  return {
    allowed: true,
    limitReached: false,
    current: currentStorageMB,
    max: maxStorage,
    percentage,
    feature: 'Armazenamento',
  };
}

/**
 * Verifica se uma funcionalidade está disponível no plano
 */
export function hasFeature(
  subscription: Subscription,
  feature: keyof PlanLimits['features']
): boolean {
  const plan = getPlan(subscription.planId);
  return plan.limits.features[feature];
}

/**
 * Retorna todos os limites e uso atual
 */
export function getUsageOverview(subscription: Subscription) {
  const plan = getPlan(subscription.planId);
  const limits = plan.limits;
  const usage = subscription.usage;

  return {
    salesOrders: {
      current: usage.salesOrders,
      max: limits.maxSalesOrders,
      percentage: (usage.salesOrders / limits.maxSalesOrders) * 100,
      nearLimit: usage.salesOrders >= limits.maxSalesOrders * 0.8,
    },
    purchaseOrders: {
      current: usage.purchaseOrders,
      max: limits.maxPurchaseOrders,
      percentage: (usage.purchaseOrders / limits.maxPurchaseOrders) * 100,
      nearLimit: usage.purchaseOrders >= limits.maxPurchaseOrders * 0.8,
    },
    invoices: {
      current: usage.invoices,
      max: limits.maxInvoices,
      percentage: limits.maxInvoices >= 99999 ? 0 : (usage.invoices / limits.maxInvoices) * 100,
      nearLimit: usage.invoices >= limits.maxInvoices * 0.8,
    },
    transactions: {
      current: usage.transactions,
      max: limits.maxTransactions,
      percentage: (usage.transactions / limits.maxTransactions) * 100,
      nearLimit: usage.transactions >= limits.maxTransactions * 0.8,
    },
    storage: {
      current: usage.storageMB,
      max: limits.maxStorageMB,
      percentage: (usage.storageMB / limits.maxStorageMB) * 100,
      nearLimit: usage.storageMB >= limits.maxStorageMB * 0.8,
    },
  };
}

/**
 * Retorna warning se estiver próximo do limite (80%)
 */
export function getUsageWarnings(subscription: Subscription): string[] {
  const overview = getUsageOverview(subscription);
  const warnings: string[] = [];

  if (overview.salesOrders.nearLimit) {
    warnings.push(`Você usou ${overview.salesOrders.current} de ${overview.salesOrders.max} pedidos de venda este mês.`);
  }
  if (overview.purchaseOrders.nearLimit) {
    warnings.push(`Você usou ${overview.purchaseOrders.current} de ${overview.purchaseOrders.max} pedidos de compra este mês.`);
  }
  if (overview.invoices.nearLimit && overview.invoices.max < 99999) {
    warnings.push(`Você emitiu ${overview.invoices.current} de ${overview.invoices.max} NF-es este mês.`);
  }
  if (overview.transactions.nearLimit) {
    warnings.push(`Você criou ${overview.transactions.current} de ${overview.transactions.max} transações este mês.`);
  }
  if (overview.storage.nearLimit) {
    warnings.push(`Você usou ${overview.storage.current.toFixed(2)} MB de ${overview.storage.max} MB de armazenamento.`);
  }

  return warnings;
}
