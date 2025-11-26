import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  PieChart,
  Users,
  Calendar,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart,
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { Alert, AlertDescription } from "./ui/alert";

// ============================================================================
// TIPOS
// ============================================================================

interface Estatisticas {
  resumo: {
    totalNFes: number;
    totalAutorizadas: number;
    totalRejeitadas: number;
    totalCanceladas: number;
    totalRascunhos: number;
    valorTotalProdutos: number;
    valorTotalNFes: number;
    valorTotalImpostos: number;
    ticketMedio: number;
  };
  
  evolucao: Array<{
    data: string;
    quantidade: number;
    valorTotal: number;
    autorizadas: number;
    rejeitadas: number;
  }>;
  
  distribuicaoStatus: Array<{
    status: string;
    quantidade: number;
    percentual: number;
    valor: number;
  }>;
  
  topDestinatarios: Array<{
    nome: string;
    cpfCnpj: string;
    quantidade: number;
    valorTotal: number;
  }>;
  
  impostos: {
    icms: number;
    icmsST: number;
    ipi: number;
    pis: number;
    cofins: number;
    total: number;
  };
  
  periodo: {
    inicio: string;
    fim: string;
  };
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FiscalDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar estatísticas
  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Montar query params
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/estatisticas?periodo=${periodo}`;
      
      if (periodo === 'custom' && dataInicio && dataFim) {
        url += `&dataInicio=${dataInicio}&dataFim=${dataFim}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar estatísticas');
      }

      const result = await response.json();
      
      if (result.success) {
        setEstatisticas(result.data);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (err: any) {
      console.error('Erro ao carregar estatísticas:', err);
      setError(err.message);
      toast.error('Erro ao carregar dashboard', {
        description: err.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePeriodoChange = (novoPeriodo: string) => {
    setPeriodo(novoPeriodo as any);
    // Se não for custom, carregar automaticamente
    if (novoPeriodo !== 'custom') {
      setTimeout(() => carregarEstatisticas(), 100);
    }
  };

  const handleFiltrarCustom = () => {
    if (!dataInicio || !dataFim) {
      toast.error('Preencha as datas de início e fim');
      return;
    }
    carregarEstatisticas();
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !estatisticas) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => carregarEstatisticas()}
            className="ml-4"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!estatisticas) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* HEADER COM FILTROS */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl">Dashboard Fiscal</h2>
          <p className="text-muted-foreground">
            Período: {formatarData(estatisticas.periodo.inicio)} a {formatarData(estatisticas.periodo.fim)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Período customizado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => carregarEstatisticas(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* FILTRO CUSTOMIZADO */}
      {periodo === 'custom' && (
        <Card className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <Button onClick={handleFiltrarCustom}>
              <Calendar className="size-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </Card>
      )}

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de NF-es"
          value={estatisticas.resumo.totalNFes}
          icon={FileText}
          color="blue"
          subtitle={`${estatisticas.resumo.totalAutorizadas} autorizadas`}
        />
        
        <MetricCard
          title="Valor Total"
          value={formatarMoeda(estatisticas.resumo.valorTotalNFes)}
          icon={DollarSign}
          color="green"
          subtitle={`Ticket médio: ${formatarMoeda(estatisticas.resumo.ticketMedio)}`}
        />
        
        <MetricCard
          title="Impostos"
          value={formatarMoeda(estatisticas.resumo.valorTotalImpostos)}
          icon={TrendingUp}
          color="purple"
          subtitle={`${((estatisticas.resumo.valorTotalImpostos / estatisticas.resumo.valorTotalNFes) * 100 || 0).toFixed(1)}% do total`}
        />
        
        <MetricCard
          title="Taxa de Sucesso"
          value={`${estatisticas.resumo.totalNFes > 0 ? ((estatisticas.resumo.totalAutorizadas / estatisticas.resumo.totalNFes) * 100).toFixed(1) : 0}%`}
          icon={CheckCircle}
          color="green"
          subtitle={`${estatisticas.resumo.totalRejeitadas} rejeitadas`}
        />
      </div>

      {/* MINI CARDS DE STATUS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusMiniCard
          label="Autorizadas"
          value={estatisticas.resumo.totalAutorizadas}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatusMiniCard
          label="Rejeitadas"
          value={estatisticas.resumo.totalRejeitadas}
          icon={XCircle}
          color="text-red-600"
        />
        <StatusMiniCard
          label="Canceladas"
          value={estatisticas.resumo.totalCanceladas}
          icon={AlertCircle}
          color="text-orange-600"
        />
        <StatusMiniCard
          label="Rascunhos"
          value={estatisticas.resumo.totalRascunhos}
          icon={Clock}
          color="text-gray-600"
        />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EVOLUÇÃO TEMPORAL */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <BarChart3 className="size-5" />
            Evolução de NF-es
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={estatisticas.evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tickFormatter={(value) => {
                  const [ano, mes, dia] = value.split('-');
                  return `${dia}/${mes}`;
                }}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => formatarData(value)}
                formatter={(value: any, name: string) => {
                  if (name === 'valorTotal') return [formatarMoeda(value), 'Valor Total'];
                  if (name === 'quantidade') return [value, 'Quantidade'];
                  if (name === 'autorizadas') return [value, 'Autorizadas'];
                  if (name === 'rejeitadas') return [value, 'Rejeitadas'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="quantidade" stroke="#3b82f6" name="Quantidade" />
              <Line type="monotone" dataKey="autorizadas" stroke="#10b981" name="Autorizadas" />
              <Line type="monotone" dataKey="rejeitadas" stroke="#ef4444" name="Rejeitadas" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* DISTRIBUIÇÃO POR STATUS */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <PieChart className="size-5" />
            Distribuição por Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={estatisticas.distribuicaoStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.status}: ${entry.quantidade}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="quantidade"
              >
                {estatisticas.distribuicaoStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: string, props: any) => {
                  return [
                    `${value} (${props.payload.percentual.toFixed(1)}%)`,
                    'Quantidade'
                  ];
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </Card>

        {/* VALORES POR DIA */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <DollarSign className="size-5" />
            Valores por Dia
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estatisticas.evolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tickFormatter={(value) => {
                  const [ano, mes, dia] = value.split('-');
                  return `${dia}/${mes}`;
                }}
              />
              <YAxis tickFormatter={(value) => formatarMoedaCurta(value)} />
              <Tooltip 
                labelFormatter={(value) => formatarData(value)}
                formatter={(value: any) => [formatarMoeda(value), 'Valor Total']}
              />
              <Legend />
              <Bar dataKey="valorTotal" fill="#10b981" name="Valor Total" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* BREAKDOWN DE IMPOSTOS */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-5" />
            Breakdown de Impostos
          </h3>
          <div className="space-y-4">
            <ImpostoBar
              label="ICMS"
              valor={estatisticas.impostos.icms}
              total={estatisticas.impostos.total}
              color="bg-blue-500"
            />
            <ImpostoBar
              label="ICMS-ST"
              valor={estatisticas.impostos.icmsST}
              total={estatisticas.impostos.total}
              color="bg-indigo-500"
            />
            <ImpostoBar
              label="IPI"
              valor={estatisticas.impostos.ipi}
              total={estatisticas.impostos.total}
              color="bg-purple-500"
            />
            <ImpostoBar
              label="PIS"
              valor={estatisticas.impostos.pis}
              total={estatisticas.impostos.total}
              color="bg-pink-500"
            />
            <ImpostoBar
              label="COFINS"
              valor={estatisticas.impostos.cofins}
              total={estatisticas.impostos.total}
              color="bg-rose-500"
            />
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatarMoeda(estatisticas.impostos.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* TOP DESTINATÁRIOS */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2">
          <Users className="size-5" />
          Top 10 Destinatários
        </h3>
        {estatisticas.topDestinatarios.length > 0 ? (
          <div className="space-y-3">
            {estatisticas.topDestinatarios.map((dest, index) => (
              <div 
                key={dest.cpfCnpj} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{dest.nome}</p>
                    <p className="text-sm text-muted-foreground">{formatarCpfCnpj(dest.cpfCnpj)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatarMoeda(dest.valorTotal)}</p>
                  <p className="text-sm text-muted-foreground">{dest.quantidade} NF-es</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum destinatário no período selecionado
          </p>
        )}
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'red';
  subtitle?: string;
}

function MetricCard({ title, value, icon: Icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="size-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

interface StatusMiniCardProps {
  label: string;
  value: number;
  icon: any;
  color: string;
}

function StatusMiniCard({ label, value, icon: Icon, color }: StatusMiniCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={`size-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

interface ImpostoBarProps {
  label: string;
  valor: number;
  total: number;
  color: string;
}

function ImpostoBar({ label, valor, total, color }: ImpostoBarProps) {
  const percentual = total > 0 ? (valor / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {formatarMoeda(valor)} ({percentual.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarMoedaCurta(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`;
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(1)}K`;
  }
  return formatarMoeda(valor);
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarCpfCnpj(valor: string): string {
  const numeros = valor.replace(/\D/g, '');
  
  if (numeros.length === 11) {
    // CPF: 000.000.000-00
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numeros.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return valor;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    autorizada: '#10b981',
    rejeitada: '#ef4444',
    cancelada: '#f59e0b',
    rascunho: '#6b7280',
    transmitida: '#3b82f6',
    assinada: '#8b5cf6',
    emitida: '#06b6d4',
  };

  return colors[status] || '#6b7280';
}
