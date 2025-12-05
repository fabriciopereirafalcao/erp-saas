import { useEffect, useState, useRef } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { useNavigate } from "../ui/navigate";

interface CheckoutSuccessProps {
  onNavigate: (view: string) => void;
}

export function CheckoutSuccess({ onNavigate }: CheckoutSuccessProps) {
  const { refreshSubscription, subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const attemptCountRef = useRef(0);
  const maxAttempts = 15; // 15 tentativas = ~30 segundos

  useEffect(() => {
    let isMounted = true;

    const checkPaymentStatus = async () => {
      if (!isMounted) return;
      
      attemptCountRef.current++;
      setAttempts(attemptCountRef.current);
      
      console.log(`[CHECKOUT] Verificando status... tentativa ${attemptCountRef.current}/${maxAttempts}, Status atual: ${subscription?.status}`);
      
      // Refresh subscription do context
      await refreshSubscription();
    };

    // Primeira verificação após 2s
    const initialTimeout = setTimeout(async () => {
      if (!isMounted) return;
      
      await checkPaymentStatus();
      
      // Continuar verificando a cada 2s
      intervalRef.current = window.setInterval(async () => {
        await checkPaymentStatus();
      }, 2000);
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Executar apenas na montagem

  // ✅ EFEITO SEPARADO: Monitorar mudanças no subscription
  useEffect(() => {
    console.log(`[CHECKOUT] Subscription atualizado: ${subscription?.status}, Tentativas: ${attemptCountRef.current}`);
    
    // Parar quando não for mais trial OU atingiu max tentativas
    if (subscription?.status !== 'trial' || attemptCountRef.current >= maxAttempts) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsLoading(false);
      console.log(`[CHECKOUT] ✅ Finalizado! Status final: ${subscription?.status}`);
    }
  }, [subscription?.status]); // Monitorar mudanças no status

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
            {attempts > 3 && (
              <p className="text-sm text-gray-500 mt-4">
                Aguardando confirmação do Stripe... ({attempts}/15)
              </p>
            )}
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