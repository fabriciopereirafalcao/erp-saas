/**
 * Utilitários de Validação e Proteção de Estoque
 * 
 * Este módulo implementa verificações atômicas e validações
 * para prevenir duplicação de operações e estoque negativo
 */

import { SalesOrder } from "../contexts/ERPContext";

// ==================== TIPOS ====================

export interface StockValidationResult {
  isValid: boolean;
  available: number;
  requested: number;
  reserved: number;
  currentStock: number;
  message: string;
  canProceed: boolean;
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  message: string;
}

export interface OperationLock {
  orderId: string;
  operation: 'stock_reduction' | 'accounts_creation' | 'payment';
  lockId: string;
  timestamp: number;
  expiresAt: number;
}

// ==================== SISTEMA DE LOCKS ====================

/**
 * Armazena locks ativos em memória
 * Em produção, isso deveria usar Redis ou similar
 */
const activeLocks = new Map<string, OperationLock>();

/**
 * Tempo de expiração do lock (em milissegundos)
 * Previne deadlocks se operação falhar
 */
const LOCK_TIMEOUT = 30000; // 30 segundos

/**
 * Gera ID único para lock
 */
const generateLockId = (): string => {
  return `LOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Tenta adquirir lock para uma operação
 * Implementa verificação atômica
 */
export const acquireLock = (
  orderId: string, 
  operation: OperationLock['operation']
): LockResult => {
  const lockKey = `${orderId}-${operation}`;
  const existingLock = activeLocks.get(lockKey);
  
  // Verificar se já existe lock
  if (existingLock) {
    // Verificar se lock expirou
    if (Date.now() < existingLock.expiresAt) {
      return {
        acquired: false,
        message: `Operação "${operation}" já está em andamento para pedido ${orderId}`
      };
    }
    
    // Lock expirou, pode remover
    console.warn(`Lock expirado removido: ${lockKey}`);
    activeLocks.delete(lockKey);
  }
  
  // Adquirir novo lock
  const lockId = generateLockId();
  const lock: OperationLock = {
    orderId,
    operation,
    lockId,
    timestamp: Date.now(),
    expiresAt: Date.now() + LOCK_TIMEOUT
  };
  
  activeLocks.set(lockKey, lock);
  
  console.log(`✅ Lock adquirido: ${lockKey} (${lockId})`);
  
  return {
    acquired: true,
    lockId,
    message: `Lock adquirido com sucesso`
  };
};

/**
 * Libera lock após operação concluída
 */
export const releaseLock = (
  orderId: string, 
  operation: OperationLock['operation'],
  lockId: string
): void => {
  const lockKey = `${orderId}-${operation}`;
  const existingLock = activeLocks.get(lockKey);
  
  if (!existingLock) {
    console.warn(`Lock não encontrado para liberação: ${lockKey}`);
    return;
  }
  
  // Verificar se é o lock correto
  if (existingLock.lockId !== lockId) {
    console.error(`Tentativa de liberar lock incorreto! Key: ${lockKey}`);
    return;
  }
  
  activeLocks.delete(lockKey);
  console.log(`🔓 Lock liberado: ${lockKey} (${lockId})`);
};

/**
 * Limpa locks expirados
 * Deve ser chamado periodicamente
 */
export const cleanupExpiredLocks = (): number => {
  const now = Date.now();
  let cleaned = 0;
  
  activeLocks.forEach((lock, key) => {
    if (now >= lock.expiresAt) {
      activeLocks.delete(key);
      cleaned++;
      console.warn(`🧹 Lock expirado removido: ${key}`);
    }
  });
  
  return cleaned;
};

/**
 * Verifica se operação já possui lock
 */
export const hasActiveLock = (
  orderId: string, 
  operation: OperationLock['operation']
): boolean => {
  const lockKey = `${orderId}-${operation}`;
  const lock = activeLocks.get(lockKey);
  
  if (!lock) return false;
  
  // Verificar se não expirou
  if (Date.now() >= lock.expiresAt) {
    activeLocks.delete(lockKey);
    return false;
  }
  
  return true;
};

// ==================== VALIDAÇÃO DE ESTOQUE ====================

/**
 * Interface para item de inventário (simplificada)
 */
interface InventoryItem {
  productName: string;
  quantity: number;
  currentStock: number;
}

/**
 * Calcula estoque disponível considerando reservas
 */
export const calculateAvailableStock = (
  productName: string,
  currentStock: number,
  allOrders: SalesOrder[]
): number => {
  // Calcular total reservado por pedidos em andamento
  const reserved = allOrders
    .filter(order => 
      order.productName === productName &&
      order.status !== "Cancelado" &&
      order.status !== "Pago" &&
      !order.actionFlags?.stockReduced // Não contar se já baixou
    )
    .reduce((sum, order) => sum + order.quantity, 0);
  
  return Math.max(0, currentStock - reserved);
};

/**
 * Valida se há estoque disponível para o pedido
 */
export const validateStockAvailability = (
  productName: string,
  requestedQuantity: number,
  currentStock: number,
  allOrders: SalesOrder[],
  excludeOrderId?: string // Para excluir pedido atual do cálculo
): StockValidationResult => {
  // Calcular reservas (excluindo o pedido atual se fornecido)
  const reserved = allOrders
    .filter(order => 
      order.productName === productName &&
      order.status !== "Cancelado" &&
      order.status !== "Pago" &&
      !order.actionFlags?.stockReduced &&
      order.id !== excludeOrderId // Excluir pedido atual
    )
    .reduce((sum, order) => sum + order.quantity, 0);
  
  const available = Math.max(0, currentStock - reserved);
  const canProceed = available >= requestedQuantity;
  
  let message = '';
  if (!canProceed) {
    message = `Estoque insuficiente! Disponível: ${available}, Solicitado: ${requestedQuantity}, Reservado: ${reserved}`;
  } else if (reserved > 0) {
    message = `Estoque disponível: ${available} (${reserved} reservado(s) por outros pedidos)`;
  } else {
    message = `Estoque disponível: ${available}`;
  }
  
  return {
    isValid: canProceed,
    available,
    requested: requestedQuantity,
    reserved,
    currentStock,
    message,
    canProceed
  };
};

/**
 * Valida se operação de baixa de estoque pode prosseguir
 * Verificação ATÔMICA com múltiplas camadas de proteção
 * @param skipLockCheck - Se true, pula a verificação de lock (usado quando lock já foi adquirido)
 */
export const validateStockReduction = (
  order: SalesOrder,
  currentStock: number,
  allOrders: SalesOrder[],
  skipLockCheck: boolean = false
): {
  canProceed: boolean;
  message: string;
  details: StockValidationResult;
} => {
  // PROTEÇÃO 1: Verificar se já foi executado (flag)
  if (order.actionFlags?.stockReduced) {
    return {
      canProceed: false,
      message: `⚠️ Baixa de estoque já executada anteriormente (ID: ${order.actionFlags.stockReductionId})`,
      details: {
        isValid: false,
        available: 0,
        requested: order.quantity,
        reserved: 0,
        currentStock,
        message: 'Operação já executada',
        canProceed: false
      }
    };
  }
  
  // PROTEÇÃO 2: Verificar se há lock ativo (apenas se não estiver pulando a verificação)
  if (!skipLockCheck && hasActiveLock(order.id, 'stock_reduction')) {
    return {
      canProceed: false,
      message: `⚠️ Baixa de estoque em andamento para pedido ${order.id}. Aguarde conclusão.`,
      details: {
        isValid: false,
        available: 0,
        requested: order.quantity,
        reserved: 0,
        currentStock,
        message: 'Operação em andamento',
        canProceed: false
      }
    };
  }
  
  // PROTEÇÃO 3: Validar disponibilidade de estoque
  const validation = validateStockAvailability(
    order.productName,
    order.quantity,
    currentStock,
    allOrders,
    order.id
  );
  
  if (!validation.canProceed) {
    return {
      canProceed: false,
      message: `❌ ${validation.message}`,
      details: validation
    };
  }
  
  return {
    canProceed: true,
    message: `✅ Validação OK. ${validation.message}`,
    details: validation
  };
};

/**
 * Valida se criação de contas a receber pode prosseguir
 */
export const validateAccountsCreation = (
  order: SalesOrder
): {
  canProceed: boolean;
  message: string;
} => {
  // PROTEÇÃO 1: Verificar se já foi executado
  if (order.actionFlags?.accountsReceivableCreated) {
    return {
      canProceed: false,
      message: `⚠️ Conta a receber já criada anteriormente (ID: ${order.actionFlags.accountsReceivableId})`
    };
  }
  
  // PROTEÇÃO 2: Verificar se há lock ativo
  if (hasActiveLock(order.id, 'accounts_creation')) {
    return {
      canProceed: false,
      message: `⚠️ Criação de conta a receber em andamento para pedido ${order.id}`
    };
  }
  
  return {
    canProceed: true,
    message: '✅ Validação OK para criação de conta a receber'
  };
};

/**
 * Valida se quitação pode prosseguir
 */
export const validatePayment = (
  order: SalesOrder
): {
  canProceed: boolean;
  message: string;
} => {
  // PROTEÇÃO 1: Verificar se já foi executado
  if (order.actionFlags?.accountsReceivablePaid) {
    return {
      canProceed: false,
      message: `⚠️ Pagamento já recebido anteriormente (ID: ${order.actionFlags.financialTransactionId})`
    };
  }
  
  // PROTEÇÃO 2: Verificar se há lock ativo
  if (hasActiveLock(order.id, 'payment')) {
    return {
      canProceed: false,
      message: `⚠️ Recebimento de pagamento em andamento para pedido ${order.id}`
    };
  }
  
  return {
    canProceed: true,
    message: '✅ Validação OK para recebimento de pagamento'
  };
};

// ==================== UTILITÁRIOS DE DEBUG ====================

/**
 * Retorna status de todos os locks ativos
 */
export const getActiveLocks = (): OperationLock[] => {
  return Array.from(activeLocks.values());
};

/**
 * Retorna informações detalhadas de locks para debug
 */
export const debugLocks = (): void => {
  console.group('🔒 LOCKS ATIVOS');
  if (activeLocks.size === 0) {
    console.log('Nenhum lock ativo');
  } else {
    activeLocks.forEach((lock, key) => {
      const timeRemaining = Math.max(0, lock.expiresAt - Date.now());
      console.log(`${key}:`, {
        lockId: lock.lockId,
        timestamp: new Date(lock.timestamp).toISOString(),
        expiresIn: `${Math.round(timeRemaining / 1000)}s`,
        isExpired: timeRemaining <= 0
      });
    });
  }
  console.groupEnd();
};

/**
 * Força limpeza de todos os locks (USAR APENAS EM DESENVOLVIMENTO)
 */
export const forceCleanAllLocks = (): number => {
  const count = activeLocks.size;
  activeLocks.clear();
  console.warn(`🧹 FORCE CLEAN: ${count} locks removidos`);
  return count;
};

// ==================== CLEANUP AUTOMÁTICO ====================

/**
 * Inicia limpeza automática de locks expirados
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export const startAutomaticCleanup = (intervalMs: number = 60000): void => {
  if (cleanupInterval) {
    console.warn('Cleanup automático já está ativo');
    return;
  }
  
  cleanupInterval = setInterval(() => {
    const cleaned = cleanupExpiredLocks();
    if (cleaned > 0) {
      console.log(`🧹 Cleanup automático: ${cleaned} lock(s) expirado(s) removido(s)`);
    }
  }, intervalMs);
  
  console.log(`✅ Cleanup automático iniciado (intervalo: ${intervalMs}ms)`);
};

export const stopAutomaticCleanup = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Cleanup automático interrompido');
  }
};

// Iniciar cleanup automático (1 minuto)
if (typeof window !== 'undefined') {
  startAutomaticCleanup(60000);
}
