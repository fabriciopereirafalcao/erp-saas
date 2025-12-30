/**
 * Validação de Períodos Fechados
 * Funções auxiliares para verificar e validar transações em períodos contábeis fechados
 */

import { ClosedPeriod } from '../contexts/ERPContext';

/**
 * Verifica se uma data está em um período fechado
 */
export function isDateInClosedPeriod(
  date: Date | string,
  closedPeriods: ClosedPeriod[]
): { isClosed: boolean; period?: ClosedPeriod } {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const month = checkDate.getMonth() + 1; // 0-11 -> 1-12
  const year = checkDate.getFullYear();
  
  const period = closedPeriods.find(p => p.month === month && p.year === year);
  
  return {
    isClosed: !!period,
    period
  };
}

/**
 * Gera descrição da ação para auditoria
 */
export function getActionDescription(
  actionType: 'create' | 'edit' | 'delete',
  transactionType: 'Receita' | 'Despesa',
  description: string,
  amount?: number
): string {
  const typeLabel = transactionType === 'Receita' ? 'receita' : 'despesa';
  const amountStr = amount ? ` no valor de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
  
  switch (actionType) {
    case 'create':
      return `Criação de ${typeLabel}${amountStr}: ${description}`;
    case 'edit':
      return `Edição de ${typeLabel}${amountStr}: ${description}`;
    case 'delete':
      return `Exclusão de ${typeLabel}${amountStr}: ${description}`;
    default:
      return description;
  }
}

/**
 * Extrai datas afetadas de uma transação
 */
export function getAffectedDates(
  transaction: any,
  actionType: 'create' | 'edit' | 'delete'
): string[] {
  const dates: string[] = [];
  
  // Data de ocorrência
  if (transaction.date) {
    const dateStr = typeof transaction.date === 'string' 
      ? transaction.date 
      : transaction.date.toISOString().split('T')[0];
    dates.push(dateStr);
  }
  
  // Data efetiva (liquidação)
  if (transaction.effectiveDate) {
    const dateStr = typeof transaction.effectiveDate === 'string'
      ? transaction.effectiveDate
      : transaction.effectiveDate.toISOString().split('T')[0];
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
  }
  
  return dates;
}

/**
 * Calcula impacto da transação para auditoria
 */
export function calculateTransactionImpact(
  transaction: any,
  oldTransaction?: any
): {
  oldBalance?: number;
  newBalance?: number;
  difference?: number;
} {
  if (!oldTransaction) {
    // Nova transação
    return {
      newBalance: transaction.amount,
      difference: transaction.amount
    };
  }
  
  // Edição de transação
  const oldAmount = oldTransaction.amount || 0;
  const newAmount = transaction.amount || 0;
  
  return {
    oldBalance: oldAmount,
    newBalance: newAmount,
    difference: newAmount - oldAmount
  };
}
