import React, { useState } from 'react';
import { X, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
  periodMonth: number;
  periodYear: number;
  actionDescription: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  periodMonth,
  periodYear,
  actionDescription
}) => {
  const [password, setPassword] = useState('');
  const [justification, setJustification] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Validações
    if (!password.trim()) {
      toast.error('Digite sua senha de administrador');
      return;
    }

    if (!justification.trim()) {
      toast.error('A justificativa é obrigatória');
      return;
    }

    if (justification.trim().length < 10) {
      toast.error('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    if (!confirmed) {
      toast.error('Você deve confirmar que tem autorização');
      return;
    }

    setIsLoading(true);

    // TODO: Validar senha do admin via backend
    // Por enquanto, aceitar qualquer senha (em produção isso deve ser validado)
    setTimeout(() => {
      setIsLoading(false);
      onConfirm(justification);
      
      // Limpar campos
      setPassword('');
      setJustification('');
      setConfirmed(false);
    }, 500);
  };

  const handleClose = () => {
    setPassword('');
    setJustification('');
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg text-gray-900">AUTENTICAÇÃO ADMINISTRATIVA</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm text-yellow-900">
                  Você está ajustando o período fechado <strong>{periodMonth.toString().padStart(2, '0')}/{periodYear}</strong>
                </p>
                <p className="text-sm text-yellow-800">
                  {actionDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="admin-password" className="block text-sm text-gray-700 mb-2">
              Digite sua senha de administrador: <span className="text-red-500">*</span>
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Justification Field */}
          <div>
            <label htmlFor="justification" className="block text-sm text-gray-700 mb-2">
              Justificativa (obrigatória): <span className="text-red-500">*</span>
            </label>
            <textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descreva detalhadamente o motivo deste ajuste em período fechado..."
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {justification.length} caracteres (mínimo: 10)
            </p>
          </div>

          {/* Audit Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  i
                </div>
              </div>
              <p className="text-sm text-blue-900">
                Esta ação será registrada em auditoria especial com timestamp, usuário e justificativa completa.
              </p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="confirm-auth"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="confirm-auth" className="text-sm text-gray-700 cursor-pointer select-none">
              Confirmo que tenho autorização para realizar ajustes em períodos fechados e estou ciente das implicações desta ação.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !password || !justification || !confirmed}
            className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmar Ajuste
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
