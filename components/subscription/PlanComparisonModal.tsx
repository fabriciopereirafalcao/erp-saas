import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Check, X, Sparkles } from "lucide-react";
import { PLAN_CONFIG, PlanId } from "../../lib/plans";
import { cn } from "../../lib/utils";

interface PlanComparisonModalProps {
  open: boolean;
  onClose: () => void;
  currentPlanId: PlanId;
  onSelectPlan: (planId: PlanId, billingCycle: "monthly" | "yearly") => void;
}

export function PlanComparisonModal({
  open,
  onClose,
  currentPlanId,
  onSelectPlan,
}: PlanComparisonModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans: PlanId[] = ["basico", "intermediario", "avancado", "ilimitado"];

  const features = [
    { key: "users", label: "Usuários" },
    { key: "products", label: "Produtos" },
    { key: "customers", label: "Clientes" },
    { key: "suppliers", label: "Fornecedores" },
    { key: "invoices", label: "NF-e/Mês" },
    { key: "transactions", label: "Transações/Mês" },
    { key: "inventory", label: "Gestão de Estoque" },
    { key: "sales", label: "Vendas" },
    { key: "purchases", label: "Compras" },
    { key: "nfe", label: "Faturamento Fiscal" },
    { key: "financial", label: "Financeiro" },
    { key: "reports", label: "Relatórios" },
  ];

  const formatLimit = (limit: number | null) => {
    if (limit === null) return <Check className="size-5 text-green-600" />;
    return limit.toLocaleString();
  };

  const getFeatureValue = (planId: PlanId, featureKey: string) => {
    const plan = PLAN_CONFIG[planId];
    const limits = plan.limits;

    switch (featureKey) {
      case "users":
        return formatLimit(limits.users);
      case "products":
        return formatLimit(limits.products);
      case "customers":
        return formatLimit(limits.customers);
      case "suppliers":
        return formatLimit(limits.suppliers);
      case "invoices":
        return formatLimit(limits.invoices);
      case "transactions":
        return formatLimit(limits.transactions);
      case "inventory":
      case "sales":
      case "purchases":
        return plan.features.basicModules ? (
          <Check className="size-5 text-green-600" />
        ) : (
          <X className="size-5 text-gray-400" />
        );
      case "nfe":
        return plan.features.fiscalModule ? (
          <Check className="size-5 text-green-600" />
        ) : (
          <X className="size-5 text-gray-400" />
        );
      case "financial":
        return plan.features.financialModule ? (
          <Check className="size-5 text-green-600" />
        ) : (
          <X className="size-5 text-gray-400" />
        );
      case "reports":
        return plan.features.advancedReports ? (
          <Check className="size-5 text-green-600" />
        ) : (
          <X className="size-5 text-gray-400" />
        );
      default:
        return "-";
    }
  };

  const getPlanPrice = (planId: PlanId) => {
    const prices = {
      basico: { monthly: 49.90, yearly: 499.00 },
      intermediario: { monthly: 99.90, yearly: 999.00 },
      avancado: { monthly: 199.90, yearly: 1999.00 },
      ilimitado: { monthly: 399.90, yearly: 3999.00 },
    };

    return prices[planId][billingCycle];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Compare os Planos</DialogTitle>
        </DialogHeader>

        {/* Toggle de Ciclo de Cobrança */}
        <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <Button
            variant={billingCycle === "monthly" ? "default" : "outline"}
            onClick={() => setBillingCycle("monthly")}
            className="min-w-[120px]"
          >
            Mensal
          </Button>
          <Button
            variant={billingCycle === "yearly" ? "default" : "outline"}
            onClick={() => setBillingCycle("yearly")}
            className="min-w-[120px]"
          >
            Anual
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded">
              -17%
            </span>
          </Button>
        </div>

        {/* Tabela de Comparação */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="p-4 text-left text-gray-600">Recursos</th>
                {plans.map((planId) => {
                  const isCurrentPlan = planId === currentPlanId;
                  const isRecommended = planId === "intermediario";

                  return (
                    <th
                      key={planId}
                      className={cn(
                        "p-4 text-center relative",
                        isCurrentPlan && "bg-blue-50"
                      )}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs rounded-full flex items-center gap-1">
                            <Sparkles className="size-3" />
                            Recomendado
                          </span>
                        </div>
                      )}
                      <div className="text-lg font-bold text-gray-900 capitalize mb-1">
                        {PLAN_CONFIG[planId].name}
                      </div>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        R$ {getPlanPrice(planId).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {billingCycle === "monthly" ? "/mês" : "/ano"}
                      </div>
                      {isCurrentPlan && (
                        <div className="mt-2">
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                            Plano Atual
                          </span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.key}
                  className={cn(
                    "border-b border-gray-200",
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  )}
                >
                  <td className="p-4 text-gray-700">{feature.label}</td>
                  {plans.map((planId) => (
                    <td
                      key={planId}
                      className={cn(
                        "p-4 text-center",
                        planId === currentPlanId && "bg-blue-50"
                      )}
                    >
                      {getFeatureValue(planId, feature.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4"></td>
                {plans.map((planId) => {
                  const isCurrentPlan = planId === currentPlanId;
                  const planHierarchy = ["basico", "intermediario", "avancado", "ilimitado"];
                  const currentIndex = planHierarchy.indexOf(currentPlanId);
                  const planIndex = planHierarchy.indexOf(planId);
                  const isUpgrade = planIndex > currentIndex;

                  return (
                    <td
                      key={planId}
                      className={cn(
                        "p-4 text-center",
                        isCurrentPlan && "bg-blue-50"
                      )}
                    >
                      {isCurrentPlan ? (
                        <Button variant="outline" disabled className="w-full">
                          Plano Atual
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          onClick={() => onSelectPlan(planId, billingCycle)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Fazer Upgrade
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onSelectPlan(planId, billingCycle)}
                          variant="outline"
                          className="w-full"
                        >
                          Fazer Downgrade
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
