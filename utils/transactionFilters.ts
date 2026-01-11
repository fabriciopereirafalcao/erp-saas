/**
 * ================================================================================
 * UTILS - Filtros de Transações Financeiras
 * ================================================================================
 * 
 * Helpers centralizados para filtrar transações por estado administrativo.
 * 
 * REGRA DE OURO:
 * - Todos os cálculos financeiros (saldos, DRE, fluxo de caixa) devem usar
 *   getActiveTransactions() para garantir que apenas transações ATIVAS sejam
 *   consideradas.
 * 
 * - Transações CANCELADAS e SUBSTITUÍDAS são excluídas automaticamente dos
 *   cálculos, mas permanecem no banco para auditoria.
 */

import { FinancialTransaction, AdministrativeStatus } from '../contexts/ERPContext';

/**
 * Retorna apenas transações ATIVAS
 * ✅ Usar em todos os cálculos financeiros
 * 
 * NOTA: Usa administrative_status (snake_case) pois vem do banco de dados
 */
export const getActiveTransactions = (
  transactions: FinancialTransaction[]
): FinancialTransaction[] => {
  return transactions.filter(
    t => !t.administrative_status || t.administrative_status === 'active'
  );
};

/**
 * Retorna todas as transações (incluindo canceladas/substituídas)
 * ✅ Usar apenas em relatórios de auditoria
 */
export const getAllTransactions = (
  transactions: FinancialTransaction[]
): FinancialTransaction[] => {
  return transactions;
};

/**
 * Retorna apenas transações CANCELADAS
 * ✅ Usar em relatórios de auditoria
 */
export const getCancelledTransactions = (
  transactions: FinancialTransaction[]
): FinancialTransaction[] => {
  return transactions.filter(
    t => t.administrative_status === 'canceled'
  );
};

/**
 * Retorna apenas transações SUBSTITUÍDAS
 * ✅ Usar em relatórios de auditoria
 */
export const getSubstitutedTransactions = (
  transactions: FinancialTransaction[]
): FinancialTransaction[] => {
  return transactions.filter(
    t => t.administrative_status === 'substituted'
  );
};

/**
 * Retorna label legível para exibição no frontend
 */
export const getAdministrativeStatusLabel = (
  status?: AdministrativeStatus
): string => {
  if (!status || status === AdministrativeStatus.ATIVA) {
    return 'Ativa';
  }
  
  const labels: Record<AdministrativeStatus, string> = {
    [AdministrativeStatus.ATIVA]: 'Ativa',
    [AdministrativeStatus.CANCELADA]: 'Cancelada',
    [AdministrativeStatus.SUBSTITUIDA]: 'Substituída'
  };
  
  return labels[status] || 'Ativa';
};

/**
 * Retorna cor do badge para exibição
 */
export const getAdministrativeStatusColor = (
  status?: AdministrativeStatus
): 'default' | 'secondary' | 'destructive' => {
  if (!status || status === AdministrativeStatus.ATIVA) {
    return 'default';
  }
  
  const colors: Record<AdministrativeStatus, 'default' | 'secondary' | 'destructive'> = {
    [AdministrativeStatus.ATIVA]: 'default',
    [AdministrativeStatus.CANCELADA]: 'destructive',
    [AdministrativeStatus.SUBSTITUIDA]: 'secondary'
  };
  
  return colors[status] || 'default';
};