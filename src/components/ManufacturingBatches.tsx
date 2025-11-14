import { PackageCheck } from 'lucide-react';

export function ManufacturingBatches() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <PackageCheck className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Lotes de Fabricação</h1>
        </div>
        <p className="text-gray-500">Gerencie os lotes de produção e rastreabilidade</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <PackageCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Cadastro de Lotes de Fabricação</h3>
        <p className="text-gray-500">
          Cadastre e controle lotes de fabricação para rastreabilidade completa dos produtos manufaturados.
        </p>
      </div>
    </div>
  );
}
