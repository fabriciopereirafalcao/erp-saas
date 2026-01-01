/**
 * ===================================================================
 * useClosedPeriodsSQL - Hook para Períodos Fechados em SQL
 * ===================================================================
 * 
 * SUBSTITUIÇÃO DE ARQUITETURA:
 * - ANTES: companies.settings.closedPeriods (JSONB)
 * - DEPOIS: financial_closed_periods (SQL table)
 * 
 * BENEFÍCIOS:
 * - Persistência real entre deploys
 * - Auditoria confiável e imutável
 * - Histórico de reabertura
 * - Compatibilidade mantida com código existente
 */

import { authGet, authPost } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';

// ==================== INTERFACES ====================

export interface FinancialClosedPeriod {
  id: string;
  company_id: string;
  period_month: number;
  period_year: number;
  status: 'closed' | 'reopened';
  is_first_period: boolean;
  closed_at: string;
  closed_by?: string;
  closed_by_name: string;
  closed_justification?: string;
  reopened_at?: string;
  reopened_by?: string;
  reopened_by_name?: string;
  reopened_justification?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ClosedPeriodAdjustment {
  id: string;
  company_id: string;
  period_id: string;
  action: 'create' | 'edit' | 'delete' | 'settle';
  transaction_id: string;
  transaction_description?: string;
  transaction_amount?: number;
  transaction_date?: string;
  admin_user_id: string;
  admin_user_name: string;
  admin_password_hash: string;
  justification: string;
  metadata?: any;
  adjusted_at: string;
}

// ==================== FUNÇÕES DE CARREGAMENTO ====================

/**
 * Carrega todos os períodos fechados da empresa
 */
export async function loadClosedPeriods(): Promise<FinancialClosedPeriod[]> {
  try {
    console.log('[CLOSED-PERIODS-SQL] 📥 Carregando períodos fechados...');
    
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-periods`
    );

    if (!response.success || !response.data) {
      console.log('[CLOSED-PERIODS-SQL] 📭 Nenhum período fechado encontrado (ou rota não disponível)');
      return [];
    }

    console.log(`[CLOSED-PERIODS-SQL] ✅ ${response.data.length} períodos carregados`);
    return response.data as FinancialClosedPeriod[];
    
  } catch (error) {
    console.warn('[CLOSED-PERIODS-SQL] ⚠️  Erro ao carregar períodos (continuando sem dados):', error);
    // Retornar array vazio em vez de lançar erro - sistema funciona sem dados SQL
    return [];
  }
}

/**
 * Carrega ajustes em períodos fechados
 */
export async function loadClosedPeriodAdjustments(): Promise<ClosedPeriodAdjustment[]> {
  try {
    console.log('[CLOSED-PERIODS-SQL] 📥 Carregando ajustes...');
    
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-period-adjustments`
    );

    if (!response.success || !response.data) {
      console.log('[CLOSED-PERIODS-SQL] 📭 Nenhum ajuste encontrado (ou rota não disponível)');
      return [];
    }

    console.log(`[CLOSED-PERIODS-SQL] ✅ ${response.data.length} ajustes carregados`);
    return response.data as ClosedPeriodAdjustment[];
    
  } catch (error) {
    console.warn('[CLOSED-PERIODS-SQL] ⚠️  Erro ao carregar ajustes (continuando sem dados):', error);
    // Retornar array vazio em vez de lançar erro - sistema funciona sem dados SQL
    return [];
  }
}

/**
 * Verifica se um período está fechado
 */
export async function checkPeriodClosed(
  year: number,
  month: number
): Promise<{ isClosed: boolean; status: string }> {
  try {
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-periods/check/${year}/${month}`
    );

    if (!response.success) {
      return { isClosed: false, status: 'open' };
    }

    return {
      isClosed: response.isClosed || false,
      status: response.status || 'open'
    };
    
  } catch (error) {
    console.error('[CLOSED-PERIODS-SQL] ❌ Erro ao verificar período:', error);
    return { isClosed: false, status: 'open' };
  }
}

// ==================== FUNÇÕES DE SALVAMENTO ====================

/**
 * Fecha um período contábil
 */
export async function closePeriod(params: {
  month: number;
  year: number;
  isFirstPeriod?: boolean;
  justification?: string;
}): Promise<{ success: boolean; data?: FinancialClosedPeriod; error?: string }> {
  try {
    console.log('[CLOSED-PERIODS-SQL] 💾 Fechando período...');
    console.log('[CLOSED-PERIODS-SQL] 📊 Dados:', params);
    
    const response = await authPost(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-periods/close`,
      params
    );

    if (!response.success) {
      console.error('[CLOSED-PERIODS-SQL] ❌ Erro na resposta:', response);
      return { success: false, error: response.error || 'Erro desconhecido' };
    }

    console.log('[CLOSED-PERIODS-SQL] ✅ Período fechado com sucesso');
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('[CLOSED-PERIODS-SQL] ❌ Erro ao fechar período:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Reabre um período fechado
 */
export async function reopenPeriod(params: {
  month: number;
  year: number;
  justification: string;
}): Promise<{ success: boolean; data?: FinancialClosedPeriod; error?: string }> {
  try {
    console.log('[CLOSED-PERIODS-SQL] 💾 Reabrindo período...');
    console.log('[CLOSED-PERIODS-SQL] 📊 Dados:', params);
    
    const response = await authPost(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-periods/reopen`,
      params
    );

    if (!response.success) {
      console.error('[CLOSED-PERIODS-SQL] ❌ Erro na resposta:', response);
      return { success: false, error: response.error || 'Erro desconhecido' };
    }

    console.log('[CLOSED-PERIODS-SQL] ✅ Período reaberto com sucesso');
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('[CLOSED-PERIODS-SQL] ❌ Erro ao reabrir período:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Registra ajuste autorizado em período fechado
 */
export async function createClosedPeriodAdjustment(params: {
  periodId: string;
  action: 'create' | 'edit' | 'delete' | 'settle';
  transactionId: string;
  transactionDescription?: string;
  transactionAmount?: number;
  transactionDate?: string;
  adminPassword: string;
  justification: string;
}): Promise<{ success: boolean; data?: ClosedPeriodAdjustment; error?: string }> {
  try {
    console.log('[CLOSED-PERIODS-SQL] 💾 Registrando ajuste...');
    
    const response = await authPost(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/reconciliation/closed-period-adjustments/create`,
      params
    );

    if (!response.success) {
      console.error('[CLOSED-PERIODS-SQL] ❌ Erro na resposta:', response);
      return { success: false, error: response.error || 'Erro desconhecido' };
    }

    console.log('[CLOSED-PERIODS-SQL] ✅ Ajuste registrado com sucesso');
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('[CLOSED-PERIODS-SQL] ❌ Erro ao registrar ajuste:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ==================== FUNÇÕES DE CONVERSÃO (COMPATIBILIDADE) ====================

/**
 * Converte FinancialClosedPeriod para formato antigo (ClosedPeriod)
 * Mantém compatibilidade com código existente
 */
export function convertSQLToClosedPeriod(period: FinancialClosedPeriod): any {
  return {
    id: period.id,
    month: period.period_month,
    year: period.period_year,
    closedAt: period.closed_at,
    closedBy: period.closed_by_name,
    closedByName: period.closed_by_name,
    firstPeriod: period.is_first_period,
    justification: period.closed_justification
  };
}

/**
 * Converte ClosedPeriodAdjustment para formato antigo
 */
export function convertSQLToAdjustment(adjustment: ClosedPeriodAdjustment): any {
  return {
    id: adjustment.id,
    periodId: adjustment.period_id,
    adjustmentType: adjustment.action,
    transactionId: adjustment.transaction_id,
    transactionDescription: adjustment.transaction_description,
    amount: adjustment.transaction_amount,
    transactionDate: adjustment.transaction_date,
    adminUserName: adjustment.admin_user_name,
    justification: adjustment.justification,
    adjustedAt: adjustment.adjusted_at
  };
}
