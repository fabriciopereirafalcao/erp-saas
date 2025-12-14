import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Download, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useERP } from '../contexts/ERPContext';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

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
  outras_receitas_despesas: number;
  resultado_operacional?: number;
  irpj?: number;
  csll?: number;
  lucro_liquido: number;
  breakdown: Record<string, number>;
}

interface DRELineItem {
  lineCode: string;
  lineName: string;
  value: number;
  isSubtotal: boolean;
  level: number;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function DREGerencial() {
  const { user, companySettings } = useERP();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [regime, setRegime] = useState<string>('SIMPLES');

  // ==================== EFFECTS ====================

  useEffect(() => {
    // Carregar regime da empresa
    if (companySettings?.taxRegime) {
      setRegime(companySettings.taxRegime);
    }
  }, [companySettings]);

  // ==================== HANDLERS ====================

  const handleCalculateDRE = async () => {
    if (!startDate || !endDate) {
      alert('Selecione o período');
      return;
    }

    if (!accessToken) {
      alert('Você precisa estar autenticado');
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

  const handleSaveSnapshot = async () => {
    if (!dreData) return;

    if (!accessToken) {
      alert('Você precisa estar autenticado');
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/snapshot`;
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
        alert('Snapshot salvo com sucesso!');
      } else {
        alert('Erro ao salvar snapshot');
      }
    } catch (error) {
      console.error('Erro ao salvar snapshot:', error);
      alert('Erro ao salvar snapshot');
    }
  };

  const handleExportPDF = () => {
    alert('Funcionalidade de exportação PDF será implementada em breve');
  };

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

  // ==================== CÁLCULOS DE MARGENS ====================

  const calculateMargins = () => {
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

    return { margemBruta, margemOperacional, margemLiquida };
  };

  const margins = calculateMargins();

  // ==================== RENDER ====================

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <div>
            <h2 className="text-xl sm:text-2xl">DRE Gerencial</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Demonstração do Resultado do Exercício - Foco Gerencial
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
              <Download className="w-4 h-4 mr-2" />
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
            Selecione o período e regime tributário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Data Início */}
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Data Fim */}
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Regime */}
            <div>
              <Label htmlFor="regime">Regime Tributário</Label>
              <Select value={regime} onValueChange={setRegime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLES">Simples Nacional</SelectItem>
                  <SelectItem value="PRESUMIDO">Lucro Presumido</SelectItem>
                  <SelectItem value="REAL">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Calcular */}
            <div className="flex items-end">
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

      {/* KPIs (Margens) */}
      {dreData && margins && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Margem Bruta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {margins.margemBruta.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">
                Lucro Bruto / Receita Bruta
              </p>
            </CardContent>
          </Card>

          {regime !== 'SIMPLES' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Margem Operacional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {margins.margemOperacional.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">
                  Resultado Operacional / Receita Bruta
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Margem Líquida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {margins.margemLiquida.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">
                Lucro Líquido / Receita Bruta
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DRE Table */}
      {dreData ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>DRE - {regime}</CardTitle>
                <CardDescription>
                  Período: {new Date(dreData.periodStart).toLocaleDateString('pt-BR')} até{' '}
                  {new Date(dreData.periodEnd).toLocaleDateString('pt-BR')}
                </CardDescription>
              </div>
              <Badge variant={dreData.lucro_liquido > 0 ? 'default' : 'destructive'}>
                {dreData.lucro_liquido > 0 ? 'Lucro' : 'Prejuízo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Descrição</th>
                    <th className="text-right px-4 py-3 font-semibold w-48">Valor (R$)</th>
                    <th className="text-right px-4 py-3 font-semibold w-32">% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Receita Bruta */}
                  <tr className="border-b">
                    <td className="px-4 py-3">Receita Bruta</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(dreData.receita_bruta)}
                    </td>
                    <td className="px-4 py-3 text-right">100.0%</td>
                  </tr>

                  {/* Deduções */}
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">(–) Deduções da Receita</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      ({formatCurrency(dreData.deducoes_receita)})
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatPercentage(dreData.deducoes_receita, dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Receita Líquida */}
                  <tr className="border-b bg-blue-50">
                    <td className="px-4 py-3 font-semibold">= Receita Líquida</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(dreData.receita_liquida)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPercentage(dreData.receita_liquida, dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Custos */}
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">(–) Custos</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      ({formatCurrency(dreData.custos)})
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatPercentage(dreData.custos, dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Lucro Bruto */}
                  <tr className="border-b bg-green-50">
                    <td className="px-4 py-3 font-semibold">= Lucro Bruto</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatCurrency(dreData.lucro_bruto)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatPercentage(dreData.lucro_bruto, dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Despesas Operacionais */}
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">
                      (–) Despesas Operacionais {regime === 'SIMPLES' && '(inclui DAS)'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      ({formatCurrency(dreData.despesas_operacionais)})
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatPercentage(dreData.despesas_operacionais, dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Outras Receitas/Despesas */}
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">(+/–) Outras Receitas/Despesas</td>
                    <td className={`px-4 py-3 text-right ${dreData.outras_receitas_despesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dreData.outras_receitas_despesas >= 0 ? '' : '('}
                      {formatCurrency(Math.abs(dreData.outras_receitas_despesas))}
                      {dreData.outras_receitas_despesas >= 0 ? '' : ')'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercentage(Math.abs(dreData.outras_receitas_despesas), dreData.receita_bruta)}
                    </td>
                  </tr>

                  {/* Resultado Operacional (só para PRESUMIDO e REAL) */}
                  {regime !== 'SIMPLES' && dreData.resultado_operacional !== undefined && (
                    <tr className="border-b bg-blue-50">
                      <td className="px-4 py-3 font-semibold">= Resultado Operacional</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(dreData.resultado_operacional)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatPercentage(dreData.resultado_operacional, dreData.receita_bruta)}
                      </td>
                    </tr>
                  )}

                  {/* IRPJ (só para PRESUMIDO e REAL) */}
                  {regime !== 'SIMPLES' && dreData.irpj !== undefined && (
                    <tr className="border-b">
                      <td className="px-4 py-3 pl-8">(–) IRPJ</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        ({formatCurrency(dreData.irpj)})
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatPercentage(dreData.irpj, dreData.receita_bruta)}
                      </td>
                    </tr>
                  )}

                  {/* CSLL (só para PRESUMIDO e REAL) */}
                  {regime !== 'SIMPLES' && dreData.csll !== undefined && (
                    <tr className="border-b">
                      <td className="px-4 py-3 pl-8">(–) CSLL</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        ({formatCurrency(dreData.csll)})
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatPercentage(dreData.csll, dreData.receita_bruta)}
                      </td>
                    </tr>
                  )}

                  {/* Lucro Líquido */}
                  <tr className="bg-green-100 border-t-2 border-green-600">
                    <td className="px-4 py-4 font-bold text-lg">= LUCRO LÍQUIDO</td>
                    <td className="px-4 py-4 text-right font-bold text-lg text-green-700">
                      {formatCurrency(dreData.lucro_liquido)}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      {formatPercentage(dreData.lucro_liquido, dreData.receita_bruta)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
}