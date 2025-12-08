import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, AlertCircle, Mail, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function EmailSettings() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Verificar se a API key está configurada ao montar
  useEffect(() => {
    checkConfiguration();
  }, []);

  async function checkConfiguration() {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/email/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - Resposta do servidor:', data);
        setIsConfigured(data.configured || false);
        setDebugInfo(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Erro ao verificar configuração:', response.status, errorText);
        toast.error('Erro ao verificar configuração', {
          description: `Status: ${response.status}. Verifique o console para mais detalhes.`,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar configuração:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfigureSecret() {
    toast.info('Abrindo modal de configuração...', {
      description: 'Cole sua API key do Resend no campo que aparecerá',
    });
    
    // Aguarda um pouco para o modal aparecer
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  async function handleTestEmail() {
    if (!testEmail) {
      toast.error('Preencha o email de teste');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Email inválido');
      return;
    }

    setTesting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/email/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ to: testEmail }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar email de teste');
      }

      toast.success('Email de teste enviado!', {
        description: `Verifique a caixa de entrada de ${testEmail}`,
      });

    } catch (error: any) {
      console.error('Erro ao testar email:', error);
      toast.error('Erro ao enviar email de teste', {
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Configuração de Email</h1>
        <p className="text-gray-600">
          Configure o serviço de envio automático de emails usando Resend.
        </p>
      </div>

      <div className="space-y-6">{/* Status da Configuração */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${isConfigured ? 'bg-green-100' : 'bg-amber-100'}`}>
              {isConfigured ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">
                {isConfigured ? 'Email Configurado' : 'Email Não Configurado'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {isConfigured
                  ? 'O serviço de email está ativo. Convites serão enviados automaticamente.'
                  : 'Configure sua API key do Resend para enviar emails automaticamente.'}
              </p>

              {isConfigured ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ Quando você convidar um usuário, o sistema enviará automaticamente um email profissional com o link de convite.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    ⚠️ Sem email configurado, você precisará copiar manualmente o link de convite e enviá-lo aos usuários.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </Card>

        {/* Instruções importantes sobre delay */}
        {!isConfigured && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <strong>⏱️ Importante:</strong> Após configurar a API key, pode levar <strong>1-3 minutos</strong> para o sistema detectar automaticamente. 
              Se já configurou, aguarde um pouco e clique em "🔄 Atualizar Status".
            </AlertDescription>
          </Alert>
        )}

        {/* Formulário de Configuração */}
        {!isConfigured && !loading && (
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">A API Key do Resend não está configurada</h3>
            
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Para configurar a API key:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Certifique-se de ter sua API key do Resend (começa com "re_")</li>
                    <li>Se ainda não tem, crie em <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a></li>
                    <li>Clique no botão abaixo para abrir o modal de configuração</li>
                    <li>Cole sua API key quando solicitado</li>
                    <li>Aguarde alguns segundos e recarregue esta página</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleConfigureSecret}
                className="w-full bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900"
              >
                <Mail className="w-4 h-4 mr-2" />
                Configurar API Key do Resend
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Após configurar, clique em "Atualizar Status" abaixo
              </p>
              
              <Button
                onClick={checkConfiguration}
                variant="outline"
                className="w-full"
              >
                🔄 Atualizar Status
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="text-gray-600">Verificando configuração...</p>
            </div>
          </Card>
        )}

        {/* Teste de Email */}
        {isConfigured && (
          <>
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Testar Envio de Email</h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Envie um email de teste para verificar se tudo está funcionando corretamente.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="testEmail">
                    Email de Teste
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="pl-10"
                      disabled={testing}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleTestEmail}
                  disabled={testing || !testEmail}
                  variant="outline"
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Email de Teste
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Reconfigurar API Key */}
            <Card className="p-6 border-amber-200 bg-amber-50">
              <h3 className="text-amber-900 mb-2">Reconfigurar API Key</h3>
              <p className="text-sm text-amber-800 mb-4">
                Se precisar atualizar ou trocar sua API key do Resend, clique no botão abaixo.
              </p>
              <Button
                onClick={handleConfigureSecret}
                variant="outline"
                className="w-full border-amber-300 hover:bg-amber-100"
              >
                <Mail className="w-4 h-4 mr-2" />
                Reconfigurar API Key do Resend
              </Button>
            </Card>
          </>
        )}

        {/* Informações */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-900 mb-2">Sobre o Resend</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ <strong>Free tier:</strong> 100 emails/dia, 3.000/mês</li>
                <li>✅ <strong>Design profissional:</strong> Templates HTML responsivos</li>
                <li>✅ <strong>Alta deliverability:</strong> Raramente vai para spam</li>
                <li>✅ <strong>Analytics:</strong> Rastreamento de emails enviados</li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-blue-300">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Links úteis:</strong>
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    📄 <a href="https://resend.com/docs" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Documentação do Resend
                    </a>
                  </li>
                  <li>
                    🔑 <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Gerenciar API Keys
                    </a>
                  </li>
                  <li>
                    📊 <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Ver Emails Enviados
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Debug Info - Mostrar informações técnicas */}
        {debugInfo && (
          <Card className="p-6 bg-gray-50 border-gray-300">
            <h4 className="text-gray-900 mb-3">🔧 Informações de Debug</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-600">Configurado:</span>
                <span className={debugInfo.configured ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.configured ? '✅ SIM' : '❌ NÃO'}
                </span>
                
                <span className="text-gray-600">API Key existe:</span>
                <span className={debugInfo.hasKey ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.hasKey ? '✅ SIM' : '❌ NÃO'}
                </span>
                
                <span className="text-gray-600">Prefixo:</span>
                <span className="text-gray-900">{debugInfo.keyPrefix || 'null'}</span>
                
                <span className="text-gray-600">Tamanho:</span>
                <span className="text-gray-900">{debugInfo.keyLength} caracteres</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-gray-700 mb-2"><strong>Variáveis de Ambiente:</strong></p>
                <div className="grid grid-cols-2 gap-2">
                  {debugInfo.allEnvVars && Object.entries(debugInfo.allEnvVars).map(([key, value]) => (
                    <div key={key} className="contents">
                      <span className="text-gray-600">{key}:</span>
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value ? '✅' : '❌'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {debugInfo.debugInfo && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 mb-2"><strong>Runtime:</strong></p>
                  <div className="text-gray-600">
                    <div>Plataforma: {debugInfo.debugInfo.platform}</div>
                    <div>Runtime: {debugInfo.debugInfo.runtime}</div>
                    <div>Timestamp: {new Date(debugInfo.debugInfo.timestamp).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              )}
            </div>
            
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                <strong>Abra o Console do Navegador (F12)</strong> e verifique os logs após clicar em "Atualizar Status". 
                Os logs do servidor mostrarão se a variável RESEND_API_KEY está realmente disponível no runtime do Deno.
              </AlertDescription>
            </Alert>
          </Card>
        )}
      </div>
    </div>
  );
}