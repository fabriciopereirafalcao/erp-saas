/**
 * ============================================================================
 * PERSISTÊNCIA DE NF-e - SUPABASE KV STORE
 * ============================================================================
 * Salva e recupera NF-es do banco de dados
 */

import { Hono } from "npm:hono@4.6.14";
import * as kv from "./kv_store.tsx";

console.log('[NFE_PERSISTENCE] 🚀 Módulo carregando...');

const app = new Hono();

/* ========================================================================= */
/*                           TIPOS E INTERFACES                              */
/* ========================================================================= */

interface NFe {
  id: string;
  numero: number;
  serie: number;
  chaveAcesso: string;
  status: 'rascunho' | 'processando' | 'autorizada' | 'rejeitada' | 'cancelada';
  ambiente: 'homologacao' | 'producao';
  naturezaOperacao?: string; // Natureza da operação (ex: "Venda de mercadoria")
  
  // Dados da NF-e
  emitente: {
    cnpj: string;
    razaoSocial: string;
  };
  destinatario: {
    cpfCnpj?: string;
    cnpj?: string;
    nome?: string;
    razaoSocial?: string;
  };
  
  // Valores (aceita múltiplos formatos)
  valorTotal?: number;
  valorProdutos?: number;
  valorTributos?: number;
  valores?: {
    totalNFe?: number;
    totalProdutos?: number;
  };
  
  // XML e assinatura
  xml?: string;
  xmlAssinado?: string;
  
  // SEFAZ
  protocolo?: string;
  dataAutorizacao?: string;
  motivoRejeicao?: string;
  mensagemStatus?: string;
  codigoStatus?: number; // cStat SEFAZ
  totalEventos?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/* ========================================================================= */
/*                              ROTAS - LISTAR                               */
/* ========================================================================= */

app.get("/listar", async (c) => {
  console.log('[NFE_PERSISTENCE] GET /listar - Início');
  
  try {
    // Autenticação via token (igual na rota /:id)
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdHeader = c.req.header('x-user-id');
    
    console.log(`[NFE_PERSISTENCE] accessToken: ${accessToken ? 'presente' : 'ausente'}`);
    console.log(`[NFE_PERSISTENCE] userIdHeader: ${userIdHeader || 'ausente'}`);
    
    let userId = 'system';
    
    // Se tem token, usar autenticação completa
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (authError || !user) {
        console.log('[NFE_PERSISTENCE] ❌ Token inválido:', authError?.message);
        return c.json({ success: false, error: 'Token inválido' }, 401);
      }
      
      userId = user.id;
      console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
    } else if (userIdHeader) {
      // Fallback para header x-user-id (retrocompatibilidade)
      userId = userIdHeader;
      console.log(`[NFE_PERSISTENCE] ⚠️ Usando x-user-id: ${userId}`);
    } else {
      console.log(`[NFE_PERSISTENCE] ⚠️ Sem autenticação, usando 'system'`);
    }
    
    const prefix = `nfe:${userId}:`;
    console.log(`[NFE_PERSISTENCE] 🔍 Buscando NF-es com prefix: ${prefix}`);
    
    const nfes = await kv.getByPrefix(prefix);
    
    console.log(`[NFE_PERSISTENCE] ✅ Encontradas ${nfes.length} NF-es`);
    
    // Parsear e ordenar por data (mais recentes primeiro)
    const parsed = nfes
      .map(item => {
        try {
          const nfe = typeof item.value === 'string' 
            ? JSON.parse(item.value) 
            : item.value;
          
          // Mapear para formato esperado pelo frontend (NFeSummary)
          return {
            id: nfe.id,
            chave: nfe.chaveAcesso || '',
            numero: String(nfe.numero || ''),
            serie: String(nfe.serie || ''),
            modelo: '55', // NF-e padrão
            natureza: nfe.naturezaOperacao || 'Venda',
            emitente: {
              cnpj: nfe.emitente?.cnpj || '',
              razaoSocial: nfe.emitente?.razaoSocial || '',
              uf: nfe.emitente?.uf || ''
            },
            destinatario: {
              nome: nfe.destinatario?.nome || nfe.destinatario?.razaoSocial || 'N/A',
              cpfCnpj: nfe.destinatario?.cpfCnpj || nfe.destinatario?.cnpj || 'N/A'
            },
            valores: {
              totalProdutos: nfe.valorProdutos || nfe.valores?.totalProdutos || 0,
              totalNFe: nfe.valorTotal || nfe.valores?.totalNFe || 0
            },
            status: nfe.status || 'rascunho',
            codigoStatus: nfe.codigoStatus ? String(nfe.codigoStatus) : undefined,
            mensagemStatus: nfe.motivoRejeicao || nfe.mensagemStatus,
            protocolo: nfe.protocolo,
            dataAutorizacao: nfe.dataAutorizacao,
            ambiente: nfe.ambiente === 'producao' ? 1 : 2,
            createdAt: nfe.createdAt,
            updatedAt: nfe.updatedAt,
            totalEventos: nfe.totalEventos || 0
          };
        } catch (e) {
          console.error('[NFE_PERSISTENCE] Erro ao parsear item:', e);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Mais recentes primeiro
      });
    
    return c.json({
      success: true,
      data: parsed,
      count: parsed.length
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] ❌ Erro ao listar:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                              ROTAS - BUSCAR                               */
/* ========================================================================= */

app.get("/:id", async (c) => {
  const id = c.req.param('id');
  console.log(`[NFE_PERSISTENCE] GET /${id} - Início`);
  
  try {
    // Autenticação via token (compatível com DANFE e outros módulos)
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdHeader = c.req.header('x-user-id');
    
    console.log(`[NFE_PERSISTENCE] accessToken: ${accessToken ? 'presente' : 'ausente'}`);
    console.log(`[NFE_PERSISTENCE] userIdHeader: ${userIdHeader || 'ausente'}`);
    
    let userId = 'system';
    
    // Se tem token, usar autenticação completa
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (authError || !user) {
        console.log('[NFE_PERSISTENCE] ❌ Token inválido:', authError?.message);
        return c.json({ success: false, error: 'Token inválido' }, 401);
      }
      
      userId = user.id;
      console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
    } else if (userIdHeader) {
      // Fallback para header x-user-id (retrocompatibilidade)
      userId = userIdHeader;
      console.log(`[NFE_PERSISTENCE] ⚠️ Usando x-user-id: ${userId}`);
    } else {
      console.log(`[NFE_PERSISTENCE] ⚠️ Sem autenticação, usando 'system'`);
    }
    
    const key = `nfe:${userId}:${id}`;
    console.log(`[NFE_PERSISTENCE] 🔍 Buscando com key: ${key}`);
    
    const result = await kv.get(key);
    console.log(`[NFE_PERSISTENCE] 🔍 Resultado do KV: ${result ? 'encontrado' : 'null'}`);
    
    if (!result) {
      // Tentar buscar todas as keys com prefixo para debug
      console.log(`[NFE_PERSISTENCE] 🔍 Tentando buscar com prefixo: nfe:${userId}:`);
      const allKeys = await kv.getByPrefix(`nfe:${userId}:`);
      console.log(`[NFE_PERSISTENCE] 🔍 Total de NF-es do usuário: ${allKeys.length}`);
      if (allKeys.length > 0) {
        console.log(`[NFE_PERSISTENCE] 🔍 Primeira key encontrada: ${allKeys[0]?.key}`);
        console.log(`[NFE_PERSISTENCE] 🔍 IDs disponíveis:`, allKeys.map(k => k.key.split(':')[2]).join(', '));
      }
      
      console.log(`[NFE_PERSISTENCE] ❌ NF-e não encontrada com ID: ${id}`);
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    const nfe = typeof result === 'string' ? JSON.parse(result) : result;
    
    console.log(`[NFE_PERSISTENCE] ✅ NF-e encontrada: ${nfe.id} - Status: ${nfe.status}`);
    return c.json({
      success: true,
      data: nfe
    });
    
  } catch (error) {
    console.error(`[NFE_PERSISTENCE] ❌ Erro ao buscar ${id}:`, error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                          ROTAS - DOWNLOAD XML                             */
/* ========================================================================= */

app.get("/xml/:id/:tipo", async (c) => {
  const id = c.req.param('id');
  const tipo = c.req.param('tipo'); // 'original' | 'assinado' | 'autorizado'
  console.log(`[NFE_PERSISTENCE] GET /xml/${id}/${tipo} - Início`);
  
  try {
    // Autenticação via token
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = 'system';
    
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
      }
    }
    
    const key = `nfe:${userId}:${id}`;
    
    const result = await kv.get(key);
    
    if (!result) {
      console.log(`[NFE_PERSISTENCE] ❌ NF-e não encontrada: ${id}`);
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    const nfe = typeof result === 'string' ? JSON.parse(result) : result;
    
    // Selecionar XML baseado no tipo
    let xml: string | undefined;
    let nomeArquivo: string;
    
    switch (tipo) {
      case 'original':
        xml = nfe.xml;
        nomeArquivo = `${nfe.chaveAcesso || nfe.id}_original.xml`;
        break;
      case 'assinado':
        xml = nfe.xmlAssinado || nfe.xml;
        nomeArquivo = `${nfe.chaveAcesso || nfe.id}_assinado.xml`;
        break;
      case 'autorizado':
        xml = nfe.xmlAutorizado || nfe.xmlAssinado || nfe.xml;
        nomeArquivo = `${nfe.chaveAcesso || nfe.id}.xml`;
        break;
      default:
        return c.json({
          success: false,
          error: 'Tipo de XML inválido. Use: original, assinado ou autorizado'
        }, 400);
    }
    
    if (!xml) {
      console.log(`[NFE_PERSISTENCE] ❌ XML ${tipo} não disponível para NF-e ${id}`);
      return c.json({
        success: false,
        error: `XML ${tipo} não disponível para esta NF-e`
      }, 404);
    }
    
    console.log(`[NFE_PERSISTENCE] ✅ Retornando XML ${tipo} para download`);
    
    // Retornar XML como arquivo
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error(`[NFE_PERSISTENCE] ❌ Erro ao baixar XML ${tipo} de ${id}:`, error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                              ROTAS - SALVAR                               */
/* ========================================================================= */

app.post("/salvar", async (c) => {
  console.log('[NFE_PERSISTENCE] POST /salvar - Início');
  
  try {
    const body = await c.req.json();
    
    // Autenticação via token (igual na rota /listar)
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userIdHeader = c.req.header('x-user-id');
    
    console.log(`[NFE_PERSISTENCE] accessToken: ${accessToken ? 'presente' : 'ausente'}`);
    console.log(`[NFE_PERSISTENCE] userIdHeader: ${userIdHeader || 'ausente'}`);
    
    let userId = 'system';
    
    // Se tem token, usar autenticação completa
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (authError || !user) {
        console.log('[NFE_PERSISTENCE] ❌ Token inválido:', authError?.message);
        return c.json({ success: false, error: 'Token inválido' }, 401);
      }
      
      userId = user.id;
      console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
    } else if (userIdHeader) {
      // Fallback para header x-user-id (retrocompatibilidade)
      userId = userIdHeader;
      console.log(`[NFE_PERSISTENCE] ⚠️ Usando x-user-id: ${userId}`);
    } else {
      console.log(`[NFE_PERSISTENCE] ⚠️ Sem autenticação, usando 'system'`);
    }
    
    // Gerar ID se não existir
    const id = body.id || `nfe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const nfe: NFe = {
      ...body,
      id,
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString()
    };
    
    const key = `nfe:${userId}:${id}`;
    
    console.log(`[NFE_PERSISTENCE] Salvando NF-e: ${key}`);
    console.log(`[NFE_PERSISTENCE] Status: ${nfe.status}, Número: ${nfe.numero}`);
    
    await kv.set(key, JSON.stringify(nfe));
    
    console.log('[NFE_PERSISTENCE] ✅ NF-e salva com sucesso!');
    
    return c.json({
      success: true,
      data: nfe
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] ❌ Erro ao salvar:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                           ROTAS - ATUALIZAR                               */
/* ========================================================================= */

app.patch("/:id", async (c) => {
  const id = c.req.param('id');
  console.log(`[NFE_PERSISTENCE] PATCH /${id} - Início`);
  
  try {
    // Autenticação via token
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = 'system';
    
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
      }
    }
    
    const key = `nfe:${userId}:${id}`;
    
    // Buscar NF-e existente
    const existing = await kv.get(key);
    
    if (!existing) {
      console.log(`[NFE_PERSISTENCE] ❌ NF-e não encontrada: ${id}`);
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    const currentNfe = typeof existing === 'string' ? JSON.parse(existing) : existing;
    
    // Atualizar com novos dados
    const updates = await c.req.json();
    const updated: NFe = {
      ...currentNfe,
      ...updates,
      id, // Não permite alterar ID
      userId, // Não permite alterar userId
      updatedAt: new Date().toISOString()
    };
    
    console.log(`[NFE_PERSISTENCE] Atualizando campos: ${Object.keys(updates).join(', ')}`);
    
    await kv.set(key, JSON.stringify(updated));
    
    console.log('[NFE_PERSISTENCE] ✅ NF-e atualizada com sucesso!');
    
    return c.json({
      success: true,
      data: updated
    });
    
  } catch (error) {
    console.error(`[NFE_PERSISTENCE] ❌ Erro ao atualizar ${id}:`, error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                            ROTAS - DELETAR                                */
/* ========================================================================= */

app.delete("/:id", async (c) => {
  const id = c.req.param('id');
  console.log(`[NFE_PERSISTENCE] DELETE /${id} - Início`);
  
  try {
    // Autenticação via token
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = 'system';
    
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
      }
    }
    
    const key = `nfe:${userId}:${id}`;
    
    // Verificar se existe antes de deletar
    const existing = await kv.get(key);
    
    if (!existing) {
      console.log(`[NFE_PERSISTENCE] ❌ NF-e não encontrada: ${id}`);
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    await kv.del(key);
    
    console.log('[NFE_PERSISTENCE] ✅ NF-e deletada com sucesso!');
    
    return c.json({
      success: true,
      message: 'NF-e deletada'
    });
    
  } catch (error) {
    console.error(`[NFE_PERSISTENCE] ❌ Erro ao deletar ${id}:`, error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */
/*                          ROTAS - ESTATÍSTICAS                             */
/* ========================================================================= */

// ROTA /estatisticas REMOVIDA - Usar /nfe/estatisticas do módulo nfe-statistics.tsx
// que tem autenticação completa e funcionalidades avançadas

app.get("/stats/resumo", async (c) => {
  console.log('[NFE_PERSISTENCE] GET /stats/resumo - Início');
  
  try {
    // Autenticação via token
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = 'system';
    
    if (accessToken) {
      const { createClient } = await import('npm:@supabase/supabase-js@2.49.2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`[NFE_PERSISTENCE] ✅ User autenticado: ${userId}`);
      }
    }
    
    const prefix = `nfe:${userId}:`;
    
    const nfes = await kv.getByPrefix(prefix);
    
    const parsed = nfes
      .map(item => {
        try {
          return typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    
    // Calcular estatísticas
    const stats = {
      total: parsed.length,
      autorizadas: parsed.filter(n => n.status === 'autorizada').length,
      rejeitadas: parsed.filter(n => n.status === 'rejeitada').length,
      rascunhos: parsed.filter(n => n.status === 'rascunho').length,
      processando: parsed.filter(n => n.status === 'processando').length,
      canceladas: parsed.filter(n => n.status === 'cancelada').length,
      valorTotal: parsed
        .filter(n => n.status === 'autorizada')
        .reduce((sum, n) => sum + (n.valorTotal || 0), 0)
    };
    
    console.log('[NFE_PERSISTENCE] ✅ Estatísticas calculadas:', stats);
    
    return c.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('[NFE_PERSISTENCE] ❌ Erro ao calcular stats:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/* ========================================================================= */

console.log('[NFE_PERSISTENCE] ✅ Módulo carregado!');

export default app;
