/**
 * ============================================================================
 * MÓDULO: Persistência de NF-es
 * ============================================================================
 * Responsável por salvar, listar e gerenciar NF-es no KV Store
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as kv from './kv_store.tsx';

const nfePersistence = new Hono();

// ============================================================================
// TIPOS
// ============================================================================

export interface NFe {
  id: string;
  chave: string;
  numero: string;
  serie: string;
  modelo: string;
  tipo: string; // 0-entrada, 1-saida
  natureza: string;
  
  // Emitente
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    ie: string;
    uf: string;
  };
  
  // Destinatário
  destinatario: {
    tipo: 'pf' | 'pj';
    cpfCnpj: string;
    nome: string;
    email?: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
  };
  
  // Valores
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
  
  // Status e protocolo
  status: 'rascunho' | 'emitida' | 'assinada' | 'transmitida' | 'autorizada' | 'rejeitada' | 'cancelada';
  codigoStatus?: string;
  mensagemStatus?: string;
  protocolo?: string;
  dataAutorizacao?: string;
  
  // XMLs
  xml?: string;
  xmlAssinado?: string;
  xmlAutorizado?: string;
  
  // Configurações
  ambiente: number; // 1-producao, 2-homologacao
  
  // Timeline de eventos
  eventos: Array<{
    tipo: 'emissao' | 'assinatura' | 'transmissao' | 'autorizacao' | 'rejeicao' | 'cancelamento';
    timestamp: string;
    descricao: string;
    codigo?: string;
    dados?: any;
  }>;
  
  // Metadados
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function gerarNFeId(): string {
  return `nfe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getNFeKey(userId: string, nfeId: string): string {
  return `nfe:${userId}:${nfeId}`;
}

function getIndexKey(userId: string): string {
  return `nfe_index:${userId}`;
}

// ============================================================================
// POST /nfe/salvar
// Descrição: Salva ou atualiza uma NF-e
// ============================================================================
nfePersistence.post('/nfe/salvar', async (c) => {
  try {
    console.log('[NFE_PERSISTENCE] POST /nfe/salvar - Início');
    
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
    
    // 2. Receber dados
    const body = await c.req.json();
    const nfeData: Partial<NFe> = body.nfe;
    
    if (!nfeData) {
      return c.json({ success: false, error: 'Dados da NF-e não fornecidos' }, 400);
    }
    
    // 3. Preparar NF-e
    const nfeId = nfeData.id || gerarNFeId();
    const agora = new Date().toISOString();
    
    // Buscar NF-e existente (se houver)
    const nfeKey = getNFeKey(user.id, nfeId);
    const nfeExistente = await kv.get<NFe>(nfeKey);
    
    const nfe: NFe = {
      id: nfeId,
      chave: nfeData.chave || nfeExistente?.chave || '',
      numero: nfeData.numero || nfeExistente?.numero || '',
      serie: nfeData.serie || nfeExistente?.serie || '',
      modelo: nfeData.modelo || nfeExistente?.modelo || '55',
      tipo: nfeData.tipo || nfeExistente?.tipo || '1',
      natureza: nfeData.natureza || nfeExistente?.natureza || '',
      
      emitente: nfeData.emitente || nfeExistente?.emitente || {
        cnpj: '',
        razaoSocial: '',
        ie: '',
        uf: ''
      },
      
      destinatario: nfeData.destinatario || nfeExistente?.destinatario || {
        tipo: 'pj',
        cpfCnpj: '',
        nome: '',
        endereco: {
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: ''
        }
      },
      
      valores: nfeData.valores || nfeExistente?.valores || {
        totalProdutos: 0,
        totalNFe: 0
      },
      
      status: nfeData.status || nfeExistente?.status || 'rascunho',
      codigoStatus: nfeData.codigoStatus || nfeExistente?.codigoStatus,
      mensagemStatus: nfeData.mensagemStatus || nfeExistente?.mensagemStatus,
      protocolo: nfeData.protocolo || nfeExistente?.protocolo,
      dataAutorizacao: nfeData.dataAutorizacao || nfeExistente?.dataAutorizacao,
      
      xml: nfeData.xml || nfeExistente?.xml,
      xmlAssinado: nfeData.xmlAssinado || nfeExistente?.xmlAssinado,
      xmlAutorizado: nfeData.xmlAutorizado || nfeExistente?.xmlAutorizado,
      
      ambiente: nfeData.ambiente || nfeExistente?.ambiente || 2,
      
      eventos: nfeExistente?.eventos || [],
      
      userId: user.id,
      createdAt: nfeExistente?.createdAt || agora,
      updatedAt: agora
    };
    
    // 4. Adicionar evento se houver mudança de status
    if (nfeData.status && nfeData.status !== nfeExistente?.status) {
      const evento = {
        tipo: nfeData.status === 'autorizada' ? 'autorizacao' :
              nfeData.status === 'rejeitada' ? 'rejeicao' :
              nfeData.status === 'assinada' ? 'assinatura' :
              nfeData.status === 'transmitida' ? 'transmissao' :
              'emissao',
        timestamp: agora,
        descricao: nfeData.mensagemStatus || `Status alterado para: ${nfeData.status}`,
        codigo: nfeData.codigoStatus,
        dados: {
          statusAnterior: nfeExistente?.status,
          statusNovo: nfeData.status
        }
      } as NFe['eventos'][0];
      
      nfe.eventos.push(evento);
    }
    
    // 5. Salvar NF-e
    await kv.set(nfeKey, nfe);
    
    // 6. Atualizar índice
    const indexKey = getIndexKey(user.id);
    const index = await kv.get<string[]>(indexKey) || [];
    
    if (!index.includes(nfeId)) {
      index.unshift(nfeId); // Adicionar no início (mais recente primeiro)
      await kv.set(indexKey, index);
    }
    
    console.log(`[NFE_PERSISTENCE] NF-e salva: ${nfeId}`);
    
    return c.json({
      success: true,
      data: {
        nfeId,
        chave: nfe.chave,
        status: nfe.status
      }
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] Erro ao salvar NF-e:', error);
    return c.json({
      success: false,
      error: `Erro ao salvar NF-e: ${error.message}`
    }, 500);
  }
});

// ============================================================================
// GET /nfe/listar
// Descrição: Lista todas as NF-es do usuário com filtros
// ============================================================================
nfePersistence.get('/nfe/listar', async (c) => {
  try {
    console.log('[NFE_PERSISTENCE] GET /nfe/listar - Início');
    
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
    
    // 2. Parâmetros de filtro
    const status = c.req.query('status');
    const dataInicio = c.req.query('dataInicio');
    const dataFim = c.req.query('dataFim');
    const destinatario = c.req.query('destinatario');
    
    // 3. Buscar índice de NF-es
    const indexKey = getIndexKey(user.id);
    const index = await kv.get<string[]>(indexKey) || [];
    
    console.log(`[NFE_PERSISTENCE] Encontradas ${index.length} NF-es no índice`);
    
    // 4. Buscar todas as NF-es
    const nfes: NFe[] = [];
    for (const nfeId of index) {
      const nfeKey = getNFeKey(user.id, nfeId);
      const nfe = await kv.get<NFe>(nfeKey);
      
      if (nfe) {
        // Aplicar filtros
        if (status && nfe.status !== status) continue;
        
        if (dataInicio && nfe.createdAt < dataInicio) continue;
        if (dataFim && nfe.createdAt > dataFim) continue;
        
        if (destinatario && !nfe.destinatario.nome.toLowerCase().includes(destinatario.toLowerCase())) {
          continue;
        }
        
        nfes.push(nfe);
      }
    }
    
    console.log(`[NFE_PERSISTENCE] Retornando ${nfes.length} NF-es após filtros`);
    
    // 5. Retornar lista resumida (sem XMLs para economizar banda)
    const resumos = nfes.map(nfe => ({
      id: nfe.id,
      chave: nfe.chave,
      numero: nfe.numero,
      serie: nfe.serie,
      modelo: nfe.modelo,
      natureza: nfe.natureza,
      destinatario: {
        nome: nfe.destinatario.nome,
        cpfCnpj: nfe.destinatario.cpfCnpj
      },
      valores: nfe.valores,
      status: nfe.status,
      codigoStatus: nfe.codigoStatus,
      mensagemStatus: nfe.mensagemStatus,
      protocolo: nfe.protocolo,
      dataAutorizacao: nfe.dataAutorizacao,
      ambiente: nfe.ambiente,
      createdAt: nfe.createdAt,
      updatedAt: nfe.updatedAt,
      totalEventos: nfe.eventos.length
    }));
    
    return c.json({
      success: true,
      data: {
        total: resumos.length,
        nfes: resumos
      }
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] Erro ao listar NF-es:', error);
    return c.json({
      success: false,
      error: `Erro ao listar NF-es: ${error.message}`
    }, 500);
  }
});

// ============================================================================
// GET /nfe/detalhes/:nfeId
// Descrição: Retorna detalhes completos de uma NF-e (incluindo XMLs)
// ============================================================================
nfePersistence.get('/nfe/detalhes/:nfeId', async (c) => {
  try {
    const nfeId = c.req.param('nfeId');
    console.log(`[NFE_PERSISTENCE] GET /nfe/detalhes/${nfeId} - Início`);
    
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
    
    // 2. Buscar NF-e
    const nfeKey = getNFeKey(user.id, nfeId);
    const nfe = await kv.get<NFe>(nfeKey);
    
    if (!nfe) {
      return c.json({ success: false, error: 'NF-e não encontrada' }, 404);
    }
    
    console.log(`[NFE_PERSISTENCE] NF-e encontrada: ${nfe.chave}`);
    
    return c.json({
      success: true,
      data: nfe
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] Erro ao buscar detalhes da NF-e:', error);
    return c.json({
      success: false,
      error: `Erro ao buscar NF-e: ${error.message}`
    }, 500);
  }
});

// ============================================================================
// GET /nfe/xml/:nfeId/:tipo
// Descrição: Retorna o XML da NF-e (original, assinado ou autorizado)
// ============================================================================
nfePersistence.get('/nfe/xml/:nfeId/:tipo', async (c) => {
  try {
    const nfeId = c.req.param('nfeId');
    const tipo = c.req.param('tipo') as 'original' | 'assinado' | 'autorizado';
    
    console.log(`[NFE_PERSISTENCE] GET /nfe/xml/${nfeId}/${tipo} - Início`);
    
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
    
    // 2. Buscar NF-e
    const nfeKey = getNFeKey(user.id, nfeId);
    const nfe = await kv.get<NFe>(nfeKey);
    
    if (!nfe) {
      return c.json({ success: false, error: 'NF-e não encontrada' }, 404);
    }
    
    // 3. Selecionar XML
    let xml: string | undefined;
    let filename: string;
    
    switch (tipo) {
      case 'original':
        xml = nfe.xml;
        filename = `nfe_${nfe.numero}_original.xml`;
        break;
      case 'assinado':
        xml = nfe.xmlAssinado;
        filename = `nfe_${nfe.numero}_assinado.xml`;
        break;
      case 'autorizado':
        xml = nfe.xmlAutorizado;
        filename = `nfe_${nfe.numero}_autorizado.xml`;
        break;
      default:
        return c.json({ success: false, error: 'Tipo de XML inválido' }, 400);
    }
    
    if (!xml) {
      return c.json({ 
        success: false, 
        error: `XML ${tipo} não disponível para esta NF-e` 
      }, 404);
    }
    
    console.log(`[NFE_PERSISTENCE] XML ${tipo} encontrado (${xml.length} bytes)`);
    
    // 4. Retornar XML como download
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': xml.length.toString()
      }
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] Erro ao buscar XML:', error);
    return c.json({
      success: false,
      error: `Erro ao buscar XML: ${error.message}`
    }, 500);
  }
});

// ============================================================================
// DELETE /nfe/excluir/:nfeId
// Descrição: Exclui uma NF-e (apenas rascunhos)
// ============================================================================
nfePersistence.delete('/nfe/excluir/:nfeId', async (c) => {
  try {
    const nfeId = c.req.param('nfeId');
    console.log(`[NFE_PERSISTENCE] DELETE /nfe/excluir/${nfeId} - Início`);
    
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
    
    // 2. Buscar NF-e
    const nfeKey = getNFeKey(user.id, nfeId);
    const nfe = await kv.get<NFe>(nfeKey);
    
    if (!nfe) {
      return c.json({ success: false, error: 'NF-e não encontrada' }, 404);
    }
    
    // 3. Validar se pode excluir
    if (nfe.status !== 'rascunho') {
      return c.json({ 
        success: false, 
        error: 'Somente rascunhos podem ser excluídos. Use cancelamento para NF-es autorizadas.' 
      }, 400);
    }
    
    // 4. Excluir NF-e
    await kv.del(nfeKey);
    
    // 5. Atualizar índice
    const indexKey = getIndexKey(user.id);
    const index = await kv.get<string[]>(indexKey) || [];
    const novoIndex = index.filter(id => id !== nfeId);
    await kv.set(indexKey, novoIndex);
    
    console.log(`[NFE_PERSISTENCE] NF-e excluída: ${nfeId}`);
    
    return c.json({
      success: true,
      message: 'NF-e excluída com sucesso'
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] Erro ao excluir NF-e:', error);
    return c.json({
      success: false,
      error: `Erro ao excluir NF-e: ${error.message}`
    }, 500);
  }
});

export default nfePersistence;
