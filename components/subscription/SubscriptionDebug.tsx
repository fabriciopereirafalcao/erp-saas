import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Database, AlertTriangle } from 'lucide-react';

export default function SubscriptionDebug() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar token do Supabase
      const supabaseAuth = localStorage.getItem('sb-wnvijmacgzfnwfqbvkrq-auth-token');
      let accessToken = '';
      
      if (supabaseAuth) {
        try {
          const authData = JSON.parse(supabaseAuth);
          accessToken = authData?.access_token || '';
        } catch (e) {
          console.error('Erro ao parsear token:', e);
        }
      }

      // Buscar dados do KV store
      const projectId = 'wnvijmacgzfnwfqbvkrq';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/debug`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h1>Debug de Assinatura</h1>
            <p className="text-gray-600">Verificar dados salvos no banco</p>
          </div>
        </div>
        <button
          onClick={fetchSubscriptionData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-blue-800">Carregando dados...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">Erro ao carregar dados</span>
          </div>
          <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
            {error}
          </pre>
        </div>
      )}

      {/* Data */}
      {data && !loading && (
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2">
                {data.hasSubscription ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                )}
                Status da Assinatura
              </h2>
              <span className={`px-3 py-1 rounded text-sm ${
                data.hasSubscription 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {data.hasSubscription ? 'Ativa' : 'Não Encontrada'}
              </span>
            </div>

            {data.hasSubscription ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Customer ID</span>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {data.customerId || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Subscription ID</span>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {data.subscriptionId || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Plano</span>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {data.plan || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status</span>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {data.status || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Nenhuma assinatura encontrada para este usuário</p>
                <p className="text-sm mt-2">Complete um checkout para criar uma assinatura</p>
              </div>
            )}
          </div>

          {/* Raw Data */}
          <details className="bg-gray-50 border border-gray-200 rounded-lg">
            <summary className="p-4 cursor-pointer hover:bg-gray-100 transition">
              <span className="font-medium">Ver dados brutos (JSON)</span>
            </summary>
            <pre className="p-4 text-sm overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span className="text-blue-900">Como Testar</span>
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 ml-6 list-decimal">
              <li>Acesse <code className="bg-white px-1 rounded">#stripeTest</code></li>
              <li>Complete um checkout com cartão de teste</li>
              <li>Volte para esta página e clique em "Atualizar"</li>
              <li>Verifique se a assinatura aparece acima</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
