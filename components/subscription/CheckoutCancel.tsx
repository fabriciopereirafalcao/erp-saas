import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { XCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface CheckoutCancelProps {
  onNavigate: (view: string) => void;
}

export function CheckoutCancel({ onNavigate }: CheckoutCancelProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-orange-600" />
          </div>
        </div>
        
        <h1 className="text-2xl text-gray-900 mb-4">
          Pagamento Cancelado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Você cancelou o processo de pagamento. Não se preocupe, nenhuma cobrança foi realizada.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => onNavigate("changePlan")}
            className="w-full gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Tentar Novamente
          </Button>
          
          <Button
            onClick={() => onNavigate("dashboard")}
            variant="outline"
            className="w-full gap-2"
          >
            Voltar ao Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>💡 Precisa de ajuda?</strong>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Se você teve algum problema durante o checkout, entre em contato com nosso suporte.
          </p>
        </div>
      </Card>
    </div>
  );
}
