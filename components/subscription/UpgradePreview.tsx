import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Info, Calendar, CreditCard, ArrowRight } from "lucide-react";
import { PLANS } from "../../config/plans";
import { PlanTier } from "../../types/subscription";

interface UpgradePreviewProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: {
    planId: PlanTier;
    billingCycle: "monthly" | "semiannual" | "yearly";
    currentPeriodEnd?: string;
  };
  newPlan: {
    planId: PlanTier;
    billingCycle: "monthly" | "semiannual" | "yearly";
  };
  isProcessing: boolean;
}

export function UpgradePreview({
  open,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isProcessing,
}: UpgradePreviewProps) {
  // Calcular valores e crédito proporcional
  const calculateProration = () => {
    const currentPlanData = PLANS[currentPlan.planId];
    const newPlanData = PLANS[newPlan.planId];

    if (!currentPlanData || !newPlanData) {
      return null;
    }

    const currentPrice = currentPlanData.price[currentPlan.billingCycle];
    const newPrice = newPlanData.price[newPlan.billingCycle];

    // Calcular dias restantes no período atual
    let daysRemaining = 0;
    let totalDays = 30; // Default para mensal

    if (currentPlan.billingCycle === "monthly") {
      totalDays = 30;
    } else if (currentPlan.billingCycle === "semiannual") {
      totalDays = 180;
    } else if (currentPlan.billingCycle === "yearly") {
      totalDays = 365;
    }

    if (currentPlan.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(currentPlan.currentPeriodEnd);
      const diffTime = periodEnd.getTime() - now.getTime();
      // 🔧 FIX: Usar Math.floor para não arredondar para cima (30.1 dias = 30, não 31)
      daysRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      daysRemaining = totalDays; // Se não tem data, assume período completo
    }

    // Cálculos
    const dailyRate = currentPrice / totalDays;
    const unusedCredit = dailyRate * daysRemaining;
    const amountDue = newPrice - unusedCredit;

    // Nova data de vencimento (novo período de 30/180/365 dias a partir de hoje)
    const today = new Date();
    let newPeriodDays = 30;
    if (newPlan.billingCycle === "monthly") {
      newPeriodDays = 30;
    } else if (newPlan.billingCycle === "semiannual") {
      newPeriodDays = 180;
    } else if (newPlan.billingCycle === "yearly") {
      newPeriodDays = 365;
    }

    const newPeriodEnd = new Date(today);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + newPeriodDays);

    return {
      currentPrice,
      newPrice,
      daysRemaining,
      totalDays,
      dailyRate,
      unusedCredit,
      amountDue: Math.max(0, amountDue), // Nunca negativo
      newPeriodEnd,
      newPeriodDays,
    };
  };

  const proration = calculateProration();
  const currentPlanData = PLANS[currentPlan.planId];
  const newPlanData = PLANS[newPlan.planId];

  if (!proration || !currentPlanData || !newPlanData) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  };

  const getBillingCycleLabel = (cycle: string) => {
    const labels = {
      monthly: "Mensal",
      semiannual: "Semestral",
      yearly: "Anual",
    };
    return labels[cycle as keyof typeof labels] || cycle;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-5 text-blue-600" />
            Confirmar Upgrade de Plano
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes do seu upgrade e o cálculo proporcional antes de confirmar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mudança de Plano */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Plano Atual</p>
              <p className="font-semibold">{currentPlanData.name}</p>
              <Badge variant="secondary" className="mt-1">
                {getBillingCycleLabel(currentPlan.billingCycle)}
              </Badge>
            </div>
            <ArrowRight className="size-5 text-gray-400" />
            <div className="text-right">
              <p className="text-sm text-gray-600">Novo Plano</p>
              <p className="font-semibold text-blue-600">{newPlanData.name}</p>
              <Badge variant="default" className="mt-1">
                {getBillingCycleLabel(newPlan.billingCycle)}
              </Badge>
            </div>
          </div>

          {/* Cálculo Detalhado */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CreditCard className="size-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold mb-3">Cálculo Proporcional</h4>
                
                <div className="space-y-2 text-sm">
                  {/* Valor diário */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor diário do plano atual:</span>
                    <span className="font-mono">
                      {formatCurrency(proration.currentPrice)} ÷ {proration.totalDays} dias = {formatCurrency(proration.dailyRate)}/dia
                    </span>
                  </div>

                  {/* Crédito não usado */}
                  <div className="flex justify-between text-green-600">
                    <span>Crédito não usado:</span>
                    <span className="font-mono">
                      {proration.daysRemaining} dias × {formatCurrency(proration.dailyRate)} = {formatCurrency(proration.unusedCredit)}
                    </span>
                  </div>

                  <Separator />

                  {/* Valor novo plano */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor do novo plano ({getBillingCycleLabel(newPlan.billingCycle)}):</span>
                    <span className="font-mono">{formatCurrency(proration.newPrice)}</span>
                  </div>

                  {/* Desconto */}
                  <div className="flex justify-between text-green-600">
                    <span>Desconto (crédito aplicado):</span>
                    <span className="font-mono">- {formatCurrency(proration.unusedCredit)}</span>
                  </div>

                  <Separator />

                  {/* Total a pagar */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-lg">Total a pagar hoje:</span>
                    <span className="font-bold text-2xl text-blue-600">
                      {formatCurrency(proration.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nova Validade */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-2">
              <Calendar className="size-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Validade da Nova Licença</h4>
                <p className="text-sm text-blue-700">
                  <strong>{getBillingCycleLabel(newPlan.billingCycle)}</strong> - De{" "}
                  <strong>hoje</strong> até <strong>{formatDate(proration.newPeriodEnd)}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Um novo período de {proration.newPeriodDays} dias será iniciado
                </p>
              </div>
            </div>
          </div>

          {/* Alert informativo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>O pagamento será processado imediatamente</li>
                  <li>Seu plano será atualizado após a confirmação do pagamento</li>
                  <li>A próxima cobrança será em {formatDate(proration.newPeriodEnd)} no valor de {formatCurrency(proration.newPrice)}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? "Processando..." : `Confirmar e Pagar ${formatCurrency(proration.amountDue)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}