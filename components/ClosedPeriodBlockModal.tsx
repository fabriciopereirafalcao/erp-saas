import React, { useState } from 'react';
import { X, Lock, AlertTriangle } from 'lucide-react';

interface ClosedPeriodBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminAccess: () => void;
  periodMonth: number;
  periodYear: number;
  closedBy: string;
  closedAt: string;
}

export const ClosedPeriodBlockModal: React.FC<ClosedPeriodBlockModalProps> = ({
  isOpen,
  onClose,
  onAdminAccess,
  periodMonth,
  periodYear,
  closedBy,
  closedAt
}) => {
  if (!isOpen) return null;

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg text-gray-900">PERÍODO FECHADO</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-900">
                  Esta transação está no período <strong>{periodMonth.toString().padStart(2, '0')}/{periodYear}</strong> que foi fechado.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fechado por:</span>
              <span className="text-gray-900">{closedBy}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Em:</span>
              <span className="text-gray-900">{formatDate(closedAt)}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              ⚠️ <strong>Apenas Administradores</strong> podem realizar ajustes em períodos fechados.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onAdminAccess}
            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sou Administrador
          </button>
        </div>
      </div>
    </div>
  );
};
