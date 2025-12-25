import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useERP } from '../contexts/ERPContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Calendar, DollarSign, Target, TrendingUp, TrendingDown, BarChart3, Download, FileText, RefreshCw, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

// ==================== TIPOS ====================

interface DREData {
  regime: string;
  periodStart: string;
  periodEnd: string;
  receita_bruta: number;
  deducoes_receita: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  despesas_pessoal: number;
  despesas_comerciais: number;
  despesas_administrativas: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  outras_receitas_despesas: number;
  resultado_operacional?: number;
  irpj?: number;
  csll?: number;
  lucro_liquido: number;
  breakdown: Record<string, number>;
  breakdownById: Record<string, number>;
}

interface DRELine {
  id: string;
  code: string;
  name: string;
  value: number;
  isCalculated: boolean;
  formula?: string;
  level: number;
  type: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  partyName: string;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function DREGerencial() {
  const { user, companySettings, financialTransactions, accountCategories } = useERP();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [dreDataComparative, setDreDataComparative] = useState<DREData | null>(null);
  const [dreStructure, setDreStructure] = useState<DRELine[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['DO', 'RF']));
  const [activeTab, setActiveTab] = useState('dre');
  const [comparativeMode, setComparativeMode] = useState(false);
  
  // Período 1
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Período 2 (comparativo)
  const [startDate2, setStartDate2] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    return date.toISOString().split('T')[0];
  });
  const [endDate2, setEndDate2] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(0); // Último dia do mês anterior
    return date.toISOString().split('T')[0];
  });
  
  // Modal drill-down
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownLine, setDrillDownLine] = useState<string>('');
  const [drillDownTransactions, setDrillDownTransactions] = useState<Transaction[]>([]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    const fetchDREStructure = async () => {
      if (!accessToken) return;

      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/structure`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();
        if (data.success) {
          setDreStructure(data.data);
        }
      } catch (error) {
        console.error('Erro ao buscar estrutura DRE:', error);
      }
    };

    fetchDREStructure();
  }, [accessToken]);

  // ==================== HANDLERS ====================

  const handleDiagnostic = async () => {
    if (!accessToken) {
      toast.error('Você precisa estar autenticado');
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/diagnostic`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (data.success) {
        console.log('🔍 DIAGNÓSTICO DRE:', data.data);
        
        // Filtrar e mostrar categorias sem DRE mapeado
        const categoriesWithoutDRE = data.data.categories.list.filter((cat: any) => !cat.hasDRELine);
        
        if (categoriesWithoutDRE.length > 0) {
          console.log('\n⚠️  CATEGORIAS SEM DRE MAPEADO:', categoriesWithoutDRE);
          console.table(categoriesWithoutDRE.map((cat: any) => ({
            'Código': cat.code,
            'Nome': cat.name,
            'Linha DRE': cat.dreLineName || '❌ NÃO MAPEADO'
          })));
        }
        
        alert(`DIAGNÓSTICO:\n\n` +
          `Categorias: ${data.data.categories.total} total\n` +
          `  - Com DRE mapeado: ${data.data.categories.withDRELine}\n` +
          `  - Sem DRE mapeado: ${data.data.categories.withoutDRELine}\n\n` +
          `Transações: ${data.data.transactions.total} últimas\n` +
          `  - Com categoria: ${data.data.transactions.withCategory}\n` +
          `  - Sem categoria: ${data.data.transactions.withoutCategory}\n\n` +
          `Recomendação: ${data.data.recommendation}\n\n` +
          `${categoriesWithoutDRE.length > 0 ? '📋 Veja o console (F12) para lista completa das categorias sem mapeamento.' : 'Veja o console (F12) para detalhes completos.'}`
        );
      }
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('Erro ao executar diagnóstico');
    }
  };

  const handleCalculateDRE = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período');
      return;
    }

    if (!accessToken) {
      toast.error('Você precisa estar autenticado');
      return;
    }

    // ✅ VALIDAÇÃO: Regime tributário DEVE estar cadastrado
    if (!companySettings?.taxRegime) {
      toast.error('Para calcular a DRE, é necessário cadastrar o Regime Tributário em "Configurações da Empresa"', {
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/calculate?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDreData(data.data);
        console.log('✅ DRE calculada:', data.data);
        
        // Se modo comparativo, calcular período 2
        if (comparativeMode) {
          await calculateComparativeDRE();
        }
      } else {
        console.error('Erro ao calcular DRE:', data);
        alert('Erro ao calcular DRE');
      }
    } catch (error) {
      console.error('Erro ao calcular DRE:', error);
      alert('Erro ao calcular DRE. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  const calculateComparativeDRE = async () => {
    if (!startDate2 || !endDate2 || !accessToken) return;

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/calculate?startDate=${startDate2}&endDate=${endDate2}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDreDataComparative(data.data);
        console.log('✅ DRE comparativa calculada:', data.data);
      }
    } catch (error) {
      console.error('Erro ao calcular DRE comparativa:', error);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!dreData) return;

    if (!accessToken) {
      alert('Você precisa estar autenticado');
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/dre/snapshot`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ dre: dreData })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Snapshot salvo com sucesso!');
      } else {
        toast.error('Erro ao salvar snapshot');
      }
    } catch (error) {
      console.error('Erro ao salvar snapshot:', error);
      toast.error('Erro ao salvar snapshot');
    }
  };

  const handleExportPDF = () => {
    if (!dreData) return;

    // Criar conteúdo HTML estruturado para impressão
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>DRE Gerencial - ${new Date(dreData.periodStart).toLocaleDateString('pt-BR')} a ${new Date(dreData.periodEnd).toLocaleDateString('pt-BR')}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-green { color: #22c55e; }
              .text-red { color: #ef4444; }
              .bg-gray { background-color: #f9fafb; }
            }
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1f2937; margin-bottom: 5px; }
            h2 { color: #6b7280; font-size: 14px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-green { color: #22c55e; }
            .text-red { color: #ef4444; }
            .bg-gray { background-color: #f9fafb; }
            .indicator-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px; }
            .indicator-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
            .indicator-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
            .indicator-value { font-size: 28px; font-weight: bold; color: #1f2937; }
          </style>
        </head>
        <body>
          <h1>DRE Gerencial - ${dreData.regime}</h1>
          <h2>Período: ${new Date(dreData.periodStart).toLocaleDateString('pt-BR')} até ${new Date(dreData.periodEnd).toLocaleDateString('pt-BR')}</h2>
          
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="text-right">Valor (R$)</th>
                <th class="text-right">% Receita</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Receita Bruta</td>
                <td class="text-right font-bold">${formatCurrency(dreData.receita_bruta)}</td>
                <td class="text-right">100.0%</td>
              </tr>
              <tr class="bg-gray">
                <td style="padding-left: 30px;">(–) Deduções da Receita</td>
                <td class="text-right text-red">${formatCurrency(dreData.deducoes_receita)}</td>
                <td class="text-right">${formatPercentage(dreData.deducoes_receita, dreData.receita_bruta)}</td>
              </tr>
              <tr style="background-color: #dbeafe;">
                <td class="font-bold">= Receita Líquida</td>
                <td class="text-right font-bold">${formatCurrency(dreData.receita_liquida)}</td>
                <td class="text-right font-bold">${formatPercentage(dreData.receita_liquida, dreData.receita_bruta)}</td>
              </tr>
              <tr class="bg-gray">
                <td style="padding-left: 30px;">(–) Custos (CMV)</td>
                <td class="text-right text-red">${formatCurrency(dreData.custos)}</td>
                <td class="text-right">${formatPercentage(dreData.custos, dreData.receita_bruta)}</td>
              </tr>
              <tr style="background-color: #d1fae5;">
                <td class="font-bold">= Lucro Bruto</td>
                <td class="text-right font-bold text-green">${formatCurrency(dreData.lucro_bruto)}</td>
                <td class="text-right font-bold">${formatPercentage(dreData.lucro_bruto, dreData.receita_bruta)}</td>
              </tr>
              <tr class="bg-gray">
                <td style="padding-left: 30px;">(–) Despesas Operacionais</td>
                <td class="text-right text-red">${formatCurrency(dreData.despesas_operacionais)}</td>
                <td class="text-right">${formatPercentage(dreData.despesas_operacionais, dreData.receita_bruta)}</td>
              </tr>
              ${dreData.receitas_financeiras > 0 ? `
              <tr class="bg-gray">
                <td style="padding-left: 30px;">(+) Receitas Financeiras</td>
                <td class="text-right text-green">${formatCurrency(dreData.receitas_financeiras)}</td>
                <td class="text-right">${formatPercentage(dreData.receitas_financeiras, dreData.receita_bruta)}</td>
              </tr>
              ` : ''}
              <tr style="background-color: ${dreData.lucro_liquido >= 0 ? '#d1fae5' : '#fee2e2'}; border-top: 3px solid ${dreData.lucro_liquido >= 0 ? '#22c55e' : '#ef4444'};">
                <td class="font-bold" style="font-size: 18px;">= LUCRO LÍQUIDO</td>
                <td class="text-right font-bold ${dreData.lucro_liquido >= 0 ? 'text-green' : 'text-red'}" style="font-size: 18px;">${formatCurrency(dreData.lucro_liquido)}</td>
                <td class="text-right font-bold" style="font-size: 18px;">${formatPercentage(dreData.lucro_liquido, dreData.receita_bruta)}</td>
              </tr>
            </tbody>
          </table>

          ${indicators ? `
          <h2 style="margin-top: 40px; font-size: 18px; color: #1f2937;">Indicadores Financeiros</h2>
          <div class="indicator-grid">
            <div class="indicator-card">
              <div class="indicator-label">Margem Bruta</div>
              <div class="indicator-value text-green">${indicators.margemBruta.toFixed(1)}%</div>
            </div>
            <div class="indicator-card">
              <div class="indicator-label">EBITDA</div>
              <div class="indicator-value" style="color: #3b82f6;">${formatCurrency(indicators.ebitda)}</div>
            </div>
            <div class="indicator-card">
              <div class="indicator-label">Margem Líquida</div>
              <div class="indicator-value ${dreData.lucro_liquido >= 0 ? 'text-green' : 'text-red'}">${indicators.margemLiquida.toFixed(1)}%</div>
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    // Abrir em nova janela e imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const toggleSection = (code: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedSections(newExpanded);
  };

  const handleDrillDown = (lineCode: string, lineName: string) => {
    // Encontrar categoria(s) vinculada(s) a essa linha DRE
    const line = dreStructure.find(l => l.code === lineCode);
    if (!line) return;

    const linkedCategories = accountCategories.filter(cat => cat.dreLineId === line.id);
    const categoryIds = linkedCategories.map(cat => cat.id);

    // Filtrar transações
    const transactions = financialTransactions
      .filter(tx => categoryIds.includes(tx.categoryId))
      .filter(tx => tx.date >= startDate && tx.date <= endDate)
      .map(tx => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        partyName: tx.partyName || 'N/A',
      }));

    setDrillDownLine(`${lineCode} - ${lineName}`);
    setDrillDownTransactions(transactions);
    setDrillDownOpen(true);
  };

  // ==================== HELPERS ====================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number, base: number) => {
    if (base === 0) return '0%';
    return ((value / base) * 100).toFixed(1) + '%';
  };

  // ==================== CÁLCULOS DE INDICADORES ====================

  const calculateIndicators = () => {
    if (!dreData) return null;

    const receitaBruta = dreData.receita_bruta;
    const margemBruta = dreData.receita_bruta > 0 
      ? (dreData.lucro_bruto / dreData.receita_bruta) * 100 
      : 0;
    const margemOperacional = dreData.receita_bruta > 0 && dreData.resultado_operacional
      ? (dreData.resultado_operacional / dreData.receita_bruta) * 100
      : 0;
    const margemLiquida = dreData.receita_bruta > 0
      ? (dreData.lucro_liquido / dreData.receita_bruta) * 100
      : 0;

    // EBITDA = Lucro Operacional + Depreciação/Amortização
    // Como não temos depreciação, EBITDA ≈ Resultado Operacional (ou Lucro Bruto - Despesas Operacionais)
    const ebitda = dreData.resultado_operacional || (dreData.lucro_bruto - dreData.despesas_operacionais);
    const margemEbitda = dreData.receita_bruta > 0 ? (ebitda / dreData.receita_bruta) * 100 : 0;

    // ROL = Rentabilidade sobre Receita Líquida
    const rol = dreData.receita_liquida > 0 ? (dreData.lucro_liquido / dreData.receita_liquida) * 100 : 0;

    return { margemBruta, margemOperacional, margemLiquida, ebitda, margemEbitda, rol };
  };

  const indicators = calculateIndicators();

  // ==================== DADOS PARA GRÁFICOS ====================

  const getChartData = () => {
    if (!dreData) return null;

    const evolutionData = [
      { name: 'Receita Bruta', value: dreData.receita_bruta },
      { name: 'Receita Líquida', value: dreData.receita_liquida },
      { name: 'Lucro Bruto', value: dreData.lucro_bruto },
      { name: 'Lucro Líquido', value: dreData.lucro_liquido },
    ];

    const despesasData = [
      { name: 'Pessoal', value: dreData.despesas_pessoal, color: '#3b82f6' },
      { name: 'Comerciais', value: dreData.despesas_comerciais, color: '#10b981' },
      { name: 'Administrativas', value: dreData.despesas_administrativas, color: '#f59e0b' },
      { name: 'Financeiras', value: dreData.despesas_financeiras, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const composicaoData = [
      { name: 'Lucro Líquido', value: Math.abs(dreData.lucro_liquido), color: '#22c55e' },
      { name: 'Custos', value: dreData.custos, color: '#ef4444' },
      { name: 'Despesas Operacionais', value: dreData.despesas_operacionais, color: '#f59e0b' },
    ];

    return { evolutionData, despesasData, composicaoData };
  };

  const chartData = getChartData();

  // ==================== COMPARATIVO ====================

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, percentage: 0, positive: true };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { value: diff, percentage, positive: diff >= 0 };
  };

  // ==================== RENDER LINE ====================

  const renderDRELine = (
    label: string,
    value: number,
    options: {
      isSubtotal?: boolean;
      isTotal?: boolean;
      isNegative?: boolean;
      indent?: number;
      percentage?: number;
      code?: string;
      hasChildren?: boolean;
      children?: React.ReactNode;
      onClick?: () => void;
      value2?: number;
    } = {}
  ) => {
    const {
      isSubtotal = false,
      isTotal = false,
      isNegative = false,
      indent = 0,
      percentage,
      code,
      hasChildren = false,
      children,
      onClick,
      value2
    } = options;

    const isExpanded = code ? expandedSections.has(code) : false;

    const bgClass = isTotal
      ? 'bg-green-100 border-t-2 border-green-600'
      : isSubtotal
      ? 'bg-blue-50'
      : '';

    const textClass = isTotal
      ? 'font-bold text-lg'
      : isSubtotal
      ? 'font-semibold'
      : '';

    const valueClass = isTotal
      ? 'font-bold text-lg text-green-700'
      : isSubtotal
      ? 'font-semibold'
      : isNegative
      ? 'text-red-600'
      : '';

    const variation = value2 !== undefined ? getVariation(value, value2) : null;

    return (
      <>
        <tr className={`border-b ${bgClass} ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
          <td className={`px-4 py-3 ${textClass}`} style={{ paddingLeft: `${1 + indent * 2}rem` }}>
            <div className="flex items-center gap-2">
              {hasChildren && code && (
                <button
                  onClick={() => toggleSection(code)}
                  className="hover:bg-gray-200 rounded p-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {isNegative && '(–) '}
              {!isNegative && isSubtotal && '= '}
              <span onClick={onClick}>{label}</span>
            </div>
          </td>
          <td className={`px-4 py-3 text-right ${valueClass}`} onClick={onClick}>
            {isNegative && '('}
            {formatCurrency(Math.abs(value))}
            {isNegative && ')'}
          </td>
          <td className={`px-4 py-3 text-right ${textClass}`}>
            {percentage !== undefined ? `${percentage}%` : formatPercentage(Math.abs(value), dreData?.receita_bruta || 1)}
          </td>
          {comparativeMode && value2 !== undefined && (
            <>
              <td className={`px-4 py-3 text-right ${valueClass}`}>
                {isNegative && '('}
                {formatCurrency(Math.abs(value2))}
                {isNegative && ')'}
              </td>
              <td className={`px-4 py-3 text-right`}>
                {variation && (
                  <div className={`flex items-center justify-end gap-1 ${variation.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {variation.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="text-sm font-semibold">{variation.percentage.toFixed(1)}%</span>
                  </div>
                )}
              </td>
            </>
          )}
        </tr>
        {hasChildren && isExpanded && children}
      </>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <div>
            <h2 className="text-xl sm:text-2xl">DRE Gerencial Premium</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Demonstração do Resultado do Exercício - Análise Completa
            </p>
          </div>
        </div>
        {dreData && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveSnapshot} className="text-xs sm:text-sm">
              <Download className="w-4 h-4 mr-2" />
              Salvar Snapshot
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Selecione o período e configurações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modo Comparativo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="comparativeMode"
              checked={comparativeMode}
              onChange={(e) => setComparativeMode(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="comparativeMode" className="cursor-pointer">
              Modo Comparativo (2 períodos)
            </Label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Período 1 */}
            <div className="space-y-4 border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-sm text-blue-700">Período Principal</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Período 2 (apenas se comparativo) */}
            {comparativeMode && (
              <div className="space-y-4 border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-sm text-green-700">Período Comparativo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate2">Data Início</Label>
                    <Input
                      id="startDate2"
                      type="date"
                      value={startDate2}
                      onChange={(e) => setStartDate2(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate2">Data Fim</Label>
                    <Input
                      id="endDate2"
                      type="date"
                      value={endDate2}
                      onChange={(e) => setEndDate2(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Regime Tributário - Informativo */}
            <div className="flex items-center gap-2">
              <Label>Regime Tributário:</Label>
              {companySettings?.taxRegime ? (
                <Badge variant="outline" className="text-sm">
                  {companySettings.taxRegime}
                </Badge>
              ) : (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Não cadastrado (defina em Configurações)</span>
                </div>
              )}
            </div>

            {/* Botão Calcular */}
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleDiagnostic} 
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                🔍 Diagnóstico
              </Button>
              <Button onClick={handleCalculateDRE} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Calcular DRE
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dreData ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
          </TabsList>

          {/* TAB: DRE */}
          <TabsContent value="dre" className="space-y-4">
            {/* KPIs (Margens) */}
            {indicators && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Margem Bruta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {indicators.margemBruta.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">
                      Lucro Bruto / Receita Bruta
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      EBITDA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(indicators.ebitda)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Margem: {indicators.margemEbitda.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                {(companySettings?.taxRegime || dreData?.regime) !== 'SIMPLES' && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        Margem Operacional
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {indicators.margemOperacional.toFixed(1)}%
                      </div>
                      <p className="text-xs text-gray-500">
                        Resultado Op. / Receita
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {dreData.lucro_liquido >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      Margem Líquida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${dreData.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {indicators.margemLiquida.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">
                      Lucro Líquido / Receita
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* DRE Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      DRE - {companySettings?.taxRegime === 'SIMPLES' ? 'Simples Nacional' : 
                             companySettings?.taxRegime === 'PRESUMIDO' ? 'Lucro Presumido' : 
                             companySettings?.taxRegime === 'REAL' ? 'Lucro Real' : dreData.regime}
                    </CardTitle>
                    <CardDescription>
                      Período: {new Date(dreData.periodStart).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(dreData.periodEnd).toLocaleDateString('pt-BR')}
                      {comparativeMode && dreDataComparative && (
                        <> vs {new Date(dreDataComparative.periodStart).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(dreDataComparative.periodEnd).toLocaleDateString('pt-BR')}</>
                      )}
                    </CardDescription>
                  </div>
                  {dreData.lucro_liquido !== 0 && (
                    <Badge variant={dreData.lucro_liquido > 0 ? 'default' : 'destructive'}>
                      {dreData.lucro_liquido > 0 ? 'Lucro' : 'Prejuízo'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Descrição</th>
                        <th className="text-right px-4 py-3 font-semibold w-32">Período 1</th>
                        <th className="text-right px-4 py-3 font-semibold w-24">% Rec.</th>
                        {comparativeMode && dreDataComparative && (
                          <>
                            <th className="text-right px-4 py-3 font-semibold w-32">Período 2</th>
                            <th className="text-right px-4 py-3 font-semibold w-24">Var.</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {renderDRELine('Receita Bruta', dreData.receita_bruta, { 
                        percentage: 100,
                        onClick: () => handleDrillDown('RB', 'Receita Bruta'),
                        value2: dreDataComparative?.receita_bruta
                      })}
                      {renderDRELine('Deduções da Receita', dreData.deducoes_receita, { 
                        isNegative: true, 
                        indent: 1,
                        onClick: () => handleDrillDown('DED', 'Deduções'),
                        value2: dreDataComparative?.deducoes_receita
                      })}
                      {renderDRELine('Receita Líquida', dreData.receita_liquida, { 
                        isSubtotal: true,
                        value2: dreDataComparative?.receita_liquida
                      })}
                      {renderDRELine('Custos (CMV)', dreData.custos, { 
                        isNegative: true, 
                        indent: 1,
                        onClick: () => handleDrillDown('CMV', 'Custos'),
                        value2: dreDataComparative?.custos
                      })}
                      {renderDRELine('Lucro Bruto', dreData.lucro_bruto, { 
                        isSubtotal: true,
                        value2: dreDataComparative?.lucro_bruto
                      })}
                      {renderDRELine(
                        'Despesas Operacionais',
                        dreData.despesas_operacionais,
                        {
                          isNegative: true,
                          indent: 1,
                          code: 'DO',
                          hasChildren: true,
                          value2: dreDataComparative?.despesas_operacionais,
                          children: (
                            <>
                              {dreData.despesas_pessoal > 0 && renderDRELine('Despesas com Pessoal', dreData.despesas_pessoal, { 
                                isNegative: true, 
                                indent: 2,
                                onClick: () => handleDrillDown('DP', 'Despesas Pessoal'),
                                value2: dreDataComparative?.despesas_pessoal
                              })}
                              {dreData.despesas_comerciais > 0 && renderDRELine('Despesas Comerciais', dreData.despesas_comerciais, { 
                                isNegative: true, 
                                indent: 2,
                                onClick: () => handleDrillDown('DC', 'Despesas Comerciais'),
                                value2: dreDataComparative?.despesas_comerciais
                              })}
                              {dreData.despesas_administrativas > 0 && renderDRELine('Despesas Administrativas', dreData.despesas_administrativas, { 
                                isNegative: true, 
                                indent: 2,
                                onClick: () => handleDrillDown('DA', 'Despesas Administrativas'),
                                value2: dreDataComparative?.despesas_administrativas
                              })}
                              {dreData.despesas_financeiras > 0 && renderDRELine('Despesas Financeiras', dreData.despesas_financeiras, { 
                                isNegative: true, 
                                indent: 2,
                                onClick: () => handleDrillDown('DF', 'Despesas Financeiras'),
                                value2: dreDataComparative?.despesas_financeiras
                              })}
                            </>
                          )
                        }
                      )}
                      {dreData.receitas_financeiras > 0 && renderDRELine(
                        'Receitas Financeiras',
                        dreData.receitas_financeiras,
                        {
                          indent: 1,
                          code: 'RF',
                          hasChildren: false,
                          onClick: () => handleDrillDown('RF', 'Receitas Financeiras'),
                          value2: dreDataComparative?.receitas_financeiras
                        }
                      )}
                      {(companySettings?.taxRegime || dreData.regime) !== 'SIMPLES' && dreData.resultado_operacional !== undefined && 
                        renderDRELine('Resultado Operacional', dreData.resultado_operacional, { 
                          isSubtotal: true,
                          value2: dreDataComparative?.resultado_operacional
                        })
                      }
                      {(companySettings?.taxRegime || dreData.regime) !== 'SIMPLES' && dreData.irpj !== undefined && dreData.irpj > 0 &&
                        renderDRELine('IRPJ', dreData.irpj, { 
                          isNegative: true, 
                          indent: 1,
                          value2: dreDataComparative?.irpj
                        })
                      }
                      {(companySettings?.taxRegime || dreData.regime) !== 'SIMPLES' && dreData.csll !== undefined && dreData.csll > 0 &&
                        renderDRELine('CSLL', dreData.csll, { 
                          isNegative: true, 
                          indent: 1,
                          value2: dreDataComparative?.csll
                        })
                      }
                      {renderDRELine('LUCRO LÍQUIDO', dreData.lucro_liquido, { 
                        isTotal: true,
                        value2: dreDataComparative?.lucro_liquido
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: INDICADORES */}
          <TabsContent value="indicadores">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Indicadores Financeiros</CardTitle>
                <CardDescription>Principais métricas de desempenho</CardDescription>
              </CardHeader>
              <CardContent>
                {indicators && (
                  <div className="space-y-6">
                    {/* Rentabilidade */}
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Rentabilidade</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-1">Margem Bruta</div>
                          <div className="text-3xl font-bold text-green-600">{indicators.margemBruta.toFixed(2)}%</div>
                          <div className="text-xs text-gray-400 mt-2">Lucro Bruto / Receita Bruta</div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-1">Margem EBITDA</div>
                          <div className="text-3xl font-bold text-blue-600">{indicators.margemEbitda.toFixed(2)}%</div>
                          <div className="text-xs text-gray-400 mt-2">EBITDA / Receita Bruta</div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-1">Margem Líquida</div>
                          <div className={`text-3xl font-bold ${dreData.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {indicators.margemLiquida.toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-400 mt-2">Lucro Líquido / Receita Bruta</div>
                        </div>
                      </div>
                    </div>

                    {/* Estrutura de Custos */}
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Estrutura de Custos e Despesas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-1">CMV / Receita Bruta</div>
                          <div className="text-2xl font-bold">{((dreData.custos / dreData.receita_bruta) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-1">Despesas Op. / Receita Bruta</div>
                          <div className="text-2xl font-bold">{((dreData.despesas_operacionais / dreData.receita_bruta) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* ROL */}
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Retorno</h4>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">ROL - Retorno sobre Receita Líquida</div>
                        <div className="text-3xl font-bold text-purple-600">{indicators.rol.toFixed(2)}%</div>
                        <div className="text-xs text-gray-400 mt-2">Lucro Líquido / Receita Líquida</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: GRÁFICOS */}
          <TabsContent value="graficos">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evolução */}
              {chartData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução de Resultados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Despesas por Tipo */}
              {chartData && chartData.despesasData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Composição de Despesas Operacionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.despesasData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.despesasData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Composição da Receita */}
              {chartData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Composição da Receita Bruta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.composicaoData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.composicaoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB: DETALHAMENTO */}
          <TabsContent value="detalhamento">
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Linha DRE</CardTitle>
                <CardDescription>Clique em uma linha para ver as transações</CardDescription>
              </CardHeader>
              <CardContent>
                {dreData.breakdown && Object.keys(dreData.breakdown).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(dreData.breakdown)
                      .filter(([_, value]) => value > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([code, value]) => {
                        const line = dreStructure.find(l => l.code === code);
                        return (
                          <div 
                            key={code} 
                            className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => handleDrillDown(code, line?.name || code)}
                          >
                            <div className="text-xs text-gray-500 mb-1">{code}</div>
                            <div className="text-sm font-semibold mb-1">{line?.name || code}</div>
                            <div className="text-lg font-bold text-blue-600">{formatCurrency(value)}</div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">Nenhuma DRE calculada</p>
            <p className="text-sm text-gray-400">
              Selecione o período e clique em "Calcular DRE"
            </p>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Drill-down de transações */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transações - {drillDownLine}</DialogTitle>
            <DialogDescription>
              {drillDownTransactions.length} transação(ões) encontrada(s)
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {drillDownTransactions.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-semibold">Data</th>
                      <th className="text-left px-4 py-2 text-sm font-semibold">Descrição</th>
                      <th className="text-left px-4 py-2 text-sm font-semibold">Parte</th>
                      <th className="text-right px-4 py-2 text-sm font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownTransactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-2 text-sm">{tx.description}</td>
                        <td className="px-4 py-2 text-sm">{tx.partyName}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold">
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-semibold">Total</td>
                      <td className="px-4 py-2 text-sm text-right font-bold">
                        {formatCurrency(drillDownTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação encontrada para esta linha DRE
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}