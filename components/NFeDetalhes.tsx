/**
 * Página de Detalhes Completos da NF-e
 * Exibe timeline de eventos, dados completos e ações
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  ArrowLeft,
  Download,
  Printer,
  XCircle,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  User,
  Building2,
  DollarSign,
  Truck,
  FileCheck,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { CancelarNFeDialog } from './CancelarNFeDialog';
import { CartaCorrecaoDialog } from './CartaCorrecaoDialog';

interface NFeDetalhesProps {
  nfeId: string;
  onVoltar: () => void;
}

interface NFe {
  id: string;
  chave: string;
  numero: string;
  serie: string;
  modelo: string;
  tipo: string;
  natureza: string;
  
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    ie: string;
    uf: string;
    endereco?: any;
  };
  
  destinatario: {
    tipo: 'pf' | 'pj';
    cpfCnpj: string;
    nome: string;
    email?: string;
    ie?: string;
    telefone?: string;
    endereco: any;
  };
  
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    impostos?: any;
  }>;
  
  valores: {
    totalProdutos: number;
    totalNFe: number;
    baseICMS?: number;
    valorICMS?: number;
    baseICMSST?: number;
    valorICMSST?: number;
    valorIPI?: number;
    valorPIS?: number;
    valorCOFINS?: number;
    valorFrete?: number;
    valorSeguro?: number;
    valorDesconto?: number;
    valorOutros?: number;
  };
  
  transporte?: {
    modalidade: string;
    transportadora?: {
      cnpj?: string;
      nome?: string;
      ie?: string;
      endereco?: string;
    };
    veiculo?: {
      placa?: string;
      uf?: string;
    };
    volumes?: Array<{
      quantidade: number;
      especie?: string;
      marca?: string;
      numeracao?: string;
      pesoLiquido?: number;
      pesoBruto?: number;
    }>;
  };
  
  pagamento?: {
    forma: string;
    valor: number;
    parcelas?: Array<{
      numero: number;
      vencimento: string;
      valor: number;
    }>;
  };
  
  informacoesComplementares?: string;
  informacoesFisco?: string;
  
  status: 'rascunho' | 'emitida' | 'assinada' | 'transmitida' | 'autorizada' | 'rejeitada' | 'cancelada';
  codigoStatus?: string;
  mensagemStatus?: string;
  protocolo?: string;
  dataAutorizacao?: string;
  
  xml?: string;
  xmlAssinado?: string;
  xmlAutorizado?: string;
  
  ambiente: number;
  
  eventos: Array<{
    tipo: 'emissao' | 'assinatura' | 'transmissao' | 'autorizacao' | 'rejeicao' | 'cancelamento' | 'carta_correcao';
    timestamp: string;
    descricao: string;
    codigo?: string;
    dados?: any;
  }>;
  
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  emitida: { label: 'Emitida', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  assinada: { label: 'Assinada', icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  transmitida: { label: 'Transmitida', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  autorizada: { label: 'Autorizada', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  rejeitada: { label: 'Rejeitada', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  cancelada: { label: 'Cancelada', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' }
};

const EVENTO_CONFIG = {
  emissao: { label: 'Emissão', icon: FileText, color: 'text-blue-600' },
  assinatura: { label: 'Assinatura Digital', icon: FileCheck, color: 'text-indigo-600' },
  transmissao: { label: 'Transmissão SEFAZ', icon: Clock, color: 'text-yellow-600' },
  autorizacao: { label: 'Autorização', icon: CheckCircle, color: 'text-green-600' },
  rejeicao: { label: 'Rejeição', icon: XCircle, color: 'text-red-600' },
  cancelamento: { label: 'Cancelamento', icon: AlertCircle, color: 'text-orange-600' },
  carta_correcao: { label: 'Carta de Correção', icon: FileText, color: 'text-purple-600' }
};

export function NFeDetalhes({ nfeId, onVoltar }: NFeDetalhesProps) {
  const [nfe, setNfe] = useState<NFe | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false);
  const [cartaCorrecaoDialogOpen, setCartaCorrecaoDialogOpen] = useState(false);

  useEffect(() => {
    carregarNFe();
  }, [nfeId]);

  const carregarNFe = async () => {
    try {
      setLoading(true);

      // Buscar access token
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/${nfeId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar NF-e');
      }

      setNfe(data.data);
      console.log('[NFE_DETALHES] NF-e carregada:', data.data);

    } catch (error: any) {
      console.error('[NFE_DETALHES] Erro ao carregar:', error);
      toast.error(`Erro ao carregar NF-e: ${error.message}`);
      onVoltar();
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async (tipo: 'original' | 'assinado' | 'autorizado') => {
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/xml/${nfeId}/${tipo}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao baixar XML');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/\"/g, '') || `nfe_${nfeId}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('XML baixado com sucesso!');

    } catch (error: any) {
      console.error('[NFE_DETALHES] Erro ao baixar XML:', error);
      toast.error(`Erro ao baixar XML: ${error.message}`);
    }
  };

  const handleVisualizarDANFE = async () => {
    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/danfe/nfe/${nfeId}`;
      console.log('[NFE_DETALHES] 🖨️ Gerando DANFE para NF-e:', nfeId);
      console.log('[NFE_DETALHES] 🖨️ URL:', url);
      
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        toast.error('Permita pop-ups para visualizar o DANFE');
        return;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('[NFE_DETALHES] 🖨️ Status da resposta:', response.status);
      console.log('[NFE_DETALHES] 🖨️ Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        let errorMessage = 'Erro ao gerar DANFE';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          console.error('[NFE_DETALHES] ❌ Erro JSON:', error);
        } catch {
          const errorText = await response.text();
          console.error('[NFE_DETALHES] ❌ Erro TEXT:', errorText);
          errorMessage = errorText || errorMessage;
        }
        newWindow.close();
        throw new Error(errorMessage);
      }

      const html = await response.text();
      console.log('[NFE_DETALHES] 📄 HTML recebido - Tamanho:', html.length);
      console.log('[NFE_DETALHES] 📄 Início do HTML:', html.substring(0, 100));
      
      if (!html || html.length < 100) {
        newWindow.close();
        throw new Error('HTML vazio ou inválido recebido do servidor');
      }
      
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();

      console.log('[NFE_DETALHES] ✅ DANFE aberto com sucesso');
      toast.success('DANFE aberto em nova aba');

    } catch (error: any) {
      console.error('[NFE_DETALHES] ❌ Erro ao visualizar DANFE:', error);
      toast.error(`Erro ao visualizar DANFE: ${error.message}`);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(32,251,225)]"></div>
            <p className="ml-3 text-gray-600">Carregando detalhes da NF-e...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!nfe) {
    return (
      <div className="p-8">
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>NF-e não encontrada</p>
            <Button onClick={onVoltar} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[nfe.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between">
        <Button onClick={onVoltar} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para lista
        </Button>

        <div className="flex items-center gap-2">
          {nfe.status !== 'rascunho' && (
            <>
              <Button
                onClick={() => handleDownloadXML(nfe.status === 'autorizada' ? 'autorizado' : 'assinado')}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download XML
              </Button>

              {(nfe.status === 'emitida' || nfe.status === 'assinada' || nfe.status === 'autorizada') && (
                <Button
                  onClick={handleVisualizarDANFE}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Visualizar DANFE
                </Button>
              )}

              {nfe.status === 'autorizada' && nfe.protocolo && (
                <>
                  <Button
                    onClick={() => setCancelarDialogOpen(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar NF-e
                  </Button>

                  <Button
                    onClick={() => setCartaCorrecaoDialogOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Carta de Correção
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card principal com informações básicas */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-gray-900">
                NF-e Nº {nfe.serie}-{nfe.numero}
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bg}`}>
                <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                <span className={`text-sm ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              {nfe.ambiente === 2 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                  Homologação
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Modelo {nfe.modelo} • {nfe.natureza}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Emitida em</p>
            <p className="text-gray-900">{formatarData(nfe.createdAt)}</p>
          </div>
        </div>

        {nfe.chave && (
          <div className="bg-gray-50 px-4 py-3 rounded-md mb-4">
            <p className="text-xs text-gray-500 mb-1">Chave de Acesso</p>
            <p className="text-sm text-gray-900 font-mono">{nfe.chave}</p>
          </div>
        )}

        {nfe.protocolo && (
          <div className="bg-green-50 px-4 py-3 rounded-md mb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">Protocolo de Autorização</p>
            </div>
            <p className="text-sm text-green-900 font-mono">{nfe.protocolo}</p>
            {nfe.dataAutorizacao && (
              <p className="text-xs text-green-600 mt-1">
                Autorizada em {formatarData(nfe.dataAutorizacao)}
              </p>
            )}
          </div>
        )}

        {nfe.codigoStatus && nfe.mensagemStatus && (
          <div className={`px-4 py-3 rounded-md ${
            nfe.status === 'rejeitada' ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <p className={`text-sm ${
              nfe.status === 'rejeitada' ? 'text-red-700' : 'text-gray-700'
            }`}>
              {nfe.codigoStatus} - {nfe.mensagemStatus}
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline de Eventos */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-gray-900">Timeline de Eventos</h2>
            </div>

            <div className="space-y-4">
              {nfe.eventos && nfe.eventos.length > 0 ? (
                nfe.eventos.map((evento, index) => {
                  const eventoConfig = EVENTO_CONFIG[evento.tipo];
                  const EventoIcon = eventoConfig?.icon || FileText;

                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full ${
                          evento.tipo === 'autorizacao' ? 'bg-green-100' :
                          evento.tipo === 'rejeicao' ? 'bg-red-100' :
                          evento.tipo === 'cancelamento' ? 'bg-orange-100' :
                          'bg-blue-100'
                        } flex items-center justify-center`}>
                          <EventoIcon className={`w-4 h-4 ${eventoConfig?.color || 'text-gray-600'}`} />
                        </div>
                        {index < nfe.eventos.length - 1 && (
                          <div className="w-px h-full bg-gray-200 my-1"></div>
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <p className={`text-sm ${eventoConfig?.color || 'text-gray-900'}`}>
                          {eventoConfig?.label || evento.tipo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatarData(evento.timestamp)}
                        </p>
                        {evento.descricao && (
                          <p className="text-xs text-gray-600 mt-1">{evento.descricao}</p>
                        )}
                        {evento.codigo && (
                          <p className="text-xs text-gray-500 mt-1">Código: {evento.codigo}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">Nenhum evento registrado</p>
              )}
            </div>
          </Card>
        </div>

        {/* Detalhes principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Emitente e Destinatário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Emitente</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Razão Social</p>
                  <p className="text-sm text-gray-900">{nfe.emitente.razaoSocial}</p>
                </div>
                {nfe.emitente.nomeFantasia && (
                  <div>
                    <p className="text-xs text-gray-500">Nome Fantasia</p>
                    <p className="text-sm text-gray-900">{nfe.emitente.nomeFantasia}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">CNPJ</p>
                  <p className="text-sm text-gray-900">{nfe.emitente.cnpj}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Inscrição Estadual</p>
                  <p className="text-sm text-gray-900">{nfe.emitente.ie}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">UF</p>
                  <p className="text-sm text-gray-900">{nfe.emitente.uf}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Destinatário</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Nome</p>
                  <p className="text-sm text-gray-900">{nfe.destinatario.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{nfe.destinatario.tipo === 'pj' ? 'CNPJ' : 'CPF'}</p>
                  <p className="text-sm text-gray-900">{nfe.destinatario.cpfCnpj}</p>
                </div>
                {nfe.destinatario.ie && (
                  <div>
                    <p className="text-xs text-gray-500">Inscrição Estadual</p>
                    <p className="text-sm text-gray-900">{nfe.destinatario.ie}</p>
                  </div>
                )}
                {nfe.destinatario.email && (
                  <div>
                    <p className="text-xs text-gray-500">E-mail</p>
                    <p className="text-sm text-gray-900">{nfe.destinatario.email}</p>
                  </div>
                )}
                {nfe.destinatario.telefone && (
                  <div>
                    <p className="text-xs text-gray-500">Telefone</p>
                    <p className="text-sm text-gray-900">{nfe.destinatario.telefone}</p>
                  </div>
                )}
                {nfe.destinatario.endereco && (
                  <div>
                    <p className="text-xs text-gray-500">Endereço</p>
                    <p className="text-sm text-gray-900">
                      {nfe.destinatario.endereco.logradouro}, {nfe.destinatario.endereco.numero}
                      {nfe.destinatario.endereco.complemento && `, ${nfe.destinatario.endereco.complemento}`}
                      <br />
                      {nfe.destinatario.endereco.bairro} - {nfe.destinatario.endereco.municipio}/{nfe.destinatario.endereco.uf}
                      <br />
                      CEP: {nfe.destinatario.endereco.cep}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Produtos */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Produtos e Serviços</h3>
            </div>

            {nfe.produtos && nfe.produtos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-600">Código</th>
                      <th className="text-left py-2 text-gray-600">Descrição</th>
                      <th className="text-left py-2 text-gray-600">NCM</th>
                      <th className="text-left py-2 text-gray-600">CFOP</th>
                      <th className="text-right py-2 text-gray-600">Qtd</th>
                      <th className="text-right py-2 text-gray-600">Unitário</th>
                      <th className="text-right py-2 text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nfe.produtos.map((produto, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 text-gray-900">{produto.codigo}</td>
                        <td className="py-2 text-gray-900">{produto.descricao}</td>
                        <td className="py-2 text-gray-900">{produto.ncm}</td>
                        <td className="py-2 text-gray-900">{produto.cfop}</td>
                        <td className="py-2 text-right text-gray-900">
                          {produto.quantidade} {produto.unidade}
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          {formatarValor(produto.valorUnitario)}
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          {formatarValor(produto.valorTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum produto cadastrado</p>
            )}
          </Card>

          {/* Valores e Impostos */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Valores e Impostos</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total dos Produtos</p>
                <p className="text-gray-900">{formatarValor(nfe.valores.totalProdutos)}</p>
              </div>

              {nfe.valores.valorDesconto && nfe.valores.valorDesconto > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Desconto</p>
                  <p className="text-red-600">-{formatarValor(nfe.valores.valorDesconto)}</p>
                </div>
              )}

              {nfe.valores.valorFrete && nfe.valores.valorFrete > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Frete</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorFrete)}</p>
                </div>
              )}

              {nfe.valores.valorSeguro && nfe.valores.valorSeguro > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Seguro</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorSeguro)}</p>
                </div>
              )}

              {nfe.valores.valorOutros && nfe.valores.valorOutros > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Outras Despesas</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorOutros)}</p>
                </div>
              )}

              {nfe.valores.valorICMS && nfe.valores.valorICMS > 0 && (
                <div>
                  <p className="text-xs text-gray-500">ICMS</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorICMS)}</p>
                </div>
              )}

              {nfe.valores.valorICMSST && nfe.valores.valorICMSST > 0 && (
                <div>
                  <p className="text-xs text-gray-500">ICMS ST</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorICMSST)}</p>
                </div>
              )}

              {nfe.valores.valorIPI && nfe.valores.valorIPI > 0 && (
                <div>
                  <p className="text-xs text-gray-500">IPI</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorIPI)}</p>
                </div>
              )}

              {nfe.valores.valorPIS && nfe.valores.valorPIS > 0 && (
                <div>
                  <p className="text-xs text-gray-500">PIS</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorPIS)}</p>
                </div>
              )}

              {nfe.valores.valorCOFINS && nfe.valores.valorCOFINS > 0 && (
                <div>
                  <p className="text-xs text-gray-500">COFINS</p>
                  <p className="text-gray-900">{formatarValor(nfe.valores.valorCOFINS)}</p>
                </div>
              )}

              <div className="col-span-2 md:col-span-3 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Total da NF-e</p>
                <p className="text-2xl text-gray-900">{formatarValor(nfe.valores.totalNFe)}</p>
              </div>
            </div>
          </Card>

          {/* Transporte */}
          {nfe.transporte && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Transporte</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Modalidade de Frete</p>
                  <p className="text-sm text-gray-900">{nfe.transporte.modalidade}</p>
                </div>

                {nfe.transporte.transportadora && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Transportadora</p>
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      {nfe.transporte.transportadora.nome && (
                        <div>
                          <p className="text-xs text-gray-500">Nome</p>
                          <p className="text-sm text-gray-900">{nfe.transporte.transportadora.nome}</p>
                        </div>
                      )}
                      {nfe.transporte.transportadora.cnpj && (
                        <div>
                          <p className="text-xs text-gray-500">CNPJ</p>
                          <p className="text-sm text-gray-900">{nfe.transporte.transportadora.cnpj}</p>
                        </div>
                      )}
                      {nfe.transporte.transportadora.ie && (
                        <div>
                          <p className="text-xs text-gray-500">IE</p>
                          <p className="text-sm text-gray-900">{nfe.transporte.transportadora.ie}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {nfe.transporte.veiculo && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Veículo</p>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-900">
                        Placa: {nfe.transporte.veiculo.placa} / UF: {nfe.transporte.veiculo.uf}
                      </p>
                    </div>
                  </div>
                )}

                {nfe.transporte.volumes && nfe.transporte.volumes.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Volumes</p>
                    {nfe.transporte.volumes.map((volume, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md mb-2">
                        <p className="text-sm text-gray-900">
                          Quantidade: {volume.quantidade}
                          {volume.especie && ` • Espécie: ${volume.especie}`}
                          {volume.marca && ` • Marca: ${volume.marca}`}
                          {volume.pesoLiquido && ` • Peso Líquido: ${volume.pesoLiquido}kg`}
                          {volume.pesoBruto && ` • Peso Bruto: ${volume.pesoBruto}kg`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Pagamento */}
          {nfe.pagamento && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Pagamento</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Forma de Pagamento</p>
                  <p className="text-sm text-gray-900">{nfe.pagamento.forma}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="text-gray-900">{formatarValor(nfe.pagamento.valor)}</p>
                </div>

                {nfe.pagamento.parcelas && nfe.pagamento.parcelas.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Parcelas</p>
                    <div className="space-y-2">
                      {nfe.pagamento.parcelas.map((parcela, index) => (
                        <div key={index} className="flex justify-between bg-gray-50 p-3 rounded-md">
                          <span className="text-sm text-gray-900">
                            Parcela {parcela.numero} - Venc: {new Date(parcela.vencimento).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-sm text-gray-900">{formatarValor(parcela.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Informações Complementares */}
          {(nfe.informacoesComplementares || nfe.informacoesFisco) && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Informações Complementares</h3>
              </div>

              <div className="space-y-4">
                {nfe.informacoesComplementares && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Informações Adicionais</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {nfe.informacoesComplementares}
                    </p>
                  </div>
                )}

                {nfe.informacoesFisco && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Informações ao Fisco</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {nfe.informacoesFisco}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {nfe.status === 'autorizada' && nfe.protocolo && (
        <>
          <CancelarNFeDialog
            open={cancelarDialogOpen}
            onOpenChange={setCancelarDialogOpen}
            nfeId={nfe.id}
            chaveNFe={nfe.chave}
            protocolo={nfe.protocolo}
            numeroNFe={`${nfe.serie}-${nfe.numero}`}
            dataAutorizacao={nfe.dataAutorizacao}
            emitenteCNPJ={nfe.emitente.cnpj}
            uf={nfe.emitente.uf}
            onSuccess={() => {
              setCancelarDialogOpen(false);
              carregarNFe();
            }}
          />

          <CartaCorrecaoDialog
            open={cartaCorrecaoDialogOpen}
            onOpenChange={setCartaCorrecaoDialogOpen}
            nfeId={nfe.id}
            chaveNFe={nfe.chave}
            numeroNFe={`${nfe.serie}-${nfe.numero}`}
            emitenteCNPJ={nfe.emitente.cnpj}
            uf={nfe.emitente.uf}
            onSuccess={() => {
              setCartaCorrecaoDialogOpen(false);
              carregarNFe();
            }}
          />
        </>
      )}
    </div>
  );
}
