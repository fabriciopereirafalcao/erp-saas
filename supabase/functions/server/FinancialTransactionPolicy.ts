/**
 * ================================================================================
 * BACKEND - Financial Transaction Policy (Validação Centralizada)
 * ================================================================================
 * 
 * RESPONSABILIDADE:
 * - Validar todas as operações sobre transações financeiras
 * - Backend NUNCA confia no frontend
 * - Todas as regras de negócio centralizadas aqui
 * 
 * REGRAS IMPLEMENTADAS:
 * 1. Bloqueio por origem (transações de pedido)
 * 2. Bloqueio por estado administrativo (cancelada/substituída)
 * 3. Bloqueio por liquidação (campos estruturais)
 * 4. Bloqueio por período fechado
 * 5. Bloqueio por conciliação
 * 
 * SEGURANÇA:
 * - Validação server-side obrigatória
 * - Payloads inválidos são rejeitados com razão clara
 * - Logs de tentativas de operação inválida
 */

// Tipos (replicados do frontend para independência)
enum AdministrativeStatus {
  ATIVA = 'ATIVA',
  CANCELADA = 'CANCELADA',
  SUBSTITUIDA = 'SUBSTITUIDA'
}

interface FinancialTransaction {
  id: string;
  type: 'Receita' | 'Despesa';
  amount: number;
  status: 'A Receber' | 'A Pagar' | 'Vencido' | 'Pago' | 'Recebido' | 'Cancelado';
  administrativeStatus?: AdministrativeStatus;
  effectiveDate?: string;
  bankAccountId?: string;
  origin: 'Manual' | 'Pedido';
  reference?: string; // orderId para transações de pedido
  installmentNumber?: number;
  totalInstallments?: number;
  [key: string]: any;
}

interface ClosedPeriod {
  month: number;
  year: number;
  status: 'open' | 'closed';
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Policy centralizada para validação de operações
 */
export class FinancialTransactionPolicy {
  constructor(
    private transaction: FinancialTransaction,
    private user: User,
    private closedPeriods: ClosedPeriod[],
    private reconciledDates: Set<string> // Set de "bankAccountId-date"
  ) {}

  /**
   * Valida se campo específico pode ser editado
   */
  canEditField(field: keyof FinancialTransaction): PolicyResult {
    // 1️⃣ Validação por estado administrativo
    if (this.transaction.administrativeStatus === AdministrativeStatus.CANCELADA) {
      return {
        allowed: false,
        reason: 'Transação cancelada não pode ser editada. Ela está arquivada para auditoria.'
      };
    }

    if (this.transaction.administrativeStatus === AdministrativeStatus.SUBSTITUIDA) {
      return {
        allowed: false,
        reason: 'Transação substituída não pode ser editada. Use a transação substituta.'
      };
    }

    // 2️⃣ Validação por origem (transações de pedido)
    if (this.transaction.origin === 'Pedido') {
      const blockedFieldsForOrders = [
        'amount',
        'type',
        'installmentNumber',
        'totalInstallments',
        'reference',
        'origin'
      ];

      if (blockedFieldsForOrders.includes(field)) {
        return {
          allowed: false,
          reason: `Campo "${field}" deriva do pedido e não pode ser editado. Cancele o pedido para correções estruturais.`
        };
      }
    }

    // 3️⃣ Validação por liquidação (campos estruturais)
    const isSettled = ['Pago', 'Recebido'].includes(this.transaction.status);
    if (isSettled) {
      const structuralFieldsWhenSettled = [
        'amount',
        'type',
        'dueDate',
        'bankAccountId',
        'effectiveDate'
      ];

      if (structuralFieldsWhenSettled.includes(field)) {
        return {
          allowed: false,
          reason: `Campo "${field}" não pode ser editado em transação liquidada. Estorne a liquidação primeiro.`
        };
      }
    }

    // 4️⃣ Validação por período fechado
    if (isSettled && this.transaction.effectiveDate) {
      const { isClosed, period } = this.isDateInClosedPeriod(this.transaction.effectiveDate);
      if (isClosed && period) {
        return {
          allowed: false,
          reason: `Período ${period.month}/${period.year} está fechado. Reabra o período em Conciliações para editar.`
        };
      }
    }

    // 5️⃣ Validação por conciliação
    if (this.isReconciled()) {
      const editableFieldsWhenReconciled = [
        'description',
        'categoryId',
        'categoryName',
        'costCenterId',
        'costCenterName'
      ];

      if (!editableFieldsWhenReconciled.includes(field)) {
        return {
          allowed: false,
          reason: 'Transação conciliada. Desconcilie em Conciliações Bancárias para editar campos estruturais.'
        };
      }
    }

    // ✅ PERMITIDO
    return { allowed: true };
  }

  /**
   * Valida se pode editar a transação (valida todos os campos do payload)
   */
  canEdit(updates: Partial<FinancialTransaction>): PolicyResult {
    // Validar cada campo do payload
    for (const field of Object.keys(updates)) {
      const validation = this.canEditField(field as keyof FinancialTransaction);
      if (!validation.allowed) {
        return validation;
      }
    }

    return { allowed: true };
  }

  /**
   * Valida se pode cancelar
   */
  canCancel(): PolicyResult {
    // Transação já cancelada/substituída
    if (this.transaction.administrativeStatus === AdministrativeStatus.CANCELADA) {
      return {
        allowed: false,
        reason: 'Transação já está cancelada'
      };
    }

    if (this.transaction.administrativeStatus === AdministrativeStatus.SUBSTITUIDA) {
      return {
        allowed: false,
        reason: 'Transação substituída não pode ser cancelada (já foi substituída)'
      };
    }

    // Transação liquidada - requer estorno primeiro
    const isSettled = ['Pago', 'Recebido'].includes(this.transaction.status);
    if (isSettled) {
      return {
        allowed: false,
        reason: 'Transação liquidada não pode ser cancelada diretamente. Estorne a liquidação primeiro.'
      };
    }

    // Período fechado
    if (this.transaction.effectiveDate) {
      const { isClosed, period } = this.isDateInClosedPeriod(this.transaction.effectiveDate);
      if (isClosed && period) {
        return {
          allowed: false,
          reason: `Período ${period.month}/${period.year} está fechado. Reabra o período para cancelar.`
        };
      }
    }

    // Conciliada
    if (this.isReconciled()) {
      return {
        allowed: false,
        reason: 'Transação conciliada. Desconcilie em Conciliações Bancárias para cancelar.'
      };
    }

    // ✅ PERMITIDO
    return { allowed: true };
  }

  /**
   * Valida se pode deletar (mesmas regras de cancelar)
   */
  canDelete(): PolicyResult {
    return this.canCancel(); // Mesmas regras
  }

  /**
   * Valida se pode estornar liquidação
   */
  canReverseLiquidation(): PolicyResult {
    // Só pode estornar se estiver liquidada
    const isSettled = ['Pago', 'Recebido'].includes(this.transaction.status);
    if (!isSettled) {
      return {
        allowed: false,
        reason: 'Transação não está liquidada'
      };
    }

    // Transação cancelada/substituída
    if (this.transaction.administrativeStatus === AdministrativeStatus.CANCELADA) {
      return {
        allowed: false,
        reason: 'Transação cancelada não pode ter liquidação estornada'
      };
    }

    if (this.transaction.administrativeStatus === AdministrativeStatus.SUBSTITUIDA) {
      return {
        allowed: false,
        reason: 'Transação substituída não pode ter liquidação estornada'
      };
    }

    // Período fechado
    if (this.transaction.effectiveDate) {
      const { isClosed, period } = this.isDateInClosedPeriod(this.transaction.effectiveDate);
      if (isClosed && period) {
        return {
          allowed: false,
          reason: `Período ${period.month}/${period.year} está fechado. Reabra o período para estornar.`
        };
      }
    }

    // Conciliada
    if (this.isReconciled()) {
      return {
        allowed: false,
        reason: 'Data conciliada. Desconcilie em Conciliações Bancárias para estornar liquidação.'
      };
    }

    // ✅ PERMITIDO
    return { allowed: true };
  }

  /**
   * Valida se pode substituir (mesmas regras de cancelar)
   */
  canSubstitute(): PolicyResult {
    return this.canCancel();
  }

  /**
   * Helper - verifica se data está em período fechado
   */
  private isDateInClosedPeriod(date: string): { isClosed: boolean; period?: ClosedPeriod } {
    const [year, month] = date.split('-').map(Number);

    const period = this.closedPeriods.find(
      p => p.year === year && p.month === month && p.status === 'closed'
    );

    return {
      isClosed: !!period,
      period
    };
  }

  /**
   * Helper - verifica se está conciliada
   */
  private isReconciled(): boolean {
    if (!this.transaction.effectiveDate || !this.transaction.bankAccountId) {
      return false;
    }

    const key = `${this.transaction.bankAccountId}-${this.transaction.effectiveDate}`;
    return this.reconciledDates.has(key);
  }
}

/**
 * Factory para criar policy (uso nas rotas)
 */
export const createTransactionPolicy = (
  transaction: FinancialTransaction,
  user: User,
  closedPeriods: ClosedPeriod[],
  reconciledDates: string[] // Array de "bankAccountId-date"
): FinancialTransactionPolicy => {
  const reconciledSet = new Set(reconciledDates);
  return new FinancialTransactionPolicy(transaction, user, closedPeriods, reconciledSet);
};
