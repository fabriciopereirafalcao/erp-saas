import { ListTree } from 'lucide-react';

export function ChartOfAccounts() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ListTree className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Plano de Contas</h1>
        </div>
        <p className="text-gray-500">Gerencie a estrutura contábil da empresa</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <ListTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Plano de Contas</h3>
        <p className="text-gray-500">
          Configure a estrutura do plano de contas para organização contábil da empresa.
        </p>
      </div>
    </div>
  );
}
