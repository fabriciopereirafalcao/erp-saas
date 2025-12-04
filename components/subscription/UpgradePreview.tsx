import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
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
      <DialogContent className="max-w-2xl max-h-[85vh] p-4 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-blue-600" />
            Confirmar Upgrade de Plano
          </DialogTitle>
          <DialogDescription className="text-xs">
            Revise os detalhes do seu upgrade e o cálculo proporcional antes de confirmar
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
          {/* Mudança de Plano - ULTRA COMPACTO */}
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Plano Atual</p>
              <p className="font-semibold text-sm">{currentPlanData.name}</p>
              <Badge variant="secondary" className="mt-0.5 text-xs px-1.5 py-0">
                {getBillingCycleLabel(currentPlan.billingCycle)}
              </Badge>
            </div>
            <ArrowRight className="size-4 text-gray-400 mx-2" />
            <div className="text-right">
              <p className="text-xs text-gray-500">Novo Plano</p>
              <p className="font-semibold text-sm text-blue-600">{newPlanData.name}</p>
              <Badge variant="default" className="mt-0.5 text-xs px-1.5 py-0">
                {getBillingCycleLabel(newPlan.billingCycle)}
              </Badge>
            </div>
          </div>

          {/* Cálculo Detalhado - ULTRA COMPACTO */}
          <div className="border rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <CreditCard className="size-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1.5 text-xs">Cálculo Proporcional</h4>
                
                <div className="space-y-1 text-xs">
                  {/* Valor diário */}
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-gray-600 text-xs leading-tight">Valor diário atual:</span>
                    <span className="font-mono text-right text-xs leading-tight">
                      {formatCurrency(proration.dailyRate)}/dia
                    </span>
                  </div>

                  {/* Crédito não usado */}
                  <div className="flex justify-between gap-2 items-start text-green-600">
                    <span className="text-xs leading-tight">Crédito não usado:</span>
                    <span className="font-mono text-right text-xs leading-tight">
                      {proration.daysRemaining} dias = {formatCurrency(proration.unusedCredit)}
                    </span>
                  </div>

                  <Separator className="my-0.5" />

                  {/* Valor novo plano */}
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-gray-600 text-xs leading-tight">Novo plano ({getBillingCycleLabel(newPlan.billingCycle)}):</span>
                    <span className="font-mono text-right text-xs leading-tight">{formatCurrency(proration.newPrice)}</span>
                  </div>

                  {/* Desconto */}
                  <div className="flex justify-between gap-2 items-start text-green-600">
                    <span className="text-xs leading-tight">Crédito aplicado:</span>
                    <span className="font-mono text-right text-xs leading-tight">- {formatCurrency(proration.unusedCredit)}</span>
                  </div>

                  <Separator className="my-0.5" />

                  {/* Total a pagar */}
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-semibold text-xs">Total a pagar hoje:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(proration.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nova Validade - ULTRA COMPACTO */}
          <div className="border rounded-lg p-2.5 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-1.5">
              <Calendar className="size-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-semibold text-blue-900 mb-0.5 text-xs">Validade da Nova Licença</h4>
                <p className="text-xs text-blue-700 leading-tight">
                  <strong>{getBillingCycleLabel(newPlan.billingCycle)}</strong> - De{" "}
                  <strong>hoje</strong> até <strong>{formatDate(proration.newPeriodEnd)}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-0.5 leading-tight">
                  Novo período de {proration.newPeriodDays} dias
                </p>
              </div>
            </div>
          </div>

          {/* Aviso Importante - ULTRA COMPACTO */}
          <Alert className="bg-amber-50 border-amber-200 py-1.5 px-2.5">
            <Info className="h-3.5 w-3.5 text-amber-600" />
            <AlertTitle className="text-amber-900 text-xs mb-0.5">Importante:</AlertTitle>
            <AlertDescription className="text-amber-800 space-y-0 text-xs leading-tight">
              <p className="mb-0.5">• Pagamento <strong>imediato</strong> no cartão cadastrado</p>
              <p className="mb-0.5">• Plano atualizado após confirmação</p>
              <p>• Próxima cobrança: {new Date(proration.newPeriodEnd).toLocaleDateString("pt-BR")} - R$ {proration.newPrice.toFixed(2)}</p>
            </AlertDescription>
          </Alert>
        </div>

        {/* Botões - FIXOS NO RODAPÉ */}
        <div className="flex gap-2 pt-3 border-t flex-shrink-0 mt-3">
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-9 text-sm"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? "Processando..." : `Confirmar ${formatCurrency(proration.amountDue)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}