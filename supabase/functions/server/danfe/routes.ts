/**
 * ============================================================================
 * ROTAS DANFE - Geração de PDF
 * ============================================================================
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as kv from '../kv_store.tsx';
import { gerarHTMLDanfe } from './generator.tsx';

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
    
    // 4. Converter dados da NF-e para formato DANFE (SEM parser XML)
    console.log('[DANFE_ROUTES] 🔄 Convertendo dados estruturados para DANFE...');
    
    const dadosDANFE = {
      // Identificação
      chaveAcesso: nfe.chave || '',
      numero: String(nfe.numero || ''),
      serie: String(nfe.serie || ''),
      dataEmissao: nfe.createdAt || '',
      protocolo: nfe.protocolo || '',
      dataAutorizacao: nfe.dataAutorizacao || '',
      
      // Emitente
      emitente: {
        razaoSocial: nfe.emitente?.razaoSocial || '',
        nomeFantasia: nfe.emitente?.nomeFantasia || '',
        cnpj: nfe.emitente?.cnpj || '',
        ie: nfe.emitente?.ie || '',
        endereco: nfe.emitente?.endereco?.logradouro || '',
        bairro: nfe.emitente?.endereco?.bairro || '',
        cep: nfe.emitente?.endereco?.cep || '',
        municipio: nfe.emitente?.endereco?.municipio || '',
        uf: nfe.emitente?.uf || '',
        telefone: nfe.emitente?.telefone || ''
      },
      
      // Destinatário
      destinatario: {
        nome: nfe.destinatario?.nome || '',
        cpfCnpj: nfe.destinatario?.cpfCnpj || '',
        ie: nfe.destinatario?.ie || '',
        endereco: nfe.destinatario?.endereco?.logradouro || '',
        bairro: nfe.destinatario?.endereco?.bairro || '',
        cep: nfe.destinatario?.endereco?.cep || '',
        municipio: nfe.destinatario?.endereco?.municipio || '',
        uf: nfe.destinatario?.endereco?.uf || '',
        telefone: nfe.destinatario?.telefone || ''
      },
      
      // Produtos
      produtos: (nfe.produtos || []).map((p: any) => ({
        codigo: p.codigo || '',
        descricao: p.descricao || '',
        ncm: p.ncm || '',
        cst: p.impostos?.icms?.cst || '00',
        cfop: p.cfop || '',
        unidade: p.unidade || 'UN',
        quantidade: p.quantidade || 0,
        valorUnitario: p.valorUnitario || 0,
        valorTotal: p.valorTotal || 0,
        bcIcms: p.impostos?.icms?.bc || 0,
        valorIcms: p.impostos?.icms?.valor || 0,
        ipi: p.impostos?.ipi || 0,
        aliqIcms: p.impostos?.icms?.aliquota || 0
      })),
      
      // Totais
      totais: {
        baseCalculoIcms: nfe.valores?.baseICMS || 0,
        valorIcms: nfe.valores?.valorICMS || 0,
        baseCalculoIcmsST: nfe.valores?.baseICMSST || 0,
        valorIcmsST: nfe.valores?.valorICMSST || 0,
        valorTotalProdutos: nfe.valores?.totalProdutos || 0,
        valorFrete: nfe.valores?.valorFrete || 0,
        valorSeguro: nfe.valores?.valorSeguro || 0,
        desconto: nfe.valores?.valorDesconto || 0,
        outrasDespesas: nfe.valores?.valorOutros || 0,
        valorIPI: nfe.valores?.valorIPI || 0,
        valorTotal: nfe.valores?.totalNFe || 0
      },
      
      // Transporte
      transporte: nfe.transporte ? {
        modalidade: nfe.transporte.modalidade || '9',
        transportador: nfe.transporte.transportadora ? {
          nome: nfe.transporte.transportadora.nome || '',
          cnpjCpf: nfe.transporte.transportadora.cnpj || '',
          ie: nfe.transporte.transportadora.ie || '',
          endereco: nfe.transporte.transportadora.endereco || '',
          municipio: '',
          uf: ''
        } : undefined,
        volumes: nfe.transporte.volumes && nfe.transporte.volumes.length > 0 ? {
          quantidade: nfe.transporte.volumes[0].quantidade || 0,
          especie: nfe.transporte.volumes[0].especie || '',
          marca: nfe.transporte.volumes[0].marca || '',
          numeracao: nfe.transporte.volumes[0].numeracao || '',
          pesoLiquido: nfe.transporte.volumes[0].pesoLiquido || 0,
          pesoBruto: nfe.transporte.volumes[0].pesoBruto || 0
        } : undefined
      } : undefined,
      
      // Informações Adicionais
      informacoesComplementares: nfe.informacoesComplementares || '',
      informacoesFisco: nfe.informacoesFisco || '',
      
      // Tipo
      tipoOperacao: (nfe.tipo || 'SAIDA') as 'ENTRADA' | 'SAIDA',
      naturezaOperacao: nfe.natureza || '',
      ambiente: nfe.ambiente || 2
    };
    
    console.log('[DANFE_ROUTES] ✅ Dados convertidos:', {
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
    
    // 3. Converter dados estruturados (SEM parser XML)
    const dadosDANFE = {
      chaveAcesso: nfe.chave || '',
      numero: String(nfe.numero || ''),
      serie: String(nfe.serie || ''),
      dataEmissao: nfe.createdAt || '',
      protocolo: nfe.protocolo || '',
      dataAutorizacao: nfe.dataAutorizacao || '',
      emitente: {
        razaoSocial: nfe.emitente?.razaoSocial || '',
        nomeFantasia: nfe.emitente?.nomeFantasia || '',
        cnpj: nfe.emitente?.cnpj || '',
        ie: nfe.emitente?.ie || '',
        endereco: nfe.emitente?.endereco?.logradouro || '',
        bairro: nfe.emitente?.endereco?.bairro || '',
        cep: nfe.emitente?.endereco?.cep || '',
        municipio: nfe.emitente?.endereco?.municipio || '',
        uf: nfe.emitente?.uf || '',
        telefone: nfe.emitente?.telefone || ''
      },
      destinatario: {
        nome: nfe.destinatario?.nome || '',
        cpfCnpj: nfe.destinatario?.cpfCnpj || '',
        ie: nfe.destinatario?.ie || '',
        endereco: nfe.destinatario?.endereco?.logradouro || '',
        bairro: nfe.destinatario?.endereco?.bairro || '',
        cep: nfe.destinatario?.endereco?.cep || '',
        municipio: nfe.destinatario?.endereco?.municipio || '',
        uf: nfe.destinatario?.endereco?.uf || '',
        telefone: nfe.destinatario?.telefone || ''
      },
      produtos: (nfe.produtos || []).map((p: any) => ({
        codigo: p.codigo || '',
        descricao: p.descricao || '',
        ncm: p.ncm || '',
        cst: p.impostos?.icms?.cst || '00',
        cfop: p.cfop || '',
        unidade: p.unidade || 'UN',
        quantidade: p.quantidade || 0,
        valorUnitario: p.valorUnitario || 0,
        valorTotal: p.valorTotal || 0,
        bcIcms: p.impostos?.icms?.bc || 0,
        valorIcms: p.impostos?.icms?.valor || 0,
        ipi: p.impostos?.ipi || 0,
        aliqIcms: p.impostos?.icms?.aliquota || 0
      })),
      totais: {
        baseCalculoIcms: nfe.valores?.baseICMS || 0,
        valorIcms: nfe.valores?.valorICMS || 0,
        baseCalculoIcmsST: nfe.valores?.baseICMSST || 0,
        valorIcmsST: nfe.valores?.valorICMSST || 0,
        valorTotalProdutos: nfe.valores?.totalProdutos || 0,
        valorFrete: nfe.valores?.valorFrete || 0,
        valorSeguro: nfe.valores?.valorSeguro || 0,
        desconto: nfe.valores?.valorDesconto || 0,
        outrasDespesas: nfe.valores?.valorOutros || 0,
        valorIPI: nfe.valores?.valorIPI || 0,
        valorTotal: nfe.valores?.totalNFe || 0
      },
      transporte: nfe.transporte,
      informacoesComplementares: nfe.informacoesComplementares || '',
      informacoesFisco: nfe.informacoesFisco || '',
      tipoOperacao: (nfe.tipo || 'SAIDA') as 'ENTRADA' | 'SAIDA',
      naturezaOperacao: nfe.natureza || '',
      ambiente: nfe.ambiente || 2
    };
    
    // 4. Retornar JSON
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
