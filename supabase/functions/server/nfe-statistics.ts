/**
 * ============================================================================
 * MÓDULO: Estatísticas Fiscais de NF-es
 * ============================================================================
 * Responsável por agregar dados e gerar estatísticas das NF-es
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as kv from './kv_store.tsx';

const nfeStatistics = new Hono();

// ============================================================================
// TIPOS
// ============================================================================

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
  };
  
  destinatario: {
    tipo: 'pf' | 'pj';
    cpfCnpj: string;
    nome: string;
    email?: string;
    endereco: any;
  };
  
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
  };
  
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
    tipo: 'emissao' | 'assinatura' | 'transmissao' | 'autorizacao' | 'rejeicao' | 'cancelamento';
    timestamp: string;
    descricao: string;
    codigo?: string;
    dados?: any;
  }>;
  
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface Estatisticas {
  resumo: {
    totalNFes: number;
    totalAutorizadas: number;
    totalRejeitadas: number;
    totalCanceladas: number;
    totalRascunhos: number;
    valorTotalProdutos: number;
    valorTotalNFes: number;
    valorTotalImpostos: number;
    ticketMedio: number;
  };
  
  evolucao: Array<{
    data: string;
    quantidade: number;
    valorTotal: number;
    autorizadas: number;
    rejeitadas: number;
  }>;
  
  distribuicaoStatus: Array<{
    status: string;
    quantidade: number;
    percentual: number;
    valor: number;
  }>;
  
  topDestinatarios: Array<{
    nome: string;
    cpfCnpj: string;
    quantidade: number;
    valorTotal: number;
  }>;
  
  impostos: {
    icms: number;
    icmsST: number;
    ipi: number;
    pis: number;
    cofins: number;
    total: number;
  };
  
  periodo: {
    inicio: string;
    fim: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getIndexKey(userId: string): string {
  return `nfe_index:${userId}`;
}

function getNFeKey(userId: string, nfeId: string): string {
  return `nfe:${userId}:${nfeId}`;
}

/**
 * Formata data para string YYYY-MM-DD
 */
function formatarData(data: Date): string {
  return data.toISOString().split('T')[0];
}

/**
 * Calcula a data N dias atrás
 */
function calcularDataAtras(dias: number): Date {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(0, 0, 0, 0);
  return data;
}

/**
 * Gera array de datas entre início e fim
 */
function gerarArrayDatas(inicio: Date, fim: Date): string[] {
  const datas: string[] = [];
  const atual = new Date(inicio);
  
  while (atual <= fim) {
    datas.push(formatarData(atual));
    atual.setDate(atual.getDate() + 1);
  }
  
  return datas;
}

// ============================================================================
// GET /nfe/estatisticas
// Descrição: Retorna estatísticas agregadas das NF-es
// Query params:
//   - periodo: '7d' | '30d' | '90d' | 'custom' (padrão: '30d')
//   - dataInicio: string (formato: YYYY-MM-DD, obrigatório se periodo='custom')
//   - dataFim: string (formato: YYYY-MM-DD, obrigatório se periodo='custom')
// ============================================================================
nfeStatistics.get('/nfe/estatisticas', async (c) => {
  try {
    console.log('[NFE_STATISTICS] GET /nfe/estatisticas - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Parâmetros de período
    const periodo = c.req.query('periodo') || '30d';
    let dataInicio: Date;
    let dataFim: Date = new Date();
    dataFim.setHours(23, 59, 59, 999);
    
    if (periodo === 'custom') {
      const dataInicioStr = c.req.query('dataInicio');
      const dataFimStr = c.req.query('dataFim');
      
      if (!dataInicioStr || !dataFimStr) {
        return c.json({ 
          success: false, 
          error: 'dataInicio e dataFim são obrigatórios para período customizado' 
        }, 400);
      }
      
      dataInicio = new Date(dataInicioStr);
      dataFim = new Date(dataFimStr);
    } else {
      // Períodos pré-definidos
      const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;
      dataInicio = calcularDataAtras(dias);
    }
    
    console.log(`[NFE_STATISTICS] Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`);
    
    // 3. Buscar índice de NF-es
    const indexKey = getIndexKey(user.id);
    const index = await kv.get<string[]>(indexKey) || [];
    
    console.log(`[NFE_STATISTICS] Total de NF-es no índice: ${index.length}`);
    
    // 4. Buscar e filtrar NF-es do período
    const nfes: NFe[] = [];
    for (const nfeId of index) {
      const nfeKey = getNFeKey(user.id, nfeId);
      const nfe = await kv.get<NFe>(nfeKey);
      
      if (nfe) {
        const nfeData = new Date(nfe.createdAt);
        
        // Filtrar por período
        if (nfeData >= dataInicio && nfeData <= dataFim) {
          nfes.push(nfe);
        }
      }
    }
    
    console.log(`[NFE_STATISTICS] NF-es no período: ${nfes.length}`);
    
    // 5. Calcular estatísticas
    const estatisticas: Estatisticas = calcularEstatisticas(nfes, dataInicio, dataFim);
    
    console.log(`[NFE_STATISTICS] Estatísticas calculadas - Total: ${estatisticas.resumo.totalNFes}`);
    
    return c.json({
      success: true,
      data: estatisticas
    });
    
  } catch (error) {
    console.error('[NFE_STATISTICS] Erro ao calcular estatísticas:', error);
    return c.json({
      success: false,
      error: `Erro ao calcular estatísticas: ${error.message}`
    }, 500);
  }
});

// ============================================================================
// FUNÇÕES DE CÁLCULO
// ============================================================================

/**
 * Calcula todas as estatísticas das NF-es
 */
function calcularEstatisticas(nfes: NFe[], dataInicio: Date, dataFim: Date): Estatisticas {
  // 1. RESUMO GERAL
  const totalNFes = nfes.length;
  const totalAutorizadas = nfes.filter(n => n.status === 'autorizada').length;
  const totalRejeitadas = nfes.filter(n => n.status === 'rejeitada').length;
  const totalCanceladas = nfes.filter(n => n.status === 'cancelada').length;
  const totalRascunhos = nfes.filter(n => n.status === 'rascunho').length;
  
  const valorTotalProdutos = nfes.reduce((sum, n) => sum + (n.valores.totalProdutos || 0), 0);
  const valorTotalNFes = nfes.reduce((sum, n) => sum + (n.valores.totalNFe || 0), 0);
  
  const icmsTotal = nfes.reduce((sum, n) => sum + (n.valores.valorICMS || 0), 0);
  const icmsSTTotal = nfes.reduce((sum, n) => sum + (n.valores.valorICMSST || 0), 0);
  const ipiTotal = nfes.reduce((sum, n) => sum + (n.valores.valorIPI || 0), 0);
  const pisTotal = nfes.reduce((sum, n) => sum + (n.valores.valorPIS || 0), 0);
  const cofinsTotal = nfes.reduce((sum, n) => sum + (n.valores.valorCOFINS || 0), 0);
  
  const valorTotalImpostos = icmsTotal + icmsSTTotal + ipiTotal + pisTotal + cofinsTotal;
  
  const ticketMedio = totalNFes > 0 ? valorTotalNFes / totalNFes : 0;
  
  // 2. EVOLUÇÃO TEMPORAL
  const datas = gerarArrayDatas(dataInicio, dataFim);
  const evolucao = datas.map(data => {
    const nfesDoDia = nfes.filter(n => {
      const nfeData = formatarData(new Date(n.createdAt));
      return nfeData === data;
    });
    
    return {
      data,
      quantidade: nfesDoDia.length,
      valorTotal: nfesDoDia.reduce((sum, n) => sum + (n.valores.totalNFe || 0), 0),
      autorizadas: nfesDoDia.filter(n => n.status === 'autorizada').length,
      rejeitadas: nfesDoDia.filter(n => n.status === 'rejeitada').length
    };
  });
  
  // 3. DISTRIBUIÇÃO POR STATUS
  const statusMap = new Map<string, { quantidade: number; valor: number }>();
  
  for (const nfe of nfes) {
    const status = nfe.status;
    const atual = statusMap.get(status) || { quantidade: 0, valor: 0 };
    
    statusMap.set(status, {
      quantidade: atual.quantidade + 1,
      valor: atual.valor + (nfe.valores.totalNFe || 0)
    });
  }
  
  const distribuicaoStatus = Array.from(statusMap.entries()).map(([status, dados]) => ({
    status,
    quantidade: dados.quantidade,
    percentual: totalNFes > 0 ? (dados.quantidade / totalNFes) * 100 : 0,
    valor: dados.valor
  })).sort((a, b) => b.quantidade - a.quantidade);
  
  // 4. TOP DESTINATÁRIOS
  const destinatariosMap = new Map<string, {
    nome: string;
    cpfCnpj: string;
    quantidade: number;
    valorTotal: number;
  }>();
  
  for (const nfe of nfes) {
    const key = nfe.destinatario.cpfCnpj;
    const atual = destinatariosMap.get(key) || {
      nome: nfe.destinatario.nome,
      cpfCnpj: nfe.destinatario.cpfCnpj,
      quantidade: 0,
      valorTotal: 0
    };
    
    destinatariosMap.set(key, {
      ...atual,
      quantidade: atual.quantidade + 1,
      valorTotal: atual.valorTotal + (nfe.valores.totalNFe || 0)
    });
  }
  
  const topDestinatarios = Array.from(destinatariosMap.values())
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 10); // Top 10
  
  // 5. BREAKDOWN DE IMPOSTOS
  const impostos = {
    icms: icmsTotal,
    icmsST: icmsSTTotal,
    ipi: ipiTotal,
    pis: pisTotal,
    cofins: cofinsTotal,
    total: valorTotalImpostos
  };
  
  // 6. MONTAR RESPOSTA
  return {
    resumo: {
      totalNFes,
      totalAutorizadas,
      totalRejeitadas,
      totalCanceladas,
      totalRascunhos,
      valorTotalProdutos,
      valorTotalNFes,
      valorTotalImpostos,
      ticketMedio
    },
    evolucao,
    distribuicaoStatus,
    topDestinatarios,
    impostos,
    periodo: {
      inicio: formatarData(dataInicio),
      fim: formatarData(dataFim)
    }
  };
}

export default nfeStatistics;
