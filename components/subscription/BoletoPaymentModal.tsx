/* =========================================================================
 * BOLETO PAYMENT MODAL - Modal para pagamento via Boleto
 * ========================================================================= */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle, Copy, Clock, FileText, Download, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface BoletoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boletoNumber: string;        // Código de barras do boleto
  boletoUrl: string;           // URL do PDF do boleto
  boletoBarcode: string;       // Código de barras (linha digitável)
  amount: number;
  expiresAt: number;           // Timestamp
  paymentIntentId: string;
  planName: string;
  billingCycle: string;
}

export function BoletoPaymentModal({
  isOpen,
  onClose,
  boletoNumber,
  boletoUrl,
  boletoBarcode,
  amount,
  expiresAt,
  paymentIntentId,
  planName,
  billingCycle
}: BoletoPaymentModalProps) {
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
          toast.success("Pagamento do boleto confirmado! ✅");
          
          // Redirecionar após 2 segundos
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento do boleto:", error);
      }
    }, 10000); // Verificar a cada 10 segundos (boleto demora mais)

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
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(boletoBarcode);
    toast.success("Código de barras copiado!");
  };

  const handleDownloadBoleto = () => {
    window.open(boletoUrl, "_blank");
    toast.success("Abrindo boleto...");
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

  // Estado: Boleto Expirado
  if (isExpired) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Boleto Expirado
            </h2>
            <p className="text-gray-600 mb-6">
              O boleto expirou. Por favor, gere um novo pagamento.
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
          <DialogTitle>Pagar com Boleto</DialogTitle>
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

          {/* Botão Download Boleto */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8" />
              <div>
                <h3 className="font-semibold">Seu boleto está pronto!</h3>
                <p className="text-sm text-blue-100">
                  Baixe e pague em qualquer banco ou lotérica
                </p>
              </div>
            </div>
            <Button 
              onClick={handleDownloadBoleto}
              className="w-full bg-white text-blue-600 hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Boleto (PDF)
            </Button>
          </div>

          {/* Código de Barras */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Código de Barras:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={boletoBarcode}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50"
              />
              <Button onClick={handleCopyBarcode} size="sm" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use este código para pagar pelo internet banking
            </p>
          </div>

          {/* Tempo restante */}
          <Alert className={isExpired ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}>
            <Clock className={`h-4 w-4 ${isExpired ? "text-red-600" : "text-yellow-600"}`} />
            <AlertDescription>
              <span className="text-gray-900">
                Vencimento em: <strong>{timeRemaining}</strong>
              </span>
              <br />
              <span className="text-xs text-gray-600">
                Data de vencimento: {new Date(expiresAt * 1000).toLocaleDateString("pt-BR")}
              </span>
            </AlertDescription>
          </Alert>

          {/* Status */}
          <div className="text-center text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">Aguardando confirmação do pagamento...</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A confirmação pode levar até 3 dias úteis após o pagamento
            </p>
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
              Como pagar:
            </h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Baixe o boleto em PDF</li>
              <li>Pague em qualquer banco, lotérica ou app bancário</li>
              <li>Ou copie o código de barras e pague pelo internet banking</li>
              <li>O pagamento pode levar até 3 dias úteis para compensar</li>
              <li>Você receberá um email de confirmação após o pagamento</li>
            </ol>
          </div>

          {/* Link Boleto */}
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadBoleto}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Boleto Online
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
