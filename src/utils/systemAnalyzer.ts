/**
 * Sistema de Análise Técnica Completa do ERP
 * Executa auditoria detalhada em todos os módulos para identificar
 * inconsistências, falhas lógicas, desvios de boas práticas e pontos
 * que podem comprometer a estabilidade e integridade de dados
 */

import { 
  SalesOrder, 
  InventoryItem, 
  Customer, 
  Supplier,
  FinancialTransaction,
  AccountReceivable,
  AccountPayable,
  CompanySettings
} from '../contexts/ERPContext';

export interface AuditIssue {
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
  affectedItems?: string[]; // IDs dos itens afetados
}

interface SystemData {
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  customers: Customer[];
  suppliers: Supplier[];
  financialTransactions: FinancialTransaction[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  companySettings?: CompanySettings;
}

let issueCounter = 0;

function generateIssueId(prefix: string): string {
  issueCounter++;
  return `${prefix}-${String(issueCounter).padStart(3, '0')}`;
}

/**
 * 1️⃣ VERIFICAÇÃO DE CONSISTÊNCIA ENTRE MÓDULOS
 */
function checkModuleConsistency(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar pedidos com baixa de estoque sem flag
  const deliveredOrders = data.salesOrders.filter(
    order => ['Entregue', 'Pago'].includes(order.status)
  );

  deliveredOrders.forEach(order => {
    if (!order.actionFlags?.stockReduced) {
      issues.push({
        id: generateIssueId('CRIT'),
        severity: 'Crítico',
        category: 'Integração',
        module: 'Pedidos de Venda → Estoque',
        title: `Pedido entregue sem baixa de estoque: ${order.id}`,
        description: `O pedido ${order.id} está com status "${order.status}" mas não possui flag de baixa de estoque ativada. Isso indica que o estoque não foi atualizado corretamente.`,
        impact: 'Inconsistência entre vendas realizadas e saldo de estoque. O estoque está incorretamente inflado.',
        recommendation: 'Executar rotina de correção para baixar estoque deste pedido ou reverter status.',
        files: ['/contexts/ERPContext.tsx'],
        status: 'Pendente',
        affectedItems: [order.id]
      });
    }
  });

  // Verificar pedidos entregues sem conta a receber
  deliveredOrders.forEach(order => {
    if (!order.actionFlags?.accountsReceivableCreated && order.status !== 'Pago') {
      issues.push({
        id: generateIssueId('CRIT'),
        severity: 'Crítico',
        category: 'Integração',
        module: 'Pedidos → Financeiro',
        title: `Pedido sem conta a receber: ${order.id}`,
        description: `O pedido ${order.id} foi entregue mas não gerou conta a receber no módulo financeiro.`,
        impact: 'Valores não reconhecidos no financeiro, causando divergência no fluxo de caixa.',
        recommendation: 'Gerar manualmente a conta a receber ou implementar rotina de sincronização.',
        files: ['/contexts/ERPContext.tsx', '/components/SalesOrders.tsx'],
        status: 'Pendente',
        affectedItems: [order.id]
      });
    }
  });

  // Verificar produtos vendidos que não existem no inventário
  data.salesOrders.forEach(order => {
    const productExists = data.inventory.some(
      item => item.productName === order.productName
    );
    
    if (!productExists) {
      issues.push({
        id: generateIssueId('HIGH'),
        severity: 'Alto',
        category: 'Dados',
        module: 'Pedidos → Estoque',
        title: `Produto inexistente no pedido: ${order.id}`,
        description: `O pedido ${order.id} referencia o produto "${order.productName}" que não existe no inventário.`,
        impact: 'Impossibilidade de processar pedido corretamente. Dados órfãos no sistema.',
        recommendation: 'Cadastrar produto no inventário ou corrigir nome do produto no pedido.',
        files: ['/components/SalesOrders.tsx', '/components/Inventory.tsx'],
        status: 'Pendente',
        affectedItems: [order.id, order.productName]
      });
    }
  });

  // Verificar clientes referenciados que não existem
  data.salesOrders.forEach(order => {
    const customerExists = data.customers.some(
      customer => customer.id === order.customerId
    );
    
    if (!customerExists) {
      issues.push({
        id: generateIssueId('HIGH'),
        severity: 'Alto',
        category: 'Dados',
        module: 'Pedidos → Clientes',
        title: `Cliente inexistente no pedido: ${order.id}`,
        description: `O pedido ${order.id} referencia o cliente ID "${order.customerId}" que não existe no cadastro.`,
        impact: 'Impossibilidade de acessar dados do cliente. Problemas em relatórios e faturamento.',
        recommendation: 'Cadastrar cliente ou corrigir referência no pedido.',
        files: ['/components/SalesOrders.tsx', '/components/Customers.tsx'],
        status: 'Pendente',
        affectedItems: [order.id, order.customerId]
      });
    }
  });

  return issues;
}

/**
 * 2️⃣ VALIDAÇÃO DE LÓGICA DE NEGÓCIO
 */
function checkBusinessLogic(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar pedidos que pularam status
  data.salesOrders.forEach(order => {
    if (order.statusHistory && order.statusHistory.length > 1) {
      for (let i = 1; i < order.statusHistory.length; i++) {
        const prev = order.statusHistory[i - 1].newStatus;
        const curr = order.statusHistory[i].newStatus;
        
        // Verificar transições inválidas
        const invalidTransitions = [
          { from: 'Processando', to: 'Entregue' },
          { from: 'Processando', to: 'Pago' },
          { from: 'Confirmado', to: 'Pago' }
        ];
        
        const isInvalid = invalidTransitions.some(
          t => t.from === prev && t.to === curr
        );
        
        if (isInvalid) {
          issues.push({
            id: generateIssueId('CRIT'),
            severity: 'Crítico',
            category: 'Lógica',
            module: 'Status de Pedidos',
            title: `Transição inválida de status: ${order.id}`,
            description: `O pedido ${order.id} pulou etapas do fluxo ao ir de "${prev}" para "${curr}" sem passar pelos status intermediários.`,
            impact: 'Automações podem não ter sido executadas. Possível inconsistência de dados.',
            recommendation: 'Implementar validação de máquina de estados que permita apenas transições sequenciais válidas.',
            files: ['/components/SalesOrders.tsx'],
            status: 'Pendente',
            affectedItems: [order.id]
          });
        }
      }
    }
  });

  // Verificar ações duplicadas no histórico
  data.salesOrders.forEach(order => {
    if (order.statusHistory) {
      const stockReductions = order.statusHistory.filter(
        h => h.actionsExecuted.some(a => a.includes('Baixa de'))
      );
      
      if (stockReductions.length > 1) {
        issues.push({
          id: generateIssueId('CRIT'),
          severity: 'Crítico',
          category: 'Lógica',
          module: 'Pedidos → Estoque',
          title: `Múltiplas baixas de estoque: ${order.id}`,
          description: `O pedido ${order.id} possui ${stockReductions.length} registros de baixa de estoque no histórico, indicando possível duplicação.`,
          impact: 'Estoque baixado múltiplas vezes para o mesmo pedido, causando saldo negativo incorreto.',
          recommendation: 'Implementar proteção idempotente que previne execução duplicada de ações.',
          files: ['/contexts/ERPContext.tsx'],
          status: 'Pendente',
          affectedItems: [order.id]
        });
      }
    }
  });

  return issues;
}

/**
 * 3️⃣ INTEGRIDADE DE DADOS
 */
function checkDataIntegrity(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar campos obrigatórios em produtos
  data.inventory.forEach(item => {
    const missingFields: string[] = [];
    
    if (!item.ncm || item.ncm === '') missingFields.push('NCM');
    if (!item.unit || item.unit === '') missingFields.push('Unidade');
    if (!item.category || item.category === '') missingFields.push('Categoria');
    
    if (missingFields.length > 0) {
      issues.push({
        id: generateIssueId('HIGH'),
        severity: 'Alto',
        category: 'Dados',
        module: 'Estoque',
        title: `Produto com campos obrigatórios vazios: ${item.productName}`,
        description: `O produto "${item.productName}" está sem os seguintes campos obrigatórios: ${missingFields.join(', ')}.`,
        impact: 'Impossibilidade de emitir NFe. Problemas em relatórios fiscais.',
        recommendation: 'Preencher todos os campos obrigatórios antes de utilizar o produto em pedidos.',
        files: ['/components/Inventory.tsx'],
        status: 'Pendente',
        affectedItems: [item.id, item.productName]
      });
    }
  });

  // Verificar campos obrigatórios em clientes
  data.customers.forEach(customer => {
    const missingFields: string[] = [];
    
    if (!customer.document || customer.document === '') missingFields.push('CPF/CNPJ');
    if (!customer.email || customer.email === '') missingFields.push('Email');
    if (!customer.phone || customer.phone === '') missingFields.push('Telefone');
    
    if (missingFields.length > 0) {
      issues.push({
        id: generateIssueId('MED'),
        severity: 'Médio',
        category: 'Dados',
        module: 'Clientes',
        title: `Cliente com dados incompletos: ${customer.name}`,
        description: `O cliente "${customer.name}" está sem: ${missingFields.join(', ')}.`,
        impact: 'Dificuldade em entrar em contato. Problemas em emissão de documentos fiscais.',
        recommendation: 'Completar cadastro de clientes antes de criar pedidos.',
        files: ['/components/Customers.tsx'],
        status: 'Pendente',
        affectedItems: [customer.id]
      });
    }
  });

  // Verificar consistência de valores totais em pedidos
  data.salesOrders.forEach(order => {
    const calculatedTotal = order.quantity * order.unitPrice;
    const difference = Math.abs(calculatedTotal - order.totalAmount);
    
    if (difference > 0.01) { // Tolerância de 1 centavo
      issues.push({
        id: generateIssueId('MED'),
        severity: 'Médio',
        category: 'Dados',
        module: 'Pedidos de Venda',
        title: `Divergência de valor total: ${order.id}`,
        description: `O pedido ${order.id} possui valor total de R$ ${order.totalAmount.toFixed(2)} mas a multiplicação de quantidade × preço resulta em R$ ${calculatedTotal.toFixed(2)}.`,
        impact: 'Valores incorretos em relatórios financeiros e fechamento contábil.',
        recommendation: 'Recalcular automaticamente o total com base nos itens do pedido.',
        files: ['/components/SalesOrders.tsx'],
        status: 'Pendente',
        affectedItems: [order.id]
      });
    }
  });

  // Verificar saldo negativo de estoque
  data.inventory.forEach(item => {
    if (item.currentStock < 0) {
      issues.push({
        id: generateIssueId('CRIT'),
        severity: 'Crítico',
        category: 'Dados',
        module: 'Estoque',
        title: `Estoque negativo: ${item.productName}`,
        description: `O produto "${item.productName}" possui saldo negativo de ${item.currentStock} ${item.unit}.`,
        impact: 'Venda de produtos sem estoque físico. Impossibilidade de atender pedidos.',
        recommendation: 'Ajustar saldo de estoque e investigar causa da negativação.',
        files: ['/components/Inventory.tsx'],
        status: 'Pendente',
        affectedItems: [item.id, item.productName]
      });
    }
  });

  return issues;
}

/**
 * 4️⃣ BOAS PRÁTICAS DE ARQUITETURA
 */
function checkArchitectureBestPractices(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar uso de componentes reutilizáveis (análise estrutural)
  // Esta é uma verificação informativa
  issues.push({
    id: generateIssueId('INFO'),
    severity: 'Info',
    category: 'UI/UX',
    module: 'Arquitetura',
    title: 'Oportunidade de componentização',
    description: 'Alguns módulos possuem formulários e tabelas que poderiam ser extraídos para componentes reutilizáveis.',
    impact: 'Código duplicado dificulta manutenção e pode gerar inconsistências visuais.',
    recommendation: 'Criar componentes genéricos como GenericForm, GenericTable, GenericDialog para reuso entre módulos.',
    files: ['Vários componentes'],
    status: 'Pendente'
  });

  return issues;
}

/**
 * 5️⃣ AUDITORIA E SEGURANÇA
 */
function checkSecurityAndAudit(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar se há usuários sem permissões definidas
  if (data.users) {
    data.users.forEach(user => {
      if (!user.role || user.role === '') {
        issues.push({
          id: generateIssueId('HIGH'),
          severity: 'Alto',
          category: 'Segurança',
          module: 'Usuários e Permissões',
          title: `Usuário sem perfil definido: ${user.name}`,
          description: `O usuário "${user.name}" (${user.email}) não possui perfil de acesso definido.`,
          impact: 'Usuário pode ter acesso irrestrito ou nenhum acesso, dependendo da implementação.',
          recommendation: 'Atribuir perfil adequado a todos os usuários do sistema.',
          files: ['/components/UsersPermissions.tsx'],
          status: 'Pendente',
          affectedItems: [user.id]
        });
      }
    });
  }

  // Verificar pedidos cancelados sem rollback
  const cancelledOrders = data.salesOrders.filter(
    order => order.status === 'Cancelado'
  );

  cancelledOrders.forEach(order => {
    if (order.actionFlags?.stockReduced) {
      // Verificar se houve devolução ao estoque
      const hasRollback = order.statusHistory?.some(
        h => h.actionsExecuted.some(a => a.includes('Devolução ao estoque') || a.includes('Estorno'))
      );
      
      if (!hasRollback) {
        issues.push({
          id: generateIssueId('HIGH'),
          severity: 'Alto',
          category: 'Integração',
          module: 'Cancelamento de Pedidos',
          title: `Pedido cancelado sem devolução de estoque: ${order.id}`,
          description: `O pedido ${order.id} foi cancelado mas o estoque não foi devolvido.`,
          impact: 'Estoque permanece incorretamente baixo após cancelamento.',
          recommendation: 'Implementar rotina de rollback automático ao cancelar pedidos.',
          files: ['/contexts/ERPContext.tsx'],
          status: 'Pendente',
          affectedItems: [order.id]
        });
      }
    }
  });

  return issues;
}

/**
 * 6️⃣ PERFORMANCE E ESCALABILIDADE
 */
function checkPerformance(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar volume de dados
  if (data.salesOrders.length > 1000) {
    issues.push({
      id: generateIssueId('MED'),
      severity: 'Médio',
      category: 'Performance',
      module: 'Pedidos de Venda',
      title: 'Grande volume de pedidos sem paginação',
      description: `Sistema possui ${data.salesOrders.length} pedidos. Sem paginação, pode causar lentidão.`,
      impact: 'Interface lenta ao carregar listagens. Possível travamento do navegador.',
      recommendation: 'Implementar paginação, virtualização de listas ou lazy loading.',
      files: ['/components/SalesOrders.tsx'],
      status: 'Pendente'
    });
  }

  if (data.inventory.length > 500) {
    issues.push({
      id: generateIssueId('LOW'),
      severity: 'Baixo',
      category: 'Performance',
      module: 'Estoque',
      title: 'Inventário extenso sem otimização',
      description: `Sistema possui ${data.inventory.length} produtos. Recomenda-se otimizar carregamento.`,
      impact: 'Carregamento lento da listagem de produtos.',
      recommendation: 'Implementar busca/filtro server-side e paginação.',
      files: ['/components/Inventory.tsx'],
      status: 'Pendente'
    });
  }

  return issues;
}

/**
 * 7️⃣ RELATÓRIOS E INDICADORES
 */
function checkReportsAndMetrics(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar consistência entre pedidos pagos e contas recebidas
  const paidOrders = data.salesOrders.filter(o => o.status === 'Pago');
  const receivedAccounts = data.accountsReceivable.filter(a => a.status === 'Recebido');

  if (paidOrders.length > 0 && receivedAccounts.length === 0) {
    issues.push({
      id: generateIssueId('HIGH'),
      severity: 'Alto',
      category: 'Integração',
      module: 'Relatórios Financeiros',
      title: 'Divergência entre pedidos pagos e contas recebidas',
      description: `Existem ${paidOrders.length} pedidos com status "Pago", mas nenhuma conta a receber está marcada como "Recebido".`,
      impact: 'Relatórios financeiros inconsistentes. Fluxo de caixa incorreto.',
      recommendation: 'Sincronizar status de pagamento entre pedidos e módulo financeiro.',
      files: ['/contexts/ERPContext.tsx', '/components/Reports.tsx'],
      status: 'Pendente'
    });
  }

  return issues;
}

/**
 * 8️⃣ VERIFICAÇÃO DE LOGS E AUDITORIA
 */
function checkLogsAndAudit(data: SystemData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Verificar pedidos sem histórico de status
  const ordersWithoutHistory = data.salesOrders.filter(
    order => !order.statusHistory || order.statusHistory.length === 0
  );

  if (ordersWithoutHistory.length > 0) {
    issues.push({
      id: generateIssueId('MED'),
      severity: 'Médio',
      category: 'Lógica',
      module: 'Auditoria de Pedidos',
      title: `${ordersWithoutHistory.length} pedidos sem histórico`,
      description: `Foram encontrados ${ordersWithoutHistory.length} pedidos sem registro de histórico de status.`,
      impact: 'Falta de rastreabilidade. Impossível auditar mudanças de status.',
      recommendation: 'Garantir que todo pedido registre histórico desde a criação.',
      files: ['/contexts/ERPContext.tsx'],
      status: 'Pendente',
      affectedItems: ordersWithoutHistory.map(o => o.id)
    });
  }

  return issues;
}

/**
 * FUNÇÃO PRINCIPAL DE ANÁLISE
 */
export function runSystemAnalysis(data: SystemData): AuditIssue[] {
  // Resetar contador
  issueCounter = 0;
  
  const allIssues: AuditIssue[] = [
    ...checkModuleConsistency(data),
    ...checkBusinessLogic(data),
    ...checkDataIntegrity(data),
    ...checkArchitectureBestPractices(data),
    ...checkSecurityAndAudit(data),
    ...checkPerformance(data),
    ...checkReportsAndMetrics(data),
    ...checkLogsAndAudit(data)
  ];

  // Ordenar por severidade
  const severityOrder = { 'Crítico': 0, 'Alto': 1, 'Médio': 2, 'Baixo': 3, 'Info': 4 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allIssues;
}

/**
 * Calcula estatísticas da análise
 */
export function calculateAuditStatistics(issues: AuditIssue[]) {
  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'Crítico').length,
    high: issues.filter(i => i.severity === 'Alto').length,
    medium: issues.filter(i => i.severity === 'Médio').length,
    low: issues.filter(i => i.severity === 'Baixo').length,
    info: issues.filter(i => i.severity === 'Info').length,
    byCategory: {
      integration: issues.filter(i => i.category === 'Integração').length,
      data: issues.filter(i => i.category === 'Dados').length,
      logic: issues.filter(i => i.category === 'Lógica').length,
      uiux: issues.filter(i => i.category === 'UI/UX').length,
      security: issues.filter(i => i.category === 'Segurança').length,
      performance: issues.filter(i => i.category === 'Performance').length,
    }
  };
}

/**
 * Calcula Health Score do sistema
 */
export function calculateHealthScore(stats: ReturnType<typeof calculateAuditStatistics>): number {
  const score = Math.max(0, 100 - (
    stats.critical * 10 +
    stats.high * 5 +
    stats.medium * 2 +
    stats.low * 0.5
  ));
  
  return Math.round(score);
}
