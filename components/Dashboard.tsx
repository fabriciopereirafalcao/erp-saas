import { useMemo, useState } from "react";
import { Card } from "./ui/card";
import { TrendingUp, TrendingDown, Package, DollarSign, Users, Truck, AlertTriangle, Activity, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useERP } from "../contexts/ERPContext";
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const salesDataMock = [
  { month: "Jan", sales: 45000, purchases: 32000 },
  { month: "Fev", sales: 52000, purchases: 38000 },
  { month: "Mar", sales: 48000, purchases: 35000 },
  { month: "Abr", sales: 61000, purchases: 42000 },
  { month: "Mai", sales: 55000, purchases: 39000 },
  { month: "Jun", sales: 67000, purchases: 48000 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Dashboard() {
  const { customers, suppliers, inventory, financialTransactions, salesOrders, companySettings } = useERP();

  // Estado para alternar entre regime de caixa e competência
  const [isAccrualBasis, setIsAccrualBasis] = useState(false);

  // Verificar se é o primeiro acesso (sem dados cadastrados)
  const isFirstAccess = useMemo(() => 
    customers.length === 0 && 
    suppliers.length === 0 && 
    inventory.length === 0 && 
    !companySettings.companyName,
    [customers, suppliers, inventory, companySettings]
  );

  // MED-002: Otimização com useMemo para cálculos pesados
  const activeCustomers = useMemo(() => 
    customers.filter(c => c.status === "Ativo").length,
    [customers]
  );
  
  const activeSuppliers = useMemo(() => 
    suppliers.filter(s => s.status === "Ativo").length,
    [suppliers]
  );
  
  const totalSales = useMemo(() => 
    financialTransactions
      .filter(t => t.type === "Receita" && (t.status === "Recebido" || t.status === "Pago"))
      .reduce((sum, t) => sum + t.amount, 0),
    [financialTransactions]
  );
  
  const totalPurchases = useMemo(() => 
    financialTransactions
      .filter(t => t.type === "Despesa" && (t.status === "Pago" || t.status === "Recebido"))
      .reduce((sum, t) => sum + t.amount, 0),
    [financialTransactions]
  );

  const stockMetrics = useMemo(() => ({
    total: inventory.reduce((sum, item) => sum + item.currentStock, 0),
    lowStock: inventory.filter(item => item.status === "Baixo Estoque").length,
    outOfStock: inventory.filter(item => item.status === "Fora de Estoque").length
  }), [inventory]);

  const netProfit = useMemo(() => totalSales - totalPurchases, [totalSales, totalPurchases]);
  const profitMargin = useMemo(() => 
    totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0",
    [netProfit, totalSales]
  );

  // Inventory by category data
  const inventoryByCategoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    inventory.forEach(item => {
      if (categoryMap[item.category]) {
        categoryMap[item.category] += item.currentStock;
      } else {
        categoryMap[item.category] = item.currentStock;
      }
    });

    return Object.entries(categoryMap).map(([category, stock]) => ({
      type: category,
    stock
    }));
  }, [inventory]);

  // Recent activity with useMemo
  const recentOrders = useMemo(() => [
    ...salesOrders.slice(0, 5).map(o => ({ type: 'Venda', id: o.id, customer: o.customer, amount: o.totalAmount }))
  ].slice(0, 5), [salesOrders]);

  // Calcular dados de Receitas vs Despesas para os últimos 6 meses
  const revenueVsExpensesData = useMemo(() => {
    const now = new Date();
    const months = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Gerar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
      });
    }
    
    return months.map(({ month, year, monthIndex }) => {
      let revenues = 0;
      let expenses = 0;
      
      financialTransactions.forEach(transaction => {
        const transactionDate = transaction.dueDate ? new Date(transaction.dueDate) : null;
        
        if (transactionDate && 
            transactionDate.getMonth() === monthIndex && 
            transactionDate.getFullYear() === year) {
          
          if (transaction.type === "Receita") {
            // Regime de Caixa: apenas transações recebidas
            // Regime de Competência: todas as transações
            if (isAccrualBasis || transaction.status === "Recebido") {
              revenues += transaction.amount;
            }
          } else if (transaction.type === "Despesa") {
            // Regime de Caixa: apenas transações pagas
            // Regime de Competência: todas as transações
            if (isAccrualBasis || transaction.status === "Pago") {
              expenses += transaction.amount;
            }
          }
        }
      });
      
      return {
        month,
        receitas: revenues,
        despesas: expenses,
      };
    });
  }, [financialTransactions, isAccrualBasis]);

  // Tela de boas-vindas para primeiro acesso
  if (isFirstAccess) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <div className="w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-gray-900 dark:text-gray-100 mb-4">🎉 Bem-vindo ao seu ERP!</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
              Sistema de Gestão Empresarial Completo
            </p>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-8 text-left">
              <h2 className="text-gray-900 dark:text-gray-100 mb-6">🚀 Primeiros Passos</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-gray-100 mb-1">Configure sua Empresa</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Acesse <strong>Configurações → Dados da Empresa</strong> para cadastrar as informações da sua empresa, contas bancárias e configurações fiscais.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 dark:text-green-400">2</span>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-gray-100 mb-1">Cadastre seus Produtos</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Vá em <strong>Inventário</strong> para adicionar os produtos que você comercializa, com preços, estoque e categorias.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-600 dark:text-purple-400">3</span>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-gray-100 mb-1">Adicione Clientes e Fornecedores</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Cadastre seus <strong>Clientes</strong> e <strong>Fornecedores</strong> com todos os dados necessários para emissão de notas fiscais.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-orange-600 dark:text-orange-400">4</span>
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-gray-100 mb-1">Comece a Vender!</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Crie seu primeiro <strong>Pedido de Venda</strong> e acompanhe todo o fluxo: da emissão à entrega e pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <Card className="p-4 bg-white dark:bg-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm text-gray-900 dark:text-gray-100">Gestão Completa</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Controle de estoque, pedidos, financeiro e relatórios integrados.
                </p>
              </Card>
              
              <Card className="p-4 bg-white dark:bg-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-sm text-gray-900 dark:text-gray-100">Módulo Financeiro</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Contas a pagar/receber, fluxo de caixa e reconciliação bancária.
                </p>
              </Card>
              
              <Card className="p-4 bg-white dark:bg-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm text-gray-900 dark:text-gray-100">Auditoria QA</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Sistema de monitoramento de qualidade e auditoria técnica em tempo real.
                </p>
              </Card>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Painel de Controle</h1>
        <p className="text-gray-600">Bem-vindo ao seu Sistema ERP de Gestão Empresarial</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receita Total</p>
              <h2 className="text-gray-900 mb-1">R$ {totalSales.toLocaleString('pt-BR')}</h2>
              <div className={`flex items-center gap-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm">Margem: {profitMargin}%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estoque Total</p>
              <h2 className="text-gray-900 mb-1">{stockMetrics.total.toLocaleString('pt-BR')} un</h2>
              <div className={`flex items-center gap-1 ${stockMetrics.lowStock > 0 ? 'text-yellow-600' : 'text-blue-600'}`}>
                {stockMetrics.lowStock > 0 ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                <span className="text-sm">{stockMetrics.lowStock > 0 ? `${stockMetrics.lowStock} baixo estoque` : `${inventory.length} produtos`}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Clientes Ativos</p>
              <h2 className="text-gray-900 mb-1">{activeCustomers}</h2>
              <div className="flex items-center gap-1 text-green-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{customers.length} total</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fornecedores Ativos</p>
              <h2 className="text-gray-900 mb-1">{activeSuppliers}</h2>
              <div className="flex items-center gap-1 text-orange-600">
                <Truck className="w-4 h-4" />
                <span className="text-sm">{suppliers.length} total</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 text-[18px] font-normal font-bold">Receitas vs Despesas (6 Meses)</h3>
            <div className="flex items-center gap-2">
              {/* Toggle Switch */}
              <div 
                className="relative flex items-center h-9 w-40 bg-gray-100 rounded-lg p-1 cursor-pointer"
                onClick={() => setIsAccrualBasis(!isAccrualBasis)}
              >
                {/* Sliding Background */}
                <div 
                  className={`absolute top-1 h-7 w-[calc(50%-4px)] bg-blue-600 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                    isAccrualBasis ? 'left-[calc(50%+2px)]' : 'left-1'
                  }`}
                />
                
                {/* Caixa Label */}
                <div className={`relative z-10 flex-1 flex items-center justify-center gap-1 transition-colors duration-200 ${
                  !isAccrualBasis ? 'text-white' : 'text-gray-600'
                }`}>
                  <span className="text-sm" style={{ fontWeight: 500 }}>Caixa</span>
                </div>
                
                {/* Competência Label */}
                <div className={`relative z-10 flex-1 flex items-center justify-center gap-1 transition-colors duration-200 ${
                  isAccrualBasis ? 'text-white' : 'text-gray-600'
                }`}>
                  <span className="text-sm" style={{ fontWeight: 500 }}>Competência</span>
                </div>
              </div>
              
              {/* Tooltip Info */}
              <TooltipProvider>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                      <Info className="w-3 h-3 text-gray-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-xs">Altere o regime de visualização:</p>
                      <p className="text-xs"><strong>Caixa:</strong> mostra valores recebidos/pagos.</p>
                      <p className="text-xs"><strong>Competência:</strong> mostra valores pela data em que foram gerados (a receber/a pagar).</p>
                    </div>
                  </TooltipContent>
                </TooltipUI>
              </TooltipProvider>
            </div>
          </div>
          <div className="mb-2 text-xs text-gray-500">
            {isAccrualBasis 
              ? '📊 Mostrando todos os valores (realizados e pendentes)'
              : '💰 Mostrando apenas valores realizados (Recebido/Pago)'}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueVsExpensesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} name="Despesas" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-6">Estoque por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryByCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number) => `${value.toLocaleString('pt-BR')} un`}
              />
              <Bar dataKey="stock" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Additional Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Atividade Recente</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Nenhuma atividade recente</p>
            ) : (
              recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${order.type === 'Venda' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm text-gray-900">{order.id}</p>
                      <p className="text-xs text-gray-600">
                        {order.type === 'Venda' ? (order as any).customer : (order as any).supplier}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm ${order.type === 'Venda' ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {order.amount.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Estatísticas Rápidas</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">Total de Vendas</span>
              <span className="text-green-700">R$ {totalSales.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-700">Total de Compras</span>
              <span className="text-red-700">R$ {totalPurchases.toLocaleString('pt-BR')}</span>
            </div>
            <div className={`flex justify-between items-center p-3 ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'} rounded-lg`}>
              <span className="text-sm text-gray-700">Lucro Líquido</span>
              <span className={netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}>
                R$ {netProfit.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-700">Total de Transações</span>
              <span className="text-purple-700">{financialTransactions.length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {(stockMetrics.lowStock > 0 || stockMetrics.outOfStock > 0) && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-900 mb-2">⚠️ Alertas de Estoque</h3>
              <div className="text-sm text-yellow-800 space-y-1">
                {stockMetrics.outOfStock > 0 && (
                  <p>• <strong>{stockMetrics.outOfStock} produto(s)</strong> estão <strong>fora de estoque</strong></p>
                )}
                {stockMetrics.lowStock > 0 && (
                  <p>• <strong>{stockMetrics.lowStock} produto(s)</strong> estão com <strong>baixo estoque</strong></p>
                )}
                <p className="mt-2 text-yellow-700">
                  💡 Verifique o módulo de Estoque e considere criar pedidos de compra
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* System Info */}
      <Card className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-900 mb-2">🎯 Sistema ERP Integrado</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>Seu sistema está <strong>totalmente integrado</strong> e funcionando:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <p className="flex items-center gap-2">
                  ✅ <strong>Pedidos de Venda</strong> → Transações + Estoque + Clientes
                </p>
                <p className="flex items-center gap-2">
                  ✅ <strong>Pedidos de Compra</strong> → Transações + Estoque + Fornecedores
                </p>
                <p className="flex items-center gap-2">
                  ✅ <strong>Gestão de Estoque</strong> → Atualização automática
                </p>
                <p className="flex items-center gap-2">
                  ✅ <strong>Transações Financeiras</strong> → Rastreamento completo
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}