import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, Webhook, Database } from 'lucide-react';

interface WebhookLog {
  id: string;
  event_type: string;
  status: 'success' | 'error' | 'pending';
  timestamp: string;
  data: any;
  error?: string;
}

export default function WebhookDebug() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Simular logs de webhook (em produção, viria do backend)
  const mockLogs: WebhookLog[] = [
    {
      id: '1',
      event_type: 'checkout.session.completed',
      status: 'success',
      timestamp: new Date().toISOString(),
      data: { customer: 'cus_123', subscription: 'sub_456' }
    },
    {
      id: '2',
      event_type: 'customer.subscription.created',
      status: 'success',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      data: { plan: 'Enterprise', status: 'active' }
    }
  ];

  useEffect(() => {
    setLogs(mockLogs);
  }, []);

  const testWebhookEndpoint = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Testar se o endpoint está acessível
      const response = await fetch('/api/stripe/webhook-test', {
        method: 'GET',
      });

      const result = await response.json();
      setTestResult({
        success: response.ok,
        message: response.ok ? 'Webhook endpoint está acessível!' : 'Erro ao acessar endpoint',
        details: result
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: 'Erro de conexão',
        details: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('succeeded') || eventType.includes('completed')) return 'bg-green-100 text-green-800';
    if (eventType.includes('failed') || eventType.includes('deleted')) return 'bg-red-100 text-red-800';
    if (eventType.includes('created')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('updated')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Webhook className="w-8 h-8 text-indigo-600" />
          <div>
            <h1>Stripe Webhooks - Debug & Monitor</h1>
            <p className="text-gray-600">Monitoramento em tempo real dos eventos do Stripe</p>
          </div>
        </div>
        <button
          onClick={() => setLogs([...mockLogs])}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Configuration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Webhook URL</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-mono bg-gray-50 p-2 rounded">
            /make-server-686b5e88/stripe/webhook
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Eventos Configurados</span>
            <span className="text-2xl">6</span>
          </div>
          <p className="text-sm text-gray-500">Subscription + Payment events</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Status do Endpoint</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <button
            onClick={testWebhookEndpoint}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
              {testResult.message}
            </span>
          </div>
          <pre className="text-sm bg-white/50 p-2 rounded overflow-x-auto">
            {JSON.stringify(testResult.details, null, 2)}
          </pre>
        </div>
      )}

      {/* Events Configuration Guide */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="flex items-center gap-2 mb-4">
          <Database className="w-6 h-6 text-indigo-600" />
          Eventos Configurados no Stripe
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">checkout.session.completed</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Checkout finalizado com sucesso</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">customer.subscription.created</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Nova assinatura criada</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">customer.subscription.updated</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Assinatura alterada (upgrade/downgrade)</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">customer.subscription.deleted</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Assinatura cancelada</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">invoice.payment_succeeded</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Pagamento recorrente bem-sucedido</p>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">invoice.payment_failed</span>
            </div>
            <p className="text-xs text-gray-600 ml-6">Pagamento falhou (cartão recusado)</p>
          </div>
        </div>
      </div>

      {/* Webhook Logs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 p-4">
          <h2>Logs Recentes de Webhooks</h2>
          <p className="text-sm text-gray-600">Últimos eventos recebidos do Stripe</p>
        </div>

        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum webhook recebido ainda</p>
              <p className="text-sm">Crie uma assinatura de teste para ver os logs</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${getEventColor(log.event_type)}`}>
                        {log.event_type}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{formatTimestamp(log.timestamp)}</p>
                    </div>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                    Ver dados do evento
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>

                {log.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Erro:</strong> {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-900">Como Testar os Webhooks</span>
        </h3>
        <ol className="text-sm text-yellow-800 space-y-1 ml-6 list-decimal">
          <li>Crie uma assinatura de teste usando o cartão: <code className="bg-white px-1 rounded">4242 4242 4242 4242</code></li>
          <li>Aguarde alguns segundos para o webhook ser processado</li>
          <li>Atualize esta página para ver os logs</li>
          <li>Verifique se os dados da assinatura foram atualizados no banco</li>
        </ol>
      </div>
    </div>
  );
}
