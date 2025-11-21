/**
 * Sistema de Auditoria Completo
 * Registra todas as ações relevantes do sistema para fins de auditoria e compliance
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  user: string;
  userId: string;
  details: Record<string, any>;
  severity: "info" | "warning" | "error" | "critical";
  entityType?: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
}

export interface AccessLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  action: "login" | "logout" | "login_failed" | "module_access" | "unauthorized_attempt";
  module?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  sessionId?: string;
}

// Armazenamento em memória (em produção, usar banco de dados)
const auditLogs: AuditLogEntry[] = [];
const accessLogs: AccessLogEntry[] = [];
const MAX_LOGS = 10000; // Limite de logs em memória

/**
 * Gera ID único para log
 */
function generateId(): string {
  return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Registra uma ação de auditoria
 */
export function logAuditAction(params: {
  module: string;
  action: string;
  user: string;
  userId: string;
  details?: Record<string, any>;
  severity?: "info" | "warning" | "error" | "critical";
  entityType?: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    module: params.module,
    action: params.action,
    user: params.user,
    userId: params.userId,
    details: params.details || {},
    severity: params.severity || "info",
    entityType: params.entityType,
    entityId: params.entityId,
    previousValue: params.previousValue,
    newValue: params.newValue,
    ip: getClientIP(),
    userAgent: getClientUserAgent()
  };

  auditLogs.unshift(entry);
  
  // Limitar tamanho do array
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.pop();
  }

  // Log no console em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', {
      module: entry.module,
      action: entry.action,
      user: entry.user,
      severity: entry.severity
    });
  }

  return entry;
}

/**
 * Registra um acesso (login, logout, módulo)
 */
export function logAccess(params: {
  user: string;
  userId: string;
  action: "login" | "logout" | "login_failed" | "module_access" | "unauthorized_attempt";
  module?: string;
  success: boolean;
  failureReason?: string;
  sessionId?: string;
}): AccessLogEntry {
  const entry: AccessLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    user: params.user,
    userId: params.userId,
    action: params.action,
    module: params.module,
    ip: getClientIP(),
    userAgent: getClientUserAgent(),
    success: params.success,
    failureReason: params.failureReason,
    sessionId: params.sessionId
  };

  accessLogs.unshift(entry);
  
  // Limitar tamanho do array
  if (accessLogs.length > MAX_LOGS) {
    accessLogs.pop();
  }

  // Log no console em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[ACCESS]', {
      action: entry.action,
      user: entry.user,
      success: entry.success,
      module: entry.module
    });
  }

  return entry;
}

/**
 * Obtém logs de auditoria com filtros
 */
export function getAuditLogs(filters?: {
  module?: string;
  user?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}): AuditLogEntry[] {
  let filteredLogs = [...auditLogs];

  if (filters) {
    if (filters.module) {
      filteredLogs = filteredLogs.filter(log => log.module === filters.module);
    }
    if (filters.user) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.toLowerCase().includes(filters.user!.toLowerCase())
      );
    }
    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }
    if (filters.entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === filters.entityType);
    }
    if (filters.entityId) {
      filteredLogs = filteredLogs.filter(log => log.entityId === filters.entityId);
    }
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }
  }

  return filteredLogs;
}

/**
 * Obtém logs de acesso com filtros
 */
export function getAccessLogs(filters?: {
  user?: string;
  action?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AccessLogEntry[] {
  let filteredLogs = [...accessLogs];

  if (filters) {
    if (filters.user) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.toLowerCase().includes(filters.user!.toLowerCase())
      );
    }
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === filters.success);
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }
  }

  return filteredLogs;
}

/**
 * Obtém estatísticas de auditoria
 */
export function getAuditStatistics() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    total: auditLogs.length,
    last24h: auditLogs.filter(log => log.timestamp >= last24h).length,
    last7d: auditLogs.filter(log => log.timestamp >= last7d).length,
    bySeverity: {
      critical: auditLogs.filter(log => log.severity === 'critical').length,
      error: auditLogs.filter(log => log.severity === 'error').length,
      warning: auditLogs.filter(log => log.severity === 'warning').length,
      info: auditLogs.filter(log => log.severity === 'info').length,
    },
    byModule: getModuleStats(),
    topUsers: getTopUsers()
  };
}

/**
 * Obtém estatísticas de acesso
 */
export function getAccessStatistics() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const loginAttempts = accessLogs.filter(log => 
    log.action === 'login' || log.action === 'login_failed'
  );

  const successfulLogins = loginAttempts.filter(log => log.success);
  const failedLogins = loginAttempts.filter(log => !log.success);

  return {
    totalAccess: accessLogs.length,
    last24h: accessLogs.filter(log => log.timestamp >= last24h).length,
    loginAttempts: loginAttempts.length,
    successfulLogins: successfulLogins.length,
    failedLogins: failedLogins.length,
    successRate: loginAttempts.length > 0 
      ? ((successfulLogins.length / loginAttempts.length) * 100).toFixed(1)
      : '0',
    activeUsers: getActiveUsers(),
    topModules: getTopAccessedModules()
  };
}

/**
 * Limpa logs antigos (mais de X dias)
 */
export function cleanOldLogs(daysToKeep: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffTimestamp = cutoffDate.toISOString();

  const auditBefore = auditLogs.length;
  const accessBefore = accessLogs.length;

  // Remover logs antigos
  const newAuditLogs = auditLogs.filter(log => log.timestamp >= cutoffTimestamp);
  const newAccessLogs = accessLogs.filter(log => log.timestamp >= cutoffTimestamp);

  auditLogs.length = 0;
  auditLogs.push(...newAuditLogs);
  
  accessLogs.length = 0;
  accessLogs.push(...newAccessLogs);

  return {
    auditRemoved: auditBefore - auditLogs.length,
    accessRemoved: accessBefore - accessLogs.length
  };
}

/**
 * Exporta logs para JSON
 */
export function exportLogs() {
  return {
    exportDate: new Date().toISOString(),
    auditLogs: auditLogs,
    accessLogs: accessLogs,
    statistics: {
      audit: getAuditStatistics(),
      access: getAccessStatistics()
    }
  };
}

// ========== Funções Auxiliares ==========

function getClientIP(): string {
  // Em produção, obter do request header
  return '127.0.0.1';
}

function getClientUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'Unknown';
}

function getModuleStats() {
  const moduleCount: Record<string, number> = {};
  
  auditLogs.forEach(log => {
    moduleCount[log.module] = (moduleCount[log.module] || 0) + 1;
  });

  return Object.entries(moduleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([module, count]) => ({ module, count }));
}

function getTopUsers() {
  const userCount: Record<string, number> = {};
  
  auditLogs.forEach(log => {
    userCount[log.user] = (userCount[log.user] || 0) + 1;
  });

  return Object.entries(userCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user, count]) => ({ user, count }));
}

function getActiveUsers() {
  const uniqueUsers = new Set(accessLogs.map(log => log.userId));
  return uniqueUsers.size;
}

function getTopAccessedModules() {
  const moduleCount: Record<string, number> = {};
  
  accessLogs
    .filter(log => log.action === 'module_access' && log.module)
    .forEach(log => {
      moduleCount[log.module!] = (moduleCount[log.module!] || 0) + 1;
    });

  return Object.entries(moduleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([module, count]) => ({ module, count }));
}

/**
 * Ações predefinidas para facilitar logging
 */
export const AUDIT_ACTIONS = {
  // Pedidos de Venda
  SALES_ORDER_CREATED: 'Pedido de venda criado',
  SALES_ORDER_UPDATED: 'Pedido de venda atualizado',
  SALES_ORDER_DELETED: 'Pedido de venda excluído',
  SALES_ORDER_STATUS_CHANGED: 'Status do pedido alterado',
  SALES_ORDER_CONFIRMED: 'Pedido confirmado',
  SALES_ORDER_SHIPPED: 'Pedido enviado',
  SALES_ORDER_DELIVERED: 'Pedido entregue',
  SALES_ORDER_PAID: 'Pedido pago',
  SALES_ORDER_CANCELLED: 'Pedido cancelado',
  
  // Pedidos de Compra
  PURCHASE_ORDER_CREATED: 'Pedido de compra criado',
  PURCHASE_ORDER_UPDATED: 'Pedido de compra atualizado',
  PURCHASE_ORDER_DELETED: 'Pedido de compra excluído',
  PURCHASE_ORDER_STATUS_CHANGED: 'Status da compra alterado',
  PURCHASE_ORDER_RECEIVED: 'Compra recebida',
  
  // Estoque
  STOCK_ADJUSTED: 'Estoque ajustado manualmente',
  STOCK_REDUCED: 'Estoque reduzido',
  STOCK_INCREASED: 'Estoque aumentado',
  STOCK_TRANSFER: 'Transferência de estoque',
  PRODUCT_CREATED: 'Produto criado',
  PRODUCT_UPDATED: 'Produto atualizado',
  PRODUCT_DELETED: 'Produto excluído',
  
  // Financeiro
  TRANSACTION_CREATED: 'Transação financeira criada',
  TRANSACTION_UPDATED: 'Transação financeira atualizada',
  TRANSACTION_DELETED: 'Transação financeira excluída',
  ACCOUNT_RECEIVABLE_CREATED: 'Conta a receber criada',
  ACCOUNT_RECEIVABLE_PAID: 'Conta a receber paga',
  ACCOUNT_RECEIVABLE_CANCELLED: 'Conta a receber cancelada',
  ACCOUNT_PAYABLE_CREATED: 'Conta a pagar criada',
  ACCOUNT_PAYABLE_PAID: 'Conta a pagar paga',
  ACCOUNT_PAYABLE_CANCELLED: 'Conta a pagar cancelada',
  BANK_RECONCILIATION: 'Conciliação bancária realizada',
  
  // NFe
  NFE_CREATED: 'NFe criada',
  NFE_TRANSMITTED: 'NFe transmitida',
  NFE_CANCELLED: 'NFe cancelada',
  NFE_PRINTED: 'NFe impressa',
  
  // Clientes e Fornecedores
  CUSTOMER_CREATED: 'Cliente criado',
  CUSTOMER_UPDATED: 'Cliente atualizado',
  CUSTOMER_DELETED: 'Cliente excluído',
  SUPPLIER_CREATED: 'Fornecedor criado',
  SUPPLIER_UPDATED: 'Fornecedor atualizado',
  SUPPLIER_DELETED: 'Fornecedor excluído',
  
  // Configurações
  COMPANY_SETTINGS_UPDATED: 'Configurações da empresa atualizadas',
  PRICE_TABLE_CREATED: 'Tabela de preço criada',
  PRICE_TABLE_UPDATED: 'Tabela de preço atualizada',
  PRICE_TABLE_DELETED: 'Tabela de preço excluída',
  
  // Usuários e Permissões
  USER_CREATED: 'Usuário criado',
  USER_UPDATED: 'Usuário atualizado',
  USER_DELETED: 'Usuário excluído',
  ROLE_CREATED: 'Perfil de acesso criado',
  ROLE_UPDATED: 'Perfil de acesso atualizado',
  ROLE_DELETED: 'Perfil de acesso excluído',
  PERMISSIONS_CHANGED: 'Permissões alteradas'
};

/**
 * Módulos do sistema
 */
export const AUDIT_MODULES = {
  SALES: 'Vendas',
  PURCHASES: 'Compras',
  INVENTORY: 'Estoque',
  FINANCIAL: 'Financeiro',
  NFE: 'NFe',
  CUSTOMERS: 'Clientes',
  SUPPLIERS: 'Fornecedores',
  SETTINGS: 'Configurações',
  USERS: 'Usuários',
  REPORTS: 'Relatórios',
  DASHBOARD: 'Dashboard'
};
