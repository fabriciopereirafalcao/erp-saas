import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Check, X, Zap, ArrowRight, Info } from "lucide-react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { PLANS } from "../../config/plans";
import { PlanTier } from "../../types/subscription";
import { toast } from "sonner";
import { projectId } from "../../utils/supabase/info";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../ui/alert";

export function ChangePlan() {
  const { subscription, loading, refreshSubscription } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semiannual" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<{
    planId: PlanTier;
    billingCycle: "monthly" | "semiannual" | "yearly";
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (loading || !subscription) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const currentPlanId = subscription.planId;
  const isTrial = subscription.status === "trial";
  
  const planHierarchy: PlanTier[] = ["basico", "intermediario", "avancado", "ilimitado"];
  const currentIndex = planHierarchy.indexOf(currentPlanId as PlanTier);

  const isDowngrade = (targetPlanId: PlanTier) => {
    const targetIndex = planHierarchy.indexOf(targetPlanId);
    return targetIndex < currentIndex && !isTrial;
  };

  const isUpgrade = (targetPlanId: PlanTier) => {
    const targetIndex = planHierarchy.indexOf(targetPlanId);
    return targetIndex > currentIndex || isTrial;
  };

  const handleSelectPlan = (planId: PlanTier, billingCycle: "monthly" | "semiannual" | "yearly") => {
    setSelectedPlan({ planId, billingCycle });
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    try {
      const token = localStorage.getItem("sb-access-token");
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const willBeDowngrade = isDowngrade(selectedPlan.planId);
      const endpoint = willBeDowngrade ? "downgrade" : "upgrade";

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
        if (willBeDowngrade) {
          toast.success(
            "Downgrade agendado! Será efetivado no próximo período de cobrança."
          );
        } else {
          toast.success("Upgrade realizado com sucesso! Mudanças já estão ativas.");
        }
        await refreshSubscription();
        setSelectedPlan(null);
      } else {
        toast.error(data.error || "Erro ao processar mudança de plano");
      }
    } catch (error) {
      console.error("Erro ao mudar plano:", error);
      toast.error("Erro ao processar mudança de plano");
    } finally {
      setIsProcessing(false);
    }
  };

  const plans: PlanTier[] = ["basico", "intermediario", "avancado", "ilimitado"];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Alterar Plano</h1>
        <p className="text-gray-600">
          Compare os planos e escolha o melhor para sua empresa
        </p>
      </div>

      {/* Toggle de Ciclo de Cobrança */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant={billingCycle === "monthly" ? "default" : "outline"}
          onClick={() => setBillingCycle("monthly")}
          className="min-w-[120px]"
        >
          Mensal
        </Button>
        <Button
          variant={billingCycle === "semiannual" ? "default" : "outline"}
          onClick={() => setBillingCycle("semiannual")}
          className="min-w-[120px]"
        >
          Semestral
          <Badge className="ml-2 bg-green-600">-10%</Badge>
        </Button>
        <Button
          variant={billingCycle === "yearly" ? "default" : "outline"}
          onClick={() => setBillingCycle("yearly")}
          className="min-w-[120px]"
        >
          Anual
          <Badge className="ml-2 bg-green-600">-20%</Badge>
        </Button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((planId) => {
          const plan = PLANS[planId];
          const isCurrentPlan = planId === currentPlanId && !isTrial;
          const isSelected = selectedPlan?.planId === planId;
          const willBeUpgrade = isUpgrade(planId);
          const willBeDowngrade = isDowngrade(planId);
          const price = billingCycle === "monthly" ? plan.price.monthly : billingCycle === "semiannual" ? plan.price.semiannual : plan.price.yearly;

          return (
            <Card
              key={planId}
              className={`p-6 relative ${
                isSelected
                  ? "border-2 border-green-500 shadow-lg"
                  : isCurrentPlan
                  ? "border-2 border-blue-500"
                  : "border border-gray-200"
              }`}
            >
              {/* Badge Plano Atual */}
              {isCurrentPlan && (
                <Badge className="absolute top-4 right-4 bg-blue-600">
                  Plano Atual
                </Badge>
              )}

              {/* Header do Card */}
              <div className="mb-6">
                <h3 className="text-xl capitalize mb-2 text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl text-gray-900">
                    {price === 0 ? "Grátis" : `R$ ${price.toFixed(2)}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-600">
                      /{billingCycle === "monthly" ? "mês" : billingCycle === "semiannual" ? "6 meses" : "ano"}
                    </span>
                  )}
                </div>
                {billingCycle !== "monthly" && price > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500 line-through">
                      R$ {billingCycle === "semiannual" ? (plan.price.monthly * 6).toFixed(2) : (plan.price.monthly * 12).toFixed(2)}
                    </span>
                    <span className="ml-2 text-sm text-green-600">
                      Economize {billingCycle === "semiannual" ? "10%" : "20%"}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxInvoices >= 999999 ? "Ilimitado" : plan.limits.maxInvoices}
                    </strong>{" "}
                    NF-e/mês
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxTransactions >= 999999 ? "Ilimitado" : plan.limits.maxTransactions}
                    </strong>{" "}
                    Transações/mês
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxUsers >= 999999 ? "Ilimitado" : plan.limits.maxUsers}
                    </strong>{" "}
                    {plan.limits.maxUsers === 1 ? "Usuário" : "Usuários"}
                  </span>
                </li>
                {plan.limits.maxUsers > 1 ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Multi-usuário</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Multi-usuário</span>
                  </li>
                )}
                {plan.limits.features.advancedReports ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Relatórios Avançados</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Relatórios Avançados</span>
                  </li>
                )}
                {plan.limits.features.apiAccess ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Acesso API</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Acesso API</span>
                  </li>
                )}
                {plan.limits.features.prioritySupport && (
                  <li className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Suporte Prioritário</span>
                  </li>
                )}
              </ul>

              {/* Botão de Ação */}
              {isCurrentPlan ? (
                <Button disabled className="w-full">
                  Plano Atual
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelectPlan(planId, billingCycle)}
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                >
                  {isSelected ? "Selecionado" : "Contratar"}
                </Button>
              )}

              {/* Badge de tipo de mudança */}
              {!isCurrentPlan && (
                <div className="mt-3 text-center">
                  {willBeUpgrade ? (
                    <Badge className="bg-green-600">Efeito Imediato</Badge>
                  ) : (
                    <Badge className="bg-orange-600">Agendado</Badge>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Área de Confirmação */}
      {selectedPlan && (
        <Card className="p-6 bg-green-50 border-2 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-green-900 mb-2">
                {isDowngrade(selectedPlan.planId) ? "Confirmar Downgrade" : "Confirmar Upgrade"}
              </h3>
              <p className="text-green-700 text-sm">
                Você está alterando para o plano{" "}
                <strong className="capitalize">{PLANS[selectedPlan.planId].name}</strong> (
                {selectedPlan.billingCycle === "monthly" ? "Mensal" : selectedPlan.billingCycle === "semiannual" ? "Semestral" : "Anual"}).
                {isDowngrade(selectedPlan.planId)
                  ? " A mudança será efetivada no próximo período de cobrança."
                  : " A mudança será aplicada imediatamente."}
              </p>
            </div>
            <div className="flex gap-3 ml-6">
              <Button
                variant="outline"
                onClick={() => setSelectedPlan(null)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmChange}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? "Processando..." : "Confirmar"}
                {!isProcessing && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}