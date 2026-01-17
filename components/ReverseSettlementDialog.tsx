/**
 * =============================================================================
 * COMPONENTE - Modal de Estorno de Liquidação
 * =============================================================================
 * 
 * Modal para estornar liquidação de transações financeiras (reverter status Pago/Recebido).
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { RotateCcw, X, AlertTriangle } from "lucide-react";
import { FinancialTransaction } from "../contexts/ERPContext";
import { formatDateLocal } from "../utils/dateUtils";
import { toast } from "sonner";

interface ReverseSettlementDialogProps {
  transaction: FinancialTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (transactionId: string, reason: string) => Promise<void>;
  reconciliationStatus?: Record<string, boolean>; // ✅ NOVO: Status de conciliação
}

export function ReverseSettlementDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm,
  reconciliationStatus
}: ReverseSettlementDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    setReason("");
    setError("");
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    // Validações
    if (!reason || reason.trim().length === 0) {
      setError("Motivo é obrigatório");
      return;
    }

    if (reason.length > 200) {
      setError("Motivo deve ter no máximo 200 caracteres");
      return;
    }

    // Validação LGPD - evitar dados sensíveis
    const sensitivePatternsRegex = /\b(cpf|rg|cnpj|senha|cartão|cartao|banco|conta|agencia|agência)\b/i;
    if (sensitivePatternsRegex.test(reason)) {
      setError("Motivo não deve conter dados pessoais sensíveis (CPF, RG, senhas, etc.)");
      return;
    }

    if (!transaction) return;

    // ✅ VALIDAÇÃO: Bloquear estorno se houver conciliação na data de liquidação
    if (reconciliationStatus && transaction.effectiveDate && transaction.bankAccountId) {
      const reconciliationKey = `${transaction.bankAccountId}-${transaction.effectiveDate}`;
      if (reconciliationStatus[reconciliationKey]) {
        setError("Não é possível estornar: a data de liquidação está conciliada. Desconcilie primeiro.");
        toast.error("Estorno bloqueado", {
          description: "A data de liquidação está conciliada. Você deve desconciliar manualmente antes de estornar.",
          duration: 6000
        });
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(transaction.id, reason);
      
      // ✅ Toast informativo (movido do alert)
      toast.info("Estorno registrado", {
        description: "O estorno foi registrado no histórico para auditoria. Revise conciliações bancárias se necessário.",
        duration: 5000
      });
      
      handleCancel();
    } catch (err) {
      setError("Erro ao estornar liquidação");
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  // Determinar novo status após estorno
  const now = new Date();
  const dueDate = new Date(transaction.dueDate);
  const newStatus = transaction.type === 'Receita'
    ? (now > dueDate ? 'Vencido' : 'A Receber')
    : (now > dueDate ? 'Vencido' : 'A Pagar');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Estornar Liquidação
          </DialogTitle>
          <DialogDescription>
            Esta ação reverterá a liquidação da transação, voltando ao status pendente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-1">
          {/* Informações da Transação */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium">{transaction.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Valor:</span>
              <span className="font-medium">
                R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status Atual:</span>
              <span className={`font-medium ${transaction.status === 'Pago' || transaction.status === 'Recebido' ? 'text-green-600' : 'text-orange-600'}`}>
                {transaction.status}
              </span>
            </div>
            {transaction.paymentDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Data Pagamento:</span>
                <span className="font-medium">{formatDateLocal(transaction.paymentDate)}</span>
              </div>
            )}
            {transaction.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Método:</span>
                <span className="font-medium">{transaction.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Preview do Estorno */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Após o Estorno</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Novo Status:</span>
                <span className="font-medium text-blue-700">{newStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Vencimento:</span>
                <span className="font-medium">{formatDateLocal(transaction.dueDate)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Os dados de liquidação (data, método, conta) serão removidos
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <Label>Motivo do Estorno *</Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Ex: Pagamento não processado, erro bancário, etc."
              className="mt-1"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/200 caracteres
            </p>
          </div>

          {/* Alert de erro */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Alert de vínculo com pedido */}
          {transaction.origin === "Pedido" && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <strong>Atenção:</strong> Esta transação está vinculada ao pedido {transaction.reference}. O status do pedido será recalculado automaticamente após o estorno.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {loading ? "Estornando..." : "Confirmar Estorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}