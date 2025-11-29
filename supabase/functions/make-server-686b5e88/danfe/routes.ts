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
    const nfeRaw = await kv.get(nfeKey);
    
    if (!nfeRaw) {
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    // Parse do objeto (pode vir como string)
    const nfe = typeof nfeRaw === 'string' ? JSON.parse(nfeRaw) : nfeRaw;
    console.log('[DANFE_ROUTES] NF-e encontrada:', nfe.id, '- Status:', nfe.status);
    
    // 3. Verificar se tem XML autorizado
    console.log('[DANFE_ROUTES] 🔍 Campos disponíveis na NF-e:', Object.keys(nfe));
    let xmlString = '';
    
    if (nfe.xmlAutorizado) {
      console.log('[DANFE_ROUTES] ✅ Usando XML autorizado');
      xmlString = nfe.xmlAutorizado;
    } else if (nfe.xmlAssinado) {
      console.log('[DANFE_ROUTES] ⚠️ Usando XML assinado (NF-e ainda não autorizada)');
      xmlString = nfe.xmlAssinado;
    } else if (nfe.xml) {
      console.log('[DANFE_ROUTES] ⚠️ Usando XML original (NF-e ainda não assinada)');
      xmlString = nfe.xml;
    } else {
      console.error('[DANFE_ROUTES] ❌ Nenhum XML disponível!');
      console.error('[DANFE_ROUTES] ❌ Campos disponíveis:', Object.keys(nfe));
      console.error('[DANFE_ROUTES] ❌ Status da NF-e:', nfe.status);
      return c.json({
        success: false,
        error: 'XML da NF-e não encontrado. Verifique se a NF-e foi gerada corretamente.'
      }, 400);
    }
    
    console.log('[DANFE_ROUTES] 📄 Tamanho do XML:', xmlString.length, 'caracteres');
    console.log('[DANFE_ROUTES] 📄 Início do XML:', xmlString.substring(0, 100));
    
    // 4. Extrair dados do XML
    console.log('[DANFE_ROUTES] 🔄 Extraindo dados do XML...');
    const dadosDANFE = extrairDadosDoXML(xmlString);
    console.log('[DANFE_ROUTES] ✅ Dados extraídos:', {
      chave: dadosDANFE.chaveAcesso?.substring(0, 20) + '...',
      emitente: dadosDANFE.emitente?.razaoSocial,
      destinatario: dadosDANFE.destinatario?.nome,
      totalProdutos: dadosDANFE.produtos?.length
    });
    
    // 5. Gerar HTML do DANFE
    console.log('[DANFE_ROUTES] 🎨 Gerando HTML do DANFE...');
    const html = gerarHTMLDanfe(dadosDANFE);
    console.log('[DANFE_ROUTES] 📄 Tamanho do HTML gerado:', html.length, 'caracteres');
    
    console.log('[DANFE_ROUTES] ✅ DANFE gerado com sucesso!');
    
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
    const nfeRaw = await kv.get(nfeKey);
    
    if (!nfeRaw) {
      return c.json({
        success: false,
        error: 'NF-e não encontrada'
      }, 404);
    }
    
    // Parse do objeto (pode vir como string)
    const nfe = typeof nfeRaw === 'string' ? JSON.parse(nfeRaw) : nfeRaw;
    
    // 3. Pegar XML
    let xmlString = '';
    
    if (nfe.xmlAutorizado) {
      xmlString = nfe.xmlAutorizado;
    } else if (nfe.xmlAssinado) {
      xmlString = nfe.xmlAssinado;
    } else if (nfe.xml) {
      xmlString = nfe.xml;
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
