import { ShoppingBag } from 'lucide-react';

export function Buyers() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Compradores</h1>
        </div>
        <p className="text-gray-500">Cadastre e gerencie a equipe de compras</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Cadastro de Compradores</h3>
        <p className="text-gray-500">
          Registre os compradores responsáveis pelas aquisições da empresa.
        </p>
      </div>
    </div>
  );
}
