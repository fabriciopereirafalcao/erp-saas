/**
 * Componente de Listagem de NF-es Emitidas
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Download, 
  Eye, 
  FileText, 
  Search, 
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { CancelarNFeDialog } from './CancelarNFeDialog';
import { CartaCorrecaoDialog } from './CartaCorrecaoDialog';
import { NFeDetalhes } from './NFeDetalhes';

interface NFeSummary {
  id: string;
  chave: string;
  numero: string;
  serie: string;
  modelo: string;
  natureza: string;
  emitente?: {
    cnpj: string;
    razaoSocial: string;
    uf: string;
  };
  destinatario: {
    nome: string;
    cpfCnpj: string;
  };
  valores: {
    totalProdutos: number;
    totalNFe: number;
  };
  status: 'rascunho' | 'emitida' | 'assinada' | 'transmitida' | 'autorizada' | 'rejeitada' | 'cancelada';
  codigoStatus?: string;
  mensagemStatus?: string;
  protocolo?: string;
  dataAutorizacao?: string;
  ambiente: number;
  createdAt: string;
  updatedAt: string;
  totalEventos: number;
}

interface NFeListProps {
  onRefresh?: () => void;
}

const STATUS_CONFIG = {
  rascunho: {
    label: 'Rascunho',
    icon: FileText,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300'
  },
  emitida: {
    label: 'Emitida',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300'
  },
  assinada: {
    label: 'Assinada',
    icon: CheckCircle,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300'
  },
  transmitida: {
    label: 'Transmitida',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300'
  },
  autorizada: {
    label: 'Autorizada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-300'
  },
  rejeitada: {
    label: 'Rejeitada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300'
  },
  cancelada: {
    label: 'Cancelada',
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300'
  }
};

export function NFeList({ onRefresh }: NFeListProps) {
  const [nfes, setNfes] = useState<NFeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroDestinatario, setFiltroDestinatario] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Estado para visualização de detalhes
  const [nfeIdDetalhes, setNfeIdDetalhes] = useState<string | null>(null);
  
  // Estado do dialog de cancelamento
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false);
  const [nfeSelecionada, setNfeSelecionada] = useState<NFeSummary | null>(null);

  // Estado do dialog de carta de correção
  const [cartaCorrecaoDialogOpen, setCartaCorrecaoDialogOpen] = useState(false);
  const [nfeSelecionadaCartaCorrecao, setNfeSelecionadaCartaCorrecao] = useState<NFeSummary | null>(null);

  useEffect(() => {
    carregarNFes();
  }, [filtroStatus, filtroDestinatario, filtroDataInicio, filtroDataFim]);

  const carregarNFes = async () => {
    try {
      setLoading(true);

      // Buscar access token
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      // Construir query params
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      if (filtroDestinatario) params.append('destinatario', filtroDestinatario);
      if (filtroDataInicio) params.append('dataInicio', filtroDataInicio);
      if (filtroDataFim) params.append('dataFim', filtroDataFim);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/listar?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar NF-es');
      }

      // API retorna { success: true, data: [...], count: N }
      setNfes(data.data || []);
      console.log(`[NFE_LIST] ${data.count || 0} NF-es carregadas`);

    } catch (error: any) {
      console.error('[NFE_LIST] Erro ao carregar:', error);
      toast.error(`Erro ao carregar NF-es: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async (nfeId: string, tipo: 'original' | 'assinado' | 'autorizado') => {
    try {
      // Buscar access token
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

      // Download do arquivo
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
      console.error('[NFE_LIST] Erro ao baixar XML:', error);
      toast.error(`Erro ao baixar XML: ${error.message}`);
    }
  };

  const handleVisualizarDANFE = async (nfeId: string) => {
    try {
      // Buscar access token
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/danfe/nfe/${nfeId}`;
      console.log('[NFE_LIST] 🖨️ Gerando DANFE para NF-e:', nfeId);
      console.log('[NFE_LIST] 🖨️ URL:', url);
      
      // Abrir em nova aba
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        toast.error('Permita pop-ups para visualizar o DANFE');
        return;
      }

      // Buscar HTML do DANFE
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('[NFE_LIST] 🖨️ Status da resposta:', response.status);
      console.log('[NFE_LIST] 🖨️ Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        let errorMessage = 'Erro ao gerar DANFE';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
          console.error('[NFE_LIST] ❌ Erro JSON:', error);
        } catch {
          const errorText = await response.text();
          console.error('[NFE_LIST] ❌ Erro TEXT:', errorText);
          errorMessage = errorText || errorMessage;
        }
        newWindow.close();
        throw new Error(errorMessage);
      }

      const html = await response.text();
      console.log('[NFE_LIST] 📄 HTML recebido - Tamanho:', html.length);
      console.log('[NFE_LIST] 📄 Início do HTML:', html.substring(0, 100));
      
      if (!html || html.length < 100) {
        newWindow.close();
        throw new Error('HTML vazio ou inválido recebido do servidor');
      }
      
      // Escrever HTML na nova janela
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();

      console.log('[NFE_LIST] ✅ DANFE aberto com sucesso');
      toast.success('DANFE aberto em nova aba');

    } catch (error: any) {
      console.error('[NFE_LIST] ❌ Erro ao visualizar DANFE:', error);
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
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const nfesFiltradas = nfes;

  // Se houver uma NF-e selecionada para detalhes, mostrar página de detalhes
  if (nfeIdDetalhes) {
    return (
      <NFeDetalhes 
        nfeId={nfeIdDetalhes} 
        onVoltar={() => {
          setNfeIdDetalhes(null);
          carregarNFes(); // Recarregar lista ao voltar
        }} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(32,251,225)]"
            >
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="emitida">Emitida</option>
              <option value="assinada">Assinada</option>
              <option value="transmitida">Transmitida</option>
              <option value="autorizada">Autorizada</option>
              <option value="rejeitada">Rejeitada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Destinatário</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={filtroDestinatario}
                onChange={(e) => setFiltroDestinatario(e.target.value)}
                placeholder="Nome ou CPF/CNPJ"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {loading ? 'Carregando...' : `${nfesFiltradas.length} nota(s) fiscal(is) encontrada(s)`}
          </p>
          <Button
            onClick={carregarNFes}
            variant="outline"
            size="sm"
          >
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Lista de NF-es */}
      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(32,251,225)]"></div>
            <p className="ml-3 text-gray-600">Carregando notas fiscais...</p>
          </div>
        </Card>
      ) : nfesFiltradas.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhuma nota fiscal encontrada</p>
            <p className="text-sm mt-1">Emita sua primeira NF-e para começar</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {nfesFiltradas.map((nfe) => {
            const statusConfig = STATUS_CONFIG[nfe.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={nfe.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bg} border ${statusConfig.border}`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <span className={`text-sm ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <span className="text-sm text-gray-500">
                        NFe {nfe.serie}-{nfe.numero}
                      </span>

                      {nfe.ambiente === 2 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                          Homologação
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Destinatário</p>
                        <p className="text-gray-900">{nfe.destinatario?.nome || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{nfe.destinatario?.cpfCnpj || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Valor Total</p>
                        <p className="text-lg text-gray-900">{formatarValor(nfe.valores?.totalNFe || 0)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Data Emissão</p>
                        <p className="text-gray-900">{formatarData(nfe.createdAt)}</p>
                      </div>
                    </div>

                    {nfe.protocolo && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
                        <CheckCircle className="w-3 h-3" />
                        <span>Protocolo: {nfe.protocolo}</span>
                        {nfe.dataAutorizacao && (
                          <span className="ml-2">• Autorizada em {formatarData(nfe.dataAutorizacao)}</span>
                        )}
                      </div>
                    )}

                    {nfe.codigoStatus && nfe.mensagemStatus && (
                      <div className={`text-xs px-3 py-2 rounded mt-2 ${
                        nfe.status === 'rejeitada' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <span>{nfe.codigoStatus} - {nfe.mensagemStatus}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNfeIdDetalhes(nfe.id)}
                      className="whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detalhes
                    </Button>

                    {nfe.status !== 'rascunho' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadXML(nfe.id, nfe.status === 'autorizada' ? 'autorizado' : 'assinado')}
                        className="whitespace-nowrap"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        XML
                      </Button>
                    )}
                    
                    {/* Botão de DANFE - Somente para NF-es emitidas, assinadas ou autorizadas */}
                    {(nfe.status === 'emitida' || nfe.status === 'assinada' || nfe.status === 'autorizada') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVisualizarDANFE(nfe.id)}
                        className="whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        DANFE
                      </Button>
                    )}
                    
                    {/* Botão de Cancelamento - Somente para NF-es autorizadas */}
                    {nfe.status === 'autorizada' && nfe.protocolo && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setNfeSelecionada(nfe);
                          setCancelarDialogOpen(true);
                        }}
                        className="whitespace-nowrap"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    )}

                    {/* Botão de Carta de Correção - Somente para NF-es autorizadas */}
                    {nfe.status === 'autorizada' && nfe.protocolo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNfeSelecionadaCartaCorrecao(nfe);
                          setCartaCorrecaoDialogOpen(true);
                        }}
                        className="whitespace-nowrap"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Carta de Correção
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Dialog de Cancelamento */}
      {nfeSelecionada && (
        <CancelarNFeDialog
          open={cancelarDialogOpen}
          onOpenChange={setCancelarDialogOpen}
          nfeId={nfeSelecionada.id}
          chaveNFe={nfeSelecionada.chave}
          protocolo={nfeSelecionada.protocolo || ''}
          numeroNFe={`${nfeSelecionada.serie}-${nfeSelecionada.numero}`}
          dataAutorizacao={nfeSelecionada.dataAutorizacao}
          emitenteCNPJ={nfeSelecionada.emitente?.cnpj || ''}
          uf={nfeSelecionada.emitente?.uf || nfeSelecionada.chave?.substring(0, 2) || 'SP'}
          onSuccess={() => {
            setCancelarDialogOpen(false);
            setNfeSelecionada(null);
            carregarNFes(); // Recarregar lista
          }}
        />
      )}

      {/* Dialog de Carta de Correção */}
      {nfeSelecionadaCartaCorrecao && (
        <CartaCorrecaoDialog
          open={cartaCorrecaoDialogOpen}
          onOpenChange={setCartaCorrecaoDialogOpen}
          nfeId={nfeSelecionadaCartaCorrecao.id}
          chaveNFe={nfeSelecionadaCartaCorrecao.chave}
          numeroNFe={`${nfeSelecionadaCartaCorrecao.serie}-${nfeSelecionadaCartaCorrecao.numero}`}
          emitenteCNPJ={nfeSelecionadaCartaCorrecao.emitente?.cnpj || ''}
          uf={nfeSelecionadaCartaCorrecao.emitente?.uf || nfeSelecionadaCartaCorrecao.chave?.substring(0, 2) || 'SP'}
          onSuccess={() => {
            setCartaCorrecaoDialogOpen(false);
            setNfeSelecionadaCartaCorrecao(null);
            carregarNFes(); // Recarregar lista
          }}
        />
      )}
    </div>
  );
}