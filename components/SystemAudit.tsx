import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Shield,
  Database,
  Zap,
  Eye,
  Lock,
  BarChart3,
  FileWarning,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { toast } from "sonner";
import { IS_DEVELOPMENT, ENVIRONMENT } from "../utils/environment";
import { useERP } from "../contexts/ERPContext";
import { 
  runSystemAnalysis, 
  calculateAuditStatistics, 
  calculateHealthScore,
  AuditIssue as AnalyzerAuditIssue
} from "../utils/systemAnalyzer";

interface AuditIssue {
  id: string;
  severity: "Crítico" | "Alto" | "Médio" | "Baixo" | "Info";
  category: "Integração" | "Dados" | "Lógica" | "UI/UX" | "Segurança" | "Performance";
  module: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  files: string[];
  status: "Pendente" | "Em Análise" | "Resolvido";
}

export function SystemAudit() {
  const erpContext = useERP();
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Usar estados do contexto global para persistir dados entre navegações
  const { auditIssues, lastAnalysisDate, setAuditResults } = erpContext;

  const toggleIssue = (id: string) => {
    if (expandedIssues.includes(id)) {
      setExpandedIssues(expandedIssues.filter(i => i !== id));
    } else {
      setExpandedIssues([...expandedIssues, id]);
    }
  };

  // Função para re-executar análise
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("Iniciando análise completa do sistema...");
    
    try {
      // Aguardar um momento para dar feedback visual
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Executar análise real do sistema
      const systemData = {
        salesOrders: erpContext.salesOrders,
        inventory: erpContext.inventory,
        customers: erpContext.customers,
        suppliers: erpContext.suppliers,
        financialTransactions: erpContext.financialTransactions,
        accountsReceivable: erpContext.accountsReceivable,
        accountsPayable: erpContext.accountsPayable,
        companySettings: erpContext.companySettings
      };

      const issues = runSystemAnalysis(systemData);
      const now = new Date();
      
      // Salvar resultados no contexto global para persistir entre navegações
      setAuditResults(issues, now);
      
      const stats = calculateAuditStatistics(issues);
      
      if (stats.critical > 0) {
        toast.error(`Análise concluída: ${stats.critical} problemas críticos encontrados!`);
      } else if (stats.high > 0) {
        toast.warning(`Análise concluída: ${stats.high} problemas de alta prioridade encontrados.`);
      } else if (stats.total > 0) {
        toast.success(`Análise concluída: ${stats.total} questões identificadas.`);
      } else {
        toast.success("Análise concluída: Sistema sem problemas detectados!");
      }
      
      // Scroll para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error("Erro ao executar análise");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // RELATÓRIO COMPLETO DE AUDITORIA (dados estáticos de referência - podem ser sobrescritos pela análise real)
  const staticAuditIssues: AuditIssue[] = [
    // ============ CRÍTICO ============
    {
      id: "CRIT-001",
      severity: "Crítico",
      category: "Integração",
      module: "Pedidos de Venda → Estoque",
      title: "✅ Risco de Duplicação na Baixa de Estoque [RESOLVIDO]",
      description: "PROBLEMA RESOLVIDO: Implementado sistema completo de proteção com locks transacionais, validação atômica em 3 camadas (flag, lock, estoque disponível), e rollback automático. A função executeStockReduction agora possui proteção de nível empresarial contra duplicação.",
      impact: "IMPACTO ELIMINADO: Sistema agora possui garantia de idempotência. Impossível executar baixa duplicada mesmo com cliques múltiplos ou race conditions.",
      recommendation: "✅ IMPLEMENTADO: Sistema de locks transacionais (/utils/stockValidation.ts), validação atômica com 3 camadas, verificação de flag stockReduced, e liberação garantida de locks (bloco finally).",
      files: ["/contexts/ERPContext.tsx", "/utils/stockValidation.ts"],
      status: "Resolvido"
    },
    {
      id: "CRIT-002",
      severity: "Crítico",
      category: "Integração",
      module: "Pedidos → Financeiro",
      title: "✅ Geração Duplicada de Contas a Receber/Pagar [RESOLVIDO]",
      description: "PROBLEMA RESOLVIDO: Implementado sistema de proteção dupla com verificação de flag (accountsReceivableCreated) + verificação de referência (busca por transação existente). Sistema de locks previne execuções simultâneas.",
      impact: "IMPACTO ELIMINADO: Sistema agora verifica duas vezes antes de criar conta: primeiro pela flag, depois pela referência no banco. Se conta já existe, retorna ID existente ao invés de duplicar.",
      recommendation: "✅ IMPLEMENTADO: Verificação dupla (flag + referência), sistema de locks transacionais, busca por transação existente, e retorno de ID existente ao invés de criar duplicata.",
      files: ["/contexts/ERPContext.tsx", "/utils/stockValidation.ts"],
      status: "Resolvido"
    },
    {
      id: "CRIT-003",
      severity: "Crítico",
      category: "Dados",
      module: "Estoque",
      title: "Ausência de Validação de Saldo Negativo",
      description: "O sistema permite que sejam criados pedidos de venda mesmo quando não há estoque suficiente. Não há validação de saldo disponível no momento da criação ou confirmação do pedido.",
      impact: "Venda de produtos sem estoque, causando impossibilidade de entrega e inconsistência entre vendas e capacidade de atendimento.",
      recommendation: "Adicionar validação de estoque disponível antes de confirmar pedido. Implementar sistema de reserva de estoque para pedidos em andamento.",
      files: ["/components/SalesOrders.tsx", "/contexts/ERPContext.tsx"],
      status: "Pendente"
    },
    {
      id: "CRIT-004",
      severity: "Crítico",
      category: "Lógica",
      module: "Status de Pedidos",
      title: "✅ Falta de Validação de Transição de Status [RESOLVIDO]",
      description: "PROBLEMA RESOLVIDO: Implementada máquina de estados completa que valida todas as transições de status. Sistema agora bloqueia pulos de etapas e garante execução sequencial das automações. Todas as tentativas de transição são registradas para auditoria.",
      impact: "IMPACTO ELIMINADO: Impossível pular etapas do fluxo. Sistema valida transições com máquina de estados estrita (Processando → Confirmado → Enviado → Entregue → Pago). Status intermediários pulados têm suas automações executadas automaticamente.",
      recommendation: "✅ IMPLEMENTADO: Máquina de estados completa (/utils/statusTransitionValidation.ts), validação em tempo real com mensagens claras, registro de tentativas para auditoria, execução automática de ações de etapas puladas.",
      files: ["/contexts/ERPContext.tsx", "/utils/statusTransitionValidation.ts"],
      status: "Resolvido"
    },

    // ============ ALTO ============
    {
      id: "HIGH-001",
      severity: "Alto",
      category: "Integração",
      module: "Cancelamento de Pedidos",
      title: "Reversão Incompleta de Ações ao Cancelar Pedido",
      description: "Ao cancelar um pedido que já teve baixa de estoque e geração de conta a receber, não há estorno automático dessas operações.",
      impact: "Estoque não é devolvido, conta a receber permanece ativa, causando dados inconsistentes no sistema.",
      recommendation: "Implementar função de rollback que reverte todas as ações executadas (devolução ao estoque, cancelamento de conta a receber, etc.).",
      files: ["/contexts/ERPContext.tsx"],
      status: "Pendente"
    },
    {
      id: "HIGH-002",
      severity: "Alto",
      category: "Dados",
      module: "Campos Obrigatórios",
      title: "Falta de Validação de Campos Críticos",
      description: "Diversos campos obrigatórios não possuem validação adequada: NCM em produtos, CNPJ/CPF em clientes, dados fiscais em empresa.",
      impact: "Impossibilidade de emitir NFe corretamente, erros em relatórios fiscais, dados incompletos para operações.",
      recommendation: "Adicionar validações obrigatórias nos formulários. Marcar campos críticos com asterisco (*) e impedir salvamento sem preenchimento.",
      files: ["/components/Inventory.tsx", "/components/Customers.tsx", "/components/CompanySettings.tsx"],
      status: "Pendente"
    },
    {
      id: "HIGH-003",
      severity: "Alto",
      category: "Segurança",
      module: "Permissões de Acesso",
      title: "Permissões Não Implementadas no Frontend",
      description: "O módulo de Usuários e Permissões existe, mas as permissões não são verificadas nos componentes. Qualquer usuário pode acessar qualquer módulo.",
      impact: "Falta de controle de acesso, permitindo que usuários vejam/editem dados que não deveriam ter acesso.",
      recommendation: "Implementar hook usePermissions() e wrapper de rotas/componentes para validar permissões antes de renderizar.",
      files: ["/components/UsersPermissions.tsx", "/App.tsx"],
      status: "Pendente"
    },
    {
      id: "HIGH-004",
      severity: "Alto",
      category: "Lógica",
      module: "NFe - Faturamento Fiscal",
      title: "Validação Incompleta de Dados Fiscais",
      description: "A emissão de NFe não valida se todos os dados fiscais obrigatórios estão preenchidos (CFOP, CST/CSOSN, NCM, dados da empresa).",
      impact: "Tentativa de emissão de NFe com dados incompletos, que seria rejeitada pela SEFAZ. Retrabalho e atraso no faturamento.",
      recommendation: "Adicionar validação completa antes de permitir transmissão. Criar checklist de pré-requisitos para emissão.",
      files: ["/components/TaxInvoicing.tsx"],
      status: "Pendente"
    },
    {
      id: "HIGH-005",
      severity: "Alto",
      category: "Integração",
      module: "Pedidos → NFe",
      title: "Falta de Integração Automática entre Pedido e NFe",
      description: "Não há geração automática de NFe ao marcar pedido como 'Entregue'. O faturamento fiscal é completamente manual e desconectado do fluxo de vendas.",
      impact: "Risco de esquecer de emitir nota fiscal, atraso no faturamento, possível irregularidade fiscal.",
      recommendation: "Implementar opção de geração automática de NFe ao entregar pedido, ou ao menos criar rascunho de NFe automaticamente.",
      files: ["/components/TaxInvoicing.tsx", "/components/SalesOrders.tsx"],
      status: "Pendente"
    },

    // ============ MÉDIO ============
    {
      id: "MED-001",
      severity: "Médio",
      category: "Dados",
      module: "Cálculo de Totais",
      title: "Validação de Valores em Pedidos",
      description: "Não há validação se o totalAmount do pedido é igual à soma dos itens. Sistema aceita valores manuais sem conferência.",
      impact: "Possível divergência entre valor total e soma dos itens, causando problemas em relatórios e fechamento contábil.",
      recommendation: "Calcular automaticamente o total com base nos itens. Se permitir edição manual, validar se está correto.",
      files: ["/components/SalesOrders.tsx"],
      status: "Pendente"
    },
    {
      id: "MED-002",
      severity: "Médio",
      category: "Performance",
      module: "Dashboard e Relatórios",
      title: "Recálculo Desnecessário de Métricas",
      description: "Dashboards e relatórios recalculam todos os indicadores a cada render, mesmo quando os dados não mudaram.",
      impact: "Performance degradada com grande volume de dados. Interface pode ficar lenta.",
      recommendation: "Usar useMemo() para cachear cálculos de métricas. Recalcular apenas quando dados relevantes mudarem.",
      files: ["/components/Dashboard.tsx", "/components/Reports.tsx", "/components/CashFlow.tsx"],
      status: "Pendente"
    },
    {
      id: "MED-003",
      severity: "Médio",
      category: "UI/UX",
      module: "Formulários",
      title: "Feedback Insuficiente em Operações Assíncronas",
      description: "Algumas operações (como salvar pedido, gerar NFe) não mostram loading ou confirmação clara. Usuário pode clicar múltiplas vezes.",
      impact: "Possível duplicação de registros, confusão do usuário sobre o status da operação.",
      recommendation: "Adicionar states de loading, desabilitar botões durante processamento, mostrar toasts de confirmação.",
      files: ["Vários componentes com formulários"],
      status: "Pendente"
    },
    {
      id: "MED-004",
      severity: "Médio",
      category: "Lógica",
      module: "Tabelas de Preço",
      title: "Aplicação Manual de Tabelas de Preço",
      description: "Ao criar pedido, não há aplicação automática da tabela de preço do cliente. Preço precisa ser inserido manualmente.",
      impact: "Risco de erro humano ao inserir preços, não aproveitamento das tabelas configuradas.",
      recommendation: "Ao selecionar cliente, carregar automaticamente sua tabela de preço e aplicar nos produtos do pedido.",
      files: ["/components/SalesOrders.tsx", "/components/PriceTables.tsx"],
      status: "Pendente"
    },
    {
      id: "MED-005",
      severity: "Médio",
      category: "Dados",
      module: "Movimentações de Estoque",
      title: "Falta de Rastreabilidade Completa",
      description: "Movimentações de estoque não registram detalhes como lote, data de validade, localização no depósito.",
      impact: "Dificuldade em rastrear produtos, impossibilidade de gerenciar FIFO/LIFO, problemas com produtos perecíveis.",
      recommendation: "Expandir modelo de dados para incluir lote, validade, localização. Implementar controle de lotes.",
      files: ["/contexts/ERPContext.tsx", "/components/Inventory.tsx"],
      status: "Pendente"
    },

    // ============ BAIXO ============
    {
      id: "LOW-001",
      severity: "Baixo",
      category: "UI/UX",
      module: "Navegação",
      title: "Falta de Breadcrumbs em Formulários",
      description: "Ao editar registros em dialogs, não há indicação clara de onde o usuário está no sistema.",
      impact: "Usuário pode se perder em fluxos complexos, especialmente em telas com múltiplas abas.",
      recommendation: "Adicionar breadcrumbs ou indicador de contexto nos títulos dos dialogs.",
      files: ["Vários componentes"],
      status: "Pendente"
    },
    {
      id: "LOW-002",
      severity: "Baixo",
      category: "UI/UX",
      module: "Exportação de Dados",
      title: "Funcionalidade de Exportação Incompleta",
      description: "Botões de exportar existem mas a funcionalidade não está implementada em vários módulos.",
      impact: "Usuário não consegue exportar relatórios em Excel/PDF conforme necessário.",
      recommendation: "Implementar exportação para Excel, PDF e CSV nos principais módulos.",
      files: ["/components/Reports.tsx", "/components/Inventory.tsx"],
      status: "Pendente"
    },
    {
      id: "LOW-003",
      severity: "Baixo",
      category: "Performance",
      module: "Tabelas",
      title: "Falta de Paginação em Listas Grandes",
      description: "Todas as tabelas carregam todos os registros de uma vez. Com grande volume de dados, pode causar lentidão.",
      impact: "Performance degradada com muitos registros. Interface travada ao carregar milhares de itens.",
      recommendation: "Implementar paginação ou virtualização de listas nas tabelas principais.",
      files: ["Todos os componentes com tabelas"],
      status: "Pendente"
    },

    // ============ INFO ============
    {
      id: "INFO-001",
      severity: "Info",
      category: "Lógica",
      module: "Logs de Auditoria",
      title: "Logs Parcialmente Implementados",
      description: "StatusHistory existe e funciona, mas não está implementado em todos os módulos (apenas em Pedidos de Venda).",
      impact: "Falta de rastreabilidade em operações críticas como alterações de estoque, transações financeiras.",
      recommendation: "Expandir sistema de logs para todos os módulos. Criar componente reutilizável de histórico.",
      files: ["/contexts/ERPContext.tsx", "/components/StatusHistoryTimeline.tsx"],
      status: "Pendente"
    },
    {
      id: "INFO-002",
      severity: "Info",
      category: "UI/UX",
      module: "Ajuda Contextual",
      title: "Falta de Tooltips e Documentação Inline",
      description: "Campos complexos (CFOP, CST, CSOSN, NCM) não possuem tooltips explicativos para ajudar o usuário.",
      impact: "Usuário pode ter dificuldade em preencher campos técnicos corretamente.",
      recommendation: "Adicionar tooltips com exemplos e explicações nos campos complexos.",
      files: ["Vários componentes com formulários"],
      status: "Pendente"
    },
    {
      id: "INFO-003",
      severity: "Info",
      category: "Segurança",
      module: "Logs de Acesso",
      title: "Ausência de Logs de Login/Logout",
      description: "Sistema de usuários existe mas não registra tentativas de login, horários de acesso, etc.",
      impact: "Falta de rastreabilidade de acessos ao sistema para fins de auditoria.",
      recommendation: "Implementar logging de eventos de autenticação e acessos aos módulos.",
      files: ["/components/UsersPermissions.tsx"],
      status: "Pendente"
    }
  ];

  // Usar dados dinâmicos se disponíveis, senão usar dados estáticos
  const currentIssues = auditIssues.length > 0 ? auditIssues : staticAuditIssues;

  // Estatísticas
  const stats = {
    critical: currentIssues.filter(i => i.severity === "Crítico").length,
    high: currentIssues.filter(i => i.severity === "Alto").length,
    medium: currentIssues.filter(i => i.severity === "Médio").length,
    low: currentIssues.filter(i => i.severity === "Baixo").length,
    info: currentIssues.filter(i => i.severity === "Info").length,
    total: currentIssues.length
  };

  const categoryStats = {
    integration: currentIssues.filter(i => i.category === "Integração").length,
    data: currentIssues.filter(i => i.category === "Dados").length,
    logic: currentIssues.filter(i => i.category === "Lógica").length,
    uiux: currentIssues.filter(i => i.category === "UI/UX").length,
    security: currentIssues.filter(i => i.category === "Segurança").length,
    performance: currentIssues.filter(i => i.category === "Performance").length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Crítico":
        return "bg-red-100 text-red-700 border-red-200";
      case "Alto":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Médio":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Baixo":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Info":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Crítico":
        return <XCircle className="w-5 h-5" />;
      case "Alto":
        return <AlertTriangle className="w-5 h-5" />;
      case "Médio":
        return <AlertCircle className="w-5 h-5" />;
      case "Baixo":
        return <TrendingUp className="w-5 h-5" />;
      case "Info":
        return <Eye className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Integração":
        return <Zap className="w-4 h-4" />;
      case "Dados":
        return <Database className="w-4 h-4" />;
      case "Lógica":
        return <BarChart3 className="w-4 h-4" />;
      case "UI/UX":
        return <Eye className="w-4 h-4" />;
      case "Segurança":
        return <Shield className="w-4 h-4" />;
      case "Performance":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <FileWarning className="w-4 h-4" />;
    }
  };

  const healthScore = calculateHealthScore(stats);
  const healthColor = healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-gray-900">Auditoria Técnica do Sistema ERP</h1>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {ENVIRONMENT.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600">Análise completa de consistência, integridade e boas práticas</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Última análise: {lastAnalysisDate ? lastAnalysisDate.toLocaleString('pt-BR') : 'Nunca executada'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Executar Nova Análise'}
            </Button>
            <div className={`text-center p-4 bg-white rounded-lg border-2 ${healthColor === "text-green-600" ? "border-green-200" : healthColor === "text-yellow-600" ? "border-yellow-200" : "border-red-200"}`}>
              <p className="text-sm text-gray-600">Health Score</p>
              <p className={`text-3xl ${healthColor}`}>{healthScore}%</p>
            </div>
          </div>
        </div>

        {/* Alerta de Ambiente de Desenvolvimento */}
        <Alert className="mb-4 border-purple-200 bg-purple-50">
          <Shield className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <strong>⚠️ MÓDULO DE DESENVOLVIMENTO:</strong> Este painel de auditoria está disponível apenas em ambiente de desenvolvimento e para usuários com perfil "Super Admin". Não será exibido em produção.
          </AlertDescription>
        </Alert>

        {/* Resumo Geral */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Análise Concluída:</strong> Foram identificadas <strong>{stats.total} questões</strong> no sistema, sendo{" "}
            <strong className="text-red-600">{stats.critical} críticas</strong>, {stats.high} de prioridade alta,{" "}
            {stats.medium} médias, {stats.low} baixas e {stats.info} informativas.
          </AlertDescription>
        </Alert>

        {/* Cards de Estatísticas por Severidade */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Crítico</p>
                <p className="text-2xl text-gray-900">{stats.critical}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alto</p>
                <p className="text-2xl text-gray-900">{stats.high}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Médio</p>
                <p className="text-2xl text-gray-900">{stats.medium}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Baixo</p>
                <p className="text-2xl text-gray-900">{stats.low}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-gray-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Info</p>
                <p className="text-2xl text-gray-900">{stats.info}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Cards de Estatísticas por Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <h3 className="text-gray-900">Integração</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.integration}</p>
            <p className="text-sm text-gray-600">Problemas de sincronização entre módulos</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="text-gray-900">Dados</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.data}</p>
            <p className="text-sm text-gray-600">Integridade e validação de dados</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Lógica</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.logic}</p>
            <p className="text-sm text-gray-600">Regras de negócio e fluxos</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-5 h-5 text-cyan-600" />
              <h3 className="text-gray-900">UI/UX</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.uiux}</p>
            <p className="text-sm text-gray-600">Interface e experiência do usuário</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-red-600" />
              <h3 className="text-gray-900">Segurança</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.security}</p>
            <p className="text-sm text-gray-600">Controle de acesso e proteção</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h3 className="text-gray-900">Performance</h3>
            </div>
            <p className="text-3xl text-gray-900">{categoryStats.performance}</p>
            <p className="text-sm text-gray-600">Otimização e escalabilidade</p>
          </Card>
        </div>
      </div>

      {/* Abas por Severidade */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
          <TabsTrigger value="critical">Crítico ({stats.critical})</TabsTrigger>
          <TabsTrigger value="high">Alto ({stats.high})</TabsTrigger>
          <TabsTrigger value="medium">Médio ({stats.medium})</TabsTrigger>
          <TabsTrigger value="low">Baixo ({stats.low})</TabsTrigger>
          <TabsTrigger value="info">Info ({stats.info})</TabsTrigger>
        </TabsList>

        {["all", "critical", "high", "medium", "low", "info"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <div className="space-y-3">
              {currentIssues
                .filter(issue => 
                  tab === "all" || 
                  (tab === "critical" && issue.severity === "Crítico") ||
                  (tab === "high" && issue.severity === "Alto") ||
                  (tab === "medium" && issue.severity === "Médio") ||
                  (tab === "low" && issue.severity === "Baixo") ||
                  (tab === "info" && issue.severity === "Info")
                )
                .map((issue) => {
                  const isExpanded = expandedIssues.includes(issue.id);
                  
                  return (
                    <Card key={issue.id} className={`border-l-4 ${getSeverityColor(issue.severity).split(' ')[2]}`}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleIssue(issue.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className={getSeverityColor(issue.severity)}>
                                    <span className="flex items-center gap-1">
                                      {getSeverityIcon(issue.severity)}
                                      {issue.severity}
                                    </span>
                                  </Badge>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    {getCategoryIcon(issue.category)}
                                    {issue.category}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{issue.id}</span>
                                </div>
                                <h3 className="text-gray-900 mb-1">{issue.title}</h3>
                                <p className="text-sm text-gray-600">{issue.module}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <Separator />
                          <div className="p-4 space-y-4 bg-gray-50">
                            <div>
                              <h4 className="text-sm text-gray-900 mb-1">📋 Descrição</h4>
                              <p className="text-sm text-gray-700">{issue.description}</p>
                            </div>

                            <div>
                              <h4 className="text-sm text-gray-900 mb-1">⚠️ Impacto</h4>
                              <p className="text-sm text-red-700">{issue.impact}</p>
                            </div>

                            <div>
                              <h4 className="text-sm text-gray-900 mb-1">✅ Recomendação</h4>
                              <p className="text-sm text-green-700">{issue.recommendation}</p>
                            </div>

                            <div>
                              <h4 className="text-sm text-gray-900 mb-1">📁 Arquivos Afetados</h4>
                              <div className="flex flex-wrap gap-2">
                                {issue.files.map((file, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs font-mono">
                                    {file}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
