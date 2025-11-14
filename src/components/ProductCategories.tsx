import { Tags } from 'lucide-react';

export function ProductCategories() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Tags className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Categorias de Produtos</h1>
        </div>
        <p className="text-gray-500">Organize produtos por categorias</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Tags className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Categorias de Produtos</h3>
        <p className="text-gray-500">
          Crie categorias para organizar e classificar os produtos no sistema.
        </p>
      </div>
    </div>
  );
}
