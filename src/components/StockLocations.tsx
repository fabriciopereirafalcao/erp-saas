import { Warehouse } from 'lucide-react';

export function StockLocations() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Warehouse className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Locais de Estoque</h1>
        </div>
        <p className="text-gray-500">Cadastre os locais físicos de armazenamento</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Warehouse className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Locais de Estoque</h3>
        <p className="text-gray-500">
          Defina os locais físicos onde os produtos são armazenados (depósitos, prateleiras, etc.).
        </p>
      </div>
    </div>
  );
}
