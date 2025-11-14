/**
 * Sistema de Validação de Transição de Status
 * 
 * Implementa máquina de estados para garantir que pedidos
 * sigam o fluxo correto sem pular etapas críticas
 * 
 * CRIT-004: Validação de Transição de Status
 */

import { SalesOrder } from "../contexts/ERPContext";

// ==================== TIPOS ====================

export type SalesOrderStatus = 
  | "Processando" 
  | "Confirmado" 
  | "Enviado" 
  | "Entregue" 
  | "Parcialmente Concluído"
  | "Concluído" 
  | "Cancelado";

export type PurchaseOrderStatus = 
  | "Processando" 
  | "Confirmado" 
  | "Enviado" 
  | "Recebido" 
  | "Parcialmente Concluído"
  | "Concluído" 
  | "Cancelado";

// Tipo genérico para compatibilidade
export type OrderStatus = SalesOrderStatus | PurchaseOrderStatus;

export interface StatusTransitionResult {
  isValid: boolean;
  canProceed: boolean;
  message: string;
  details: {
    currentStatus: OrderStatus;
    requestedStatus: OrderStatus;
    validNextStatuses: OrderStatus[];
    skippedStatuses: OrderStatus[];
    requiredActions: string[];
  };
}

export interface StatusTransitionRule {
  from: OrderStatus;
  to: OrderStatus[];
  description: string;
  requiredActions?: string[];
}

// ==================== MÁQUINA DE ESTADOS ====================

/**
 * Regras de transição para PEDIDOS DE VENDA (usa "Entregue")
 */
export const SALES_STATUS_TRANSITION_RULES: Record<string, string[]> = {
  "Processando": ["Confirmado", "Enviado", "Entregue", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Confirmado": ["Enviado", "Entregue", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Enviado": ["Entregue", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Entregue": ["Parcialmente Concluído", "Concluído", "Cancelado"],
  "Parcialmente Concluído": ["Concluído", "Cancelado"],
  "Concluído": ["Cancelado"],
  "Cancelado": []
};

/**
 * Regras de transição para PEDIDOS DE COMPRA (usa "Recebido")
 */
export const PURCHASE_STATUS_TRANSITION_RULES: Record<string, string[]> = {
  "Processando": ["Confirmado", "Enviado", "Recebido", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Confirmado": ["Enviado", "Recebido", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Enviado": ["Recebido", "Parcialmente Concluído", "Concluído", "Cancelado"],
  "Recebido": ["Parcialmente Concluído", "Concluído", "Cancelado"],
  "Parcialmente Concluído": ["Concluído", "Cancelado"],
  "Concluído": ["Cancelado"],
  "Cancelado": []
};

/**
 * Regras genéricas (compatibilidade retroativa)
 * @deprecated Use SALES_STATUS_TRANSITION_RULES ou PURCHASE_STATUS_TRANSITION_RULES
 */
export const STATUS_TRANSITION_RULES: Record<string, string[]> = PURCHASE_STATUS_TRANSITION_RULES;

/**
 * Ordem sequencial dos status - PEDIDOS DE VENDA
 */
export const SALES_STATUS_ORDER: string[] = [
  "Processando",
  "Confirmado", 
  "Enviado",
  "Entregue",
  "Parcialmente Concluído",
  "Concluído"
];

/**
 * Ordem sequencial dos status - PEDIDOS DE COMPRA
 */
export const PURCHASE_STATUS_ORDER: string[] = [
  "Processando",
  "Confirmado", 
  "Enviado",
  "Recebido",
  "Parcialmente Concluído",
  "Concluído"
];

/**
 * Ordem genérica (compatibilidade)
 * @deprecated Use SALES_STATUS_ORDER ou PURCHASE_STATUS_ORDER
 */
export const STATUS_ORDER: string[] = PURCHASE_STATUS_ORDER;

/**
 * Descrição de cada status - PEDIDOS DE VENDA
 */
export const SALES_STATUS_DESCRIPTIONS: Record<string, string> = {
  "Processando": "Pedido criado, aguardando confirmação",
  "Confirmado": "Pedido confirmado, aguardando separação/envio",
  "Enviado": "Pedido separado e enviado, aguardando entrega",
  "Entregue": "Pedido entregue ao cliente, aguardando liquidação das parcelas",
  "Parcialmente Concluído": "Algumas parcelas foram recebidas, aguardando restante",
  "Concluído": "Todas as parcelas foram recebidas, pedido finalizado",
  "Cancelado": "Pedido cancelado, não será processado"
};

/**
 * Descrição de cada status - PEDIDOS DE COMPRA
 */
export const PURCHASE_STATUS_DESCRIPTIONS: Record<string, string> = {
  "Processando": "Pedido criado, aguardando confirmação",
  "Confirmado": "Pedido confirmado, aguardando recebimento",
  "Enviado": "Pedido enviado pelo fornecedor, em trânsito",
  "Recebido": "Pedido recebido, aguardando liquidação das parcelas",
  "Parcialmente Concluído": "Algumas parcelas foram pagas, aguardando restante",
  "Concluído": "Todas as parcelas foram pagas, pedido finalizado",
  "Cancelado": "Pedido cancelado, não será processado"
};

/**
 * Descrições genéricas (compatibilidade)
 * @deprecated Use SALES_STATUS_DESCRIPTIONS ou PURCHASE_STATUS_DESCRIPTIONS
 */
export const STATUS_DESCRIPTIONS: Record<string, string> = PURCHASE_STATUS_DESCRIPTIONS;

/**
 * Ações automáticas - PEDIDOS DE VENDA
 */
export const SALES_REQUIRED_ACTIONS: Record<string, string[]> = {
  "Processando->Confirmado": [
    "Validar dados do pedido",
    "Validar estoque disponível"
  ],
  "Confirmado->Enviado": [
    "Reservar estoque",
    "Gerar nota de separação"
  ],
  "Enviado->Entregue": [
    "Executar baixa de estoque",
    "Criar transações financeiras (parcelas a receber)"
  ],
  "Entregue->Parcialmente Concluído": [
    "Verificar parcelas recebidas"
  ],
  "Entregue->Concluído": [
    "Verificar todas as parcelas recebidas"
  ],
  "Parcialmente Concluído->Concluído": [
    "Verificar todas as parcelas recebidas"
  ],
  "*->Cancelado": [
    "Reverter operações executadas",
    "Devolver estoque (se baixado)",
    "Cancelar contas a receber (se criadas)"
  ]
};

/**
 * Ações automáticas - PEDIDOS DE COMPRA
 */
export const PURCHASE_REQUIRED_ACTIONS: Record<string, string[]> = {
  "Processando->Confirmado": [
    "Validar dados do pedido"
  ],
  "Confirmado->Enviado": [
    "Registrar envio pelo fornecedor"
  ],
  "Enviado->Recebido": [
    "Executar entrada de estoque",
    "Criar transações financeiras (parcelas a pagar)"
  ],
  "Recebido->Parcialmente Concluído": [
    "Verificar parcelas pagas"
  ],
  "Recebido->Concluído": [
    "Verificar todas as parcelas pagas"
  ],
  "Parcialmente Concluído->Concluído": [
    "Verificar todas as parcelas pagas"
  ],
  "*->Cancelado": [
    "Reverter operações executadas",
    "Estornar entrada de estoque (se executada)",
    "Cancelar contas a pagar (se criadas)"
  ]
};

/**
 * Ações genéricas (compatibilidade)
 * @deprecated Use SALES_REQUIRED_ACTIONS ou PURCHASE_REQUIRED_ACTIONS
 */
export const STATUS_REQUIRED_ACTIONS: Record<string, string[]> = PURCHASE_REQUIRED_ACTIONS;

// ==================== VALIDAÇÃO DE TRANSIÇÃO ====================

/**
 * Valida se a transição de status é permitida pela máquina de estados
 * 
 * REGRAS:
 * ✅ PERMITE: Avanço sequencial ou com pulos (executa automações intermediárias)
 * ✅ PERMITE: Cancelamento de qualquer status (exceto já cancelado)
 * ❌ BLOQUEIA: Retrocesso de status (exceto para Cancelado)
 * ❌ BLOQUEIA: Alteração de status "Cancelado"
 * ❌ BLOQUEIA: Manter mesmo status
 */
export const validateStatusTransition = (
  currentStatus: OrderStatus,
  requestedStatus: OrderStatus,
  orderType: 'sales' | 'purchase' = 'purchase'
): StatusTransitionResult => {
  // Selecionar regras corretas baseado no tipo de pedido
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  const statusOrder = orderType === 'sales' ? SALES_STATUS_ORDER : PURCHASE_STATUS_ORDER;
  const requiredActionsMap = orderType === 'sales' ? SALES_REQUIRED_ACTIONS : PURCHASE_REQUIRED_ACTIONS;
  // Caso especial: se já está no status solicitado
  if (currentStatus === requestedStatus) {
    return {
      isValid: false,
      canProceed: false,
      message: `⚠️ Pedido já está no status "${currentStatus}"`,
      details: {
        currentStatus,
        requestedStatus,
        validNextStatuses: transitionRules[currentStatus] || [],
        skippedStatuses: [],
        requiredActions: []
      }
    };
  }

  // Obter transições válidas para o status atual
  const validNextStatuses = transitionRules[currentStatus] || [];
  
  // Verificar se a transição está na lista de válidas
  const isAllowedTransition = validNextStatuses.includes(requestedStatus);
  
  if (!isAllowedTransition) {
    // Caso especial: estado final sendo alterado
    if (currentStatus === "Cancelado") {
      return {
        isValid: false,
        canProceed: false,
        message: `❌ Pedido cancelado não pode ter status alterado`,
        details: {
          currentStatus,
          requestedStatus,
          validNextStatuses: [],
          skippedStatuses: [],
          requiredActions: []
        }
      };
    }
    
    // Verificar se está tentando retroceder
    const currentIndex = statusOrder.indexOf(currentStatus);
    const requestedIndex = statusOrder.indexOf(requestedStatus);
    
    if (currentIndex !== -1 && requestedIndex !== -1 && requestedIndex < currentIndex) {
      return {
        isValid: false,
        canProceed: false,
        message: `❌ Não é possível retroceder status: "${currentStatus}" → "${requestedStatus}". ` +
                 `Use "Cancelar" para anular o pedido.`,
        details: {
          currentStatus,
          requestedStatus,
          validNextStatuses,
          skippedStatuses: [],
          requiredActions: []
        }
      };
    }
    
    // Transição não permitida por outro motivo
    return {
      isValid: false,
      canProceed: false,
      message: `❌ Transição não permitida: "${currentStatus}" → "${requestedStatus}". ` +
               `Próximos status válidos: ${validNextStatuses.join(", ")}`,
      details: {
        currentStatus,
        requestedStatus,
        validNextStatuses,
        skippedStatuses: [],
        requiredActions: []
      }
    };
  }

  // Transição válida - verificar se há etapas puladas
  const skippedStatuses = getSkippedStatuses(currentStatus, requestedStatus, orderType);
  
  // Obter ações necessárias
  const transitionKey = `${currentStatus}->${requestedStatus}`;
  const wildcardKey = `*->${requestedStatus}`;
  const requiredActions = 
    requiredActionsMap[transitionKey] || 
    requiredActionsMap[wildcardKey] || 
    [];

  // Mensagem diferente se houver pulos
  let message = `✅ Transição válida: "${currentStatus}" → "${requestedStatus}"`;
  if (skippedStatuses.length > 0) {
    message += `. ⚠️ Etapas intermediárias (${skippedStatuses.join(" → ")}) serão executadas automaticamente`;
  }

  return {
    isValid: true,
    canProceed: true,
    message,
    details: {
      currentStatus,
      requestedStatus,
      validNextStatuses,
      skippedStatuses,
      requiredActions
    }
  };
};

/**
 * Detecta quais status foram pulados na transição
 */
export const getSkippedStatuses = (
  currentStatus: OrderStatus,
  requestedStatus: OrderStatus,
  orderType: 'sales' | 'purchase' = 'purchase'
): OrderStatus[] => {
  // Não calcular pulos para Cancelado (pode vir de qualquer status)
  if (requestedStatus === "Cancelado") {
    return [];
  }
  
  // Selecionar ordem correta
  const statusOrder = orderType === 'sales' ? SALES_STATUS_ORDER : PURCHASE_STATUS_ORDER;
  
  // Obter índices na sequência
  const currentIndex = statusOrder.indexOf(currentStatus);
  const requestedIndex = statusOrder.indexOf(requestedStatus);
  
  // Se índices inválidos ou não está avançando, não há pulos
  if (currentIndex === -1 || requestedIndex === -1 || requestedIndex <= currentIndex) {
    return [];
  }
  
  // Retornar status intermediários que foram pulados
  return statusOrder.slice(currentIndex + 1, requestedIndex) as OrderStatus[];
};

/**
 * Obtém o próximo status na sequência
 */
export const getNextStatus = (currentStatus: OrderStatus, orderType: 'sales' | 'purchase' = 'purchase'): OrderStatus | null => {
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  const validNextStatuses = transitionRules[currentStatus] || [];
  
  // Filtrar Cancelado e retornar o primeiro status válido da sequência
  const nextInSequence = validNextStatuses.find(status => status !== "Cancelado");
  
  return nextInSequence as OrderStatus || null;
};

/**
 * Verifica se um status é final (não pode mais mudar)
 */
export const isFinalStatus = (status: OrderStatus, orderType: 'sales' | 'purchase' = 'purchase'): boolean => {
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  const validNextStatuses = transitionRules[status] || [];
  return validNextStatuses.length === 0;
};

/**
 * Verifica se pode cancelar a partir do status atual
 */
export const canCancel = (status: OrderStatus, orderType: 'sales' | 'purchase' = 'purchase'): boolean => {
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  const validNextStatuses = transitionRules[status] || [];
  return validNextStatuses.includes("Cancelado");
};

/**
 * Obtém todos os status possíveis a partir do atual
 */
export const getValidNextStatuses = (currentStatus: OrderStatus, orderType: 'sales' | 'purchase' = 'purchase'): OrderStatus[] => {
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  return (transitionRules[currentStatus] || []) as OrderStatus[];
};

/**
 * Obtém status válidos para transição MANUAL (exclui status automáticos)
 * 
 * PROTEÇÃO CRÍTICA: Os status "Parcialmente Concluído" e "Concluído" são
 * exclusivamente automáticos e só podem ser definidos quando o usuário
 * marca parcelas como recebidas no módulo de transações financeiras
 */
export const getValidManualNextStatuses = (currentStatus: OrderStatus, orderType: 'sales' | 'purchase' = 'purchase'): OrderStatus[] => {
  const transitionRules = orderType === 'sales' ? SALES_STATUS_TRANSITION_RULES : PURCHASE_STATUS_TRANSITION_RULES;
  const allValidStatuses = transitionRules[currentStatus] || [];
  
  // Filtrar status que só podem ser definidos automaticamente
  const automaticOnlyStatuses = ["Parcialmente Concluído", "Concluído"];
  
  return allValidStatuses.filter(status => !automaticOnlyStatuses.includes(status)) as OrderStatus[];
};

// ==================== VALIDAÇÃO DE PEDIDOS ====================

/**
 * Valida transição de status para Pedidos de Venda
 */
export const validateSalesOrderStatusTransition = (
  order: SalesOrder,
  newStatus: SalesOrder['status']
): StatusTransitionResult => {
  return validateStatusTransition(
    order.status as OrderStatus,
    newStatus as OrderStatus,
    'sales'
  );
};

/**
 * Valida transição de status para Pedidos de Compra
 */
export const validatePurchaseOrderStatusTransition = (
  order: PurchaseOrder,
  newStatus: PurchaseOrder['status']
): StatusTransitionResult => {
  return validateStatusTransition(
    order.status as OrderStatus,
    newStatus as OrderStatus,
    'purchase'
  );
};

// ==================== UTILITÁRIOS DE DEBUG ====================

/**
 * Exibe a máquina de estados completa no console
 */
export const debugStateMachine = (): void => {
  console.group('🔄 MÁQUINA DE ESTADOS - PEDIDOS');
  
  STATUS_ORDER.forEach(status => {
    const validNext = STATUS_TRANSITION_RULES[status] || [];
    const description = STATUS_DESCRIPTIONS[status];
    const isFinal = isFinalStatus(status);
    
    console.log(`\n📍 ${status}${isFinal ? ' (FINAL)' : ''}`);
    console.log(`   Descrição: ${description}`);
    console.log(`   Pode ir para: ${validNext.join(', ') || 'Nenhum (estado final)'}`);
  });
  
  console.groupEnd();
};

/**
 * Testa uma transição específica
 */
export const testTransition = (
  from: OrderStatus,
  to: OrderStatus
): void => {
  const result = validateStatusTransition(from, to);
  
  console.group(`🧪 TESTE: ${from} → ${to}`);
  console.log(`Válida: ${result.isValid ? '✅' : '❌'}`);
  console.log(`Mensagem: ${result.message}`);
  
  if (result.details.skippedStatuses.length > 0) {
    console.log(`Status pulados: ${result.details.skippedStatuses.join(' → ')}`);
  }
  
  if (result.details.requiredActions.length > 0) {
    console.log('Ações necessárias:');
    result.details.requiredActions.forEach(action => {
      console.log(`  - ${action}`);
    });
  }
  
  console.groupEnd();
};

/**
 * Exibe diagrama visual da máquina de estados
 */
export const printStateDiagram = (): void => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            MÁQUINA DE ESTADOS - PEDIDOS (CRIT-004)            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Processando ──► Confirmado ──► Enviado ──► Recebido         ║
║       │              │              │            │            ║
║       │              │              │            ▼            ║
║       │              │              │    Parcialmente         ║
║       │              │              │      Concluído          ║
║       │              │              │            │            ║
║       │              │              │            ▼            ║
║       │              │              │       Concluído         ║
║       │              │              │            │            ║
║       ╰──────────────┴──────────────┴────────────┤            ║
║                                                   ▼            ║
║                                              Cancelado        ║
║                                               (FINAL)         ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  REGRAS:                                                      ║
║  ✅ Permite avanço com ou sem pulos de etapas                ║
║  ✅ Executa automações de etapas puladas                     ║
║  ✅ Cancelamento permitido de QUALQUER status                ║
║  ❌ Não é possível retroceder status (use Cancelar)          ║
║  ❌ Status "Cancelado" não pode ser alterado                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
};

// ==================== HISTÓRICO DE VALIDAÇÕES ====================

interface TransitionAttempt {
  timestamp: Date;
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  success: boolean;
  message: string;
}

const transitionHistory: TransitionAttempt[] = [];

/**
 * Registra tentativa de transição para auditoria
 */
export const logTransitionAttempt = (
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  result: StatusTransitionResult
): void => {
  const attempt: TransitionAttempt = {
    timestamp: new Date(),
    orderId,
    from,
    to,
    success: result.isValid,
    message: result.message
  };
  
  transitionHistory.push(attempt);
  
  // Manter apenas últimas 100 tentativas
  if (transitionHistory.length > 100) {
    transitionHistory.shift();
  }
  
  // Log apenas se bloqueado (transições válidas logadas no ERPContext)
  if (!result.isValid) {
    console.warn(`⚠️ Transição bloqueada [${orderId}]: ${from} → ${to} - ${result.message}`);
  } else {
    // Log de sucesso feito no ERPContext para evitar duplicação
  }
};

/**
 * Obtém histórico de tentativas de transição
 */
export const getTransitionHistory = (
  orderId?: string
): TransitionAttempt[] => {
  if (orderId) {
    return transitionHistory.filter(attempt => attempt.orderId === orderId);
  }
  return [...transitionHistory];
};

/**
 * Obtém estatísticas de transições
 */
export const getTransitionStats = (): {
  total: number;
  successful: number;
  blocked: number;
  blockedPercentage: number;
} => {
  const total = transitionHistory.length;
  const successful = transitionHistory.filter(a => a.success).length;
  const blocked = transitionHistory.filter(a => !a.success).length;
  const blockedPercentage = total > 0 ? (blocked / total) * 100 : 0;
  
  return {
    total,
    successful,
    blocked,
    blockedPercentage: Math.round(blockedPercentage * 100) / 100
  };
};

// ==================== EXPORT ====================

export default {
  validateStatusTransition,
  validateSalesOrderStatusTransition,
  validatePurchaseOrderStatusTransition,
  getSkippedStatuses,
  getNextStatus,
  isFinalStatus,
  canCancel,
  getValidNextStatuses,
  debugStateMachine,
  testTransition,
  printStateDiagram,
  logTransitionAttempt,
  getTransitionHistory,
  getTransitionStats,
  STATUS_TRANSITION_RULES,
  STATUS_ORDER,
  STATUS_DESCRIPTIONS,
  STATUS_REQUIRED_ACTIONS
};
