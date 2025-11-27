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
  
  // Dados da NF-e
  emitente: {
    cnpj: string;
    razaoSocial: string;
  };
  destinatario: {
    cpfCnpj: string;
    nome: string;
  };
  
  // Valores
  valorTotal: number;
  valorProdutos: number;
  valorTributos?: number;
  
  // XML e assinatura
  xml?: string;
  xmlAssinado?: string;
  
  // SEFAZ
  protocolo?: string;
  dataAutorizacao?: string;
  motivoRejeicao?: string;
  codigoStatus?: number; // cStat SEFAZ
  
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
    // Buscar todas as NF-es do usuário
    const userId = c.req.header('x-user-id') || 'system';
    const prefix = `nfe:${userId}:`;
    
    console.log(`[NFE_PERSISTENCE] Buscando NF-es com prefix: ${prefix}`);
    
    const nfes = await kv.getByPrefix(prefix);
    
    console.log(`[NFE_PERSISTENCE] ✅ Encontradas ${nfes.length} NF-es`);
    
    // Parsear e ordenar por data (mais recentes primeiro)
    const parsed = nfes
      .map(item => {
        try {
          return typeof item.value === 'string' 
            ? JSON.parse(item.value) 
            : item.value;
        } catch {
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
    const userId = c.req.header('x-user-id') || 'system';
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
    
    console.log(`[NFE_PERSISTENCE] ✅ NF-e encontrada: ${id}`);
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
/*                              ROTAS - SALVAR                               */
/* ========================================================================= */

app.post("/salvar", async (c) => {
  console.log('[NFE_PERSISTENCE] POST /salvar - Início');
  
  try {
    const body = await c.req.json();
    const userId = c.req.header('x-user-id') || 'system';
    
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
    const userId = c.req.header('x-user-id') || 'system';
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
    const userId = c.req.header('x-user-id') || 'system';
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

app.get("/stats/resumo", async (c) => {
  console.log('[NFE_PERSISTENCE] GET /stats/resumo - Início');
  
  try {
    const userId = c.req.header('x-user-id') || 'system';
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
