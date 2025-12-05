/**
 * Dialog de Carta de Correção Eletrônica (CC-e)
 * 
 * Permite corrigir erros não substanciais em NF-es autorizadas.
 * Conforme NT2012.004 SEFAZ.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle, FileEdit, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface CartaCorrecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfeId: string;
  chaveNFe: string;
  numeroNFe: string;
  emitenteCNPJ: string;
  uf: string;
  onSuccess?: () => void;
}

type Estado = 'form' | 'processando' | 'sucesso' | 'erro';

export function CartaCorrecaoDialog({
  open,
  onOpenChange,
  nfeId,
  chaveNFe,
  numeroNFe,
  emitenteCNPJ,
  uf,
  onSuccess
}: CartaCorrecaoDialogProps) {
  
  const [estado, setEstado] = useState<Estado>('form');
  const [correcao, setCorrecao] = useState('');
  const [sequencia, setSequencia] = useState(1);
  const [ambiente, setAmbiente] = useState<number>(2); // 1=Produção, 2=Homologação
  
  // Resultado
  const [protocolo, setProtocolo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  // Resetar ao abrir
  useEffect(() => {
    if (open) {
      setEstado('form');
      setCorrecao('');
      setSequencia(1);
      setProtocolo('');
      setMensagem('');
      setErro('');
    }
  }, [open]);

  const handleEnviar = async () => {
    // Validações
    if (!correcao.trim()) {
      toast.error('Preencha o texto da correção');
      return;
    }

    if (correcao.length < 15) {
      toast.error('Correção deve ter no mínimo 15 caracteres (requisito SEFAZ)');
      return;
    }

    if (correcao.length > 1000) {
      toast.error('Correção deve ter no máximo 1000 caracteres');
      return;
    }

    if (sequencia < 1 || sequencia > 20) {
      toast.error('Sequência deve estar entre 1 e 20');
      return;
    }

    setEstado('processando');
    console.log('[CC-E_DIALOG] Enviando CC-e...');
    console.log('[CC-E_DIALOG] Chave:', chaveNFe);
    console.log('[CC-E_DIALOG] Sequência:', sequencia);
    console.log('[CC-E_DIALOG] Correção:', correcao ? correcao.substring(0, Math.min(50, correcao.length)) + '...' : 'N/A');

    try {
      // Buscar access token
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado');
      }

      // Chamar endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/carta-correcao`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            nfeId,
            chaveNFe,
            sequencia,
            correcao: correcao.trim(),
            cnpj: emitenteCNPJ,
            uf,
            ambiente
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.mensagem || 'Erro ao enviar CC-e');
      }

      console.log('[CC-E_DIALOG] ✅ CC-e registrada!');
      console.log('[CC-E_DIALOG] Protocolo:', data.data.protocolo);
      
      setProtocolo(data.data.protocolo);
      setMensagem(data.data.mensagem);
      setEstado('sucesso');
      
      toast.success('CC-e registrada com sucesso!');

    } catch (error: any) {
      console.error('[CC-E_DIALOG] Erro:', error);
      setErro(error.message || 'Erro desconhecido');
      setEstado('erro');
      toast.error(`Erro ao enviar CC-e: ${error.message}`);
    }
  };

  const handleFechar = () => {
    if (estado === 'sucesso' && onSuccess) {
      onSuccess();
    }
    onOpenChange(false);
  };

  const caracteresRestantes = 1000 - correcao.length;

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-blue-600" />
            Carta de Correção Eletrônica (CC-e)
          </DialogTitle>
          <DialogDescription>
            NF-e: {numeroNFe} • Chave: {chaveNFe ? `${chaveNFe.substring(0, 10)}...${chaveNFe.substring(34)}` : 'N/A'}
          </DialogDescription>
        </DialogHeader>

        {/* ESTADO: FORMULÁRIO */}
        {estado === 'form' && (
          <div className="space-y-6">
            {/* Alerta Informativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-blue-900">
                    A CC-e permite corrigir erros <strong>não substanciais</strong> após a autorização da NF-e.
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>NÃO pode corrigir:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
                    <li>Valores que impactam impostos (base, alíquota, quantidade, valor)</li>
                    <li>Dados cadastrais que alterem remetente ou destinatário</li>
                    <li>Data de emissão ou saída</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-2">
                    Limite: <strong>20 CC-e</strong> por NF-e
                  </p>
                </div>
              </div>
            </div>

            {/* Sequência */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Sequência da CC-e *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={sequencia}
                onChange={(e) => setSequencia(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número sequencial da CC-e para esta NF-e (1 a 20)
              </p>
            </div>

            {/* Texto da Correção */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Texto da Correção * (15-1000 caracteres)
              </label>
              <Textarea
                value={correcao}
                onChange={(e) => setCorrecao(e.target.value)}
                placeholder="Descreva a correção que deseja fazer na NF-e..."
                className="min-h-[200px] resize-y"
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Mínimo 15 caracteres (requisito SEFAZ)
                </p>
                <p className={`text-xs ${caracteresRestantes < 100 ? 'text-orange-600' : 'text-gray-500'}`}>
                  {correcao.length} / 1000 caracteres
                </p>
              </div>
            </div>

            {/* Ambiente */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Ambiente SEFAZ *
              </label>
              <select
                value={ambiente}
                onChange={(e) => setAmbiente(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2 - Homologação (Testes)</option>
                <option value={1}>1 - Produção</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione o mesmo ambiente em que a NF-e foi autorizada
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleFechar}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleEnviar}
                disabled={correcao.length < 15 || correcao.length > 1000}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileEdit className="w-4 h-4 mr-2" />
                Enviar CC-e
              </Button>
            </div>
          </div>
        )}

        {/* ESTADO: PROCESSANDO */}
        {estado === 'processando' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <div>
              <p className="text-gray-900">Enviando CC-e para SEFAZ...</p>
              <p className="text-sm text-gray-600 mt-2">
                Aguarde enquanto registramos a correção
              </p>
            </div>
          </div>
        )}

        {/* ESTADO: SUCESSO */}
        {estado === 'sucesso' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-green-900 mb-2">CC-e Registrada com Sucesso!</h3>
              <p className="text-sm text-green-800">
                A Carta de Correção foi registrada e vinculada à NF-e
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600">Protocolo do Evento</p>
                <p className="text-sm text-gray-900 font-mono">{protocolo}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-600">Sequência</p>
                <p className="text-sm text-gray-900">{sequencia}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Mensagem SEFAZ</p>
                <p className="text-sm text-gray-900">{mensagem}</p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Correção Aplicada</p>
                <p className="text-sm text-gray-900">{correcao}</p>
              </div>
            </div>

            <Button
              onClick={handleFechar}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluir
            </Button>
          </div>
        )}

        {/* ESTADO: ERRO */}
        {estado === 'erro' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-red-900 mb-2">Erro ao Enviar CC-e</h3>
              <p className="text-sm text-red-800">{erro}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-900">
                <strong>Possíveis causas:</strong>
              </p>
              <ul className="text-xs text-yellow-800 list-disc list-inside mt-2 space-y-1">
                <li>Sequência incorreta (já existe CC-e com esta sequência)</li>
                <li>NF-e cancelada ou inutilizada</li>
                <li>Ambiente diferente do usado na autorização</li>
                <li>Texto da correção com erro de formatação</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleFechar}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={() => setEstado('form')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
