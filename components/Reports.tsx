import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, TrendingDown, Package, DollarSign, Users, ShoppingCart, FileText, Calendar, Filter, Printer, FileSpreadsheet, FileDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useERP } from "../contexts/ERPContext";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel, exportToPDF, formatCurrencyForExport, formatDateForExport } from "../utils/exportUtils";
import { toast } from "sonner";
import { formatDateLocal } from "../utils/dateUtils";

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export function Reports() {
  const { 
    salesOrders, 
    customers, 
    suppliers, 
    inventory,
    accountsPayable,
    accountsReceivable,
    financialTransactions,
    companySettings
  } = useERP();
  
  // ✅ Proteções contra arrays undefined
  const safeSalesOrders = salesOrders || [];
  const safeCustomers = customers || [];
  const safeSuppliers = suppliers || [];
  const safeInventory = inventory || [];
  const safeAccountsPayable = accountsPayable || [];
  const safeAccountsReceivable = accountsReceivable || [];
  const safeFinancialTransactions = financialTransactions || [];
  const safeBankAccounts = companySettings?.bankAccounts || [];

  const [period, setPeriod] = useState("6meses");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");

  // Calcular datas com base no período selecionado
  const dateRange = useMemo(() => {
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    const now = new Date();
    let start: Date;

    switch (period) {
      case "1mes":
        start = subMonths(now, 1);
        break;
      case "3meses":
        start = subMonths(now, 3);
        break;
      case "6meses":
        start = subMonths(now, 6);
        break;
      case "1ano":
        start = subMonths(now, 12);
        break;
      default:
        start = subMonths(now, 6);
    }

    return { start, end: now };
  }, [period, startDate, endDate]);

  // Filtrar dados por período
  const filteredSalesOrders = useMemo(() => {
    return safeSalesOrders.filter(order => {
      const orderDate = new Date(order.issueDate || order.orderDate);
      const inPeriod = isWithinInterval(orderDate, dateRange);
      const matchesCustomer = selectedCustomer === "all" || order.customerId === selectedCustomer;
      const matchesProduct = selectedProduct === "all" || order.productName.includes(selectedProduct);
      return inPeriod && matchesCustomer && matchesProduct;
    });
  }, [safeSalesOrders, dateRange, selectedCustomer, selectedProduct]);

  // Métricas gerais
  const metrics = useMemo(() => {
    // ✅ Receita Total (vendas não canceladas)
    const totalSales = filteredSalesOrders
      .filter(o => o.status !== "Cancelado")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    // ✅ CORRIGIDO: Calcular despesas totais a partir de TRANSAÇÕES FINANCEIRAS de Despesa
    const totalPurchases = safeFinancialTransactions
      .filter(t => t.type === "Despesa")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const profit = totalSales - totalPurchases;
    const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    // ✅ Contas a receber pendentes
    const totalAccountsReceivable = safeAccountsReceivable
      .filter(a => a.status === "A Vencer" || a.status === "Vencido" || a.status === "Parcial")
      .reduce((sum, a) => sum + a.remainingAmount, 0);

    // ✅ Contas a pagar pendentes
    const totalAccountsPayable = safeAccountsPayable
      .filter(a => a.status === "A Vencer" || a.status === "Vencido" || a.status === "Parcial")
      .reduce((sum, a) => sum + a.remainingAmount, 0);

    return {
      totalSales,
      totalPurchases,
      profit,
      margin,
      totalAccountsReceivable,
      totalAccountsPayable,
      netCashFlow: totalAccountsReceivable - totalAccountsPayable
    };
  }, [filteredSalesOrders, safeAccountsReceivable, safeAccountsPayable, safeFinancialTransactions]);

  // Vendas por mês
  const salesByMonth = useMemo(() => {
    const monthsMap = new Map<string, { sales: number; purchases: number; profit: number }>();

    filteredSalesOrders.forEach(order => {
      if (order.status === "Cancelado") return;
      const month = format(new Date(order.issueDate || order.orderDate), "MMM/yy", { locale: ptBR });
      const current = monthsMap.get(month) || { sales: 0, purchases: 0, profit: 0 };
      current.sales += order.totalAmount;
      monthsMap.set(month, current);
    });

    const result = Array.from(monthsMap.entries()).map(([month, data]) => ({
      month,
      sales: data.sales,
      purchases: 0, // Módulo de compras removido
      profit: data.sales
    }));

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSalesOrders]);

  // Top clientes
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, { name: string; orders: number; revenue: number }>();

    filteredSalesOrders.forEach(order => {
      if (order.status === "Cancelado") return;
      const current = customerMap.get(order.customerId) || { 
        name: order.customer, 
        orders: 0, 
        revenue: 0 
      };
      current.orders += 1;
      current.revenue += order.totalAmount;
      customerMap.set(order.customerId, current);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredSalesOrders]);

  // Top fornecedores (módulo de compras removido)
  const topSuppliers = useMemo(() => {
    return []; // Módulo de compras removido
  }, []);

  // Produtos mais vendidos
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    filteredSalesOrders.forEach(order => {
      if (order.status === "Cancelado") return;
      const current = productMap.get(order.productName) || { 
        name: order.productName, 
        quantity: 0, 
        revenue: 0 
      };
      current.quantity += order.quantity;
      current.revenue += order.totalAmount;
      productMap.set(order.productName, current);
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredSalesOrders]);

  // Vendas por status
  const salesByStatus = useMemo(() => {
    const statusMap = new Map<string, number>();

    filteredSalesOrders.forEach(order => {
      const current = statusMap.get(order.status) || 0;
      statusMap.set(order.status, current + 1);
    });

    return Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredSalesOrders]);

  // Compras por status - Módulo de compras removido
  const purchasesByStatus: { name: string; value: number }[] = [];

  // Estoque por produto
  const inventoryReport = useMemo(() => {
    return safeInventory
      .map(item => {
        const quantity = item.quantity || 0;
        const costPerUnit = item.costPerUnit || 0;
        const minStock = item.minStockLevel || 0;
        
        return {
          productName: item.productName,
          quantity: quantity,
          value: quantity * costPerUnit,
          minStock: minStock,
          status: quantity <= minStock ? "Baixo" : "Normal"
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [safeInventory]);

  // Contas a receber por vencimento
  const receivablesByDueDate = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let dueToday = 0;
    let due7days = 0;
    let due30days = 0;
    let dueFuture = 0;

    // ✅ CORRIGIDO: Filtrar por status corretos
    safeAccountsReceivable.filter(a => a.status === "A Vencer" || a.status === "Vencido" || a.status === "Parcial").forEach(account => {
      const dueDate = new Date(account.dueDate);
      const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Usar remainingAmount em vez de amount para contas parciais
      const value = account.remainingAmount || account.amount;

      if (daysDiff < 0) {
        overdue += value;
      } else if (daysDiff === 0) {
        dueToday += value;
      } else if (daysDiff <= 7) {
        due7days += value;
      } else if (daysDiff <= 30) {
        due30days += value;
      } else {
        dueFuture += value;
      }
    });

    return [
      { name: "Vencidas", value: overdue, color: "#ef4444" },
      { name: "Hoje", value: dueToday, color: "#f59e0b" },
      { name: "7 dias", value: due7days, color: "#3b82f6" },
      { name: "30 dias", value: due30days, color: "#8b5cf6" },
      { name: "Futuro", value: dueFuture, color: "#16a34a" }
    ].filter(item => item.value > 0);
  }, [safeAccountsReceivable]);

  // Contas a pagar por vencimento
  const payablesByDueDate = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let dueToday = 0;
    let due7days = 0;
    let due30days = 0;
    let dueFuture = 0;

    // ✅ CORRIGIDO: Filtrar por status corretos
    safeAccountsPayable.filter(a => a.status === "A Vencer" || a.status === "Vencido" || a.status === "Parcial").forEach(account => {
      const dueDate = new Date(account.dueDate);
      const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Usar remainingAmount em vez de amount para contas parciais
      const value = account.remainingAmount || account.amount;

      if (daysDiff < 0) {
        overdue += value;
      } else if (daysDiff === 0) {
        dueToday += value;
      } else if (daysDiff <= 7) {
        due7days += value;
      } else if (daysDiff <= 30) {
        due30days += value;
      } else {
        dueFuture += value;
      }
    });

    return [
      { name: "Vencidas", value: overdue, color: "#ef4444" },
      { name: "Hoje", value: dueToday, color: "#f59e0b" },
      { name: "7 dias", value: due7days, color: "#3b82f6" },
      { name: "30 dias", value: due30days, color: "#8b5cf6" },
      { name: "Futuro", value: dueFuture, color: "#16a34a" }
    ].filter(item => item.value > 0);
  }, [safeAccountsPayable]);

  // DRE Simplificado
  const dre = useMemo(() => {
    const receitaBruta = filteredSalesOrders
      .filter(o => o.status === "Pago" || o.status === "Entregue")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const custoProdutos = 0; // Módulo de compras removido

    const lucroLiquido = receitaBruta - custoProdutos;
    const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

    return {
      receitaBruta,
      custoProdutos,
      lucroLiquido,
      margemLucro
    };
  }, [filteredSalesOrders]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    try {
      // Preparar dados combinados para exportação
      const reportData = [
        // Métricas principais
        { secao: "Métricas", descricao: "Receita Total", valor: formatCurrencyForExport(metrics.totalSales) },
        { secao: "Métricas", descricao: "Despesas Total", valor: formatCurrencyForExport(metrics.totalPurchases) },
        { secao: "Métricas", descricao: "Lucro Líquido", valor: formatCurrencyForExport(metrics.profit) },
        { secao: "Métricas", descricao: "Margem (%)", valor: `${metrics.margin.toFixed(2)}%` },
        { secao: "", descricao: "", valor: "" }, // Linha em branco
        
        // Top Clientes
        { secao: "Top Clientes", descricao: "Cliente", valor: "Faturamento" },
        ...topCustomers.slice(0, 5).map(c => ({
          secao: "",
          descricao: c.name,
          valor: formatCurrencyForExport(c.revenue)
        })),
        { secao: "", descricao: "", valor: "" }, // Linha em branco
        
        // Top Produtos
        { secao: "Top Produtos", descricao: "Produto", valor: "Receita" },
        ...topProducts.slice(0, 5).map(p => ({
          secao: "",
          descricao: p.name,
          valor: formatCurrencyForExport(p.revenue)
        })),
        { secao: "", descricao: "", valor: "" }, // Linha em branco
        
        // Estoque
        { secao: "Estoque", descricao: "Produto", valor: "Valor Total" },
        ...inventoryReport.slice(0, 10).map(i => ({
          secao: "",
          descricao: i.productName,
          valor: formatCurrencyForExport(i.value)
        }))
      ];

      const headers = [
        { key: "secao", label: "Seção" },
        { key: "descricao", label: "Descrição" },
        { key: "valor", label: "Valor" }
      ];

      const periodText = startDate && endDate 
        ? `${formatDateForExport(startDate)}_a_${formatDateForExport(endDate)}`
        : period;
      
      exportToExcel(reportData, headers, `relatorio_${periodText}_${format(new Date(), 'yyyyMMdd')}`);
      toast.success("Relatório exportado para Excel com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar para Excel:", error);
      toast.error("Erro ao exportar relatório para Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Gerando PDF... Aguarde");
      await exportToPDF("reports-content", `relatorio_${format(new Date(), 'yyyyMMdd_HHmmss')}`);
      toast.success("Relatório exportado para PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar para PDF:", error);
      toast.error("Erro ao exportar relatório para PDF");
    }
  };

  return (
    <div className="p-8">
      <div id="reports-content" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Relatórios e Análises</h1>
            <p className="text-gray-600">Análise completa integrada de todos os módulos do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Filtros Globais */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label className="text-xs">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1mes">Último Mês</SelectItem>
                  <SelectItem value="3meses">Últimos 3 Meses</SelectItem>
                  <SelectItem value="6meses">Últimos 6 Meses</SelectItem>
                  <SelectItem value="1ano">Último Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {safeCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company || customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {safeSuppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company || supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-gray-900">R$ {metrics.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">{filteredSalesOrders.length} pedidos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Despesas Totais</p>
                <p className="text-gray-900">R$ {metrics.totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">0 compras</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lucro Bruto</p>
                <p className="text-gray-900">R$ {metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">Margem: {metrics.margin.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Estoque Total</p>
                <p className="text-gray-900">R$ {inventoryReport.reduce((sum, item) => sum + item.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">{safeInventory.length} produtos</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Abas de Relatórios */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="inventory">Estoque</TabsTrigger>
          <TabsTrigger value="partners">Clientes/Fornec.</TabsTrigger>
        </TabsList>

        {/* ABA: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          {/* DRE Simplificado */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">📊 DRE - Demonstração de Resultado do Exercício</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">Receita Bruta de Vendas</span>
                <span className="text-green-600">R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-700">(-) Custo dos Produtos Vendidos</span>
                <span className="text-red-600">R$ {dre.custoProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50 px-3 rounded">
                <span className="text-gray-900">(=) Lucro Líquido</span>
                <span className="text-blue-600">R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Margem de Lucro</span>
                <span className={dre.margemLucro >= 0 ? "text-green-600" : "text-red-600"}>
                  {dre.margemLucro.toFixed(2)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendência */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-6">Tendência de Vendas vs Compras</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} name="Vendas" />
                  <Line type="monotone" dataKey="purchases" stroke="#ef4444" strokeWidth={2} name="Compras" />
                  <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Lucro" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Lucro Mensal */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-6">Análise de Lucro Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="profit" fill="#16a34a" name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Fluxo de Caixa */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">💰 Resumo Financeiro</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">A Receber (Pendente)</p>
                <p className="text-green-700 text-xl">R$ {metrics.totalAccountsReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">A Pagar (Pendente)</p>
                <p className="text-red-700 text-xl">R$ {metrics.totalAccountsPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Fluxo de Caixa Líquido</p>
                <p className={`text-xl ${metrics.netCashFlow >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  R$ {metrics.netCashFlow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: VENDAS */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status das Vendas */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-6">Pedidos de Venda por Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Produtos */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Top 10 Produtos Mais Vendidos</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.quantity.toLocaleString('pt-BR')} un.</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900">R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tabela Detalhada de Vendas */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Detalhamento de Pedidos de Venda</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalesOrders.slice(0, 50).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{formatDateLocal(order.issueDate || order.orderDate)}</TableCell>
                      <TableCell>{order.productName}</TableCell>
                      <TableCell>{order.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge className={
                          order.status === "Pago" ? "bg-emerald-100 text-emerald-700" :
                          order.status === "Entregue" ? "bg-green-100 text-green-700" :
                          order.status === "Cancelado" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredSalesOrders.length > 50 && (
              <p className="text-sm text-gray-500 mt-3 text-center">
                Mostrando 50 de {filteredSalesOrders.length} registros
              </p>
            )}
          </Card>
        </TabsContent>

        {/* ABA: FINANCEIRO */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contas a Receber */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-6">Contas a Receber por Vencimento</h3>
              {receivablesByDueDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={receivablesByDueDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" name="Valor (R$)">
                      {receivablesByDueDate.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">Nenhuma conta a receber pendente</p>
              )}
            </Card>

            {/* Contas a Pagar */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-6">Contas a Pagar por Vencimento</h3>
              {payablesByDueDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={payablesByDueDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" name="Valor (R$)">
                      {payablesByDueDate.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">Nenhuma conta a pagar pendente</p>
              )}
            </Card>
          </div>

          {/* Saldos Bancários */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Saldos das Contas Bancárias</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {safeBankAccounts.map((account) => (
                <div key={account.id} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{account.bankName}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Ag: {account.agency} - Conta: {account.accountNumber}
                  </p>
                  <p className={`text-xl ${account.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Transações Recentes */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Transações Financeiras Recentes</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeFinancialTransactions.slice(0, 20).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDateLocal(transaction.date)}</TableCell>
                      <TableCell>
                        <Badge className={transaction.type === "Receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={transaction.type === "Receita" ? "text-green-700" : "text-red-700"}>
                        {transaction.type === "Receita" ? "+" : "-"}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: ESTOQUE */}
        <TabsContent value="inventory" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Relatório de Estoque</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Est. Mínimo</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryReport.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{item.minStock.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        R$ {item.quantity > 0 
                          ? (item.value / item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                          : '0,00'}
                      </TableCell>
                      <TableCell>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge className={item.status === "Baixo" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Alertas de Estoque */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">⚠️ Alertas de Estoque Baixo</h3>
            {inventoryReport.filter(item => item.status === "Baixo").length > 0 ? (
              <div className="space-y-2">
                {inventoryReport.filter(item => item.status === "Baixo").map((item, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-red-900">{item.productName}</p>
                      <p className="text-sm text-red-700">
                        Quantidade atual: {item.quantity} | Mínimo: {item.minStock}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-700">Repor</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600 text-center py-8">✓ Todos os produtos estão com estoque adequado</p>
            )}
          </Card>
        </TabsContent>

        {/* ABA: CLIENTES E FORNECEDORES */}
        <TabsContent value="partners" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Top 10 Clientes por Receita</h3>
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.orders} pedidos</p>
                      </div>
                    </div>
                    <p className="text-gray-900">R$ {customer.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Fornecedores */}
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Top 10 Fornecedores por Volume</h3>
              <div className="space-y-3">
                {topSuppliers.map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-gray-900">{supplier.name}</p>
                        <p className="text-sm text-gray-600">{supplier.orders} compras</p>
                      </div>
                    </div>
                    <p className="text-gray-900">R$ {supplier.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Resumo de Clientes */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Resumo de Clientes</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-2xl text-blue-700">{safeCustomers.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Clientes Ativos</p>
                <p className="text-2xl text-green-700">{topCustomers.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-2xl text-purple-700">
                  R$ {topCustomers.length > 0 && topCustomers.reduce((sum, c) => sum + c.orders, 0) > 0
                    ? (topCustomers.reduce((sum, c) => sum + c.revenue, 0) / topCustomers.reduce((sum, c) => sum + c.orders, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    : '0,00'}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-2xl text-orange-700">
                  R$ {(topCustomers.length > 0 ? topCustomers.reduce((sum, c) => sum + c.revenue, 0) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          {/* Resumo de Fornecedores */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Resumo de Fornecedores</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total de Fornecedores</p>
                <p className="text-2xl text-blue-700">{safeSuppliers.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Fornecedores Ativos</p>
                <p className="text-2xl text-green-700">{topSuppliers.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Compra Média</p>
                <p className="text-2xl text-purple-700">
                  R$ {topSuppliers.length > 0 && topSuppliers.reduce((sum, s) => sum + s.orders, 0) > 0
                    ? (topSuppliers.reduce((sum, s) => sum + s.spent, 0) / topSuppliers.reduce((sum, s) => sum + s.orders, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    : '0,00'}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Gastos Totais</p>
                <p className="text-2xl text-orange-700">
                  R$ {(topSuppliers.length > 0 ? topSuppliers.reduce((sum, s) => sum + s.spent, 0) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}