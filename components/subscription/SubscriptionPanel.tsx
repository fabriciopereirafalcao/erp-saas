import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  CreditCard,
  Users,
  Package,
  FileText,
  TrendingUp,
  Settings,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { PLAN_CONFIG } from "../../lib/plans";
import { UsageProgressCard } from "./UsageProgressCard";
import { TrialCountdown } from "./TrialCountdown";
import { PlanComparisonModal } from "./PlanComparisonModal";
import { UpgradeConfirmDialog } from "./UpgradeConfirmDialog";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export function SubscriptionPanel() {
  const { subscription, loading, refreshSubscription } = useSubscription();
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    planId: string;
    billingCycle: "monthly" | "semiannual" | "yearly";
  } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (loading || !subscription) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const plan = PLAN_CONFIG[subscription.planId];
  const isTrial = subscription.status === "trial";

  const handleSelectPlan = (planId: string, billingCycle: "monthly" | "semiannual" | "yearly") => {
    setSelectedPlan({ planId, billingCycle });
    setShowPlansModal(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);

    try {
      // 🔧 FIX: Obter token via Supabase Auth (método correto)
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsUpgrading(false);
        return;
      }

      const token = session.access_token;

      const planHierarchy = ["basico", "intermediario", "avancado", "ilimitado"];
      const currentIndex = planHierarchy.indexOf(subscription.planId);
      const newIndex = planHierarchy.indexOf(selectedPlan.planId);
      const isUpgrade = newIndex > currentIndex;

      const endpoint = isUpgrade ? "upgrade" : "downgrade";

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPlanId: selectedPlan.planId,
            billingCycle: selectedPlan.billingCycle,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${isUpgrade ? "Upgrade" : "Downgrade"} realizado com sucesso!`);
        await refreshSubscription();
        setShowConfirmDialog(false);
        setSelectedPlan(null);
      } else {
        toast.error(data.error || "Erro ao processar mudança de plano");
      }
    } catch (error) {
      console.error("Erro ao mudar plano:", error);
      toast.error("Erro ao processar mudança de plano");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelScheduledChange = async () => {
    try {
      // 🔧 FIX: Obter token via Supabase Auth (método correto)
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const token = session.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/cancel-scheduled-change`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Mudança de plano cancelada com sucesso!");
        await refreshSubscription();
      } else {
        toast.error(data.error || "Erro ao cancelar mudança");
      }
    } catch (error) {
      console.error("Erro ao cancelar mudança:", error);
      toast.error("Erro ao cancelar mudança");
    }
  };

  const handleManagePayment = async () => {
    try {
      // 🔧 FIX: Obter token via Supabase Auth (método correto)
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const token = session.access_token;

      toast.loading("Abrindo portal de pagamento...");

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/create-portal-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.portalUrl) {
        // Abrir portal em nova aba
        window.open(data.portalUrl, "_blank");
        toast.dismiss();
      } else {
        toast.error(data.error || "Erro ao abrir portal de pagamento");
      }
    } catch (error) {
      console.error("Erro ao abrir portal:", error);
      toast.error("Erro ao abrir portal de pagamento");
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Meu Plano</h1>
        <p className="text-gray-600">
          Gerencie sua assinatura e acompanhe o uso dos recursos
        </p>
      </div>

      {/* Trial Countdown */}
      {isTrial && subscription.trialEnd && (
        <div className="mb-6">
          <TrialCountdown
            trialEnd={subscription.trialEnd}
            onUpgradeClick={() => {
              // Navegar para ChangePlan via hash
              window.location.hash = 'changePlan';
            }}
          />
        </div>
      )}

      {/* Mudança Agendada */}
      {subscription.scheduledPlanChange && (
        <Card className="p-6 border-2 border-orange-500 bg-orange-50 mb-6">
          <div className="flex items-start gap-4">
            <Calendar className="size-6 text-orange-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-orange-900 mb-2">Mudança de Plano Agendada</h3>
              <p className="text-orange-700 text-sm mb-4">
                Seu plano será alterado para{" "}
                <strong className="capitalize">
                  {PLAN_CONFIG[subscription.scheduledPlanChange.newPlanId].name}
                </strong>{" "}
                em{" "}
                <strong>
                  {new Date(subscription.scheduledPlanChange.scheduledFor).toLocaleDateString("pt-BR")}
                </strong>
                .
              </p>
              <Button
                onClick={handleCancelScheduledChange}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-100"
              >
                Cancelar Mudança
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Plano Atual */}
      <Card className="p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-gray-900 capitalize">{plan.name}</h2>
              {isTrial && (
                <Badge className="bg-blue-600">Trial</Badge>
              )}
              {subscription.status === "active" && (
                <Badge className="bg-green-600">Ativo</Badge>
              )}
            </div>
            <p className="text-gray-600">{plan.description}</p>
          </div>
          
          {/* Botão de Gerenciar Pagamento (apenas se não estiver em trial) */}
          {!isTrial && (
            <Button
              onClick={handleManagePayment}
              variant="outline"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Gerenciar Pagamento
            </Button>
          )}
        </div>

        {/* Informações de Cobrança */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 mb-1">Ciclo de Cobrança</div>
            <div className="font-medium text-gray-900 capitalize">
              {subscription.billingCycle === "monthly" 
                ? "Mensal" 
                : subscription.billingCycle === "semiannual"
                ? "Semestral"
                : "Anual"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Período Atual</div>
            <div className="font-medium text-gray-900">
              {new Date(subscription.currentPeriodStart).toLocaleDateString("pt-BR")} -{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {isTrial ? "Trial Termina em" : "Próxima Cobrança"}
            </div>
            <div className="font-medium text-gray-900">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>
      </Card>

      {/* Uso de Recursos */}
      <div>
        <h2 className="text-gray-900 mb-4">Uso de Recursos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UsageProgressCard
            label="Pedidos de Venda/Mês"
            current={subscription.usage.salesOrders || 0}
            limit={null} 
            icon={<FileText className="size-5 text-gray-600" />}
            color="bg-blue-500"
          />
          <UsageProgressCard
            label="Pedidos de Compra/Mês"
            current={subscription.usage.purchaseOrders || 0}
            limit={null}
            icon={<Package className="size-5 text-gray-600" />}
            color="bg-purple-500"
          />
          <UsageProgressCard
            label="NF-e/Mês"
            current={subscription.usage.invoices || 0}
            limit={plan.limits.invoices}
            icon={<FileText className="size-5 text-gray-600" />}
            color="bg-orange-500"
          />
          <UsageProgressCard
            label="Transações/Mês"
            current={subscription.usage.transactions || 0}
            limit={plan.limits.transactions}
            icon={<TrendingUp className="size-5 text-gray-600" />}
            color="bg-pink-500"
          />
        </div>
      </div>

      {/* Modals */}
      <PlanComparisonModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlanId={subscription.planId}
        onSelectPlan={handleSelectPlan}
      />

      {selectedPlan && (
        <UpgradeConfirmDialog
          open={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setSelectedPlan(null);
          }}
          currentPlanId={subscription.planId}
          newPlanId={selectedPlan.planId as any}
          billingCycle={selectedPlan.billingCycle}
          onConfirm={handleConfirmUpgrade}
          isLoading={isUpgrading}
        />
      )}
    </div>
  );
}