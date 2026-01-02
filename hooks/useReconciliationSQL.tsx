/**
 * ===================================================================
 * useReconciliationSQL - Hook para Conciliações em SQL
 * ===================================================================
 * 
 * SUBSTITUIÇÃO DE ARQUITETURA:
 * - ANTES: companies.settings.reconciliationStatus (JSONB)
 * - DEPOIS: bank_reconciliations (SQL table)
 * 
 * BENEFÍCIOS:
 * - Persistência real entre deploys
 * - Auditoria confiável e imutável
 * - Queries eficientes
 * - Compatibilidade mantida com código existente
 */

import { authGet, authPost } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';

// ==================== INTERFACES ====================

export interface BankReconciliation {
  id: string;
  company_id: string;
  bank_account_id: string;
  reference_date: string; // YYYY-MM-DD
  status: 'open' | 'reconciled' | 'closed';
  confirmed_balance?: number;
  expected_balance?: number;
  difference?: number;
  transaction_count?: number;
  reconciled_at?: string;
  reconciled_by?: string;
  reconciled_by_name?: string;
  closed_at?: string;
  closed_by?: string;
  closed_by_name?: string;
  notes?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationAuditLog {
  id: string;
  company_id: string;
  reconciliation_id?: string;
  reconciliation_key: string;
  bank_account_id: string;
  reference_date: string;
  action: 'reconcile' | 'unconcile' | 'close' | 'reopen' | 'auto_unconcile';
  confirmed_balance?: number;
  expected_balance?: number;
  difference?: number;
  transaction_count?: number;
  reason?: string;
  transaction_id?: string;
  transaction_description?: string;
  transaction_amount?: number;
  automatic: boolean;
  user_id?: string;
  user_name: string;
  timestamp: string;
  metadata?: any;
}

// ==================== FUNÇÕES DE CARREGAMENTO ====================

/**
 * Carrega todas as conciliações da empresa
 */
export async function loadBankReconciliations(): Promise<BankReconciliation[]> {
  try {
    console.log('[RECONCILIATION-SQL] 📥 Carregando conciliações...');
    
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/bank-reconciliations`
    );

    if (!response.success || !response.data) {
      console.log('[RECONCILIATION-SQL] 📭 Nenhuma conciliação encontrada (ou rota não disponível)');
      return [];
    }

    console.log(`[RECONCILIATION-SQL] ✅ ${response.data.length} conciliações carregadas`);
    return response.data as BankReconciliation[];
    
  } catch (error) {
    console.warn('[RECONCILIATION-SQL] ⚠️  Erro ao carregar conciliações (continuando sem dados):', error);
    // Retornar array vazio em vez de lançar erro - sistema funciona sem dados SQL
    return [];
  }
}

/**
 * Carrega logs de auditoria de conciliações
 */
export async function loadReconciliationAuditLogs(): Promise<ReconciliationAuditLog[]> {
  try {
    console.log('[RECONCILIATION-SQL] 📥 Carregando logs de auditoria...');
    
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/reconciliation-audit`
    );

    if (!response.success || !response.data) {
      console.log('[RECONCILIATION-SQL] 📭 Nenhum log encontrado (ou rota não disponível)');
      return [];
    }

    console.log(`[RECONCILIATION-SQL] ✅ ${response.data.length} logs carregados`);
    return response.data as ReconciliationAuditLog[];
    
  } catch (error) {
    console.warn('[RECONCILIATION-SQL] ⚠️  Erro ao carregar logs (continuando sem dados):', error);
    // Retornar array vazio em vez de lançar erro - sistema funciona sem dados SQL
    return [];
  }
}

/**
 * Verifica se uma data específica está conciliada
 */
export async function checkReconciliationStatus(
  bankAccountId: string,
  referenceDate: string
): Promise<{ isReconciled: boolean; status: string }> {
  try {
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/bank-reconciliations/status/${bankAccountId}/${referenceDate}`
    );

    if (!response.success) {
      return { isReconciled: false, status: 'open' };
    }

    return {
      isReconciled: response.isReconciled || false,
      status: response.status || 'open'
    };
    
  } catch (error) {
    console.error('[RECONCILIATION-SQL] ❌ Erro ao verificar status:', error);
    return { isReconciled: false, status: 'open' };
  }
}

// ==================== FUNÇÕES DE SALVAMENTO ====================

/**
 * Define status de conciliação para uma data
 */
export async function setReconciliationStatus(params: {
  bankAccountId: string;
  referenceDate: string;
  status: boolean; // true = conciliar, false = desconciliar
  confirmedBalance?: number;
  expectedBalance?: number;
  difference?: number;
  transactionCount?: number;
  auditData?: {
    userName: string;
    reason?: string;
    transactionId?: string;
    transactionDescription?: string;
    transactionAmount?: number;
    automatic?: boolean;
  };
}): Promise<{ success: boolean; data?: BankReconciliation; error?: string }> {
  try {
    console.log('[RECONCILIATION-SQL] 💾 Salvando status de conciliação...');
    console.log('[RECONCILIATION-SQL] 📊 Dados:', params);
    
    const response = await authPost(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/bank-reconciliations/set-status`,
      params
    );

    if (!response.success) {
      console.error('[RECONCILIATION-SQL] ❌ Erro na resposta:', response);
      return { success: false, error: response.error || 'Erro desconhecido' };
    }

    console.log('[RECONCILIATION-SQL] ✅ Status salvo com sucesso');
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('[RECONCILIATION-SQL] ❌ Erro ao salvar status:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ==================== FUNÇÕES DE CONVERSÃO (COMPATIBILIDADE) ====================

/**
 * Converte array de BankReconciliation para Record<string, boolean>
 * Mantém compatibilidade com código existente que usa reconciliationStatus
 */
export function convertReconciliationsToRecord(
  reconciliations: BankReconciliation[]
): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  
  reconciliations.forEach(rec => {
    const key = `${rec.bank_account_id}-${rec.reference_date}`;
    record[key] = rec.status === 'reconciled' || rec.status === 'closed';
  });
  
  return record;
}

/**
 * Converte ReconciliationAuditLog para ReconciliationAuditEntry
 * Mantém compatibilidade com interface existente
 */
export function convertAuditLogToEntry(log: ReconciliationAuditLog): any {
  // ✅ IMPORTANTE: Filtrar apenas ações de conciliação efetiva
  // Não mostrar desconciliações no histórico para evitar confusão com valores zerados
  // O histórico deve mostrar apenas quando a data FOI conciliada, não quando foi desconciliada
  const isReconciled = log.action === 'reconcile' || log.action === 'close';
  
  return {
    id: log.id,
    reconciliationKey: log.reconciliation_key,
    bankAccountId: log.bank_account_id,
    bankName: '', // Não temos no SQL, pode buscar de bankAccounts
    date: log.reference_date,
    isReconciled: isReconciled,
    timestamp: log.timestamp,
    user: log.user_name,
    userId: log.user_id || 'system',
    initialBalance: 0, // Pode calcular se necessário
    finalBalance: log.confirmed_balance || 0,
    realizedIncome: 0, // Pode calcular se necessário
    realizedExpenses: 0, // Pode calcular se necessário
    transactionCount: log.transaction_count || 0,
    action: log.action // ✅ Preservar action original para filtro posterior
  };
}

/**
 * Gera chave de conciliação a partir de bankAccountId e date
 */
export function getReconciliationKey(bankAccountId: string, date: string): string {
  return `${bankAccountId}-${date}`;
}

/**
 * Parse de chave de conciliação
 */
export function parseReconciliationKey(key: string): { bankAccountId: string; date: string } | null {
  const parts = key.split('-');
  if (parts.length >= 4) {
    const bankAccountId = parts[0];
    const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
    return { bankAccountId, date };
  }
  return null;
}