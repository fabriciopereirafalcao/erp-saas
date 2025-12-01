/* =========================================================================
 * UPGRADE DIALOG - DIALOG PROFISSIONAL PARA UPGRADE DE PLANO
 * ========================================================================= */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Crown, Zap, Shield, TrendingUp, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { PlanTier } from "../types/subscription";
import { PLANS, getPlan, formatPrice } from "../config/plans";
import { useNavigate } from "react-router-dom";

/* =========================================================================
 * COMPONENTE PRINCIPAL
 * ========================================================================= */

export function UpgradeDialog() {
  const { upgradeDialogState, closeUpgradeDialog, subscription } = useSubscription();
  const navigate = useNavigate();

  if (!subscription) return null;

  const currentPlan = getPlan(subscription.planId);
  const { isOpen, reason, requiredPlan } = upgradeDialogState;

  // Determinar plano recomendado
  const suggestedPlan = requiredPlan ? getPlan(requiredPlan) : getRecommendedPlan(reason);

  const handleUpgrade = () => {
    closeUpgradeDialog();
    // Navegar para página de planos
    navigate("/configuracoes");
    // Pequeno delay para garantir navegação
    setTimeout(() => {
      // Tentar abrir tab de planos programaticamente se possível
      const billingTab = document.querySelector('[value="plano"]');
      if (billingTab instanceof HTMLElement) {
        billingTab.click();
      }
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeUpgradeDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-amber-500" />
            <DialogTitle>Upgrade Necessário</DialogTitle>
          </div>
          <DialogDescription>
            {reason}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* COMPARAÇÃO DE PLANOS */}
          <div className="grid grid-cols-2 gap-4">
            {/* PLANO ATUAL */}
            <Card className="p-4 border-2">
              <div className="text-center mb-3">
                <Badge variant="outline" className="mb-2">
                  Plano Atual
                </Badge>
                <h4>{currentPlan.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(currentPlan.price.monthly)}/mês
                </p>
              </div>
              <Separator className="my-3" />
              <ul className="space-y-2">
                {getKeyFeatures(currentPlan).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    {feature.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={!feature.available ? "text-muted-foreground" : ""}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* PLANO SUGERIDO */}
            <Card className="p-4 border-2 border-primary bg-primary/5">
              <div className="text-center mb-3">
                <Badge className="mb-2">
                  Plano Recomendado
                </Badge>
                <h4>{suggestedPlan.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(suggestedPlan.price.monthly)}/mês
                </p>
                {suggestedPlan.discount?.yearly && (
                  <p className="text-xs text-green-600 mt-1">
                    Economize {suggestedPlan.discount.yearly}% no plano anual
                  </p>
                )}
              </div>
              <Separator className="my-3" />
              <ul className="space-y-2">
                {getKeyFeatures(suggestedPlan).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    {feature.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={!feature.available ? "text-muted-foreground" : "font-medium"}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* BENEFÍCIOS DO UPGRADE */}
          <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <h4 className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              Benefícios do Upgrade
            </h4>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {getUpgradeBenefits(currentPlan.id, suggestedPlan.id).map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-amber-600" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* ACTIONS */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeUpgradeDialog} className="flex-1">
              Agora Não
            </Button>
            <Button onClick={handleUpgrade} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />
              Ver Planos e Fazer Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
 * FUNÇÕES AUXILIARES
 * ========================================================================= */

function getKeyFeatures(plan: any) {
  return [
    {
      label: plan.limits.maxUsers >= 99999 ? "Usuários ilimitados" : `${plan.limits.maxUsers} usuário${plan.limits.maxUsers > 1 ? 's' : ''}`,
      available: true,
    },
    {
      label: plan.limits.features.fiscalModule ? `NF-e (${plan.limits.maxInvoices >= 99999 ? '∞' : plan.limits.maxInvoices}/mês)` : "Sem NF-e",
      available: plan.limits.features.fiscalModule,
    },
    {
      label: plan.limits.maxTransactions > 0 ? `Transações (${plan.limits.maxTransactions >= 99999 ? '∞' : plan.limits.maxTransactions}/mês)` : "Sem transações",
      available: plan.limits.maxTransactions > 0,
    },
    {
      label: "Contas a pagar/receber",
      available: plan.id === 'avancado' || plan.id === 'ilimitado',
    },
    {
      label: "Fluxo de caixa",
      available: plan.id === 'avancado' || plan.id === 'ilimitado',
    },
    {
      label: plan.limits.features.apiAccess ? "API REST" : "Sem API",
      available: plan.limits.features.apiAccess,
    },
  ];
}

function getUpgradeBenefits(fromPlan: PlanTier, toPlan: PlanTier): string[] {
  const benefits: string[] = [];

  const from = getPlan(fromPlan);
  const to = getPlan(toPlan);

  // Usuários
  if (to.limits.maxUsers > from.limits.maxUsers) {
    benefits.push(
      to.limits.maxUsers >= 99999
        ? "Usuários ilimitados"
        : `Até ${to.limits.maxUsers} usuários`
    );
  }

  // NF-e
  if (to.limits.features.fiscalModule && !from.limits.features.fiscalModule) {
    benefits.push("Emissão de NF-e");
  } else if (to.limits.maxInvoices > from.limits.maxInvoices) {
    benefits.push(
      to.limits.maxInvoices >= 99999
        ? "NF-e ilimitadas"
        : `${to.limits.maxInvoices} NF-es/mês`
    );
  }

  // Transações
  if (to.limits.maxTransactions > from.limits.maxTransactions) {
    benefits.push(
      to.limits.maxTransactions >= 99999
        ? "Transações ilimitadas"
        : `${to.limits.maxTransactions} transações/mês`
    );
  }

  // Módulos financeiros
  if ((toPlan === 'avancado' || toPlan === 'ilimitado') && fromPlan !== 'avancado' && fromPlan !== 'ilimitado') {
    benefits.push("Contas a pagar/receber");
    benefits.push("Conciliações bancárias");
    benefits.push("Fluxo de caixa");
  }

  // API
  if (to.limits.features.apiAccess && !from.limits.features.apiAccess) {
    benefits.push("API REST completa");
  }

  // Storage
  if (to.limits.maxStorageMB > from.limits.maxStorageMB) {
    benefits.push(`${(to.limits.maxStorageMB / 1024).toFixed(0)} GB de armazenamento`);
  }

  return benefits;
}

function getRecommendedPlan(reason: string): any {
  // Lógica para determinar plano recomendado baseado na razão
  
  if (reason.includes("NF-e") || reason.includes("fiscal")) {
    return PLANS.intermediario;
  }
  
  if (reason.includes("transações") || reason.includes("financeiro")) {
    return PLANS.intermediario;
  }
  
  if (reason.includes("contas a pagar") || reason.includes("contas a receber") || 
      reason.includes("conciliação") || reason.includes("fluxo de caixa")) {
    return PLANS.avancado;
  }
  
  if (reason.includes("usuário")) {
    return PLANS.intermediario;
  }
  
  if (reason.includes("API") || reason.includes("integração")) {
    return PLANS.avancado;
  }

  // Default: intermediário
  return PLANS.intermediario;
}
