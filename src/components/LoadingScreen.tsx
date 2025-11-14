import { Loader2, Package } from 'lucide-react';
import { memo } from 'react';

// ⚡ Memoizado pois não tem props dinâmicas
export const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-20 h-20 bg-green-600 dark:bg-green-500 rounded-xl flex items-center justify-center">
            <Package className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-green-600 dark:text-green-400 animate-spin" />
          <span className="text-lg text-gray-700 dark:text-gray-300">Carregando...</span>
        </div>
      </div>
    </div>
  );
});