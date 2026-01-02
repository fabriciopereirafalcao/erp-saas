/**
 * ================================================================================
 * Dialog de Bloqueio de Período Fechado (Sem Autenticação)
 * ================================================================================
 * 
 * NOVA LÓGICA:
 * - Bloqueia totalmente liquidação em período fechado
 * - Não permite autenticação administrativa
 * - Orienta usuário a reabrir o período manualmente
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Lock, AlertCircle } from 'lucide-react';

interface ClosedPeriodBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodMonth: number;
  periodYear: number;
  actionType: 'settle' | 'edit' | 'delete';
}

export function ClosedPeriodBlockDialog({
  open,
  onOpenChange,
  periodMonth,
  periodYear,
  actionType
}: ClosedPeriodBlockDialogProps) {
  const periodLabel = `${periodMonth.toString().padStart(2, '0')}/${periodYear}`;
  
  const actionText = {
    settle: 'liquidar',
    edit: 'editar',
    delete: 'deletar'
  }[actionType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                ⛔ Período Fechado
              </DialogTitle>
              <DialogDescription className="text-sm">
                Operação bloqueada em período contábil fechado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Período */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">
                  O período <span className="font-bold">{periodLabel}</span> está fechado e não permite novas movimentações financeiras.
                </p>
                <p className="text-xs text-red-700 mb-2">
                  Não é possível {actionText} transações em períodos fechados.
                </p>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📋 Como prosseguir:
            </p>
            <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
              <li>Acesse <strong>Conciliações {'>'} Períodos Fechados</strong></li>
              <li>Clique em <strong>Reabrir Período</strong></li>
              <li>Informe senha e justificativa administrativa</li>
              <li>Realize a operação desejada</li>
              <li>Reconcilie as datas afetadas</li>
              <li>Feche o período novamente</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            OK, Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
