import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Search, Plus, Edit2, Calendar as CalendarIcon, TrendingUp, TrendingDown, Activity, DollarSign, CheckCircle2, AlertTriangle, Clock, FileText, Package, ArrowDownCircle, ArrowUpCircle, CreditCard, MoreVertical, ArrowRightLeft, ChevronDown } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner@2.0.3";
import { formatDateLocal, addDaysToDate } from "../utils/dateUtils";

export function FinancialTransactions() {
  const {
    financialTransactions,
    customers,
    suppliers,
    accountCategories,
    companySettings,
    paymentMethods,
    addFinancialTransaction,
    updateFinancialTransaction,
    markTransactionAsReceived,
    markTransactionAsPaid,
    salesOrders,
    purchaseOrders
  } = useERP();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"Todas" | "Receita" | "Despesa">("Todas");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [filterOrigin, setFilterOrigin] = useState<string>("Todas");
  const [showDialog, setShowDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editingInstallmentMode, setEditingInstallmentMode] = useState<"single" | "all">("single");
  const [settledInstallmentsCount, setSettledInstallmentsCount] = useState<number>(0);
  const [receivingTransaction, setReceivingTransaction] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [receiveBankAccountId, setReceiveBankAccountId] = useState<string>("");
  const [receivePaymentMethodId, setReceivePaymentMethodId] = useState<string>("");
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "Despesa" as "Receita" | "Despesa",
    date: new Date(),
    partyType: "Outro" as "Cliente" | "Fornecedor" | "Outro",
    partyId: "",
    partyName: "",
    categoryId: "",
    amount: "",
    costCenterId: "",
    description: "",
    // Campos de parcelamento
    installments: "1",
    firstInstallmentDays: 0
  });

  // Estado para transferências
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [transferData, setTransferData] = useState({
    sourceAccountId: "",
    destinationAccountId: "",
    amount: "",
    date: new Date(),
    description: ""
  });

  // Helper: buscar ordem vinculada (pedido de venda ou compra)
  const getLinkedOrder = (txn: any) => {
    if (txn.origin === "Pedido" && txn.reference) {
      // Primeiro tentar buscar em pedidos de venda
      const salesOrder = salesOrders.find(o => o.id === txn.reference);
      if (salesOrder) {
        return salesOrder;
      }
      // Se não encontrar, buscar em pedidos de compra
      const purchaseOrder = purchaseOrders.find(o => o.id === txn.reference);
      if (purchaseOrder) {
        return purchaseOrder;
      }
    }
    return null;
  };

  // Helper: verificar se está vencido
  const isOverdue = (txn: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(txn.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && (txn.status === "A Receber" || txn.status === "A Pagar" || txn.status === "A Vencer" || txn.status === "Vencido");
  };

  const filteredTransactions = financialTransactions.filter(txn => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.reference && txn.reference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === "Todas" || txn.type === filterType;
    const matchesStatus = filterStatus === "Todos" || txn.status === filterStatus;
    const matchesOrigin = filterOrigin === "Todas" || txn.origin === filterOrigin;

    return matchesSearch && matchesType && matchesStatus && matchesOrigin;
  });

  const totalReceitas = financialTransactions
    .filter(t => t.type === "Receita" && (t.status === "Recebido" || t.status === "Pago"))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDespesas = financialTransactions
    .filter(t => t.type === "Despesa" && (t.status === "Pago" || t.status === "Recebido"))
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalReceitas - totalDespesas;

  const handleOpenDialog = (transactionId?: string, transferMode: boolean = false) => {
    setIsTransferMode(transferMode);
    
    if (transactionId) {
      const transaction = financialTransactions.find(t => t.id === transactionId);
      if (transaction) {
        setEditingTransaction(transactionId);
        setFormData({
          type: transaction.type,
          date: new Date(transaction.date),
          partyType: transaction.partyType,
          partyId: transaction.partyId || "",
          partyName: transaction.partyName,
          categoryId: transaction.categoryId,
          amount: (transaction.amount * 100).toString(),
          costCenterId: transaction.costCenterId || "",
          description: transaction.description,
          installments: "1",
          firstInstallmentDays: 0
        });
      }
    } else {
      setEditingTransaction(null);
      setFormData({
        type: "Despesa",
        date: new Date(),
        partyType: "Outro",
        partyId: "",
        partyName: "",
        categoryId: accountCategories[0]?.id || "",
        amount: "",
        costCenterId: "",
        description: "",
        installments: "1",
        firstInstallmentDays: 0
      });
      
      // Resetar dados de transferência
      setTransferData({
        sourceAccountId: companySettings.bankAccounts[0]?.id || "",
        destinationAccountId: companySettings.bankAccounts[1]?.id || "",
        amount: "",
        date: new Date(),
        description: ""
      });
    }
    setShowDialog(true);
  };

  const handleTransfer = () => {
    // Validações para transferência
    if (!transferData.sourceAccountId) {
      toast.error("Selecione a conta de origem");
      return;
    }
    if (!transferData.destinationAccountId) {
      toast.error("Selecione a conta de destino");
      return;
    }
    if (transferData.sourceAccountId === transferData.destinationAccountId) {
      toast.error("As contas de origem e destino devem ser diferentes");
      return;
    }
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!transferData.description) {
      toast.error("Informe uma descrição para a transferência");
      return;
    }

    const amount = parseFloat(transferData.amount) / 100;
    const sourceAccount = companySettings.bankAccounts.find(b => b.id === transferData.sourceAccountId);
    const destinationAccount = companySettings.bankAccounts.find(b => b.id === transferData.destinationAccountId);

    if (!sourceAccount || !destinationAccount) {
      toast.error("Contas bancárias não encontradas");
      return;
    }

    // Encontrar categoria de transferência ou usar primeira categoria
    const transferCategory = accountCategories.find(c => c.name.toLowerCase().includes("transferência")) || accountCategories[0];
    const paymentMethod = paymentMethods.find(pm => pm.isActive);

    const transactionDate = transferData.date.toISOString().split('T')[0];

    // Gerar ID único para vincular as duas transações
    const transferPairId = `TRANSFER-${Date.now()}`;

    // Criar transação de SAÍDA (Despesa) na conta de origem
    const outgoingTransaction = {
      type: "Despesa" as const,
      date: transactionDate,
      dueDate: transactionDate,
      effectiveDate: transactionDate,
      partyType: "Outro" as const,
      partyName: `Transferência para ${destinationAccount.bankName}`,
      categoryId: transferCategory?.id || "",
      categoryName: transferCategory?.name || "Transferência",
      bankAccountId: sourceAccount.id,
      bankAccountName: sourceAccount.bankName,
      paymentMethodId: paymentMethod?.id || "",
      paymentMethodName: paymentMethod?.name || "Transferência",
      amount: amount,
      status: "Pago" as const,
      description: transferData.description,
      origin: "Manual" as const,
      isTransfer: true,
      transferPairId: transferPairId,
      transferDirection: "origem" as const
    };

    // Criar transação de ENTRADA (Receita) na conta de destino
    const incomingTransaction = {
      type: "Receita" as const,
      date: transactionDate,
      dueDate: transactionDate,
      effectiveDate: transactionDate,
      partyType: "Outro" as const,
      partyName: `Transferência de ${sourceAccount.bankName}`,
      categoryId: transferCategory?.id || "",
      categoryName: transferCategory?.name || "Transferência",
      bankAccountId: destinationAccount.id,
      bankAccountName: destinationAccount.bankName,
      paymentMethodId: paymentMethod?.id || "",
      paymentMethodName: paymentMethod?.name || "Transferência",
      amount: amount,
      status: "Recebido" as const,
      description: transferData.description,
      origin: "Manual" as const,
      isTransfer: true,
      transferPairId: transferPairId,
      transferDirection: "destino" as const
    };

    // Adicionar as duas transações
    addFinancialTransaction(outgoingTransaction);
    addFinancialTransaction(incomingTransaction);

    toast.success("Transferência realizada com sucesso!", {
      description: `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} transferidos de ${sourceAccount.bankName} para ${destinationAccount.bankName}`
    });

    setShowDialog(false);
  };

  const handleSave = () => {
    // Se for modo transferência, processar transferência
    if (isTransferMode) {
      handleTransfer();
      return;
    }

    // Validações
    if (!formData.partyName) {
      toast.error("Informe o parceiro comercial");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    const category = accountCategories.find(c => c.id === formData.categoryId);
    const costCenter = companySettings.costCenters.find(c => c.id === formData.costCenterId);

    const numInstallments = parseInt(formData.installments);
    const totalAmount = parseFloat(formData.amount) / 100;
    const installmentAmount = totalAmount / numInstallments;

    // Se for edição, não permitir criar múltiplas parcelas
    if (editingTransaction) {
      toast.warning("Edição de transações manuais não está disponível. Por favor, exclua e crie uma nova.");
      return;
    }

    // Criar múltiplas transações se houver parcelamento
    const baseDate = formData.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < numInstallments; i++) {
      // Calcular data de vencimento de cada parcela usando addDaysToDate
      const daysToAdd = formData.firstInstallmentDays + (i * 30);
      const dueDate = addDaysToDate(formData.date.toISOString().split('T')[0], daysToAdd);
      
      // Calcular valor da parcela (última parcela ajusta diferenças de arredondamento)
      const amount = i === numInstallments - 1 
        ? totalAmount - (installmentAmount * (numInstallments - 1))
        : installmentAmount;

      // Determinar status baseado na data de vencimento
      const dueDateObj = new Date(dueDate);
      dueDateObj.setHours(0, 0, 0, 0);
      const status = dueDateObj < today ? "Vencido" : "A Vencer";

      const transactionData = {
        type: formData.type,
        date: formData.date.toISOString().split('T')[0],
        dueDate: dueDate,
        partyType: formData.partyType,
        partyId: formData.partyId || undefined,
        partyName: formData.partyName,
        categoryId: formData.categoryId,
        categoryName: category?.name || "",
        // Conta bancária e forma de pagamento serão definidos no momento da liquidação
        bankAccountId: "",
        bankAccountName: "",
        paymentMethodId: "",
        paymentMethodName: "",
        amount: amount,
        status: status as any,
        costCenterId: formData.costCenterId || undefined,
        costCenterName: costCenter?.name,
        description: numInstallments > 1 
          ? `${formData.description} - Parcela ${i + 1}/${numInstallments}`
          : formData.description,
        installmentNumber: numInstallments > 1 ? i + 1 : undefined,
        totalInstallments: numInstallments > 1 ? numInstallments : undefined,
        origin: "Manual" as const
      };

      addFinancialTransaction(transactionData);
    }

    if (numInstallments > 1) {
      toast.success(`${numInstallments} transações criadas com sucesso!`, {
        description: `Valor total: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Liquidar manualmente cada parcela`
      });
    } else {
      toast.success("Transação criada com sucesso!", {
        description: "Liquidar manualmente quando necessário"
      });
    }

    setShowDialog(false);
    setEditingTransaction(null);
  };

  const handleOpenReceiveDialog = (transactionId: string) => {
    setReceivingTransaction(transactionId);
    setEffectiveDate(new Date());
    // Definir valores padrão para conta e forma de pagamento
    setReceiveBankAccountId(companySettings.bankAccounts[0]?.id || "");
    setReceivePaymentMethodId(paymentMethods.find(pm => pm.isActive)?.id || "");
    setShowReceiveDialog(true);
  };

  const handleMarkAsReceived = () => {
    if (!receivingTransaction) return;
    
    const transaction = financialTransactions.find(t => t.id === receivingTransaction);
    if (!transaction) {
      toast.error("Transação não encontrada");
      return;
    }

    // Validar campos obrigatórios
    if (!receiveBankAccountId) {
      toast.error("Selecione a conta de recebimento");
      return;
    }
    if (!receivePaymentMethodId) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    // Validar que a data não seja futura
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (effectiveDate > today) {
      toast.error("Não é possível liquidar transações com data futura", {
        description: "A data de recebimento/pagamento deve ser hoje ou anterior"
      });
      return;
    }

    const formattedDate = effectiveDate.toISOString().split('T')[0];
    const bankAccount = companySettings.bankAccounts.find(b => b.id === receiveBankAccountId);
    const paymentMethod = paymentMethods.find(pm => pm.id === receivePaymentMethodId);
    
    if (transaction.type === "Receita") {
      markTransactionAsReceived(
        receivingTransaction, 
        formattedDate, 
        receiveBankAccountId,
        bankAccount?.bankName || "",
        receivePaymentMethodId,
        paymentMethod?.name || ""
      );
    } else {
      markTransactionAsPaid(
        receivingTransaction, 
        formattedDate,
        receiveBankAccountId,
        bankAccount?.bankName || "",
        receivePaymentMethodId,
        paymentMethod?.name || ""
      );
    }

    setShowReceiveDialog(false);
    setReceivingTransaction(null);
  };

  // Função auxiliar para encontrar todas as parcelas relacionadas
  // Funciona mesmo quando parentTransactionId não está preenchido
  const findRelatedInstallments = (transaction: any) => {
    // Primeiro, tentar usar parentTransactionId se existir
    if (transaction.parentTransactionId) {
      const parentId = transaction.parentTransactionId;
      const byParentId = financialTransactions.filter(t => 
        t.id === parentId || t.parentTransactionId === parentId
      );
      if (byParentId.length > 0) return byParentId;
    }
    
    // Se não tem parentTransactionId ou não encontrou, tentar por outras características
    // Buscar transações com:
    // - Mesmo tipo, partyName, data de lançamento
    // - TotalInstallments igual
    // - InstallmentNumbers sequenciais
    if (transaction.totalInstallments && transaction.totalInstallments > 1) {
      const candidates = financialTransactions.filter(t => 
        t.type === transaction.type &&
        t.partyName === transaction.partyName &&
        t.date === transaction.date &&
        t.totalInstallments === transaction.totalInstallments &&
        t.installmentNumber !== undefined &&
        t.installmentNumber > 0
      );
      
      // Verificar se encontramos o número esperado de parcelas
      if (candidates.length === transaction.totalInstallments) {
        return candidates;
      }
    }
    
    // Fallback: retornar apenas a transação atual
    return [transaction];
  };

  const handleOpenEditDialog = (transactionId: string, mode: "single" | "all" = "single") => {
    const transaction = financialTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      toast.error("Transação não encontrada");
      return;
    }

    setEditingTransaction(transactionId);
    setEditingInstallmentMode(mode);

    // Se for modo "all" e for parcelamento, calcular valores totais e configurações
    if (mode === "all" && transaction.totalInstallments && transaction.totalInstallments > 1) {
      // Buscar todas as parcelas relacionadas (mesmo sem parentTransactionId)
      const allInstallments = findRelatedInstallments(transaction);

      console.log(`[DEBUG] Edição de parcelamento - Transação ${transaction.id}:`, {
        transactionId: transaction.id,
        parentTransactionId: transaction.parentTransactionId,
        totalParcelas: allInstallments.length,
        parcelasIDs: allInstallments.map(t => ({ id: t.id, installment: t.installmentNumber, status: t.status }))
      });

      // Filtrar apenas parcelas não liquidadas (não recebidas/pagas)
      const unsettledInstallments = allInstallments.filter(t => 
        t.status !== "Recebido" && t.status !== "Pago" && t.status !== "Cancelado"
      );

      // Calcular valor total apenas das parcelas não liquidadas
      const totalAmount = unsettledInstallments.reduce((sum, t) => sum + t.amount, 0);

      // Calcular dias até primeira parcela não liquidada
      const firstUnsettledInstallment = unsettledInstallments.sort((a, b) => 
        (a.installmentNumber || 0) - (b.installmentNumber || 0)
      )[0];
      
      const baseDate = new Date(transaction.date);
      const firstDueDate = new Date(firstUnsettledInstallment.dueDate);
      const daysDiff = Math.floor((firstDueDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

      // Contar quantas parcelas liquidadas (pagas/recebidas) existem
      const settledCount = allInstallments.filter(t => 
        t.status === "Recebido" || t.status === "Pago"
      ).length;

      // Salvar contagem de parcelas liquidadas para exibir no formulário
      setSettledInstallmentsCount(settledCount);

      setFormData({
        type: transaction.type,
        date: new Date(transaction.date),
        partyType: transaction.partyType,
        partyId: transaction.partyId || "",
        partyName: transaction.partyName,
        categoryId: transaction.categoryId,
        amount: totalAmount.toFixed(2),
        costCenterId: transaction.costCenterId || "",
        description: transaction.description,
        installments: unsettledInstallments.length.toString(),
        firstInstallmentDays: daysDiff >= 0 ? daysDiff : 0
      });
    } else {
      // Modo single ou transação única
      setSettledInstallmentsCount(0);
      setFormData({
        type: transaction.type,
        date: new Date(transaction.date),
        partyType: transaction.partyType,
        partyId: transaction.partyId || "",
        partyName: transaction.partyName,
        categoryId: transaction.categoryId,
        amount: (transaction.amount * 100).toString(),
        costCenterId: transaction.costCenterId || "",
        description: transaction.description,
        installments: "1",
        firstInstallmentDays: 0
      });
    }
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;

    // Validações
    if (!formData.partyName) {
      toast.error("Informe o parceiro comercial");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    const transaction = financialTransactions.find(t => t.id === editingTransaction);
    if (!transaction) {
      toast.error("Transação não encontrada");
      return;
    }

    const category = accountCategories.find(c => c.id === formData.categoryId);
    const costCenter = companySettings.costCenters.find(c => c.id === formData.costCenterId);

    // Se for edição de todas as parcelas (toda a transação)
    if (editingInstallmentMode === "all" && transaction.totalInstallments && transaction.totalInstallments > 1) {
      // Buscar todas as transações do mesmo grupo
      const allInstallments = financialTransactions.filter(t => 
        t.parentTransactionId === transaction.parentTransactionId ||
        t.id === transaction.parentTransactionId ||
        (transaction.parentTransactionId && t.parentTransactionId === transaction.parentTransactionId)
      );

      const newInstallmentCount = parseInt(formData.installments);
      const currentInstallmentCount = allInstallments.length;
      const totalAmount = parseFloat(formData.amount) / 100;
      const newInstallmentAmount = totalAmount / newInstallmentCount;

      // Separar parcelas liquidadas e não liquidadas
      const settledInstallments = allInstallments.filter(t => 
        t.status === "Recebido" || t.status === "Pago"
      );
      const unsettledInstallments = allInstallments.filter(t => 
        t.status !== "Recebido" && t.status !== "Pago" && t.status !== "Cancelado"
      );

      const parentId = transaction.parentTransactionId || transaction.id;

      // Caso 1: Redução de parcelas
      if (newInstallmentCount < currentInstallmentCount) {
        // Cancelar parcelas excedentes (começando das últimas)
        const toCancel = unsettledInstallments
          .sort((a, b) => (b.installmentNumber || 0) - (a.installmentNumber || 0))
          .slice(0, unsettledInstallments.length - newInstallmentCount + settledInstallments.length);

        toCancel.forEach(txn => {
          updateFinancialTransaction(txn.id, {
            ...txn,
            status: "Cancelado" as any
          });
        });

        // Atualizar parcelas restantes
        const remaining = unsettledInstallments.filter(t => !toCancel.find(c => c.id === t.id));
        remaining.forEach((txn, index) => {
          updateFinancialTransaction(txn.id, {
            ...txn,
            partyType: formData.partyType,
            partyId: formData.partyId,
            partyName: formData.partyName,
            categoryId: formData.categoryId,
            categoryName: category?.name || "",
            amount: newInstallmentAmount,
            costCenterId: formData.costCenterId,
            costCenterName: costCenter?.name || "",
            description: formData.description,
            totalInstallments: newInstallmentCount,
          });
        });

        toast.success(`${toCancel.length} parcela(s) cancelada(s) e ${remaining.length} atualizada(s)`);
      }
      // Caso 2: Aumento de parcelas
      else if (newInstallmentCount > currentInstallmentCount) {
        const parcelasACriar = newInstallmentCount - currentInstallmentCount;

        // Atualizar parcelas existentes não liquidadas
        unsettledInstallments.forEach(txn => {
          updateFinancialTransaction(txn.id, {
            ...txn,
            partyType: formData.partyType,
            partyId: formData.partyId,
            partyName: formData.partyName,
            categoryId: formData.categoryId,
            categoryName: category?.name || "",
            amount: newInstallmentAmount,
            costCenterId: formData.costCenterId,
            costCenterName: costCenter?.name || "",
            description: formData.description,
            totalInstallments: newInstallmentCount,
          });
        });

        // Criar novas parcelas
        const currentMaxInstallment = Math.max(...allInstallments.map(t => t.installmentNumber || 0));
        const bankAccount = companySettings.bankAccounts[0];
        const paymentMethod = paymentMethods.find(pm => pm.isActive);

        for (let i = 0; i < parcelasACriar; i++) {
          const installmentNumber = currentMaxInstallment + i + 1;
          const daysToAdd = formData.firstInstallmentDays + ((installmentNumber - 1) * 30);
          const dueDate = addDaysToDate(formData.date.toISOString().split('T')[0], daysToAdd);

          const newTransaction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            type: formData.type,
            date: formData.date.toISOString().split('T')[0],
            dueDate: dueDate,
            partyType: formData.partyType,
            partyId: formData.partyId,
            partyName: formData.partyName,
            categoryId: formData.categoryId,
            categoryName: category?.name || "",
            bankAccountId: bankAccount?.id || "",
            bankAccountName: bankAccount?.bankName || "",
            paymentMethodId: paymentMethod?.id || "",
            paymentMethodName: paymentMethod?.name || "",
            amount: newInstallmentAmount,
            status: (formData.type === "Receita" ? "A Receber" : "A Pagar") as any,
            costCenterId: formData.costCenterId,
            costCenterName: costCenter?.name || "",
            description: formData.description,
            installmentNumber: installmentNumber,
            totalInstallments: newInstallmentCount,
            parentTransactionId: parentId,
            origin: "Manual" as any,
          };

          addFinancialTransaction(newTransaction);
        }

        toast.success(`${parcelasACriar} nova(s) parcela(s) criada(s) e existentes atualizadas`);
      }
      // Caso 3: Mesmo número de parcelas, apenas atualizar
      else {
        unsettledInstallments.forEach(txn => {
          updateFinancialTransaction(txn.id, {
            ...txn,
            partyType: formData.partyType,
            partyId: formData.partyId,
            partyName: formData.partyName,
            categoryId: formData.categoryId,
            categoryName: category?.name || "",
            amount: newInstallmentAmount,
            costCenterId: formData.costCenterId,
            costCenterName: costCenter?.name || "",
            description: formData.description,
          });
        });

        toast.success(`${unsettledInstallments.length} parcela(s) atualizada(s) com sucesso`);
      }
    } else {
      // Edição de uma única transação/parcela
      updateFinancialTransaction(editingTransaction, {
        ...transaction,
        partyType: formData.partyType,
        partyId: formData.partyId,
        partyName: formData.partyName,
        categoryId: formData.categoryId,
        categoryName: category?.name || "",
        amount: parseFloat(formData.amount) / 100,
        costCenterId: formData.costCenterId,
        costCenterName: costCenter?.name || "",
        description: formData.description,
      });

      toast.success("Transação atualizada com sucesso");
    }

    setShowEditDialog(false);
    setEditingTransaction(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Recebido": "bg-green-100 text-green-700",
      "Pago": "bg-green-100 text-green-700",
      "A Receber": "bg-blue-100 text-blue-700",
      "A Pagar": "bg-orange-100 text-orange-700",
      "A Vencer": "bg-blue-100 text-blue-700",
      "Vencido": "bg-red-100 text-red-700",
      "Cancelado": "bg-gray-100 text-gray-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Processando": "bg-blue-100 text-blue-700",
      "Confirmado": "bg-purple-100 text-purple-700",
      "Enviado": "bg-yellow-100 text-yellow-700",
      "Entregue": "bg-green-100 text-green-700",
      "Parcialmente Concluído": "bg-orange-100 text-orange-700",
      "Concluído": "bg-green-100 text-green-700",
      "Cancelado": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Transações Financeiras</h1>
            <p className="text-gray-600">Gerencie receitas e despesas do seu negócio</p>
            <p className="text-sm text-blue-600 mt-1">
              💡 As transações de pedidos são criadas automaticamente na entrega e baixadas manualmente ao receber o pagamento
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog(undefined, false)} className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenDialog(undefined, false)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação Manual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenDialog(undefined, true)} className="text-blue-600">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transferência entre Contas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Receitas</p>
                <p className="text-gray-900">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Despesas</p>
                <p className="text-gray-900">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                <Activity className={`w-5 h-5 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo</p>
                <p className={saldo >= 0 ? "text-green-600" : "text-red-600"}>
                  R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Transações</p>
                <p className="text-gray-900">{financialTransactions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Pesquisar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="Receita">Receitas</SelectItem>
              <SelectItem value="Despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="A Receber">A Receber</SelectItem>
              <SelectItem value="A Pagar">A Pagar</SelectItem>
              <SelectItem value="A Vencer">A Vencer</SelectItem>
              <SelectItem value="Vencido">Vencido</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Recebido">Recebido</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas as Origens</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Pedido">Pedido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ações</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Parcela</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((txn) => {
                const linkedOrder = getLinkedOrder(txn);
                const overdue = isOverdue(txn);
                
                return (
                  <TableRow key={txn.id} className={txn.origin === "Pedido" ? "bg-blue-50/30" : ""}>
                    <TableCell>
                      {txn.origin === "Manual" && txn.status !== "Cancelado" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {txn.status !== "Recebido" && txn.status !== "Pago" && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleOpenReceiveDialog(txn.id)}
                                  className={txn.type === "Receita" ? "text-green-600" : "text-blue-600"}
                                >
                                  {txn.type === "Receita" ? (
                                    <>
                                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                                      Confirmar Recebimento
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                                      Confirmar Pagamento
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {txn.totalInstallments && txn.totalInstallments > 1 ? (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleOpenEditDialog(txn.id, "single")}
                                    >
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      Editar Esta Parcela
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleOpenEditDialog(txn.id, "all")}
                                    >
                                      <Edit2 className="mr-2 h-4 w-4" />
                                      Editar Toda a Transação
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenEditDialog(txn.id, "single")}
                                  >
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Editar Transação
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {(txn.status === "Recebido" || txn.status === "Pago") && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  toast.info("Transação já liquidada", {
                                    description: "Transações recebidas/pagas não podem ser editadas"
                                  });
                                }}
                                className="text-gray-500"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {txn.type === "Receita" ? "Recebido" : "Pago"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {txn.origin === "Pedido" && (txn.status === "A Receber" || txn.status === "A Pagar" || txn.status === "Vencido") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReceiveDialog(txn.id)}
                          className={`h-8 w-8 p-0 ${txn.type === "Receita" ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
                          title={txn.type === "Receita" ? "Marcar como recebido" : "Marcar como pago"}
                        >
                          {txn.type === "Receita" ? (
                            <ArrowDownCircle className="w-4 h-4" />
                          ) : (
                            <ArrowUpCircle className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {txn.id}
                        {overdue && (
                          <AlertTriangle className="w-4 h-4 text-red-500" title="Vencido" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={txn.type === "Receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={txn.origin === "Manual" ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"}
                      >
                        {txn.origin === "Manual" ? (
                          <><FileText className="w-3 h-3 mr-1 inline" />Manual</>
                        ) : (
                          <><Package className="w-3 h-3 mr-1 inline" />Pedido</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateLocal(txn.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDateLocal(txn.dueDate)}
                        {overdue && <Clock className="w-3 h-3 text-red-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{txn.partyName}</p>
                        <p className="text-xs text-gray-500">{txn.partyType}</p>
                      </div>
                    </TableCell>
                    <TableCell>{txn.categoryName}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">
                        {txn.bankAccountName || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={txn.type === "Receita" ? "text-green-700" : "text-red-700"}>
                        R$ {txn.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(txn.status)}>
                        {txn.status}
                      </Badge>
                      {txn.paymentDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          em {formatDateLocal(txn.paymentDate)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {linkedOrder ? (
                        <div>
                          <p className="text-sm">{linkedOrder.id}</p>
                          <Badge className={`${getOrderStatusColor(linkedOrder.status)} mt-1`} variant="outline">
                            {linkedOrder.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {txn.installmentNumber && txn.totalInstallments ? (
                        <span className="text-sm">
                          {txn.installmentNumber}/{txn.totalInstallments}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Manual Transaction Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Transação" : isTransferMode ? "Transferência entre Contas" : "Nova Transação Manual"}
            </DialogTitle>
            <DialogDescription>
              {isTransferMode ? "Realize transferências de valores entre suas contas bancárias" : "Registre receitas e despesas não vinculadas a pedidos"}
            </DialogDescription>
          </DialogHeader>

          {isTransferMode ? (
            // FORMULÁRIO DE TRANSFERÊNCIA
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  💡 <strong>Transferência entre Contas:</strong> Esta operação cria automaticamente uma saída na conta de origem e uma entrada na conta de destino.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Conta de Origem */}
                <div>
                  <Label>Conta de Origem *</Label>
                  <Select
                    value={transferData.sourceAccountId}
                    onValueChange={(value) => setTransferData({ ...transferData, sourceAccountId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySettings.bankAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - Saldo: R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conta de Destino */}
                <div>
                  <Label>Conta de Destino *</Label>
                  <Select
                    value={transferData.destinationAccountId}
                    onValueChange={(value) => setTransferData({ ...transferData, destinationAccountId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySettings.bankAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - Saldo: R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data */}
                <div>
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(transferData.date, "PPP", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={transferData.date}
                        onSelect={(date) => date && setTransferData({ ...transferData, date })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Valor */}
                <div>
                  <Label>Valor *</Label>
                  <Input
                    type="text"
                    value={transferData.amount === '' || transferData.amount === '0' ? '' : (parseFloat(transferData.amount) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setTransferData({ ...transferData, amount: value });
                    }}
                    onFocus={(e) => {
                      if (transferData.amount === '' || transferData.amount === '0') {
                        setTransferData({ ...transferData, amount: '' });
                      }
                    }}
                    placeholder="0,00"
                  />
                </div>

                {/* Descrição */}
                <div className="col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={transferData.description}
                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                    placeholder="Motivo da transferência"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleTransfer} className="bg-blue-600 hover:bg-blue-700">
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Realizar Transferência
                </Button>
              </DialogFooter>
            </div>
          ) : (
          <>
          <Tabs defaultValue="header" className="w-full flex flex-col flex-1 overflow-hidden">
            <div className="border-b bg-white">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="header">
                  <FileText className="w-4 h-4 mr-2" />
                  Cabeçalho
                </TabsTrigger>
                <TabsTrigger value="payment">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Condições de Pagamento
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ABA 1: CABEÇALHO */}
              <TabsContent value="header" className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
            {/* Tipo */}
            <div>
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipo de Parceiro */}
            <div>
              <Label>Tipo de Parceiro *</Label>
              <Select
                value={formData.partyType}
                onValueChange={(value: any) => setFormData({ ...formData, partyType: value, partyId: "", partyName: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parceiro */}
            <div>
              <Label>Parceiro Comercial *</Label>
              {formData.partyType === "Cliente" ? (
                <Select
                  value={formData.partyId}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setFormData({ ...formData, partyId: value, partyName: customer?.name || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : formData.partyType === "Fornecedor" ? (
                <Select
                  value={formData.partyId}
                  onValueChange={(value) => {
                    const supplier = suppliers.find(s => s.id === value);
                    setFormData({ ...formData, partyId: value, partyName: supplier?.name || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="Nome do parceiro"
                />
              )}
            </div>

            {/* Categoria */}
            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accountCategories
                    .filter(cat => cat.type === formData.type && cat.isActive)
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.code} - {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor Total */}
            <div>
              <Label>Valor *</Label>
              <Input
                type="text"
                value={formData.amount === '' || formData.amount === '0' ? '' : (parseFloat(formData.amount) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, amount: value });
                }}
                onFocus={(e) => {
                  if (formData.amount === '' || formData.amount === '0') {
                    setFormData({ ...formData, amount: '' });
                  }
                }}
                placeholder="0,00"
              />
            </div>

            {/* Centro de Custo */}
            <div>
              <Label>Centro de Custo</Label>
              <Select
                value={formData.costCenterId || "none"}
                onValueChange={(value) => setFormData({ ...formData, costCenterId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {companySettings.costCenters.map(center => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da transação"
              />
            </div>
                </div>
              </TabsContent>

              {/* ABA 2: CONDIÇÕES DE PAGAMENTO */}
              <TabsContent value="payment" className="space-y-4 p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 mb-2">
                    💡 <strong>Como funciona:</strong>
                  </p>
                  <ul className="text-sm text-blue-900 space-y-1 ml-4 list-disc">
                    <li>Configure o parcelamento e as datas de vencimento abaixo</li>
                    <li>Uma transação será criada para cada parcela automaticamente</li>
                    <li>A conta bancária e forma de pagamento serão definidas <strong>no momento da liquidação manual</strong></li>
                    <li>Liquide cada parcela individualmente através do botão de ação nas transações</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Número de Parcelas */}
                  <div>
                    <Label>Número de Parcelas *</Label>
                    <Select
                      value={formData.installments}
                      onValueChange={(value) => setFormData({ ...formData, installments: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prazo 1ª Parcela */}
                  <div>
                    <Label>Prazo 1ª Parcela (dias)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.firstInstallmentDays}
                      onChange={(e) => setFormData({ ...formData, firstInstallmentDays: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dias após a data da transação para vencimento da 1ª parcela
                    </p>
                  </div>

                  {/* Tabela de Parcelas Calculadas */}
                  <div className="col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-blue-900">
                            <strong>{formData.installments}x</strong> de <strong>
                              R$ {((parseFloat(formData.amount || "0") / 100) / parseInt(formData.installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                        </div>
                        <div className="text-blue-700">
                          Total: <strong>R$ {(parseFloat(formData.amount || "0") / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    </div>

                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Parcela</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: parseInt(formData.installments) }, (_, i) => {
                            const totalAmount = parseFloat(formData.amount || "0");
                            const installmentAmount = totalAmount / parseInt(formData.installments);
                            const amount = i === parseInt(formData.installments) - 1 
                              ? totalAmount - (installmentAmount * (parseInt(formData.installments) - 1))
                              : installmentAmount;
                            
                            const daysToAdd = formData.firstInstallmentDays + (i * 30);
                            const dueDate = addDaysToDate(formData.date.toISOString().split('T')[0], daysToAdd);
                            
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dueDateObj = new Date(dueDate);
                            dueDateObj.setHours(0, 0, 0, 0);
                            const isOverdue = dueDateObj < today;
                            
                            return (
                              <TableRow key={i}>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50">
                                    {i + 1}/{formData.installments}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                    <span className={isOverdue ? "text-red-600" : ""}>
                                      {formatDateLocal(dueDate)}
                                    </span>
                                    {isOverdue && (
                                      <Badge className="bg-red-100 text-red-700 text-xs">
                                        Vencido
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Criar {parseInt(formData.installments) > 1 ? `${formData.installments} Transações` : "Transação"}
            </Button>
          </DialogFooter>
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive/Pay Transaction Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento/Pagamento</DialogTitle>
            <DialogDescription>
              Informe a data efetiva do recebimento ou pagamento
            </DialogDescription>
          </DialogHeader>

          {receivingTransaction && (() => {
            const txn = financialTransactions.find(t => t.id === receivingTransaction);
            const linkedOrder = txn ? getLinkedOrder(txn) : null;
            
            return txn ? (
              <div className="space-y-4">
                {/* Informações da Transação */}
                <Card className="p-4 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span>{txn.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <Badge className={txn.type === "Receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {txn.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parceiro:</span>
                      <span>{txn.partyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor:</span>
                      <span className={txn.type === "Receita" ? "text-green-700" : "text-red-700"}>
                        R$ {txn.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {txn.installmentNumber && txn.totalInstallments && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcela:</span>
                        <span>{txn.installmentNumber}/{txn.totalInstallments}</span>
                      </div>
                    )}
                    {linkedOrder && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pedido:</span>
                        <span>{linkedOrder.id}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Data Efetiva */}
                <div>
                  <Label>Data Efetiva de {txn.type === "Receita" ? "Recebimento" : "Pagamento"} *</Label>
                  <Popover open={showCalendarPopover} onOpenChange={setShowCalendarPopover}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start mt-2">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(effectiveDate, "PPP", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={effectiveDate}
                        onSelect={(date) => {
                          if (date) {
                            setEffectiveDate(date);
                            setShowCalendarPopover(false);
                          }
                        }}
                        locale={ptBR}
                        disabled={(date) => {
                          // Desabilitar datas futuras
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          return date > today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 mt-1">
                    ⓘ A data de liquidação não pode ser futura. Máximo: hoje.
                  </p>
                </div>

                {/* Conta Bancária */}
                <div>
                  <Label>Conta de {txn.type === "Receita" ? "Recebimento" : "Pagamento"} *</Label>
                  <Select 
                    value={receiveBankAccountId} 
                    onValueChange={(value) => setReceiveBankAccountId(value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySettings.bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - {account.accountType} ({account.agency}/{account.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {companySettings.bankAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Nenhuma conta cadastrada. Cadastre em Minha Empresa.
                    </p>
                  )}
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <Label>Forma de Pagamento *</Label>
                  <Select 
                    value={receivePaymentMethodId} 
                    onValueChange={(value) => setReceivePaymentMethodId(value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.filter(pm => pm.isActive).map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} {method.type && `(${method.type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paymentMethods.filter(pm => pm.isActive).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Nenhuma forma de pagamento ativa. Cadastre em Minha Empresa.
                    </p>
                  )}
                </div>

                {/* Alerta de Impacto */}
                {linkedOrder && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <p className="text-blue-800">
                      ℹ️ Esta ação atualizará automaticamente o status do pedido {linkedOrder.id}
                    </p>
                  </div>
                )}
              </div>
            ) : null;
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsReceived} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Transação */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInstallmentMode === "all" ? "Editar Toda a Transação" : "Editar Transação"}
            </DialogTitle>
            <DialogDescription>
              {editingInstallmentMode === "all" 
                ? "Edite a transação completa. Você pode alterar o número de parcelas - o sistema irá criar, cancelar ou recalcular conforme necessário."
                : "Edite as informações da transação. Valores já recebidos/pagos não podem ser alterados."}
            </DialogDescription>
          </DialogHeader>

          {/* Alerta informativo sobre parcelas liquidadas */}
          {editingInstallmentMode === "all" && settledInstallmentsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-900 mb-1">
                    <strong>Importante:</strong> Esta transação possui <strong>{settledInstallmentsCount}</strong> parcela{settledInstallmentsCount > 1 ? 's' : ''} já liquidada{settledInstallmentsCount > 1 ? 's' : ''}.
                  </p>
                  <p className="text-amber-700 text-xs">
                    O valor total exibido refere-se apenas às <strong>{formData.installments} parcela{parseInt(formData.installments) > 1 ? 's' : ''} não liquidada{parseInt(formData.installments) > 1 ? 's' : ''}</strong> que podem ser editadas.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Tipo e Data - Apenas para modo "all" */}
            {editingInstallmentMode === "all" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita">Receita</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.date, "PPP", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => date && setFormData({ ...formData, date })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Parceiro Comercial */}
            <div>
              <Label>Tipo de Parceiro *</Label>
              <Select
                value={formData.partyType}
                onValueChange={(value: any) => setFormData({ ...formData, partyType: value, partyId: "", partyName: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Parceiro Comercial *</Label>
              {formData.partyType === "Cliente" ? (
                <Select
                  value={formData.partyId}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setFormData({ ...formData, partyId: value, partyName: customer?.name || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : formData.partyType === "Fornecedor" ? (
                <Select
                  value={formData.partyId}
                  onValueChange={(value) => {
                    const supplier = suppliers.find(s => s.id === value);
                    setFormData({ ...formData, partyId: value, partyName: supplier?.name || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="Nome do parceiro"
                />
              )}
            </div>

            {/* Categoria */}
            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {accountCategories
                    .filter(cat => cat.type === formData.type)
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div>
              <Label>Valor Total *</Label>
              <Input
                type="text"
                value={formData.amount === '' || formData.amount === '0' ? '' : (parseFloat(formData.amount) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, amount: value });
                }}
                onFocus={(e) => {
                  if (formData.amount === '' || formData.amount === '0') {
                    setFormData({ ...formData, amount: '' });
                  }
                }}
                placeholder="0,00"
              />
              {editingInstallmentMode === "all" && parseInt(formData.installments) > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Valor por parcela: R$ {(parseFloat(formData.amount || "0") / 100 / parseInt(formData.installments)).toFixed(2)}
                </p>
              )}
            </div>

            {/* Campos de Parcelamento - Apenas para modo "all" */}
            {editingInstallmentMode === "all" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Número de Parcelas *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="360"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Altere para adicionar ou remover parcelas
                  </p>
                </div>

                <div>
                  <Label>Dias para 1ª Parcela</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.firstInstallmentDays}
                    onChange={(e) => setFormData({ ...formData, firstInstallmentDays: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Parcelas subsequentes: +30 dias cada
                  </p>
                </div>
              </div>
            )}

            {/* Centro de Custo */}
            {companySettings.costCenters.length > 0 && (
              <div>
                <Label>Centro de Custo</Label>
                <Select
                  value={formData.costCenterId}
                  onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {companySettings.costCenters.map(center => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da transação"
              />
            </div>

            {editingInstallmentMode === "all" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
                <p className="text-blue-800">
                  ℹ️ <strong>Edição de transação parcelada:</strong>
                </p>
                {settledInstallmentsCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs">
                    <p className="text-green-800">
                      ✓ <strong>{settledInstallmentsCount}</strong> parcela{settledInstallmentsCount > 1 ? 's' : ''} já liquidada{settledInstallmentsCount > 1 ? 's' : ''} (não será{settledInstallmentsCount > 1 ? 'm' : ''} alterada{settledInstallmentsCount > 1 ? 's' : ''})
                    </p>
                  </div>
                )}
                <ul className="text-blue-700 text-xs space-y-1 ml-4">
                  <li>• Você está editando apenas as {formData.installments} parcela{parseInt(formData.installments) > 1 ? 's' : ''} não liquidada{parseInt(formData.installments) > 1 ? 's' : ''}</li>
                  <li>• Ao reduzir parcelas: as últimas serão canceladas</li>
                  <li>• Ao aumentar parcelas: novas serão criadas automaticamente</li>
                  <li>• Os valores serão recalculados proporcionalmente</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
