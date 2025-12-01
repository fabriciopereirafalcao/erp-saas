/* =========================================================================
 * SUBSCRIPTION CONTEXT - GERENCIAMENTO GLOBAL DE ASSINATURA
 * ========================================================================= */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Subscription, PlanTier } from "../types/subscription";
import { useAuth } from "./AuthContext";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { getPlan } from "../config/plans";
import {
  canCreateSalesOrder,
  canCreatePurchaseOrder,
  canCreateInvoice,
  canCreateTransaction,
  canCreateProduct,
  canCreateCustomer,
  canCreateSupplier,
  canCreateUser,
  canUploadFile,
  hasFeature,
  getUsageOverview,
  getUsageWarnings,
} from "../utils/subscriptionLimits";

/* =========================================================================
 * TIPOS
 * ========================================================================= */

interface SubscriptionContextType {
  // DADOS
  subscription: Subscription | null;
  loading: boolean;
  
  // FUNÇÕES DE VALIDAÇÃO
  canCreateSalesOrder: () => { allowed: boolean; reason?: string };
  canCreatePurchaseOrder: () => { allowed: boolean; reason?: string };
  canCreateInvoice: () => { allowed: boolean; reason?: string };
  canCreateTransaction: () => { allowed: boolean; reason?: string };
  canCreateProduct: () => { allowed: boolean; reason?: string };
  canCreateCustomer: () => { allowed: boolean; reason?: string };
  canCreateSupplier: () => { allowed: boolean; reason?: string };
  canCreateUser: () => { allowed: boolean; reason?: string };
  canUploadFile: (fileSizeMB: number) => { allowed: boolean; reason?: string };
  hasFeature: (feature: string) => boolean;
  
  // ANALYTICS
  getUsageOverview: () => any;
  getUsageWarnings: () => string[];
  
  // ACTIONS
  refreshSubscription: () => Promise<void>;
  incrementUsage: (type: 'salesOrders' | 'purchaseOrders' | 'invoices' | 'transactions', amount?: number) => Promise<void>;
  
  // UPGRADE TRIGGER
  triggerUpgrade: (reason: string, requiredPlan?: PlanTier) => void;
  upgradeDialogState: {
    isOpen: boolean;
    reason: string;
    requiredPlan?: PlanTier;
  };
  closeUpgradeDialog: () => void;
}

/* =========================================================================
 * CONTEXT
 * ========================================================================= */

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/* =========================================================================
 * PROVIDER
 * ========================================================================= */

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialogState, setUpgradeDialogState] = useState({
    isOpen: false,
    reason: "",
    requiredPlan: undefined as PlanTier | undefined,
  });

  /* =======================================================================
   * CARREGAR ASSINATURA
   * ======================================================================= */

  useEffect(() => {
    if (session?.access_token) {
      loadSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [session]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubscription(data.data);
      } else {
        console.error("Erro ao carregar assinatura:", data.error);
      }
    } catch (error) {
      console.error("Erro ao carregar assinatura:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================================
   * INCREMENTAR USO
   * ======================================================================= */

  const incrementUsage = async (
    type: 'salesOrders' | 'purchaseOrders' | 'invoices' | 'transactions',
    amount: number = 1
  ) => {
    try {
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/increment-usage`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type, amount }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Atualizar subscription local
        setSubscription(data.data);
      }
    } catch (error) {
      console.error("Erro ao incrementar uso:", error);
    }
  };

  /* =======================================================================
   * FUNÇÕES DE VALIDAÇÃO (WRAPPERS)
   * ======================================================================= */

  const validationFunctions = {
    canCreateSalesOrder: () => subscription ? canCreateSalesOrder(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreatePurchaseOrder: () => subscription ? canCreatePurchaseOrder(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateInvoice: () => subscription ? canCreateInvoice(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateTransaction: () => subscription ? canCreateTransaction(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateProduct: () => subscription ? canCreateProduct(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateCustomer: () => subscription ? canCreateCustomer(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateSupplier: () => subscription ? canCreateSupplier(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canCreateUser: () => subscription ? canCreateUser(subscription) : { allowed: false, reason: "Assinatura não encontrada" },
    canUploadFile: (fileSizeMB: number) => subscription ? canUploadFile(subscription, fileSizeMB) : { allowed: false, reason: "Assinatura não encontrada" },
    hasFeature: (feature: string) => subscription ? hasFeature(subscription, feature) : false,
    getUsageOverview: () => subscription ? getUsageOverview(subscription) : null,
    getUsageWarnings: () => subscription ? getUsageWarnings(subscription) : [],
  };

  /* =======================================================================
   * TRIGGER DE UPGRADE
   * ======================================================================= */

  const triggerUpgrade = (reason: string, requiredPlan?: PlanTier) => {
    setUpgradeDialogState({
      isOpen: true,
      reason,
      requiredPlan,
    });
  };

  const closeUpgradeDialog = () => {
    setUpgradeDialogState({
      isOpen: false,
      reason: "",
      requiredPlan: undefined,
    });
  };

  /* =======================================================================
   * PROVIDER VALUE
   * ======================================================================= */

  const value: SubscriptionContextType = {
    subscription,
    loading,
    ...validationFunctions,
    refreshSubscription: loadSubscription,
    incrementUsage,
    triggerUpgrade,
    upgradeDialogState,
    closeUpgradeDialog,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/* =========================================================================
 * HOOK CUSTOMIZADO
 * ========================================================================= */

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
