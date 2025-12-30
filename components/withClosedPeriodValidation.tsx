/**
 * HOC - Higher Order Component para validação de períodos fechados
 * Envolve componentes de transações financeiras com validação automática
 */

import React, { useState, ComponentType } from 'react';
import { useERP } from '../contexts/ERPContext';
import { ClosedPeriodModals } from './ClosedPeriodModals';
import { 
  isDateInClosedPeriod, 
  getActionDescription, 
  getAffectedDates,
  calculateTransactionImpact 
} from '../utils/closedPeriodValidation';
import { toast } from 'sonner';

export interface WithClosedPeriodValidationProps {
  validateBeforeAction?: (
    action: 'create' | 'edit' | 'delete',
    data: any,
    onProceed: () => void
  ) => void;
}

export function withClosedPeriodValidation<P extends object>(
  WrappedComponent: ComponentType<P & WithClosedPeriodValidationProps>
) {
  return function WithClosedPeriodValidationWrapper(props: P) {
    const { 
      closedPeriods, 
      recordClosedPeriodAdjustment 
    } = useERP();

    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [closedPeriodData, setClosedPeriodData] = useState<{
      month: number;
      year: number;
      closedBy: string;
      closedAt: string;
      periodId: string;
    } | null>(null);
    const [pendingAction, setPendingAction] = useState<{
      type: 'create' | 'edit' | 'delete';
      data: any;
      onProceed: () => void;
    } | null>(null);
    const [actionDescription, setActionDescription] = useState('');

    const validateBeforeAction = (
      action: 'create' | 'edit' | 'delete',
      data: any,
      onProceed: () => void
    ) => {
      // Verificar se a data está em período fechado
      const dateToCheck = data.date || data.effectiveDate || new Date();
      const { isClosed, period } = isDateInClosedPeriod(dateToCheck, closedPeriods);

      if (!isClosed || !period) {
        // Período não fechado, prosseguir normalmente
        onProceed();
        return;
      }

      // Período fechado - mostrar modal de bloqueio
      setClosedPeriodData({
        month: period.month,
        year: period.year,
        closedBy: period.closedBy,
        closedAt: period.closedAt,
        periodId: period.id
      });

      const description = getActionDescription(
        action,
        data.type || 'Despesa',
        data.description || 'Transação',
        data.amount
      );
      setActionDescription(description);

      setPendingAction({ type: action, data, onProceed });
      setShowBlockModal(true);
    };

    const handleAdminAccess = () => {
      setShowBlockModal(false);
      setShowAuthModal(true);
    };

    const handleConfirmAuth = async (justification: string) => {
      if (!pendingAction || !closedPeriodData) return;

      try {
        // Registrar ajuste em auditoria
        const affectedDates = getAffectedDates(pendingAction.data, pendingAction.type);
        const impact = calculateTransactionImpact(pendingAction.data);

        const adjustmentType = 
          pendingAction.type === 'create' ? 'transaction_created' :
          pendingAction.type === 'edit' ? 'transaction_edited' :
          'transaction_deleted';

        await recordClosedPeriodAdjustment(
          closedPeriodData.periodId,
          adjustmentType,
          pendingAction.data.id || 'new-transaction',
          pendingAction.data.description || 'Transação',
          justification,
          affectedDates,
          impact
        );

        // Prosseguir com a ação
        pendingAction.onProceed();

        toast.success('Ajuste registrado em auditoria', {
          description: 'A transação foi processada e registrada em período fechado'
        });

        // Limpar estados
        setShowAuthModal(false);
        setClosedPeriodData(null);
        setPendingAction(null);
        setActionDescription('');

      } catch (error) {
        console.error('[CLOSED PERIOD] Erro ao processar ajuste:', error);
        toast.error('Erro ao processar ajuste em período fechado');
      }
    };

    return (
      <>
        <WrappedComponent
          {...props}
          validateBeforeAction={validateBeforeAction}
        />
        
        <ClosedPeriodModals
          showBlockModal={showBlockModal}
          showAuthModal={showAuthModal}
          closedPeriodData={closedPeriodData}
          actionDescription={actionDescription}
          onCloseBlockModal={() => {
            setShowBlockModal(false);
            setPendingAction(null);
          }}
          onAdminAccess={handleAdminAccess}
          onCloseAuthModal={() => {
            setShowAuthModal(false);
            setPendingAction(null);
          }}
          onConfirmAuth={handleConfirmAuth}
        />
      </>
    );
  };
}
