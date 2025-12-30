import React, { useState } from 'react';
import { Lock, Calendar, CheckCircle, AlertCircle, Unlock } from 'lucide-react';
import { useERP } from '../contexts/ERPContext';
import { toast } from 'sonner';

export const ClosedPeriodsManagement: React.FC = () => {
  const { 
    closedPeriods, 
    closePeriod, 
    reopenPeriod, 
    canClosePeriod, 
    getMonthReconciliationStatus 
  } = useERP();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const currentPeriodStatus = getMonthReconciliationStatus(selectedMonth, selectedYear);
  const canClose = canClosePeriod(selectedMonth, selectedYear);
  const isCurrentPeriodClosed = closedPeriods.some(
    p => p.month === selectedMonth && p.year === selectedYear
  );

  const handleClosePeriod = async () => {
    const result = await closePeriod(selectedMonth, selectedYear);
    if (result) {
      toast.success('Período fechado com sucesso!');
    }
  };

  const handleReopenPeriod = async () => {
    const period = closedPeriods.find(
      p => p.month === selectedMonth && p.year === selectedYear
    );
    
    if (!period) return;

    const justification = prompt('Digite a justificativa para reabrir este período:');
    if (!justification || justification.trim().length < 10) {
      toast.error('Justificativa inválida (mínimo 10 caracteres)');
      return;
    }

    const result = await reopenPeriod(period.id, justification);
    if (result) {
      toast.success('Período reaberto com sucesso!');
    }
  };

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

  // Ordenar períodos fechados (mais recente primeiro)
  const sortedClosedPeriods = [...closedPeriods].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg text-gray-900">Gestão de Períodos Contábeis</h3>
          <p className="text-sm text-gray-600">Controle de fechamento de períodos mensais</p>
        </div>
      </div>

      {/* Períodos Fechados */}
      {sortedClosedPeriods.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm text-gray-700">Períodos Fechados:</h4>
          <div className="space-y-2">
            {sortedClosedPeriods.map(period => (
              <div 
                key={period.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-900">
                      {period.month.toString().padStart(2, '0')}/{period.year}
                      {period.firstPeriod && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          Período Inicial
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600">
                      Fechado por {period.closedBy} em {formatDate(period.closedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReopenPeriod}
                  className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Reabrir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seletor de Período */}
      <div className="space-y-3">
        <h4 className="text-sm text-gray-700">Período Atual:</h4>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Status do Período */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Progresso de Conciliação:</span>
            <span className="text-sm text-gray-900">
              {currentPeriodStatus.reconciledDays}/{currentPeriodStatus.totalDays} dias ({currentPeriodStatus.percentage}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                currentPeriodStatus.percentage === 100 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${currentPeriodStatus.percentage}%` }}
            />
          </div>

          {!canClose.canClose && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-900">{canClose.reason}</p>
            </div>
          )}

          {canClose.canClose && !isCurrentPeriodClosed && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-900">
                Este período está pronto para ser fechado
              </p>
            </div>
          )}

          {isCurrentPeriodClosed && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-gray-100 border border-gray-300 rounded">
              <Lock className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-900">
                Este período já está fechado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ação de Fechar Período */}
      {!isCurrentPeriodClosed && (
        <button
          onClick={handleClosePeriod}
          disabled={!canClose.canClose}
          className="w-full px-4 py-3 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Fechar Período {selectedMonth.toString().padStart(2, '0')}/{selectedYear}
        </button>
      )}
    </div>
  );
};
