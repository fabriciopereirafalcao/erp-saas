/**
 * ================================================================================
 * HOC - Validação de Períodos Fechados (NOVA LÓGICA - BLOQUEIO TOTAL)
 * ================================================================================
 * 
 * MUDANÇA DE ARQUITETURA (Janeiro 2026):
 * 
 * ❌ ANTES: Permitia autenticação administrativa para operar em período fechado
 * ✅ AGORA: Bloqueio total - requer reabertura manual do período
 * 
 * REGRAS DE BLOQUEIO:
 * 1. LIQUIDAÇÃO (settle): SEMPRE bloqueia em período fechado
 * 2. EDITAR transação liquidada: BLOQUEIA em período fechado
 * 3. DELETAR transação liquidada: BLOQUEIA em período fechado
 * 4. CRIAR transação liquidada: BLOQUEIA em período fechado (nova validação)
 * 5. CRIAR transação não liquidada: PERMITIDO (pode ser liquidada depois)
 * 
 * PROCESSO PARA OPERAR EM PERÍODO FECHADO:
 * 1. Admin deve reabrir o período manualmente em Conciliações
 * 2. Realizar operação desejada
 * 3. Reconciliar datas afetadas
 * 4. Fechar período novamente
 */

import React, { useState, ComponentType } from 'react';
import { useERP } from '../contexts/ERPContext';
import { ClosedPeriodBlockDialog } from './ClosedPeriodBlockDialog';
import { isDateInClosedPeriod } from '../utils/closedPeriodValidation';

export interface WithClosedPeriodValidationProps {
  validateBeforeAction?: (
    action: 'create' | 'edit' | 'delete' | 'settle',
    data: any,
    onProceed: () => void
  ) => void;
}

export function withClosedPeriodValidation<P extends object>(
  WrappedComponent: ComponentType<P & WithClosedPeriodValidationProps>
) {
  return function WithClosedPeriodValidationWrapper(props: P) {
    const { closedPeriods } = useERP();

    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [blockedPeriod, setBlockedPeriod] = useState<{
      month: number;
      year: number;
      actionType: 'settle' | 'edit' | 'delete';
    } | null>(null);

    /**
     * Valida se a ação pode ser executada considerando períodos fechados
     */
    const validateBeforeAction = (
      action: 'create' | 'edit' | 'delete' | 'settle',
      data: any,
      onProceed: () => void
    ) => {
      // ✅ REGRA 1: LIQUIDAÇÃO (settle) - validar effectiveDate
      if (action === 'settle') {
        const effectiveDate = data.effectiveDate || data.date;
        if (!effectiveDate) {
          onProceed(); // Sem data, prosseguir
          return;
        }

        const { isClosed, period } = isDateInClosedPeriod(effectiveDate, closedPeriods);
        
        if (isClosed && period) {
          // ⛔ BLOQUEAR - período fechado
          setBlockedPeriod({
            month: period.month,
            year: period.year,
            actionType: 'settle'
          });
          setShowBlockDialog(true);
          return;
        }

        onProceed(); // Período aberto, prosseguir
        return;
      }

      // ✅ REGRA 2: EDITAR transação - bloquear apenas se transação está LIQUIDADA em período fechado
      if (action === 'edit') {
        // Verificar se transação está liquidada
        const isSettled = data.status === 'Recebido' || data.status === 'Pago';
        
        if (!isSettled) {
          onProceed(); // Transação não liquidada, prosseguir
          return;
        }

        // Transação liquidada - validar effectiveDate
        const effectiveDate = data.effectiveDate;
        if (!effectiveDate) {
          onProceed(); // Sem data efetiva, prosseguir
          return;
        }

        const { isClosed, period } = isDateInClosedPeriod(effectiveDate, closedPeriods);
        
        if (isClosed && period) {
          // ⛔ BLOQUEAR - edição de transação liquidada em período fechado
          setBlockedPeriod({
            month: period.month,
            year: period.year,
            actionType: 'edit'
          });
          setShowBlockDialog(true);
          return;
        }

        onProceed(); // Período aberto, prosseguir
        return;
      }

      // ✅ REGRA 3: DELETAR transação - bloquear apenas se transação está LIQUIDADA em período fechado
      if (action === 'delete') {
        // Verificar se transação está liquidada
        const isSettled = data.status === 'Recebido' || data.status === 'Pago';
        
        if (!isSettled) {
          onProceed(); // Transação não liquidada, prosseguir
          return;
        }

        // Transação liquidada - validar effectiveDate
        const effectiveDate = data.effectiveDate;
        if (!effectiveDate) {
          onProceed(); // Sem data efetiva, prosseguir
          return;
        }

        const { isClosed, period } = isDateInClosedPeriod(effectiveDate, closedPeriods);
        
        if (isClosed && period) {
          // ⛔ BLOQUEAR - deleção de transação liquidada em período fechado
          setBlockedPeriod({
            month: period.month,
            year: period.year,
            actionType: 'delete'
          });
          setShowBlockDialog(true);
          return;
        }

        onProceed(); // Período aberto, prosseguir
        return;
      }

      // ✅ REGRA 4: CRIAR transação liquidada: BLOQUEIA em período fechado (nova validação)
      if (action === 'create') {
        // Verificar se transação está sendo criada já liquidada
        const isSettled = data.status === 'Recebido' || data.status === 'Pago';
        
        if (!isSettled) {
          onProceed(); // Transação não liquidada, prosseguir
          return;
        }

        // Transação criada já liquidada - validar effectiveDate
        const effectiveDate = data.effectiveDate;
        if (!effectiveDate) {
          onProceed(); // Sem data efetiva, prosseguir
          return;
        }

        const { isClosed, period } = isDateInClosedPeriod(effectiveDate, closedPeriods);
        
        if (isClosed && period) {
          // ⛔ BLOQUEAR - criação de transação já liquidada em período fechado
          setBlockedPeriod({
            month: period.month,
            year: period.year,
            actionType: 'settle' // Usa 'settle' porque é criação com liquidação
          });
          setShowBlockDialog(true);
          return;
        }

        onProceed(); // Período aberto, prosseguir
        return;
      }

      // Fallback - prosseguir
      onProceed();
    };

    return (
      <>
        <WrappedComponent
          {...props}
          validateBeforeAction={validateBeforeAction}
        />
        
        {/* Dialog de Bloqueio */}
        {blockedPeriod && (
          <ClosedPeriodBlockDialog
            open={showBlockDialog}
            onOpenChange={setShowBlockDialog}
            periodMonth={blockedPeriod.month}
            periodYear={blockedPeriod.year}
            actionType={blockedPeriod.actionType}
          />
        )}
      </>
    );
  };
}

/**
 * Função auxiliar exportada para validar "transação já paga"
 * Usada nos componentes de criação de transação
 */
export function isPaymentDateInClosedPeriod(
  paymentDate: string | Date,
  closedPeriods: any[]
): { isClosed: boolean; period?: { month: number; year: number } } {
  return isDateInClosedPeriod(paymentDate, closedPeriods);
}