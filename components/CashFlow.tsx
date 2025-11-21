import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Plus, AlertTriangle, FileText, Download, Info } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateLocal } from "../utils/dateUtils";

export function CashFlow() {
  const {
    cashFlowEntries,
    accountsReceivable,
    accountsPayable,
    companySettings,
    financialTransactions,
    addCashFlowEntry,
    deleteCashFlowEntry,
    customers,
    suppliers
  } = useERP();

  // ✅ Proteções contra arrays undefined
  const safeCashFlowEntries = cashFlowEntries || [];
  const safeAccountsReceivable = accountsReceivable || [];
  const safeAccountsPayable = accountsPayable || [];
  const safeFinancialTransactions = financialTransactions || [];
  const safeBankAccounts = companySettings?.bankAccounts || [];
  const safeCostCenters = companySettings?.costCenters || [];
  const safeCustomers = customers || [];
  const safeSuppliers = suppliers || [];

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    type: "Entrada" as "Entrada" | "Saída",
    category: "",
    description: "",
    amount: "",
    status: "Previsto" as "Realizado" | "Previsto" | "Projetado"
  });

  // Filtros para visão diária
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("all");

  // Filtros para visão mensal
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedBankMonthly, setSelectedBankMonthly] = useState<string>("all");
  const [selectedPartnerMonthly, setSelectedPartnerMonthly] = useState<string>("all");
  const [selectedCostCenterMonthly, setSelectedCostCenterMonthly] = useState<string>("all");

  // Calcular fluxo de caixa
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const calculateCashFlow = () => {
    const flowData: any[] = [];
    
    // Calcular saldo inicial baseado nos filtros
    let initialBalance = 0;
    if (selectedBank === "all") {
      initialBalance = safeBankAccounts.reduce((sum, bank) => sum + bank.balance, 0);
    } else {
      const bank = safeBankAccounts.find(b => b.id === selectedBank);
      initialBalance = bank ? bank.balance : 0;
    }

    let currentBalance = initialBalance; // Saldo que considera apenas realizados
    
    // Data atual para comparação
    const today = format(new Date(), 'yyyy-MM-dd');

    days.forEach((day, index) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Verificar se é data futura
      const isFutureDate = dateStr > today;

      // Saldo inicial do dia = saldo atual do dia anterior
      const dayInitialBalance = currentBalance;
      
      // Aplicar filtros nas transações
      let filteredTransactions = safeFinancialTransactions;
      
      if (selectedBank !== "all") {
        filteredTransactions = filteredTransactions.filter(t => t.bankAccountId === selectedBank);
      }
      
      if (selectedPartner !== "all") {
        filteredTransactions = filteredTransactions.filter(t => 
          t.customerId === selectedPartner || t.supplierId === selectedPartner
        );
      }
      
      // REALIZADOS - Entradas realizadas (Recebido)
      const realizedIncome = filteredTransactions
        .filter(t => t.type === "Receita" && t.paymentDate === dateStr && t.status === "Recebido")
        .reduce((sum, t) => sum + t.amount, 0);

      // REALIZADOS - Saídas realizadas (Pago)
      const realizedExpenses = filteredTransactions
        .filter(t => t.type === "Despesa" && t.paymentDate === dateStr && t.status === "Pago")
        .reduce((sum, t) => sum + t.amount, 0);

      // Atualizar saldo atual (após movimentações realizadas)
      currentBalance += realizedIncome - realizedExpenses;

      // EM ABERTO - Entradas previstas DO DIA (apenas para exibição na coluna)
      const openIncomeDay = filteredTransactions
        .filter(t => t.type === "Receita" && t.dueDate === dateStr && t.status !== "Recebido" && t.status !== "Cancelado")
        .reduce((sum, t) => sum + t.amount, 0);

      // EM ABERTO - Saídas previstas DO DIA (apenas para exibição na coluna)
      const openExpensesDay = filteredTransactions
        .filter(t => t.type === "Despesa" && t.dueDate === dateStr && t.status !== "Pago" && t.status !== "Cancelado")
        .reduce((sum, t) => sum + t.amount, 0);

      // EM ABERTO ACUMULADO - Entradas previstas até a data atual (para cálculo do saldo final)
      const cumulativeOpenIncome = filteredTransactions
        .filter(t => {
          if (t.type !== "Receita" || !t.dueDate || t.status === "Recebido" || t.status === "Cancelado") return false;
          return t.dueDate <= dateStr;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // EM ABERTO ACUMULADO - Saídas previstas até a data atual (para cálculo do saldo final)
      const cumulativeOpenExpenses = filteredTransactions
        .filter(t => {
          if (t.type !== "Despesa" || !t.dueDate || t.status === "Pago" || t.status === "Cancelado") return false;
          return t.dueDate <= dateStr;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Verificar se há pendências de dias anteriores
      const hasPreviousPending = filteredTransactions
        .some(t => {
          if (!t.dueDate || t.dueDate >= dateStr) return false;
          if (t.type === "Receita") return t.status !== "Recebido" && t.status !== "Cancelado";
          if (t.type === "Despesa") return t.status !== "Pago" && t.status !== "Cancelado";
          return false;
        });

      // PROJEÇÕES MANUAIS - Sempre incluídas
      const projectedIncome = safeCashFlowEntries
        .filter(e => e.date === dateStr && e.type === "Entrada" && e.status === "Projetado")
        .reduce((sum, e) => sum + e.amount, 0);

      const projectedExpenses = safeCashFlowEntries
        .filter(e => e.date === dateStr && e.type === "Saída" && e.status === "Projetado")
        .reduce((sum, e) => sum + e.amount, 0);

      // Combinar valores do dia + projeções (para exibição nas colunas)
      const totalOpenIncomeDay = openIncomeDay + projectedIncome;
      const totalOpenExpensesDay = openExpensesDay + projectedExpenses;

      // Saldo final = saldo atual + valores em aberto ACUMULADOS até a data
      const finalBalance = currentBalance + cumulativeOpenIncome - cumulativeOpenExpenses;

      flowData.push({
        date: format(day, 'dd/MM'),
        fullDate: format(day, 'dd/MM/yyyy'),
        dateStr,
        // Realizados
        initialBalance: dayInitialBalance,
        realizedIncome,
        realizedExpenses,
        currentBalance: isFutureDate ? null : currentBalance, // Null para datas futuras
        // Em Aberto
        openIncome: totalOpenIncomeDay,
        openExpenses: totalOpenExpensesDay,
        finalBalance,
        hasPreviousPending, // Indicador de pendências anteriores
        // Para compatibilidade com gráficos (soma tudo)
        income: realizedIncome + totalOpenIncomeDay,
        expenses: realizedExpenses + totalOpenExpensesDay,
        balance: finalBalance
      });
    });

    return flowData;
  };

  const cashFlowData = calculateCashFlow();

  // Função para calcular fluxo de caixa mensal
  const calculateMonthlyCashFlow = () => {
    const year = parseInt(selectedYear);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Calcular saldo inicial baseado nos filtros
    let initialBalance = 0;
    if (selectedBankMonthly === "all") {
      initialBalance = safeBankAccounts.reduce((sum, bank) => sum + bank.balance, 0);
    } else {
      const bank = safeBankAccounts.find(b => b.id === selectedBankMonthly);
      initialBalance = bank ? bank.balance : 0;
    }

    const monthlyData: any[] = [];
    let cumulativeBalance = initialBalance;

    months.forEach((monthName, monthIndex) => {
      const monthStartDate = new Date(year, monthIndex, 1);
      const monthEndDate = new Date(year, monthIndex + 1, 0);

      // Aplicar filtros nas transações
      let filteredTransactions = safeFinancialTransactions;
      
      if (selectedBankMonthly !== "all") {
        filteredTransactions = filteredTransactions.filter(t => t.bankAccountId === selectedBankMonthly);
      }
      
      if (selectedPartnerMonthly !== "all") {
        filteredTransactions = filteredTransactions.filter(t => 
          t.customerId === selectedPartnerMonthly || t.supplierId === selectedPartnerMonthly
        );
      }

      // REALIZADOS - Entradas realizadas no mês
      const realizedIncome = filteredTransactions
        .filter(t => {
          if (t.type !== "Receita" || t.status !== "Recebido" || !t.paymentDate) return false;
          const paymentDate = new Date(t.paymentDate + 'T00:00:00');
          return paymentDate >= monthStartDate && paymentDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // REALIZADOS - Saídas realizadas no mês
      const realizedExpenses = filteredTransactions
        .filter(t => {
          if (t.type !== "Despesa" || t.status !== "Pago" || !t.paymentDate) return false;
          const paymentDate = new Date(t.paymentDate + 'T00:00:00');
          return paymentDate >= monthStartDate && paymentDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Saldo inicial do mês
      const monthInitialBalance = cumulativeBalance;

      // Atualizar saldo acumulado
      cumulativeBalance += realizedIncome - realizedExpenses;

      // EM ABERTO - Entradas previstas no mês (transações financeiras de Receita não liquidadas)
      const openIncome = filteredTransactions
        .filter(t => {
          if (t.type !== "Receita" || !t.dueDate || t.status === "Recebido" || t.status === "Cancelado") return false;
          const dueDate = new Date(t.dueDate + 'T00:00:00');
          return dueDate >= monthStartDate && dueDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // EM ABERTO - Saídas previstas no mês (transações financeiras de Despesa não liquidadas)
      const openExpenses = filteredTransactions
        .filter(t => {
          if (t.type !== "Despesa" || !t.dueDate || t.status === "Pago" || t.status === "Cancelado") return false;
          const dueDate = new Date(t.dueDate + 'T00:00:00');
          return dueDate >= monthStartDate && dueDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Saldo final do mês (incluindo em aberto)
      const finalBalance = cumulativeBalance + openIncome - openExpenses;

      monthlyData.push({
        month: monthName,
        initialBalance: monthInitialBalance,
        realizedIncome,
        realizedExpenses,
        currentBalance: cumulativeBalance,
        openIncome,
        openExpenses,
        finalBalance
      });
    });

    return monthlyData;
  };

  const monthlyCashFlowData = calculateMonthlyCashFlow();

  // Estatísticas do mês
  const totalIncome = cashFlowData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = cashFlowData.reduce((sum, d) => sum + d.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const finalBalance = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].balance : 0;
  const minBalance = Math.min(...cashFlowData.map(d => d.balance));
  const needWorkingCapital = minBalance < 0;

  // Criar lista de parceiros (clientes + fornecedores)
  const partners = [
    ...safeCustomers.map(c => ({ id: c.id, name: c.name, type: 'Cliente' })),
    ...safeSuppliers.map(s => ({ id: s.id, name: s.name, type: 'Fornecedor' }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;

    addCashFlowEntry({
      date: format(formData.date, 'yyyy-MM-dd'),
      type: formData.type,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      status: formData.status
    });

    setShowAddDialog(false);
    setFormData({
      date: new Date(),
      type: "Entrada",
      category: "",
      description: "",
      amount: "",
      status: "Previsto"
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Fluxo de Caixa</h1>
            <p className="text-gray-600">Acompanhe e projete o fluxo de caixa da sua empresa</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
            <Plus className="w-4 h-4 mr-2" />
            Nova Projeção
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Entradas</p>
                <p className="text-green-600">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Saídas</p>
                <p className="text-red-600">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${netCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                <DollarSign className={`w-5 h-5 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo no Período</p>
                <p className={netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"}>
                  R$ {netCashFlow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm text-gray-600">Saldo Projetado</p>
                <p className="text-purple-600">R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </Card>

          <Card className={`p-4 ${needWorkingCapital ? 'border-red-300 bg-red-50' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${needWorkingCapital ? 'bg-red-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                <AlertTriangle className={`w-5 h-5 ${needWorkingCapital ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ponto Mínimo</p>
                <p className={needWorkingCapital ? "text-red-600" : "text-gray-900"}>
                  R$ {minBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

      </div>

      <Tabs defaultValue="chart" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chart">Gráficos</TabsTrigger>
          <TabsTrigger value="daily">Visão Diária</TabsTrigger>
          <TabsTrigger value="monthly">Visão Mensal</TabsTrigger>
          <TabsTrigger value="projections">Projeções Manuais</TabsTrigger>
        </TabsList>

        {/* Charts */}
        <TabsContent value="chart" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-gray-800 mb-4">Evolução do Saldo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="currentBalance" 
                  name="Saldo Atual (Realizado)" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                />
                <Line 
                  type="monotone" 
                  dataKey="finalBalance" 
                  name="Saldo Final (Projetado)" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-gray-800 mb-4">Entradas vs Saídas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="income" name="Entradas" fill="#10b981" />
                <Bar dataKey="expenses" name="Saídas" fill="#ef4444" />
                <Line type="monotone" dataKey="net" name="Líquido" stroke="#3b82f6" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Daily View */}
        <TabsContent value="daily">
          <Card className="p-6">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Competência */}
              <div>
                <Label className="text-sm mb-2 block">Competência</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedMonth, "MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Banco/Cartão */}
              <div>
                <Label className="text-sm mb-2 block">Banco / Caixa</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {safeBankAccounts.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parceiro */}
              <div>
                <Label className="text-sm mb-2 block">Parceiro</Label>
                <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {partners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} ({partner.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Centro (Centro de Custo) */}
              <div>
                <Label className="text-sm mb-2 block">Centro</Label>
                <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 mb-6">
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                GERAR PDF
              </Button>
            </div>

            {/* Tabela */}
            <TooltipProvider>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  {/* Cabeçalho com grupos */}
                  <tr className="bg-gray-200 border-b">
                    <th rowSpan={2} className="px-3 py-3 text-left text-sm text-gray-700 border-r">Data</th>
                    <th colSpan={4} className="px-3 py-2 text-center text-sm text-gray-700 border-r">Realizados</th>
                    <th colSpan={3} className="px-3 py-2 text-center text-sm text-gray-700">Em Aberto</th>
                  </tr>
                  <tr className="bg-gray-100 border-b">
                    {/* Realizados */}
                    <th className="px-3 py-2 text-right text-sm text-gray-700">Saldo Inicial</th>
                    <th className="px-3 py-2 text-right text-sm text-gray-700">Entradas</th>
                    <th className="px-3 py-2 text-right text-sm text-gray-700">Saídas</th>
                    <th className="px-3 py-2 text-right text-sm text-gray-700 border-r">Saldo Atual</th>
                    {/* Em Aberto */}
                    <th className="px-3 py-2 text-right text-sm text-gray-700">Entradas</th>
                    <th className="px-3 py-2 text-right text-sm text-gray-700">Saídas</th>
                    <th className="px-3 py-2 text-right text-sm text-gray-700">
                      <div className="flex items-center justify-end gap-1">
                        Saldo Final
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              O Saldo Final considera todas as entradas e saídas em aberto até a data da linha (incluindo dias anteriores não realizados).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.map((day, index) => (
                    <tr 
                      key={index} 
                      className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-3 py-2.5 text-sm text-gray-900 border-r">{day.fullDate}</td>
                      {/* Realizados */}
                      <td className="px-3 py-2.5 text-sm text-right text-gray-900">
                        {day.currentBalance !== null 
                          ? `R$ ${day.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : '-'
                        }
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-green-600">
                        {day.realizedIncome > 0 ? `R$ ${day.realizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-red-600">
                        {day.realizedExpenses > 0 ? `R$ ${day.realizedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-3 py-2.5 text-sm text-right border-r ${day.currentBalance !== null && day.currentBalance >= 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {day.currentBalance !== null 
                          ? `R$ ${day.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : '-'
                        }
                      </td>
                      {/* Em Aberto */}
                      <td className="px-3 py-2.5 text-sm text-right text-green-600">
                        {day.openIncome > 0 ? `R$ ${day.openIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-red-600">
                        {day.openExpenses > 0 ? `R$ ${day.openExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-3 py-2.5 text-sm text-right ${day.finalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                          R$ {day.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          {day.hasPreviousPending && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="w-3 h-3 text-orange-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  Existem lançamentos em aberto de dias anteriores impactando este saldo.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de Totais */}
                  <tr className="bg-gray-200 border-t-2 border-gray-300">
                    <td className="px-3 py-3 text-sm text-gray-900 border-r">Totais</td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900">-</td>
                    <td className="px-3 py-3 text-sm text-right text-green-700">
                      R$ {cashFlowData.reduce((sum, d) => sum + d.realizedIncome, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-red-700">
                      R$ {cashFlowData.reduce((sum, d) => sum + d.realizedExpenses, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-gray-900 border-r">-</td>
                    <td className="px-3 py-3 text-sm text-right text-green-700">
                      R$ {cashFlowData.reduce((sum, d) => sum + d.openIncome, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-red-700">
                      R$ {cashFlowData.reduce((sum, d) => sum + d.openExpenses, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-3 py-3 text-sm text-right ${finalBalance >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                      R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </TooltipProvider>
          </Card>
        </TabsContent>

        {/* Monthly View */}
        <TabsContent value="monthly">
          <Card className="p-6">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Ano */}
              <div>
                <Label className="text-sm mb-2 block">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Banco/Caixa */}
              <div>
                <Label className="text-sm mb-2 block">Banco / Caixa</Label>
                <Select value={selectedBankMonthly} onValueChange={setSelectedBankMonthly}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {safeBankAccounts.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parceiro */}
              <div>
                <Label className="text-sm mb-2 block">Parceiro</Label>
                <Select value={selectedPartnerMonthly} onValueChange={setSelectedPartnerMonthly}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {partners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} ({partner.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Centro */}
              <div>
                <Label className="text-sm mb-2 block">Centro</Label>
                <Select value={selectedCostCenterMonthly} onValueChange={setSelectedCostCenterMonthly}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 mb-6">
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                GERAR PDF
              </Button>
            </div>

            {/* Tabela Mensal */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="px-3 py-3 text-left text-sm text-gray-700 sticky left-0 bg-gray-200 z-10 min-w-[200px]">
                      Fluxo de Caixa
                    </th>
                    {monthlyCashFlowData.map((data, index) => (
                      <th key={index} className="px-3 py-3 text-center text-sm text-gray-700 min-w-[120px]">
                        {data.month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Saldo Inicial */}
                  <tr className="border-b bg-white hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-white z-10">
                      Saldo Inicial
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td key={index} className="px-3 py-2.5 text-sm text-right text-gray-900">
                        R$ {data.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    ))}
                  </tr>

                  {/* Entradas (Realizadas) */}
                  <tr className="border-b bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-gray-50 z-10">
                      Entradas (Realizadas)
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td key={index} className="px-3 py-2.5 text-sm text-right text-green-600">
                        {data.realizedIncome > 0 
                          ? `R$ ${data.realizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saídas (Realizadas) */}
                  <tr className="border-b bg-white hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-white z-10">
                      Saídas (Realizadas)
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td key={index} className="px-3 py-2.5 text-sm text-right text-red-600">
                        {data.realizedExpenses > 0 
                          ? `R$ ${data.realizedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo Atual - Realizado */}
                  <tr className="border-b bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-gray-50 z-10">
                      Saldo Atual - Realizado
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td 
                        key={index} 
                        className={`px-3 py-2.5 text-sm text-right ${data.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}
                      >
                        R$ {data.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    ))}
                  </tr>

                  {/* Entradas (Em Aberto) */}
                  <tr className="border-b bg-white hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-white z-10">
                      Entradas (Em Aberto)
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td key={index} className="px-3 py-2.5 text-sm text-right text-green-600">
                        {data.openIncome > 0 
                          ? `R$ ${data.openIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saídas (Em Aberto) */}
                  <tr className="border-b bg-gray-50 hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-gray-900 sticky left-0 bg-gray-50 z-10">
                      Saídas (Em Aberto)
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td key={index} className="px-3 py-2.5 text-sm text-right text-red-600">
                        {data.openExpenses > 0 
                          ? `R$ ${data.openExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                          : 'R$ 0,00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo Final - Fluxo de Caixa (destaque) */}
                  <tr className="border-t-2 border-gray-300 bg-gray-200">
                    <td className="px-3 py-3 text-sm text-gray-900 sticky left-0 bg-gray-200 z-10">
                      Saldo Final - Fluxo de Caixa
                    </td>
                    {monthlyCashFlowData.map((data, index) => (
                      <td 
                        key={index} 
                        className={`px-3 py-3 text-sm text-right ${data.finalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}
                      >
                        R$ {data.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Manual Projections */}
        <TabsContent value="projections">
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-gray-800">Projeções Manuais</h3>
              <p className="text-sm text-gray-500">Adicione entradas e saídas projetadas para planejamento</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Data</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Categoria</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Descrição</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {safeCashFlowEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma projeção manual adicionada
                      </td>
                    </tr>
                  ) : (
                    safeCashFlowEntries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDateLocal(entry.date)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={entry.type === "Entrada" ? "text-green-600" : "text-red-600"}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{entry.category}</td>
                        <td className="px-4 py-3 text-sm">{entry.description}</td>
                        <td className={`px-4 py-3 text-sm text-right ${entry.type === "Entrada" ? "text-green-600" : "text-red-600"}`}>
                          R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm">{entry.status}</td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCashFlowEntry(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Projection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Projeção Manual</DialogTitle>
            <DialogDescription>
              Adicione uma projeção de entrada ou saída para planejamento futuro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start mt-2">
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

            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Vendas, Despesas Operacionais"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da projeção"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                  <SelectItem value="Previsto">Previsto</SelectItem>
                  <SelectItem value="Projetado">Projetado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert for negative balance */}
      {needWorkingCapital && (
        <Card className="mt-6 p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-red-900 mb-2">⚠️ Atenção: Necessidade de Capital de Giro</h3>
              <div className="text-sm text-red-800 space-y-1">
                <p>Seu saldo ficará <strong>negativo</strong> em algum momento do período analisado.</p>
                <p className="ml-4">• Saldo mínimo projetado: <strong>R$ {minBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                <p className="mt-2">💡 <strong>Recomendações:</strong></p>
                <p className="ml-4">• Renegocie prazos de pagamento com fornecedores</p>
                <p className="ml-4">• Antecipe recebimentos de clientes</p>
                <p className="ml-4">• Considere uma linha de crédito para capital de giro</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}