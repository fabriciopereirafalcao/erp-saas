/**
 * PLAN ACCESS GUARD
 * 
 * Componente de proteção que verifica:
 * 1. Trial expirado
 * 2. Plano não-recorrente (PIX/Boleto) expirado
 * 3. Plano cancelado/expirado
 * 
 * Se detectar qualquer situação de bloqueio, exibe tela apropriada.
 */

import { useSubscription } from "../../contexts/SubscriptionContext";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { AlertCircle, CreditCard, Clock, CheckCircle, Calendar } from "lucide-react";

interface PlanAccessGuardProps {
  children: React.ReactNode;
  currentView: string;
  onNavigateToPlans: () => void;
}

type BlockReason = 
  | "trial_expired" 
  | "plan_expired" 
  | "plan_canceled" 
  | "no_subscription";

export function PlanAccessGuard({ 
  children, 
  currentView,
  onNavigateToPlans 
}: PlanAccessGuardProps) {
  const { subscription, loading } = useSubscription();

  // Views que são SEMPRE permitidas (mesmo com bloqueio)
  const allowedViews: string[] = [
    "billing",
    "myPlan", 
    "changePlan",
    "checkoutSuccess",
    "checkoutCancel",
    "profile",
  ];

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não tem subscription, permitir (será tratado por outro guard)
  if (!subscription) {
    return <>{children}</>;
  }

  // Verificar se está na view permitida
  const isAllowedView = allowedViews.includes(currentView);

  // Se está em view permitida, sempre liberar
  if (isAllowedView) {
    return <>{children}</>;
  }

  // ============================================
  // VERIFICAÇÃO 1: TRIAL EXPIRADO
  // ============================================
  const checkTrialExpired = (): boolean => {
    if (subscription.status !== "trial") {
      return false; // Não está em trial
    }

    if (!subscription.trialEndDate) {
      return false; // Sem data de fim de trial
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);

    return now > trialEnd; // Trial expirou
  };

  if (checkTrialExpired()) {
    console.warn("🚫 [PLAN GUARD] Trial expirado. Bloqueando acesso.");
    return <BlockedScreen 
      reason="trial_expired"
      subscription={subscription}
      onNavigateToPlans={onNavigateToPlans}
    />;
  }

  // ============================================
  // VERIFICAÇÃO 2: PLANO NÃO-RECORRENTE EXPIRADO (PIX/Boleto)
  // ============================================
  const checkPlanExpired = (): boolean => {
    // Só verifica se o plano NÃO é recorrente
    if (subscription.isRecurring !== false) {
      return false; // Plano recorrente não expira dessa forma
    }

    if (!subscription.currentPeriodEnd) {
      return false; // Sem data de fim
    }

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);

    return now > periodEnd; // Período expirou
  };

  if (checkPlanExpired()) {
    console.warn("🚫 [PLAN GUARD] Plano não-recorrente expirado. Bloqueando acesso.");
    return <BlockedScreen 
      reason="plan_expired"
      subscription={subscription}
      onNavigateToPlans={onNavigateToPlans}
    />;
  }

  // ============================================
  // VERIFICAÇÃO 3: PLANO CANCELADO/EXPIRADO
  // ============================================
  if (subscription.status === "expired" || subscription.status === "canceled") {
    console.warn("🚫 [PLAN GUARD] Plano cancelado/expirado. Bloqueando acesso.");
    return <BlockedScreen 
      reason="plan_canceled"
      subscription={subscription}
      onNavigateToPlans={onNavigateToPlans}
    />;
  }

  // ✅ Acesso permitido
  return <>{children}</>;
}

/* =========================================================================
 * COMPONENTE: BLOCKED SCREEN
 * Tela de bloqueio com mensagens diferentes por motivo
 * ========================================================================= */

interface BlockedScreenProps {
  reason: BlockReason;
  subscription: any;
  onNavigateToPlans: () => void;
}

function BlockedScreen({ reason, subscription, onNavigateToPlans }: BlockedScreenProps) {
  // Configuração da mensagem por motivo
  const config = getBlockConfig(reason, subscription);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${config.iconBg}`}>
            {config.icon}
          </div>
          <h1 className="text-3xl text-gray-900 mb-2">
            {config.title}
          </h1>
          <p className="text-gray-600">
            {config.description}
          </p>
        </div>

        {/* Alertas */}
        <div className="space-y-4 mb-8">
          {/* Alerta Principal */}
          <Alert className={config.alertClass}>
            {config.alertIcon}
            <AlertTitle className={config.alertTitleClass}>{config.alertTitle}</AlertTitle>
            <AlertDescription className={config.alertDescClass}>
              {config.alertDescription}
            </AlertDescription>
          </Alert>

          {/* Informações do Plano/Trial */}
          {config.showPlanInfo && (
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {config.expirationDate && (
                  <div>
                    <span className="text-gray-600">Data de Expiração:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(config.expirationDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
                {subscription.planId && (
                  <div>
                    <span className="text-gray-600">Plano:</span>
                    <p className="font-semibold text-gray-900 capitalize">
                      {subscription.planId}
                    </p>
                  </div>
                )}
                {subscription.paymentMethod && (
                  <div>
                    <span className="text-gray-600">Método de Pagamento:</span>
                    <p className="font-semibold text-gray-900 uppercase">
                      {subscription.paymentMethod}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Benefícios */}
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Benefícios ao Contratar</AlertTitle>
            <AlertDescription className="text-blue-800 space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Acesso completo a todos os módulos do ERP</li>
                <li>Emissão ilimitada de NF-e (dependendo do plano)</li>
                <li>Suporte técnico prioritário</li>
                <li>Relatórios avançados e análises</li>
                <li>Integração com sistemas externos via API</li>
                <li>Backup automático dos seus dados</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        {/* Call to Action */}
        <div className="space-y-3">
          <Button 
            className="w-full gap-2 h-12 text-lg" 
            onClick={onNavigateToPlans}
          >
            <CreditCard className="w-5 h-5" />
            {config.ctaText}
          </Button>

          <p className="text-center text-sm text-gray-500">
            {config.ctaSubtext}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Precisa de ajuda? Entre em contato com nosso{" "}
            <a 
              href="mailto:suporte@metaerp.com.br" 
              className="text-blue-600 hover:underline"
            >
              suporte técnico
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
 * FUNÇÃO: getBlockConfig
 * Retorna configuração de mensagem por motivo de bloqueio
 * ========================================================================= */

function getBlockConfig(reason: BlockReason, subscription: any) {
  switch (reason) {
    case "trial_expired":
      return {
        icon: <AlertCircle className="w-8 h-8 text-orange-600" />,
        iconBg: "bg-orange-100",
        title: "Período de Teste Encerrado",
        description: `Seu período de teste gratuito terminou em ${
          subscription.trialEndDate 
            ? new Date(subscription.trialEndDate).toLocaleDateString("pt-BR")
            : "data desconhecida"
        }`,
        alertClass: "bg-orange-50 border-orange-200",
        alertIcon: <Clock className="h-4 w-4 text-orange-600" />,
        alertTitle: "Acesso Limitado",
        alertTitleClass: "text-orange-900",
        alertDescription: "Para continuar usando o sistema ERP, você precisa contratar um plano pago. Escolha o plano ideal para sua empresa e tenha acesso imediato a todas as funcionalidades.",
        alertDescClass: "text-orange-800",
        showPlanInfo: true,
        expirationDate: subscription.trialEndDate,
        ctaText: "Ver Planos e Contratar",
        ctaSubtext: "Escolha entre planos mensais, semestrais ou anuais com descontos especiais",
      };

    case "plan_expired":
      return {
        icon: <Calendar className="w-8 h-8 text-red-600" />,
        iconBg: "bg-red-100",
        title: "O período do seu plano acabou",
        description: "Contrate novamente para continuar usando o sistema ERP.",
        alertClass: "bg-red-50 border-red-200",
        alertIcon: <AlertCircle className="h-4 w-4 text-red-600" />,
        alertTitle: "Plano Expirado",
        alertTitleClass: "text-red-900",
        alertDescription: `Seu plano ${subscription.paymentMethod?.toUpperCase()} expirou. Como este é um plano de pagamento único (não recorrente), você precisa fazer uma nova contratação para continuar usando o sistema.`,
        alertDescClass: "text-red-800",
        showPlanInfo: true,
        expirationDate: subscription.currentPeriodEnd,
        ctaText: "Contratar Novo Plano",
        ctaSubtext: "Escolha PIX para ativação instantânea ou Cartão para renovação automática",
      };

    case "plan_canceled":
      return {
        icon: <AlertCircle className="w-8 h-8 text-red-600" />,
        iconBg: "bg-red-100",
        title: "Plano Cancelado",
        description: "Seu plano foi cancelado. Contrate novamente para continuar.",
        alertClass: "bg-red-50 border-red-200",
        alertIcon: <AlertCircle className="h-4 w-4 text-red-600" />,
        alertTitle: "Acesso Bloqueado",
        alertTitleClass: "text-red-900",
        alertDescription: "Seu plano foi cancelado. Para voltar a usar o sistema, escolha um novo plano.",
        alertDescClass: "text-red-800",
        showPlanInfo: true,
        expirationDate: subscription.canceledAt,
        ctaText: "Reativar Assinatura",
        ctaSubtext: "Escolha um plano e volte a usar todas as funcionalidades",
      };

    default:
      return {
        icon: <AlertCircle className="w-8 h-8 text-gray-600" />,
        iconBg: "bg-gray-100",
        title: "Acesso Restrito",
        description: "Você precisa de um plano ativo para acessar o sistema.",
        alertClass: "bg-gray-50 border-gray-200",
        alertIcon: <AlertCircle className="h-4 w-4 text-gray-600" />,
        alertTitle: "Nenhum Plano Ativo",
        alertTitleClass: "text-gray-900",
        alertDescription: "Contrate um plano para começar a usar o sistema ERP.",
        alertDescClass: "text-gray-800",
        showPlanInfo: false,
        expirationDate: null,
        ctaText: "Ver Planos Disponíveis",
        ctaSubtext: "Escolha o melhor plano para sua empresa",
      };
  }
}
