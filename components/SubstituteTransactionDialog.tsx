/**
 * =============================================================================
 * COMPONENTE - Modal de Substituição de Transação
 * =============================================================================
 * 
 * Modal para substituir transações financeiras criando uma nova e marcando a antiga como substituída.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ArrowRightLeft, X, Check } from "lucide-react";
import { FinancialTransaction, useERP } from "../contexts/ERPContext";

interface SubstituteTransactionDialogProps {
  transaction: FinancialTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (oldId: string, newData: Omit<FinancialTransaction, 'id'>, reason: string) => Promise<void>;
}

export function SubstituteTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm
}: SubstituteTransactionDialogProps) {
  const { customers, suppliers } = useERP();
  
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    dueDate: "",
    categoryName: "",
    partyName: "",
    partyId: "",
    partyType: ""
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inicializar dados do formulário quando a transação mudar
  const initializeForm = () => {
    if (transaction) {
      setFormData({
        amount: (transaction.amount / 100).toFixed(2).replace('.', ','),
        description: transaction.description,
        dueDate: transaction.dueDate,
        categoryName: transaction.categoryName,
        partyName: transaction.partyName,
        partyId: transaction.partyId || "",
        partyType: transaction.partyType || ""
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      initializeForm();
    } else {
      setFormData({
        amount: "",
        description: "",
        dueDate: "",
        categoryName: "",
        partyName: "",
        partyId: "",
        partyType: ""
      });
      setReason("");
      setError("");
    }
    onOpenChange(newOpen);
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

    // Validação LGPD
    const sensitivePatternsRegex = /\b(cpf|rg|cnpj|senha|cartão|cartao|banco|conta|agencia|agência)\b/i;
    if (sensitivePatternsRegex.test(reason)) {
      setError("Motivo não deve conter dados pessoais sensíveis");
      return;
    }

    if (!transaction) return;

    setLoading(true);
    setError("");

    try {
      // Parsear valor
      const amountValue = parseFloat(formData.amount.replace(',', '.')) * 100;

      // Criar dados da nova transação (herda a maioria dos campos)
      const newTransactionData: Omit<FinancialTransaction, 'id'> = {
        ...transaction,
        amount: amountValue,
        description: formData.description,
        dueDate: formData.dueDate,
        categoryName: formData.categoryName,
        partyName: formData.partyName,
        partyId: formData.partyId,
        partyType: formData.partyType
      };

      await onConfirm(transaction.id, newTransactionData, reason);
      handleOpenChange(false);
    } catch (err) {
      setError("Erro ao substituir transação");
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            Substituir Transação
          </DialogTitle>
          <DialogDescription>
            Crie uma nova transação corrigida. A transação antiga será arquivada para auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comparação lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            {/* Transação Antiga */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 mb-2">Transação Antiga (será arquivada)</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">Valor:</span>
                  <span className="ml-2 text-gray-900">
                    R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Descrição:</span>
                  <p className="text-gray-900 mt-1">{transaction.description}</p>
                </div>
              </div>
            </div>

            {/* Nova Transação */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">Nova Transação (corrigida)</h4>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '');
                      setFormData({ ...formData, amount: value });
                    }}
                    placeholder="0,00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos editáveis */}
          <div className="space-y-3">
            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label>Cliente/Fornecedor *</Label>
                <Select
                  value={formData.partyId}
                  onValueChange={(value) => {
                    // Buscar dados da parte selecionada
                    const isCustomer = customers.some(c => c.id === value);
                    const party = isCustomer 
                      ? customers.find(c => c.id === value)
                      : suppliers.find(s => s.id === value);
                    
                    if (party) {
                      setFormData({
                        ...formData,
                        partyId: party.id,
                        partyName: party.name,
                        partyType: isCustomer ? 'Cliente' : 'Fornecedor'
                      });
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length > 0 && (
                      <>
                        <SelectItem value="header-customers" disabled className="text-xs font-semibold text-gray-500">
                          CLIENTES
                        </SelectItem>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {suppliers.length > 0 && (
                      <>
                        <SelectItem value="header-suppliers" disabled className="text-xs font-semibold text-gray-500 mt-2">
                          FORNECEDORES
                        </SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Motivo da Substituição */}
          <div>
            <Label>Motivo da Substituição *</Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Ex: Correção de valor incorreto, atualização de dados, etc."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/200 caracteres
            </p>
          </div>

          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {transaction.origin === "Pedido" && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Vínculo com Pedido:</strong> A nova transação manterá o vínculo com o pedido {transaction.reference}. O status do pedido não será alterado automaticamente.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Importante:</strong> A transação antiga será arquivada (não excluída) e uma nova será criada com os dados corrigidos. Ambas permanecerão no histórico para auditoria.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !formData.description || !formData.amount}
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? "Substituindo..." : "Confirmar Substituição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
