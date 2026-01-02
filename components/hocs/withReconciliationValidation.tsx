/**
 * ================================================================================
 * HOC - Nível 2: Validação de Conciliações Bancárias
 * ================================================================================
 * 
 * PROTEÇÃO INTERMEDIÁRIA:
 * - Bloqueia edições em transações conciliadas
 * - Permite desconciliação manual (se não estiver em período fechado)
 * - Registra auditoria de desconciliações
 * - Avisos claros sobre impacto nas conciliações
 * 
 * VALIDAÇÕES:
 * 1. Transação está conciliada?
 * 2. Data da transação está em período fechado?
 * 3. Usuário tem permissão para desconciliar?
 * 
 * USO:
 * const ComponentWithValidation = withReconciliationValidation(Component);
 * 
 * PROPS INJETADAS:
 * - validateReconciliation: (action, transaction, onApprove) => void
 */

import React, { ComponentType, useCallback } from 'react';
import { useERP } from '../../contexts/ERPContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Lock, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

export interface ReconciliationValidationProps {
  validateReconciliation?: (
    action: 'create' | 'edit' | 'delete' | 'settle',
    transaction: any,
    onApprove: () => void
  ) => void;
}

interface ReconciliationValidationState {
  showDialog: boolean;
  action: 'create' | 'edit' | 'delete' | 'settle' | null;
  transaction: any;
  onApprove: (() => void) | null;
  reconciliationInfo: {
    isReconciled: boolean;
    reconciliationKey: string;
    canUnconcile: boolean;
    isInClosedPeriod: boolean;
  } | null;
}

export function withReconciliationValidation<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<Omit<P, keyof ReconciliationValidationProps>> {
  return function WithReconciliationValidation(props: Omit<P, keyof ReconciliationValidationProps>) {
    const {
      isTransactionReconciled,
      isMonthClosed,
      getReconciliationKey,
      unconcileDate,
      profile,
      companySettings
    } = useERP();

    const [state, setState] = React.useState<ReconciliationValidationState>({
      showDialog: false,
      action: null,
      transaction: null,
      onApprove: null,
      reconciliationInfo: null
    });

    /**
     * Valida se a operação pode ser executada considerando conciliação
     */
    const validateReconciliation = useCallback((
      action: 'create' | 'edit' | 'delete' | 'settle',
      transaction: any,
      onApprove: () => void
    ) => {
      // Se não tem bankAccountId, não há conciliação - aprovar automaticamente
      if (!transaction.bankAccountId) {
        onApprove();
        return;
      }

      // Verificar se a transação está conciliada
      const isReconciled = isTransactionReconciled(transaction);
      
      // Se não está conciliada, aprovar automaticamente
      if (!isReconciled) {
        onApprove();
        return;
      }

      // Está conciliada - verificar se pode desconciliar
      const transactionDate = new Date(transaction.effectiveDate || transaction.dueDate);
      const isInClosedPeriod = isMonthClosed(transactionDate);
      const reconciliationKey = getReconciliationKey(transaction.bankAccountId, transactionDate);

      // ✅ IMPORTANTE: Se o fluxo chegou até aqui, significa que o Admin já aprovou
      // a reabertura do período no nível 3 (withClosedPeriodValidation).
      // Portanto, NÃO devemos bloquear novamente por período fechado.
      // Se está em período fechado MAS o Admin aprovou, desconciliar automaticamente.
      
      if (isInClosedPeriod) {
        // ✅ Admin já aprovou no nível 3 → Desconciliar automaticamente e prosseguir
        console.log('🔓 [CONCILIAÇÃO] Admin aprovou período fechado - desconciliando automaticamente');
        
        const dateStr = transactionDate.toISOString().split('T')[0];
        
        // Desconciliar em background
        unconcileDate(
          transaction.bankAccountId,
          dateStr,
          {
            reason: 'Desconciliação automática após Admin aprovar operação em período fechado',
            userId: profile?.id || 'system',
            userName: profile?.name || profile?.email || 'Admin',
            action: action,
            transactionId: transaction.id,
            transactionDescription: transaction.description,
            transactionAmount: transaction.amount,
            automatic: true
          }
        ).then((success) => {
          if (success) {
            console.log('✅ [CONCILIAÇÃO] Desconciliado automaticamente com sucesso');
          } else {
            console.error('❌ [CONCILIAÇÃO] Erro ao desconciliar automaticamente');
          }
        });
        
        // Prosseguir imediatamente (não esperar desconciliação)
        onApprove();
        return;
      }

      // Está conciliada mas não está em período fechado - perguntar ao usuário
      setState({
        showDialog: true,
        action,
        transaction,
        onApprove,
        reconciliationInfo: {
          isReconciled: true,
          reconciliationKey,
          canUnconcile: !isInClosedPeriod,
          isInClosedPeriod
        }
      });
    }, [isTransactionReconciled, isMonthClosed, getReconciliationKey]);

    /**
     * Desconcilia e executa a ação
     */
    const handleUnconcileAndProceed = useCallback(async () => {
      if (!state.reconciliationInfo || !state.transaction || !state.onApprove) {
        return;
      }

      // Desconciliar a data
      const transactionDate = new Date(state.transaction.effectiveDate || state.transaction.dueDate);
      const dateStr = transactionDate.toISOString().split('T')[0];
      
      const success = await unconcileDate(
        state.transaction.bankAccountId,
        dateStr,
        {
          reason: 'Desconciliação manual para permitir operação',
          userId: profile?.id || 'system',
          userName: profile?.name || profile?.email || 'Usuário',
          action: state.action || 'edit',
          transactionId: state.transaction.id,
          transactionDescription: state.transaction.description,
          transactionAmount: state.transaction.amount,
          automatic: false
        }
      );

      if (!success) {
        toast.error('❌ Erro ao Desconciliar', {
          description: 'Não foi possível desconciliar a data. Tente novamente.',
          duration: 3000
        });
        return;
      }

      toast.success('✅ Desconciliado com Sucesso', {
        description: 'A transação foi desconciliada. Você pode prosseguir com a operação.',
        duration: 3000
      });

      // Executar ação original
      state.onApprove();

      // Fechar dialog
      setState({
        showDialog: false,
        action: null,
        transaction: null,
        onApprove: null,
        reconciliationInfo: null
      });
    }, [state, unconcileDate, profile]);

    /**
     * Cancela a operação
     */
    const handleCancel = useCallback(() => {
      setState({
        showDialog: false,
        action: null,
        transaction: null,
        onApprove: null,
        reconciliationInfo: null
      });
    }, []);

    /**
     * Texto descritivo da ação
     */
    const getActionText = () => {
      switch (state.action) {
        case 'create': return 'criar esta transação';
        case 'edit': return 'editar esta transação';
        case 'delete': return 'excluir esta transação';
        case 'settle': return 'liquidar esta transação';
        default: return 'realizar esta operação';
      }
    };

    return (
      <>
        <WrappedComponent 
          {...props as P} 
          validateReconciliation={validateReconciliation}
        />

        {/* Dialog de Validação de Conciliação */}
        <Dialog open={state.showDialog} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Transação Conciliada
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Esta transação está vinculada a uma conciliação bancária
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Informações da Transação */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Transação</span>
                  <Badge variant="outline" className="bg-white">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    Conciliada
                  </Badge>
                </div>
                <p className="text-sm font-medium">{state.transaction?.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Valor</span>
                  <span className="font-medium">
                    R$ {state.transaction?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Data</span>
                  <span className="font-medium">
                    {state.transaction?.effectiveDate || state.transaction?.dueDate}
                  </span>
                </div>
                {/* ✅ NOVA INFORMAÇÃO: Conta Bancária */}
                {state.transaction?.bankAccountId && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Conta Bancária</span>
                    <span className="font-medium">
                      {companySettings.bankAccounts.find(b => b.id === state.transaction?.bankAccountId)?.bankName || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              {/* Aviso */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Para {getActionText()}, você precisa desconciliar primeiro.</p>
                  <p className="text-xs text-yellow-700">
                    A conciliação será removida e você precisará reconciliar novamente esta data mais tarde.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={handleUnconcileAndProceed}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Desconciliar e Prosseguir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };
}