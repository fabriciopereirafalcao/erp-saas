/**
 * ============================================================================
 * ROTAS DANFE - Geração de PDF
 * ============================================================================
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as kv from '../kv_store.tsx';
import { extrairDadosDoXML, gerarHTMLDanfe } from './generator.tsx';

const danfe = new Hono();

// ============================================================================
// GET /danfe/nfe/:nfeId
// Descrição: Gera PDF do DANFE a partir de uma NF-e
// Retorna: HTML do DANFE (será usado para gerar PDF no frontend)
// ============================================================================
danfe.get('/nfe/:nfeId', async (c) => {
  try {
    console.log('[DANFE_ROUTES] GET /nfe/:nfeId - Início');
    
    const nfeId = c.req.param('nfeId');
    
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
    
    console.log(`[DANFE_ROUTES] Gerando DANFE para NF-e: ${nfeId}`);
    
    // 2. Buscar NF-e no KV Store
    const nfeKey = `nfe:${user.id}:${nfeId}`;
    const nfe = await kv.get(nfeKey);
    
    if (!nfe) {
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    // 3. Verificar se tem XML autorizado
    let xmlString = '';
    
    if (nfe.xmlAutorizado) {
      console.log('[DANFE_ROUTES] Usando XML autorizado');
      xmlString = nfe.xmlAutorizado;
    } else if (nfe.xmlAssinado) {
      console.log('[DANFE_ROUTES] ⚠️ Usando XML assinado (NF-e ainda não autorizada)');
      xmlString = nfe.xmlAssinado;
    } else if (nfe.xmlOriginal) {
      console.log('[DANFE_ROUTES] ⚠️ Usando XML original (NF-e ainda não assinada)');
      xmlString = nfe.xmlOriginal;
    } else {
      return c.json({
        success: false,
        error: 'XML da NF-e não encontrado'
      }, 400);
    }
    
    // 4. Extrair dados do XML
    console.log('[DANFE_ROUTES] Extraindo dados do XML...');
    const dadosDANFE = extrairDadosDoXML(xmlString);
    
    // 5. Gerar HTML do DANFE
    console.log('[DANFE_ROUTES] Gerando HTML do DANFE...');
    const html = gerarHTMLDanfe(dadosDANFE);
    
    console.log('[DANFE_ROUTES] ✅ DANFE gerado com sucesso');
    
    // 6. Retornar HTML
    return c.html(html);
    
  } catch (error: any) {
    console.error('[DANFE_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao gerar DANFE',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// GET /danfe/nfe/:nfeId/json
// Descrição: Retorna dados extraídos do XML em JSON
// Retorna: JSON com dados estruturados do DANFE
// ============================================================================
danfe.get('/nfe/:nfeId/json', async (c) => {
  try {
    console.log('[DANFE_ROUTES] GET /nfe/:nfeId/json - Início');
    
    const nfeId = c.req.param('nfeId');
    
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
    
    // 2. Buscar NF-e no KV Store
    const nfeKey = `nfe:${user.id}:${nfeId}`;
    const nfe = await kv.get(nfeKey);
    
    if (!nfe) {
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    // 3. Pegar XML
    let xmlString = '';
    
    if (nfe.xmlAutorizado) {
      xmlString = nfe.xmlAutorizado;
    } else if (nfe.xmlAssinado) {
      xmlString = nfe.xmlAssinado;
    } else if (nfe.xmlOriginal) {
      xmlString = nfe.xmlOriginal;
    } else {
      return c.json({
        success: false,
        error: 'XML da NF-e não encontrado'
      }, 400);
    }
    
    // 4. Extrair dados do XML
    const dadosDANFE = extrairDadosDoXML(xmlString);
    
    // 5. Retornar JSON
    return c.json({
      success: true,
      data: dadosDANFE
    });
    
  } catch (error: any) {
    console.error('[DANFE_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao extrair dados do XML',
      details: error.message
    }, 500);
  }
});

export default danfe;
