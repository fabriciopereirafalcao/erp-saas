/**
 * TRIAL EXPIRED GUARD
 * 
 * Componente de proteção que verifica se o período de trial do usuário expirou.
 * Se expirou e não tem plano pago, bloqueia o acesso aos módulos e exibe
 * mensagem de upgrade obrigatório.
 */

import { useEffect } from "react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { AlertCircle, CreditCard, Clock, CheckCircle } from "lucide-react";
import { NavigationView } from "../../App";

interface TrialExpiredGuardProps {
  children: React.ReactNode;
  currentView: NavigationView;
  onNavigateToPlans: () => void;
}

export function TrialExpiredGuard({ 
  children, 
  currentView,
  onNavigateToPlans 
}: TrialExpiredGuardProps) {
  const { subscription, loading } = useSubscription();

  // Views que são SEMPRE permitidas (mesmo com trial expirado)
  const allowedViews: NavigationView[] = [
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

  // Verificar se o trial expirou
  const isTrialExpired = () => {
    if (subscription.status !== "trial") {
      return false; // Não está em trial
    }

    if (!subscription.trialEndDate) {
      return false; // Sem data de fim de trial
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);

    return now > trialEnd; // Trial expirou se data atual > data de fim
  };

  // Se trial NÃO expirou, ou status não é trial, liberar acesso
  if (!isTrialExpired()) {
    return <>{children}</>;
  }

  // 🚫 TRIAL EXPIRADO - BLOQUEAR ACESSO
  console.warn("🚫 [TRIAL GUARD] Trial expirado. Bloqueando acesso aos módulos.");

  const trialEndDate = subscription.trialEndDate 
    ? new Date(subscription.trialEndDate).toLocaleDateString("pt-BR")
    : "Desconhecida";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl text-gray-900 mb-2">
            Período de Teste Encerrado
          </h1>
          <p className="text-gray-600">
            Seu período de teste gratuito terminou em <strong>{trialEndDate}</strong>
          </p>
        </div>

        {/* Alertas */}
        <div className="space-y-4 mb-8">
          <Alert className="bg-orange-50 border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Acesso Limitado</AlertTitle>
            <AlertDescription className="text-orange-800">
              Para continuar usando o sistema ERP, você precisa contratar um plano pago.
              Escolha o plano ideal para sua empresa e tenha acesso imediato a todas as funcionalidades.
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Benefícios dos Planos Pagos</AlertTitle>
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

        {/* Informações do Trial */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Plano de Trial:</span>
              <p className="font-semibold text-gray-900 capitalize">
                {subscription.planId}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Término do Trial:</span>
              <p className="font-semibold text-gray-900">
                {trialEndDate}
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-3">
          <Button 
            className="w-full gap-2 h-12 text-lg" 
            onClick={onNavigateToPlans}
          >
            <CreditCard className="w-5 h-5" />
            Ver Planos e Contratar
          </Button>

          <p className="text-center text-sm text-gray-500">
            Escolha entre planos mensais, semestrais ou anuais com descontos especiais
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
