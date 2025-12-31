/**
 * ================================================================================
 * HOC - Nível 1: Avisos de Modificação de Transações Conciliadas
 * ================================================================================
 * 
 * PROTEÇÃO BÁSICA (Avisos):
 * - Avisa sobre transações que podem impactar conciliações futuras
 * - Não bloqueia, apenas informa
 * - Útil para criar consciência sobre impactos
 * - Pode ser usado em conjunto com outros níveis
 * 
 * CASOS DE USO:
 * 1. Criar transação em data futura que já está conciliada
 * 2. Editar transação que pode quebrar saldos conciliados
 * 3. Alertar sobre impactos em fluxo de caixa
 * 
 * USO:
 * const ComponentWithWarning = withReconciliationWarning(Component);
 * 
 * PROPS INJETADAS:
 * - warnReconciliationImpact: (action, transaction, onApprove) => void
 */

import React, { ComponentType, useCallback } from 'react';
import { useERP } from '../../contexts/ERPContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Info, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface ReconciliationWarningProps {
  warnReconciliationImpact?: (
    action: 'create' | 'edit' | 'delete' | 'settle',
    transaction: any,
    onApprove: () => void
  ) => void;
}

interface ReconciliationWarningState {
  showDialog: boolean;
  action: 'create' | 'edit' | 'delete' | 'settle' | null;
  transaction: any;
  onApprove: (() => void) | null;
  impactInfo: {
    affectedDates: string[];
    affectedAccounts: string[];
    estimatedImpact: number;
  } | null;
}

export function withReconciliationWarning<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<Omit<P, keyof ReconciliationWarningProps>> {
  return function WithReconciliationWarning(props: Omit<P, keyof ReconciliationWarningProps>) {
    const {
      isTransactionReconciled,
      getReconciliationKey,
      companySettings,
      financialTransactions
    } = useERP();

    const [state, setState] = React.useState<ReconciliationWarningState>({
      showDialog: false,
      action: null,
      transaction: null,
      onApprove: null,
      impactInfo: null
    });

    /**
     * Calcula o impacto da operação em conciliações
     */
    const calculateImpact = useCallback((transaction: any) => {
      if (!transaction.bankAccountId) {
        return null;
      }

      const transactionDate = new Date(transaction.effectiveDate || transaction.dueDate);
      const dateKey = getReconciliationKey(transaction.bankAccountId, transactionDate);

      // Buscar conta bancária
      const bankAccount = companySettings?.bankAccounts?.find(
        acc => acc.id === transaction.bankAccountId
      );

      // Calcular transações futuras que podem ser afetadas
      const futureTransactions = (financialTransactions || []).filter(txn => {
        if (!txn.bankAccountId || txn.bankAccountId !== transaction.bankAccountId) {
          return false;
        }
        const txnDate = new Date(txn.effectiveDate || txn.dueDate);
        return txnDate > transactionDate && isTransactionReconciled(txn);
      });

      const affectedDates = Array.from(
        new Set(
          futureTransactions.map(txn => 
            new Date(txn.effectiveDate || txn.dueDate).toLocaleDateString('pt-BR')
          )
        )
      );

      return {
        affectedDates,
        affectedAccounts: bankAccount ? [bankAccount.bankName] : [],
        estimatedImpact: transaction.amount
      };
    }, [companySettings, financialTransactions, getReconciliationKey, isTransactionReconciled]);

    /**
     * Avisa sobre impacto em conciliações
     */
    const warnReconciliationImpact = useCallback((
      action: 'create' | 'edit' | 'delete' | 'settle',
      transaction: any,
      onApprove: () => void
    ) => {
      // Se não tem bankAccountId, não há impacto
      if (!transaction.bankAccountId) {
        onApprove();
        return;
      }

      // Calcular impacto
      const impact = calculateImpact(transaction);

      // Se não há impacto significativo, aprovar automaticamente
      if (!impact || impact.affectedDates.length === 0) {
        onApprove();
        return;
      }

      // Mostrar aviso
      setState({
        showDialog: true,
        action,
        transaction,
        onApprove,
        impactInfo: impact
      });
    }, [calculateImpact]);

    /**
     * Continua com a operação
     */
    const handleProceed = useCallback(() => {
      if (state.onApprove) {
        state.onApprove();
      }

      setState({
        showDialog: false,
        action: null,
        transaction: null,
        onApprove: null,
        impactInfo: null
      });
    }, [state]);

    /**
     * Cancela a operação
     */
    const handleCancel = useCallback(() => {
      setState({
        showDialog: false,
        action: null,
        transaction: null,
        onApprove: null,
        impactInfo: null
      });
    }, []);

    /**
     * Texto descritivo da ação
     */
    const getActionText = () => {
      switch (state.action) {
        case 'create': return 'criação';
        case 'edit': return 'edição';
        case 'delete': return 'exclusão';
        case 'settle': return 'liquidação';
        default: return 'operação';
      }
    };

    return (
      <>
        <WrappedComponent 
          {...props as P} 
          warnReconciliationImpact={warnReconciliationImpact}
        />

        {/* Dialog de Aviso de Impacto */}
        <Dialog open={state.showDialog} onOpenChange={(open) => !open && handleCancel()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Impacto em Conciliações
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Esta operação pode afetar conciliações existentes
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Informações da Operação */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Operação</span>
                  <Badge variant="outline" className="bg-white capitalize">
                    {getActionText()}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{state.transaction?.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Valor</span>
                  <span className="font-medium">
                    R$ {state.transaction?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Impacto Estimado */}
              {state.impactInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Impacto Estimado</span>
                  </div>
                  
                  {state.impactInfo.affectedAccounts.length > 0 && (
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Contas Afetadas:</span>
                      <ul className="mt-1 ml-4 list-disc">
                        {state.impactInfo.affectedAccounts.map((account, idx) => (
                          <li key={idx}>{account}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {state.impactInfo.affectedDates.length > 0 && (
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Datas com Conciliações:</span>
                      <ul className="mt-1 ml-4 list-disc">
                        {state.impactInfo.affectedDates.slice(0, 3).map((date, idx) => (
                          <li key={idx}>{date}</li>
                        ))}
                        {state.impactInfo.affectedDates.length > 3 && (
                          <li className="text-xs italic">
                            +{state.impactInfo.affectedDates.length - 3} outras datas
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Recomendação */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Recomendação</p>
                  <p className="text-xs text-yellow-700">
                    Após esta operação, recomendamos revisar as conciliações bancárias 
                    das datas afetadas para garantir que os saldos permaneçam corretos.
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
                onClick={handleProceed}
              >
                Continuar Mesmo Assim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };
}
