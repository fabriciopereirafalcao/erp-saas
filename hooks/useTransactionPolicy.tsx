/**
 * ================================================================================
 * HOOK - useTransactionPolicy (Frontend)
 * ================================================================================
 * 
 * Hook para validar operações de transações financeiras no frontend.
 * Replica a mesma lógica do backend (FinancialTransactionPolicy) para
 * feedback imediato ao usuário.
 * 
 * IMPORTANTE: Backend SEMPRE valida novamente (backend nunca confia no frontend)
 */

import { FinancialTransaction, AdministrativeStatus } from '../contexts/ERPContext';
import { useERP } from '../contexts/ERPContext';

interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export const useTransactionPolicy = () => {
  const { closedPeriods, reconciliationStatus } = useERP();

  /**
   * Verifica se data está em período fechado
   */
  const isDateInClosedPeriod = (date: string): { isClosed: boolean; period?: any } => {
    const [year, month] = date.split('-').map(Number);

    const period = (closedPeriods || []).find(
      p => p.year === year && p.month === month && p.status === 'closed'
    );

    return {
      isClosed: !!period,
      period
    };
  };

  /**
   * Verifica se transação está conciliada
   */
  const isTransactionReconciled = (
    effectiveDate?: string,
    bankAccountId?: string
  ): boolean => {
    if (!effectiveDate || !bankAccountId) return false;
    
    const key = `${bankAccountId}-${effectiveDate}`;
    return reconciliationStatus[key] === true;
  };

  /**
   * Valida se campo pode ser editado
   */
  const canEditField = (
    transaction: FinancialTransaction,
    field: keyof FinancialTransaction
  ): PolicyResult => {
    // 1️⃣ Estado administrativo
    if (transaction.administrativeStatus === AdministrativeStatus.CANCELADA) {
      return {
        allowed: false,
        reason: 'Transação cancelada não pode ser editada'
      };
    }

    if (transaction.administrativeStatus === AdministrativeStatus.SUBSTITUIDA) {
      return {
        allowed: false,
        reason: 'Transação substituída não pode ser editada'
      };
    }

    // 2️⃣ Origem (transações de pedido)
    if (transaction.origin === 'Pedido') {
      const blockedFields = [
        'amount',
        'type',
        'installmentNumber',
        'totalInstallments',
        'reference',
        'origin'
      ];

      if (blockedFields.includes(field)) {
        return {
          allowed: false,
          reason: 'Este campo deriva do pedido e não pode ser editado. Cancele o pedido para correções.'
        };
      }
    }

    // 3️⃣ Liquidação (campos estruturais)
    const isSettled = ['Pago', 'Recebido'].includes(transaction.status);
    if (isSettled) {
      const structuralFields = [
        'amount',
        'type',
        'dueDate',
        'bankAccountId',
        'effectiveDate'
      ];

      if (structuralFields.includes(field)) {
        return {
          allowed: false,
          reason: 'Este campo não pode ser editado em transação liquidada. Estorne a liquidação primeiro.'
        };
      }
    }

    // 4️⃣ Período fechado
    if (isSettled && transaction.effectiveDate) {
      const { isClosed, period } = isDateInClosedPeriod(transaction.effectiveDate);
      if (isClosed && period) {
        return {
          allowed: false,
          reason: `Período ${period.month}/${period.year} está fechado`
        };
      }
    }

    // 5️⃣ Conciliação
    if (isTransactionReconciled(transaction.effectiveDate, transaction.bankAccountId)) {
      const editableWhenReconciled = [
        'description',
        'categoryId',
        'categoryName',
        'costCenterId',
        'costCenterName'
      ];

      if (!editableWhenReconciled.includes(field)) {
        return {
          allowed: false,
          reason: 'Transação conciliada. Desconcilie para editar.'
        };
      }
    }

    return { allowed: true };
  };

  /**
   * Valida se pode cancelar/deletar
   */
  const canDelete = (transaction: FinancialTransaction): PolicyResult => {
    if (transaction.administrativeStatus === AdministrativeStatus.CANCELADA) {
      return { allowed: false, reason: 'Transação já está cancelada' };
    }

    if (transaction.administrativeStatus === AdministrativeStatus.SUBSTITUIDA) {
      return { allowed: false, reason: 'Transação substituída não pode ser cancelada' };
    }

    const isSettled = ['Pago', 'Recebido'].includes(transaction.status);
    if (isSettled) {
      return {
        allowed: false,
        reason: 'Transação liquidada não pode ser excluída. Estorne a liquidação primeiro.'
      };
    }

    if (transaction.effectiveDate) {
      const { isClosed } = isDateInClosedPeriod(transaction.effectiveDate);
      if (isClosed) {
        return { allowed: false, reason: 'Período fechado' };
      }
    }

    if (isTransactionReconciled(transaction.effectiveDate, transaction.bankAccountId)) {
      return { allowed: false, reason: 'Transação conciliada. Desconcilie primeiro.' };
    }

    return { allowed: true };
  };

  /**
   * Retorna lista de campos bloqueados com motivos
   */
  const getBlockedFields = (
    transaction: FinancialTransaction
  ): Record<string, string> => {
    const blocked: Record<string, string> = {};

    // Campos comuns a verificar
    const fieldsToCheck: (keyof FinancialTransaction)[] = [
      'amount',
      'type',
      'dueDate',
      'categoryId',
      'bankAccountId',
      'description',
      'installmentNumber',
      'totalInstallments'
    ];

    for (const field of fieldsToCheck) {
      const result = canEditField(transaction, field);
      if (!result.allowed) {
        blocked[field] = result.reason || 'Campo bloqueado';
      }
    }

    return blocked;
  };

  return {
    canEditField,
    canDelete,
    getBlockedFields,
    isTransactionReconciled,
    isDateInClosedPeriod
  };
};
