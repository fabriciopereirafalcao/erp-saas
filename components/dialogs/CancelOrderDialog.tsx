import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertTriangle, XCircle, Package, DollarSign, Info } from "lucide-react";
import { Badge } from "../ui/badge";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: "sale" | "purchase";
  orderNumber: string;
  onConfirm: (reason: string) => Promise<{ success: boolean; error?: string; liquidatedTransactions?: any[] }>;
  isLoading?: boolean;
  impactSummary?: {
    financialTransactionsCount: number;
    stockQuantity: number;
    totalAmount: number;
  };
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderType,
  orderNumber,
  onConfirm,
  isLoading = false,
  impactSummary
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [liquidatedTransactions, setLiquidatedTransactions] = useState<any[] | null>(null);

  const handleConfirm = async () => {
    // Validar motivo
    if (!reason.trim()) {
      setError("O motivo do cancelamento é obrigatório");
      return;
    }

    if (reason.length > 200) {
      setError("O motivo deve ter no máximo 200 caracteres");
      return;
    }

    setError(null);
    setLiquidatedTransactions(null);

    // Chamar função de confirmação
    const result = await onConfirm(reason);

    if (result.success) {
      // Resetar e fechar
      setReason("");
      setError(null);
      onOpenChange(false);
    } else {
      // Mostrar erro
      setError(result.error || "Erro ao cancelar pedido");
      
      // Se houver parcelas liquidadas, mostrar detalhes
      if (result.liquidatedTransactions && result.liquidatedTransactions.length > 0) {
        setLiquidatedTransactions(result.liquidatedTransactions);
      }
    }
  };

  const handleCancel = () => {
    setReason("");
    setError(null);
    setLiquidatedTransactions(null);
    onOpenChange(false);
  };

  const orderTypeLabel = orderType === "sale" ? "Venda" : "Compra";
  const stockAction = orderType === "sale" ? "devolvido ao estoque" : "removido do estoque";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <XCircle className="h-6 w-6 text-destructive" />
            Cancelar Pedido de {orderTypeLabel}
          </DialogTitle>
          <DialogDescription>
            Você está prestes a cancelar o pedido <strong>{orderNumber}</strong>. 
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta de impacto */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Impacto do cancelamento:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  <span>
                    {impactSummary?.financialTransactionsCount || 0} transação(ões) financeira(s) será(ão) cancelada(s)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  <span>
                    {impactSummary?.stockQuantity || 0} unidade(s) será(ão) {stockAction}
                  </span>
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Mostrar parcelas liquidadas se houver erro */}
          {liquidatedTransactions && liquidatedTransactions.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Não é possível cancelar este pedido!</strong>
                <p className="mt-2 text-sm">
                  As seguintes parcelas já foram liquidadas e precisam ser estornadas primeiro:
                </p>
                <ul className="mt-2 space-y-1">
                  {liquidatedTransactions.map((tx: any, index: number) => (
                    <li key={index} className="text-sm flex items-center justify-between">
                      <span>
                        Parcela {tx.installmentNumber}/{tx.totalInstallments} - {tx.description}
                      </span>
                      <Badge variant="secondary">
                        {tx.status} - R$ {tx.amount?.toFixed(2)}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  <Info className="inline h-3 w-3 mr-1" />
                  <strong>Solução:</strong> Acesse o módulo de Transações Financeiras e estorne cada parcela liquidada antes de cancelar o pedido.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Campo de motivo */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-base font-semibold">
              Motivo do Cancelamento *
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Descreva o motivo do cancelamento (obrigatório por questões de auditoria e LGPD)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`min-h-[120px] ${error && !liquidatedTransactions ? 'border-destructive' : ''}`}
              maxLength={200}
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{reason.length}/200 caracteres</span>
              {error && !liquidatedTransactions && (
                <span className="text-destructive font-medium">{error}</span>
              )}
            </div>
          </div>

          {/* Informação de governança */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>🔒 Governança de Transações:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Transações financeiras vinculadas serão automaticamente canceladas</li>
                <li>• Apenas transações pendentes podem ser canceladas</li>
                <li>• Parcelas liquidadas impedem o cancelamento (requerem estorno)</li>
                <li>• O motivo será registrado para fins de auditoria</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim() || (liquidatedTransactions !== null && liquidatedTransactions.length > 0)}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Confirmar Cancelamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
