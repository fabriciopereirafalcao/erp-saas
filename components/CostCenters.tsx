import { Target } from 'lucide-react';

export function CostCenters() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Centros de Custo</h1>
        </div>
        <p className="text-gray-500">Cadastre e organize os centros de custo</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Centros de Custo</h3>
        <p className="text-gray-500">
          Defina centros de custo para melhor controle e análise das despesas da empresa.
        </p>
      </div>
    </div>
  );
}
