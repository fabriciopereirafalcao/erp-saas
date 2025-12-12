import React, { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Search, DollarSign, AlertTriangle, Clock, ArrowDownCircle, ArrowUpCircle, FileText, Package, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { formatDateLocal } from "../utils/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AccountsPayableReceivable() {
  const {
    financialTransactions,
    salesOrders,
    purchaseOrders,
    companySettings,
    paymentMethods,
    markTransactionAsReceived,
    markTransactionAsPaid
  } = useERP();

  // ✅ Proteções contra arrays undefined
  const safeFinancialTransactions = financialTransactions || [];
  const safeSalesOrders = salesOrders || [];
  const safePurchaseOrders = purchaseOrders || [];
  const safePaymentMethods = paymentMethods || [];
  const safeBankAccounts = companySettings?.bankAccounts || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatusReceivable, setFilterStatusReceivable] = useState("Todos");
  const [filterStatusPayable, setFilterStatusPayable] = useState("Todos");
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receivingTransaction, setReceivingTransaction] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [receiveBankAccountId, setReceiveBankAccountId] = useState<string>("");
  const [receivePaymentMethodId, setReceivePaymentMethodId] = useState<string>("");
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper: buscar ordem vinculada (pedido de venda ou compra)
  const getLinkedOrder = (txn: any) => {
    if (txn.origin === "Pedido" && txn.reference) {
      // Primeiro tentar buscar em pedidos de venda
      const salesOrder = safeSalesOrders.find(o => o.id === txn.reference);
      if (salesOrder) {
        return salesOrder;
      }
      // Se não encontrar, buscar em pedidos de compra
      const purchaseOrder = safePurchaseOrders.find(o => o.id === txn.reference);
      if (purchaseOrder) {
        return purchaseOrder;
      }
    }
    return null;
  };

  // Helper: verificar se está vencido
  const isOverdue = (txn: any) => {
    const dueDate = new Date(txn.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && (txn.status === "A Receber" || txn.status === "A Pagar" || txn.status === "A Vencer" || txn.status === "Vencido");
  };

  // Filtrar transações a receber
  const receivableTransactions = safeFinancialTransactions.filter(t => 
    t.type === "Receita" && (t.status === "A Receber" || t.status === "A Vencer" || t.status === "Vencido")
  );

  // Filtrar transações a pagar
  const payableTransactions = safeFinancialTransactions.filter(t => 
    t.type === "Despesa" && (t.status === "A Pagar" || t.status === "A Vencer" || t.status === "Vencido")
  );

  // Filtrar com busca - Contas a Receber
  const filteredReceivables = receivableTransactions.filter(txn => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.reference && txn.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatusReceivable === "Todos" || txn.status === filterStatusReceivable;
    return matchesSearch && matchesStatus;
  });

  // Filtrar com busca - Contas a Pagar
  const filteredPayables = payableTransactions.filter(txn => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.reference && txn.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatusPayable === "Todos" || txn.status === filterStatusPayable;
    return matchesSearch && matchesStatus;
  });

  // Estatísticas - Contas a Receber
  const receivablesToday = receivableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).reduce((sum, t) => sum + t.amount, 0);

  const receivablesWeek = receivableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  }).reduce((sum, t) => sum + t.amount, 0);

  const receivablesOverdue = receivableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).reduce((sum, t) => sum + t.amount, 0);

  const receivablesMonth = safeFinancialTransactions.filter(t =>
    t.type === "Receita" && 
    t.status === "Recebido" && 
    t.paymentDate &&
    new Date(t.paymentDate).getMonth() === today.getMonth()
  ).reduce((sum, t) => sum + t.amount, 0);

  // Estatísticas - Contas a Pagar
  const payablesToday = payableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).reduce((sum, t) => sum + t.amount, 0);

  const payablesWeek = payableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  }).reduce((sum, t) => sum + t.amount, 0);

  const payablesOverdue = payableTransactions.filter(t => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).reduce((sum, t) => sum + t.amount, 0);

  const payablesMonth = safeFinancialTransactions.filter(t =>
    t.type === "Despesa" && 
    t.status === "Pago" && 
    t.paymentDate &&
    new Date(t.paymentDate).getMonth() === today.getMonth()
  ).reduce((sum, t) => sum + t.amount, 0);

  // Total a receber e pagar
  const totalReceivable = receivableTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPayable = payableTransactions.reduce((sum, t) => sum + t.amount, 0);

  const handleOpenReceiveDialog = (transactionId: string) => {
    setReceivingTransaction(transactionId);
    setEffectiveDate(new Date());
    setReceiveBankAccountId(safeBankAccounts[0]?.id || "");
    setReceivePaymentMethodId(safePaymentMethods.find(pm => pm.isActive)?.id || "");
    setShowReceiveDialog(true);
  };

  const handleMarkAsReceived = () => {
    if (!receivingTransaction) return;
    
    const transaction = safeFinancialTransactions.find(t => t.id === receivingTransaction);
    if (!transaction) {
      return;
    }

    if (!receiveBankAccountId || !receivePaymentMethodId) {
      return;
    }

    const formattedDate = effectiveDate.toISOString().split('T')[0];
    const bankAccount = safeBankAccounts.find(b => b.id === receiveBankAccountId);
    const paymentMethod = safePaymentMethods.find(pm => pm.id === receivePaymentMethodId);
    
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
      "Recebido": "bg-green-100 text-green-700",
      "Parcialmente Concluído": "bg-orange-100 text-orange-700",
      "Concluído": "bg-green-100 text-green-700",
      "Cancelado": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Contas a Pagar e Receber</h1>
        <p className="text-gray-600">Controle financeiro completo do seu negócio</p>
        <p className="text-sm text-blue-600 mt-1">
          💡 Liquidação de transações de pedidos - receba e pague suas contas diretamente aqui
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contas a Receber */}
            <div className="space-y-4">
              <h2 className="text-gray-800">Contas a Receber</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Vencer Hoje</p>
                      <p className="text-gray-900">R$ {receivablesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Vencer na Semana</p>
                      <p className="text-gray-900">R$ {receivablesWeek.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Em Atraso</p>
                      <p className="text-red-600">R$ {receivablesOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recebido no Mês</p>
                      <p className="text-green-600">R$ {receivablesMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Contas a Pagar */}
            <div className="space-y-4">
              <h2 className="text-gray-800">Contas a Pagar</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Vencer Hoje</p>
                      <p className="text-gray-900">R$ {payablesToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Vencer na Semana</p>
                      <p className="text-gray-900">R$ {payablesWeek.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Em Atraso</p>
                      <p className="text-red-600">R$ {payablesOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <ArrowUpCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pago no Mês</p>
                      <p className="text-green-600">R$ {payablesMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Saldo Projetado */}
          <Card className="p-6">
            <h3 className="text-gray-800 mb-4">Projeção Financeira</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total a Receber</p>
                  <p className="text-green-600">
                    R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <ArrowUpCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total a Pagar</p>
                  <p className="text-red-600">
                    R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Saldo Projetado</p>
                  <p className="text-blue-600">
                    R$ {(totalReceivable - totalPayable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Contas a Receber */}
        <TabsContent value="receivable" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Pesquisar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatusReceivable} onValueChange={setFilterStatusReceivable}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="A Receber">A Receber</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ações</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Parcela</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                      Nenhuma conta a receber encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceivables.map((txn) => {
                    const linkedOrder = getLinkedOrder(txn);
                    const overdue = isOverdue(txn);
                    
                    return (
                      <TableRow key={txn.id} className={txn.origin === "Pedido" ? "bg-blue-50/30" : ""}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReceiveDialog(txn.id)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Marcar como recebido"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </Button>
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
                          <Badge className="bg-green-100 text-green-700">
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
                          <span className="text-green-700">
                            R$ {txn.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(txn.status)}>
                            {txn.status}
                          </Badge>
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
        </TabsContent>

        {/* Contas a Pagar */}
        <TabsContent value="payable" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Pesquisar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatusPayable} onValueChange={setFilterStatusPayable}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="A Pagar">A Pagar</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ações</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Parcela</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                      Nenhuma conta a pagar encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayables.map((txn) => {
                    const linkedOrder = getLinkedOrder(txn);
                    const overdue = isOverdue(txn);
                    
                    return (
                      <TableRow key={txn.id} className={txn.origin === "Pedido" ? "bg-blue-50/30" : ""}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReceiveDialog(txn.id)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Marcar como pago"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
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
                          <Badge className="bg-red-100 text-red-700">
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
                          <span className="text-red-700">
                            R$ {txn.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(txn.status)}>
                            {txn.status}
                          </Badge>
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
        </TabsContent>
      </Tabs>

      {/* Receive/Pay Dialog - VERSÃO COMPLETA */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento/Pagamento</DialogTitle>
            <DialogDescription>
              Informe a data efetiva do recebimento ou pagamento
            </DialogDescription>
          </DialogHeader>

          {receivingTransaction && (() => {
            const txn = safeFinancialTransactions.find(t => t.id === receivingTransaction);
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
                        {format(effectiveDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
                      {safeBankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - {account.accountType} ({account.agency}/{account.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {safeBankAccounts.length === 0 && (
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
                      {safePaymentMethods.filter(pm => pm.isActive).map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} {method.type && `(${method.type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {safePaymentMethods.filter(pm => pm.isActive).length === 0 && (
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
    </div>
  );
}