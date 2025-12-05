/* =========================================================================
 * HOOK: useModuleAccess - Verificação de Acesso a Módulos
 * ========================================================================= */

import { useSubscription } from "../contexts/SubscriptionContext";
import { NavigationView } from "../App";
import { getPlan } from "../config/plans";

export interface ModuleAccessResult {
  allowed: boolean;
  reason?: string;
  requiresUpgrade: boolean;
  requiredPlan?: 'basico' | 'intermediario' | 'avancado' | 'ilimitado';
}

/**
 * Hook para verificar se o usuário tem acesso a um módulo
 */
export function useModuleAccess() {
  const { subscription, triggerUpgrade } = useSubscription();

  /**
   * Verifica se um módulo está disponível no plano atual
   */
  const checkModuleAccess = (module: NavigationView): ModuleAccessResult => {
    if (!subscription) {
      return {
        allowed: false,
        reason: "Assinatura não encontrada",
        requiresUpgrade: true,
      };
    }

    const plan = getPlan(subscription.planId);

    // Módulos sempre disponíveis
    const alwaysAvailable: NavigationView[] = [
      "dashboard",
      "inventory",
      "purchases",
      "sales",
      "customers",
      "suppliers",
      "priceTables",
      "reports",
      "company",
      "usersPermissions",
      "emailSettings",
      "billing",
      "profile",
      "productCategories",
      "stockLocations",
      "manufacturingBatches",
      "salespeople",
      "buyers",
      "chartOfAccounts",
      "costCenters",
      "digitalCertificate",
      "testePersistencia",
      "systemAudit",
    ];

    if (alwaysAvailable.includes(module)) {
      return { allowed: true, requiresUpgrade: false };
    }

    // VERIFICAR MÓDULO FISCAL (NF-e)
    if (module === "taxInvoicing") {
      if (!plan.limits.features.fiscalModule) {
        return {
          allowed: false,
          reason: "O módulo de Faturamento Fiscal (NF-e) não está disponível no plano Básico. Faça upgrade para ter acesso.",
          requiresUpgrade: true,
          requiredPlan: "intermediario",
        };
      }
      return { allowed: true, requiresUpgrade: false };
    }

    // VERIFICAR TRANSAÇÕES FINANCEIRAS
    if (module === "financialTransactions") {
      if (plan.limits.maxTransactions === 0) {
        return {
          allowed: false,
          reason: "O módulo de Transações Financeiras não está disponível no plano Básico. Faça upgrade para ter acesso.",
          requiresUpgrade: true,
          requiredPlan: "intermediario",
        };
      }
      return { allowed: true, requiresUpgrade: false };
    }

    // VERIFICAR CONTAS A PAGAR/RECEBER
    if (module === "accountsPayableReceivable") {
      if (subscription.planId === "basico" || subscription.planId === "intermediario") {
        return {
          allowed: false,
          reason: "O módulo de Contas a Pagar/Receber está disponível apenas nos planos Avançado e Ilimitado.",
          requiresUpgrade: true,
          requiredPlan: "avancado",
        };
      }
      return { allowed: true, requiresUpgrade: false };
    }

    // VERIFICAR CONCILIAÇÕES
    if (module === "balanceReconciliation") {
      if (subscription.planId === "basico" || subscription.planId === "intermediario") {
        return {
          allowed: false,
          reason: "O módulo de Conciliações Bancárias está disponível apenas nos planos Avançado e Ilimitado.",
          requiresUpgrade: true,
          requiredPlan: "avancado",
        };
      }
      return { allowed: true, requiresUpgrade: false };
    }

    // VERIFICAR FLUXO DE CAIXA
    if (module === "cashFlow") {
      if (subscription.planId === "basico" || subscription.planId === "intermediario") {
        return {
          allowed: false,
          reason: "O módulo de Fluxo de Caixa está disponível apenas nos planos Avançado e Ilimitado.",
          requiresUpgrade: true,
          requiredPlan: "avancado",
        };
      }
      return { allowed: true, requiresUpgrade: false };
    }

    // Default: permitir
    return { allowed: true, requiresUpgrade: false };
  };

  /**
   * Tenta acessar um módulo - se bloqueado, mostra dialog de upgrade
   */
  const tryAccessModule = (module: NavigationView, onSuccess?: () => void): boolean => {
    const access = checkModuleAccess(module);

    if (!access.allowed && access.requiresUpgrade) {
      triggerUpgrade(access.reason || "Módulo não disponível no seu plano", access.requiredPlan);
      return false;
    }

    // Se permitido, executa callback
    if (onSuccess) {
      onSuccess();
    }

    return true;
  };

  return {
    checkModuleAccess,
    tryAccessModule,
    subscription,
  };
}
