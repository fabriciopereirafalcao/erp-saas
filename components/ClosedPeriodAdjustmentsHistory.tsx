import React, { useState } from 'react';
import { AlertTriangle, Lock, Calendar, User, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useERP } from '../contexts/ERPContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

export const ClosedPeriodAdjustmentsHistory: React.FC = () => {
  const { closedPeriodAdjustments, closedPeriods } = useERP();
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  // Ordenar ajustes por data (mais recente primeiro)
  const sortedAdjustments = [...closedPeriodAdjustments].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filtrar ajustes
  const filteredAdjustments = sortedAdjustments.filter(adj => {
    if (filterMonth !== 'all' && adj.month !== filterMonth) return false;
    if (filterYear !== 'all' && adj.year !== filterYear) return false;
    return true;
  });

  // Extrair anos únicos dos períodos fechados
  const uniqueYears = Array.from(
    new Set(closedPeriods.map(p => p.year))
  ).sort((a, b) => b - a);

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'transaction_created':
        return 'Criação';
      case 'transaction_edited':
        return 'Edição';
      case 'transaction_deleted':
        return 'Exclusão';
      default:
        return type;
    }
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'transaction_created':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'transaction_edited':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'transaction_deleted':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (closedPeriods.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Nenhum período foi fechado ainda</p>
          <p className="text-sm mt-2">
            Feche períodos contábeis para começar a rastrear ajustes
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg text-gray-900">Histórico de Ajustes em Períodos Fechados</h3>
          <p className="text-sm text-gray-600">
            Trilha de auditoria completa de todas as alterações em períodos contábeis fechados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Mês:</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Ano:</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          {filteredAdjustments.length} {filteredAdjustments.length === 1 ? 'ajuste' : 'ajustes'}
        </div>
      </div>

      {/* Lista de Ajustes */}
      {filteredAdjustments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Nenhum ajuste encontrado com os filtros selecionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAdjustments.map((adjustment) => (
            <div
              key={adjustment.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Header do Ajuste */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={getAdjustmentTypeColor(adjustment.adjustmentType)}>
                        {getAdjustmentTypeLabel(adjustment.adjustmentType)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Período: {adjustment.month.toString().padStart(2, '0')}/{adjustment.year}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">
                      {adjustment.transactionDescription}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  {format(new Date(adjustment.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Admin:</span>
                  <span className="text-gray-900">{adjustment.adminUser}</span>
                </div>

                {adjustment.affectedDates.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Datas afetadas:</span>
                    <span className="text-gray-900">
                      {adjustment.affectedDates.map(d => 
                        format(new Date(d), 'dd/MM/yyyy')
                      ).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Impacto Financeiro */}
              {adjustment.impactSummary && Object.keys(adjustment.impactSummary).length > 0 && (
                <div className="flex items-center gap-4 text-sm mb-3 p-2 bg-gray-50 rounded">
                  {adjustment.impactSummary.oldBalance !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Anterior:</span>
                      <span className="text-gray-900">
                        R$ {adjustment.impactSummary.oldBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {adjustment.impactSummary.newBalance !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Novo:</span>
                      <span className="text-gray-900">
                        R$ {adjustment.impactSummary.newBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {adjustment.impactSummary.difference !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Diferença:</span>
                      <span className={adjustment.impactSummary.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                        R$ {Math.abs(adjustment.impactSummary.difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Justificativa */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-600 mb-1">Justificativa:</p>
                <p className="text-sm text-gray-900 italic bg-yellow-50 p-2 rounded border border-yellow-200">
                  "{adjustment.justification}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      {filteredAdjustments.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl text-green-600">
                {filteredAdjustments.filter(a => a.adjustmentType === 'transaction_created').length}
              </p>
              <p className="text-xs text-gray-600">Criações</p>
            </div>
            <div>
              <p className="text-2xl text-yellow-600">
                {filteredAdjustments.filter(a => a.adjustmentType === 'transaction_edited').length}
              </p>
              <p className="text-xs text-gray-600">Edições</p>
            </div>
            <div>
              <p className="text-2xl text-red-600">
                {filteredAdjustments.filter(a => a.adjustmentType === 'transaction_deleted').length}
              </p>
              <p className="text-xs text-gray-600">Exclusões</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
