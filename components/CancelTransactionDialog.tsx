/**
 * =============================================================================
 * COMPONENTE - Modal de Cancelamento de Transação
 * =============================================================================
 * 
 * Modal para cancelar transações financeiras com validação LGPD de motivo.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { FinancialTransaction } from "../contexts/ERPContext";

interface CancelTransactionDialogProps {
  transaction: FinancialTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (transactionId: string, reason: string) => Promise<void>;
}

export function CancelTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm
}: CancelTransactionDialogProps) {
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

    setLoading(true);
    setError("");

    try {
      await onConfirm(transaction.id, reason);
      handleCancel();
    } catch (err) {
      setError("Erro ao cancelar transação");
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Cancelar Transação
          </DialogTitle>
          <DialogDescription>
            Esta ação marcará a transação como cancelada (soft delete). A transação permanecerá no sistema para auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <span className="text-gray-600">Descrição:</span>
              <span className="font-medium">{transaction.description}</span>
            </div>
            {transaction.origin === "Pedido" && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Origem:</span>
                <span className="font-medium text-blue-600">Pedido {transaction.reference}</span>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <Label>Motivo do Cancelamento *</Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Ex: Transação duplicada, erro de lançamento, etc."
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

          {/* Alert informativo */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Importante:</strong> A transação será marcada como cancelada mas permanecerá no banco de dados para fins de auditoria. Ela não aparecerá mais nos cálculos financeiros.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
