import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function StripeTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('basico');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    { id: 'basico', name: 'Básico', monthlyPrice: 97, yearlyPrice: 970 },
    { id: 'profissional', name: 'Profissional', monthlyPrice: 197, yearlyPrice: 1970 },
    { id: 'empresarial', name: 'Empresarial', monthlyPrice: 397, yearlyPrice: 3970 },
  ];

  const testCheckout = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Obter sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setResult({
          error: 'Você precisa estar logado para testar o checkout',
          details: sessionError?.message
        });
        setLoading(false);
        return;
      }

      const { user } = session;

      // 2. Buscar companyId do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        setResult({
          error: 'Erro ao buscar dados do usuário',
          details: userError?.message
        });
        setLoading(false);
        return;
      }

      // 3. Chamar API de checkout
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            planId: selectedPlan,
            billingCycle: billingCycle,
            userId: user.id,
            companyId: userData.company_id,
            frontendUrl: window.location.origin // 🔥 Enviar URL do frontend
          })
        }
      );

      const data = await response.json();

      setResult({
        success: data.success,
        data: data,
        statusCode: response.status
      });

      // Se sucesso, redirecionar para Stripe
      if (data.success && data.checkoutUrl) {
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 2000);
      }

    } catch (error: any) {
      setResult({
        error: 'Erro ao fazer request',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = plans.find(p => p.id === selectedPlan);
  const price = billingCycle === 'monthly' 
    ? currentPlan?.monthlyPrice 
    : currentPlan?.yearlyPrice;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="mb-2">🧪 Teste do Stripe Checkout</h1>
          <p className="text-gray-600 mb-8">
            Esta página permite testar o fluxo completo de checkout do Stripe
          </p>

          {/* Seleção de Plano */}
          <div className="mb-6">
            <label className="block mb-2">
              Selecione o Plano:
            </label>
            <select 
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}/
                  {billingCycle === 'monthly' ? 'mês' : 'ano'}
                </option>
              ))}
            </select>
          </div>

          {/* Ciclo de Cobrança */}
          <div className="mb-6">
            <label className="block mb-2">
              Ciclo de Cobrança:
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg ${
                  billingCycle === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Anual (economize 2 meses)
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="mb-2">📋 Resumo do Teste</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plano:</span>
                <span className="text-gray-900">{currentPlan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ciclo:</span>
                <span className="text-gray-900">{billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="text-gray-900">R$ {price}</span>
              </div>
            </div>
          </div>

          {/* Botão de Teste */}
          <button
            onClick={testCheckout}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Criando sessão...' : '🚀 Testar Checkout'}
          </button>

          {/* Resultado */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <h3 className="mb-2">
                {result.error ? '❌ Erro' : '✅ Sucesso'}
              </h3>
              <pre className="text-xs overflow-auto p-2 bg-white rounded border">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.success && result.data?.checkoutUrl && (
                <div className="mt-4 p-3 bg-blue-100 rounded">
                  <p className="text-sm">
                    🎉 Redirecionando para o Stripe em 2 segundos...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="mb-4">📚 Como Testar</h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li>
                <strong>1.</strong> Certifique-se de estar logado no sistema
              </li>
              <li>
                <strong>2.</strong> Selecione um plano e ciclo de cobrança
              </li>
              <li>
                <strong>3.</strong> Clique em "Testar Checkout"
              </li>
              <li>
                <strong>4.</strong> Você será redirecionado para o Stripe Checkout
              </li>
              <li>
                <strong>5.</strong> Use um cartão de teste:
                <ul className="ml-6 mt-2 space-y-1">
                  <li>✅ <code className="bg-gray-100 px-2 py-1 rounded">4242 4242 4242 4242</code> - Sucesso</li>
                  <li>❌ <code className="bg-gray-100 px-2 py-1 rounded">4000 0000 0000 0002</code> - Falha</li>
                  <li>🔐 <code className="bg-gray-100 px-2 py-1 rounded">4000 0025 0000 3155</code> - Requer 3D Secure</li>
                </ul>
              </li>
              <li>
                <strong>6.</strong> Data: Qualquer futura (ex: 12/34), CVV: 123
              </li>
              <li>
                <strong>7.</strong> Após pagamento, você será redirecionado de volta
              </li>
              <li>
                <strong>8.</strong> O webhook atualizará a assinatura automaticamente
              </li>
            </ol>
          </div>

          {/* Links Úteis */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <a
              href="https://dashboard.stripe.com/test/payments"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              📊 Ver Pagamentos no Stripe
            </a>
            <a
              href="https://dashboard.stripe.com/test/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              🔔 Ver Webhooks no Stripe
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}