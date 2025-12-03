import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { useNavigate } from "../ui/navigate";

interface CheckoutSuccessProps {
  onNavigate: (view: string) => void;
}

export function CheckoutSuccess({ onNavigate }: CheckoutSuccessProps) {
  const { refreshSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Aguardar 2 segundos para o webhook do Stripe processar
    const timer = setTimeout(async () => {
      await refreshSubscription();
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [refreshSubscription]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {isLoading ? (
          <>
            {/* Loading State */}
            <div className="mb-6">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
            </div>
            <h1 className="text-2xl text-gray-900 mb-4">
              Processando seu pagamento...
            </h1>
            <p className="text-gray-600">
              Aguarde enquanto confirmamos sua assinatura.
            </p>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl text-gray-900 mb-4">
              🎉 Pagamento Confirmado!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Seu plano foi ativado com sucesso. Você já pode aproveitar todos os recursos disponíveis!
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => onNavigate("dashboard")}
                className="w-full gap-2"
              >
                Ir para Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => onNavigate("myPlan")}
                variant="outline"
                className="w-full"
              >
                Ver Meu Plano
              </Button>
            </div>

            {/* Informações Adicionais */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>✅ O que acontece agora?</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left">
                <li>• Seu plano está ativo imediatamente</li>
                <li>• Você receberá um email com os detalhes</li>
                <li>• O recibo está disponível no seu painel</li>
              </ul>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
