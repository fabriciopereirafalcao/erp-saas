/* =========================================================================
 * COMPONENTE DE DEBUG - Visualizar Estado da Assinatura
 * ========================================================================= */

import { useSubscription } from "../contexts/SubscriptionContext";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

export function SubscriptionDebug() {
  const { subscription, loading } = useSubscription();
  const { user, session } = useAuth();

  return (
    <Card className="p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
      <h3 className="font-bold text-lg mb-4 text-purple-900 dark:text-purple-100">
        🔍 DEBUG: Estado da Assinatura
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <strong>User ID:</strong>{" "}
          <code className="bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
            {user?.id || "N/A"}
          </code>
        </div>

        <div>
          <strong>Session:</strong>{" "}
          <Badge variant={session ? "default" : "destructive"}>
            {session ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div>
          <strong>Loading:</strong>{" "}
          <Badge variant={loading ? "secondary" : "default"}>
            {loading ? "Carregando..." : "Carregado"}
          </Badge>
        </div>

        <div>
          <strong>Subscription:</strong>{" "}
          {subscription ? (
            <Badge variant="default" className="bg-green-500">
              Encontrada
            </Badge>
          ) : (
            <Badge variant="destructive">NULL</Badge>
          )}
        </div>

        {subscription && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>
        )}

        {!subscription && !loading && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              ⚠️ PROBLEMA: Assinatura é NULL mesmo após carregar!
            </p>
            <p className="text-red-600 dark:text-red-300 text-xs mt-2">
              Verificar console do navegador (F12) para logs de erro.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-purple-200 dark:border-purple-700">
        <p className="text-xs text-purple-700 dark:text-purple-300">
          <strong>Abra o Console (F12)</strong> e procure por:
          <br />• ⚠️ Assinatura não encontrada
          <br />• ✅ Assinatura padrão criada
          <br />• ❌ Erro ao criar assinatura padrão
          <br />• Erros em vermelho
        </p>
      </div>
    </Card>
  );
}
