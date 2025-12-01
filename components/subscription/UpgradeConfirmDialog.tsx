import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { CheckCircle2, ArrowRight, Calendar } from "lucide-react";
import { PLAN_CONFIG, PlanId } from "../../lib/plans";

interface UpgradeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  currentPlanId: PlanId;
  newPlanId: PlanId;
  billingCycle: "monthly" | "yearly";
  onConfirm: () => void;
  isLoading?: boolean;
}

export function UpgradeConfirmDialog({
  open,
  onClose,
  currentPlanId,
  newPlanId,
  billingCycle,
  onConfirm,
  isLoading = false,
}: UpgradeConfirmDialogProps) {
  const currentPlan = PLAN_CONFIG[currentPlanId];
  const newPlan = PLAN_CONFIG[newPlanId];

  const prices = {
    basico: { monthly: 49.90, yearly: 499.00 },
    intermediario: { monthly: 99.90, yearly: 999.00 },
    avancado: { monthly: 199.90, yearly: 1999.00 },
    ilimitado: { monthly: 399.90, yearly: 3999.00 },
  };

  const newPrice = prices[newPlanId][billingCycle];

  const planHierarchy = ["basico", "intermediario", "avancado", "ilimitado"];
  const isUpgrade = planHierarchy.indexOf(newPlanId) > planHierarchy.indexOf(currentPlanId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isUpgrade ? "Confirmar Upgrade" : "Confirmar Downgrade"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mudança de Plano */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">Plano Atual</div>
              <div className="font-bold text-gray-900 capitalize">{currentPlan.name}</div>
            </div>
            <ArrowRight className="size-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-600 mb-1">Novo Plano</div>
              <div className="font-bold text-green-600 capitalize">{newPlan.name}</div>
            </div>
          </div>

          {/* Valor */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">Valor</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {newPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Cobrança {billingCycle === "monthly" ? "mensal" : "anual"}
            </div>
          </div>

          {/* Recursos Inclusos */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-blue-600" />
              Recursos Inclusos
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                {newPlan.limits.users === null ? "Usuários ilimitados" : `Até ${newPlan.limits.users} usuários`}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                {newPlan.limits.products === null ? "Produtos ilimitados" : `Até ${newPlan.limits.products} produtos`}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                {newPlan.limits.invoices === null ? "NF-e ilimitadas/mês" : `${newPlan.limits.invoices} NF-e/mês`}
              </li>
              {newPlan.features.fiscalModule && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Faturamento Fiscal Completo
                </li>
              )}
              {newPlan.features.financialModule && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Módulo Financeiro
                </li>
              )}
              {newPlan.features.advancedReports && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Relatórios Avançados
                </li>
              )}
            </ul>
          </div>

          {/* Informações de Downgrade */}
          {!isUpgrade && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Calendar className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Atenção:</p>
                  <p>
                    O downgrade será efetivado apenas no final do período atual de cobrança.
                    Você continuará tendo acesso aos recursos do plano atual até lá.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={isUpgrade ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isLoading ? "Processando..." : isUpgrade ? "Confirmar Upgrade" : "Confirmar Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
