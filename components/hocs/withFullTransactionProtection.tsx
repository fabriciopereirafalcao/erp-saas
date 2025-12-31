/**
 * ================================================================================
 * HOC - Proteção Completa de Transações (3 Níveis)
 * ================================================================================
 * 
 * COMBINA OS 3 NÍVEIS DE PROTEÇÃO:
 * - Nível 3: Períodos Fechados (bloqueio total)
 * - Nível 2: Conciliações Bancárias (desconciliação com auditoria)
 * - Nível 1: Avisos de Impacto (informativo)
 * 
 * ORDEM DE VALIDAÇÃO:
 * 1. Primeiro: Períodos Fechados (bloqueio absoluto)
 * 2. Segundo: Conciliações (bloqueio com opção de desconciliar)
 * 3. Terceiro: Avisos (apenas informativo)
 * 
 * USO SIMPLIFICADO:
 * const ProtectedComponent = withFullTransactionProtection(Component);
 * 
 * PROPS INJETADAS:
 * - validateBeforeAction: (action, transaction, onApprove) => void
 *   Esta função única orquestra os 3 níveis de validação
 */

import React, { ComponentType, useCallback } from 'react';
import { useERP } from '../../contexts/ERPContext';
import { withClosedPeriodValidation, ClosedPeriodValidationProps } from './withClosedPeriodValidation';
import { withReconciliationValidation, ReconciliationValidationProps } from './withReconciliationValidation';
import { withReconciliationWarning, ReconciliationWarningProps } from './withReconciliationWarning';

export interface FullTransactionProtectionProps {
  validateBeforeAction?: (
    action: 'create' | 'edit' | 'delete' | 'settle',
    transaction: any,
    onApprove: () => void
  ) => void;
}

/**
 * HOC que combina os 3 níveis de proteção em uma única validação
 */
export function withFullTransactionProtection<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<Omit<P, keyof FullTransactionProtectionProps>> {
  
  // Componente interno que orquestra as validações
  function FullProtectionOrchestrator(
    props: P & 
      ClosedPeriodValidationProps & 
      ReconciliationValidationProps & 
      ReconciliationWarningProps
  ) {
    const {
      validateBeforeAction: validateClosedPeriod,
      validateReconciliation,
      warnReconciliationImpact,
      ...restProps
    } = props;

    /**
     * Função unificada que executa as 3 validações em cascata
     */
    const validateBeforeAction = useCallback((
      action: 'create' | 'edit' | 'delete' | 'settle',
      transaction: any,
      onApprove: () => void
    ) => {
      // NÍVEL 3: Períodos Fechados (mais crítico)
      // Se estiver em período fechado, bloqueia totalmente
      if (validateClosedPeriod) {
        validateClosedPeriod(action, transaction, () => {
          
          // NÍVEL 2: Conciliações Bancárias (intermediário)
          // Se passou do nível 3, verifica conciliação
          if (validateReconciliation) {
            validateReconciliation(action, transaction, () => {
              
              // NÍVEL 1: Avisos de Impacto (informativo)
              // Se passou dos níveis 3 e 2, mostra avisos se necessário
              if (warnReconciliationImpact) {
                warnReconciliationImpact(action, transaction, onApprove);
              } else {
                onApprove();
              }
            });
          } else {
            // Se não tem validação de conciliação, pula para avisos
            if (warnReconciliationImpact) {
              warnReconciliationImpact(action, transaction, onApprove);
            } else {
              onApprove();
            }
          }
        });
      } else {
        // Se não tem validação de período fechado, pula para conciliação
        if (validateReconciliation) {
          validateReconciliation(action, transaction, () => {
            if (warnReconciliationImpact) {
              warnReconciliationImpact(action, transaction, onApprove);
            } else {
              onApprove();
            }
          });
        } else {
          // Se não tem validação de conciliação, pula para avisos
          if (warnReconciliationImpact) {
            warnReconciliationImpact(action, transaction, onApprove);
          } else {
            onApprove();
          }
        }
      }
    }, [validateClosedPeriod, validateReconciliation, warnReconciliationImpact]);

    return (
      <WrappedComponent 
        {...restProps as P} 
        validateBeforeAction={validateBeforeAction}
      />
    );
  }

  // Aplicar os 3 HOCs em sequência (de fora para dentro: 3 -> 2 -> 1)
  const WithLevel3 = withClosedPeriodValidation(FullProtectionOrchestrator);
  const WithLevel2 = withReconciliationValidation(WithLevel3);
  const WithLevel1 = withReconciliationWarning(WithLevel2);

  return WithLevel1 as ComponentType<Omit<P, keyof FullTransactionProtectionProps>>;
}

/**
 * EXEMPLO DE USO:
 * 
 * // No componente:
 * const ProtectedTransactions = withFullTransactionProtection(FinancialTransactions);
 * 
 * // Dentro do componente:
 * function FinancialTransactions({ validateBeforeAction }) {
 *   const handleCreate = (transaction) => {
 *     validateBeforeAction('create', transaction, () => {
 *       // Só executa se passar pelas 3 validações
 *       addFinancialTransaction(transaction);
 *       toast.success('Transação criada!');
 *     });
 *   };
 * }
 * 
 * FLUXO DE VALIDAÇÃO:
 * 1. validateBeforeAction('create', transaction, callback)
 * 2. → Nível 3: Período fechado? 
 *    → SIM: Bloqueia (dialog de autenticação Admin)
 *    → NÃO: Continua para nível 2
 * 3. → Nível 2: Está conciliada?
 *    → SIM: Bloqueia (dialog para desconciliar)
 *    → NÃO: Continua para nível 1
 * 4. → Nível 1: Tem impacto em conciliações?
 *    → SIM: Avisa (dialog informativo)
 *    → NÃO: Executa callback
 * 5. → Callback executado: addFinancialTransaction()
 */
