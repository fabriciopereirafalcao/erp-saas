/* =========================================================================
 * PIX PAYMENT MODAL - Modal para pagamento via PIX
 * ========================================================================= */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle, Copy, Clock, QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixQrCode: string;           // Código PIX (copia e cola)
  pixQrCodeUrl: string;        // URL da imagem do QR Code
  amount: number;
  expiresAt: number;           // Timestamp
  paymentIntentId: string;
  planName: string;
  billingCycle: string;
}

export function PixPaymentModal({
  isOpen,
  onClose,
  pixQrCode,
  pixQrCodeUrl,
  amount,
  expiresAt,
  paymentIntentId,
  planName,
  billingCycle
}: PixPaymentModalProps) {
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  // Polling para verificar se pagamento foi confirmado
  useEffect(() => {
    if (!isOpen || paymentConfirmed || isExpired) return;

    const interval = setInterval(async () => {
      try {
        // Verificar status do pagamento
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/check-payment-status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ paymentIntentId }),
          }
        );

        const data = await response.json();

        if (data.status === "succeeded") {
          setPaymentConfirmed(true);
          toast.success("Pagamento PIX confirmado! ✅");
          
          // Redirecionar após 2 segundos
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento PIX:", error);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [isOpen, paymentIntentId, paymentConfirmed, isExpired]);

  // Contador de tempo
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining("Expirado");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixQrCode);
    toast.success("Código PIX copiado!");
  };

  const getCycleName = () => {
    switch (billingCycle) {
      case "monthly": return "Mensal";
      case "semiannual": return "Semestral";
      case "yearly": return "Anual";
      default: return billingCycle;
    }
  };

  // Estado: Pagamento Confirmado
  if (paymentConfirmed) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pagamento Confirmado!
            </h2>
            <p className="text-gray-600 mb-4">
              Seu plano <strong>{planName}</strong> foi ativado com sucesso.
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              Redirecionando...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Estado: QR Code Expirado
  if (isExpired) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              QR Code Expirado
            </h2>
            <p className="text-gray-600 mb-6">
              O código PIX expirou. Por favor, gere um novo pagamento.
            </p>
            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Estado: Aguardando Pagamento
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar com PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Plano */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Plano</span>
              <span className="font-semibold text-gray-900">{planName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Período</span>
              <span className="font-semibold text-gray-900">{getCycleName()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-blue-300">
              <span className="text-sm text-gray-600">Valor a pagar</span>
              <span className="text-2xl font-bold text-gray-900">
                R$ {amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="flex justify-center mb-3">
              <img 
                src={pixQrCodeUrl} 
                alt="QR Code PIX" 
                className="w-64 h-64 border border-gray-300 rounded"
              />
            </div>
            
            <Alert>
              <QrCode className="h-4 w-4" />
              <AlertDescription>
                Escaneie o QR Code acima com o app do seu banco
              </AlertDescription>
            </Alert>
          </div>

          {/* Código PIX */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Ou copie o código PIX:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pixQrCode}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 overflow-x-auto"
              />
              <Button onClick={handleCopyPixCode} size="sm" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tempo restante */}
          <Alert className={isExpired ? "border-red-500 bg-red-50" : ""}>
            <Clock className={`h-4 w-4 ${isExpired ? "text-red-600" : ""}`} />
            <AlertDescription>
              Este QR Code expira em: <strong>{timeRemaining}</strong>
            </AlertDescription>
          </Alert>

          {/* Status */}
          <div className="text-center text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">Aguardando confirmação do pagamento...</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A confirmação geralmente leva alguns segundos após o pagamento
            </p>
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
              Como pagar:
            </h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha a opção PIX</li>
              <li>Escaneie o QR Code ou cole o código</li>
              <li>Confirme o pagamento</li>
              <li>Aguarde a confirmação automática</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
