// ============================================================================
// ROTAS: Fiscal - Endpoints REST para geração de NF-e
// Descrição: Endpoints públicos para o módulo fiscal
// ============================================================================

console.log('[FISCAL_ROUTES] 🚀 ARQUIVO FISCAL/ROUTES.TS CARREGANDO...');

import { Hono } from 'npm:hono@4.6.14';

console.log('[FISCAL_ROUTES] ✅ Import Hono OK');

import { createClient } from 'jsr:@supabase/supabase-js@2';

console.log('[FISCAL_ROUTES] ✅ Import createClient OK');

import { generateXmlNFe } from './xml/generateXml.ts';

console.log('[FISCAL_ROUTES] ✅ Import generateXmlNFe OK');

import type { NFe, NFeItem, Emitente } from './types.ts';

console.log('[FISCAL_ROUTES] ✅ Import types OK');

console.log('[FISCAL_ROUTES] 🔍 Tentando importar calculationRoutes...');
let calculationRoutes;
try {
  calculationRoutes = (await import('./calculationRoutes.ts')).default;
  console.log('[FISCAL_ROUTES] ✅ calculationRoutes importado com sucesso!');
} catch (error) {
  console.error('[FISCAL_ROUTES] ❌ ERRO ao importar calculationRoutes:', error);
  throw error;
}

const fiscal = new Hono();

// ============================================================================
// ROTAS DE CÁLCULO FISCAL (FASE 3)
// ============================================================================
console.log('[FISCAL_ROUTES] Registrando rotas de cálculo...');
fiscal.route('/calculos', calculationRoutes);
console.log('[FISCAL_ROUTES] Rotas de cálculo registradas!');

// ============================================================================
// POST /fiscal/nfe/gerar-xml-direto
// Descrição: Gera o XML da NF-e direto dos dados enviados (sem buscar no banco)
// Auth: Requer token de autenticação
// ============================================================================
fiscal.post('/nfe/gerar-xml-direto', async (c) => {
  try {
    console.log('[FISCAL_ROUTES] POST /nfe/gerar-xml-direto - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token de autenticação não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido ou expirado' }, 401);
    }
    
    console.log('[FISCAL_ROUTES] Usuário autenticado:', user.id);
    
    // 2. Receber dados do body
    const body = await c.req.json();
    console.log('[FISCAL_ROUTES] Dados recebidos');
    
    // 3. Importar e usar o gerador de XML
    const { gerarXMLNFe, validarDadosNFe } = await import('../nfe-xml.tsx');
    
    // 4. Validar dados
    const validacao = validarDadosNFe(body);
    if (!validacao.valido) {
      return c.json({
        success: false,
        error: 'Dados inválidos',
        erros: validacao.erros
      }, 400);
    }
    
    // 5. Gerar XML
    console.log('[FISCAL_ROUTES] Gerando XML...');
    const xml = gerarXMLNFe(body);
    
    console.log('[FISCAL_ROUTES] ✅ XML gerado com sucesso!');
    console.log('[FISCAL_ROUTES] Tamanho:', xml.length, 'bytes');
    
    // 6. Extrair chave de acesso do XML
    const chaveMatch = xml.match(/Id="NFe(\d{44})"/);
    const chaveAcesso = chaveMatch ? chaveMatch[1] : '';
    
    // 7. Retornar resposta
    return c.json({
      success: true,
      data: {
        chaveAcesso,
        xml,
        tamanho: xml.length
      },
      message: 'XML gerado com sucesso'
    });
    
  } catch (error: any) {
    console.error('[FISCAL_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao gerar XML',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// POST /fiscal/gerar-xml
// Descrição: Gera o XML da NF-e (sem assinatura) buscando dados do banco
// Auth: Requer token de autenticação
// ============================================================================
fiscal.post('/gerar-xml', async (c) => {
  try {
    console.log('[FISCAL_ROUTES] POST /gerar-xml - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token de autenticação não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido ou expirado' }, 401);
    }
    
    console.log('[FISCAL_ROUTES] Usuário autenticado:', user.id);
    
    // 2. Receber dados do body
    const body = await c.req.json();
    const { nfeId } = body;
    
    if (!nfeId) {
      return c.json({ success: false, error: 'ID da NF-e não fornecido' }, 400);
    }
    
    console.log('[FISCAL_ROUTES] NF-e ID:', nfeId);
    
    // 3. Buscar dados da NF-e no banco
    const { data: nfeData, error: nfeError } = await supabase
      .from('fiscal_nfes')
      .select('*')
      .eq('id', nfeId)
      .eq('user_id', user.id)
      .single();
    
    if (nfeError || !nfeData) {
      console.error('[FISCAL_ROUTES] Erro ao buscar NF-e:', nfeError);
      return c.json({ success: false, error: 'NF-e não encontrada' }, 404);
    }
    
    console.log('[FISCAL_ROUTES] NF-e encontrada:', nfeData.numero);
    
    // 4. Buscar itens da NF-e
    const { data: itensData, error: itensError } = await supabase
      .from('fiscal_nfe_itens')
      .select('*')
      .eq('nfe_id', nfeId)
      .order('numero_item', { ascending: true });
    
    if (itensError || !itensData || itensData.length === 0) {
      console.error('[FISCAL_ROUTES] Erro ao buscar itens:', itensError);
      return c.json({ success: false, error: 'NF-e sem itens cadastrados' }, 400);
    }
    
    console.log('[FISCAL_ROUTES] Itens encontrados:', itensData.length);
    
    // 5. Buscar dados do emitente
    const { data: emitenteData, error: emitenteError } = await supabase
      .from('fiscal_emitentes')
      .select('*')
      .eq('id', nfeData.emitente_id)
      .eq('user_id', user.id)
      .single();
    
    if (emitenteError || !emitenteData) {
      console.error('[FISCAL_ROUTES] Erro ao buscar emitente:', emitenteError);
      return c.json({ success: false, error: 'Emitente não encontrado' }, 404);
    }
    
    console.log('[FISCAL_ROUTES] Emitente encontrado:', emitenteData.razao_social);
    
    // 6. Mapear dados do banco para o formato esperado
    const nfe: NFe = {
      id: nfeData.id,
      userId: nfeData.user_id,
      emitenteId: nfeData.emitente_id,
      
      // Identificação
      tipoNfe: parseInt(nfeData.modelo),
      modelo: nfeData.modelo,
      serie: nfeData.serie,
      numero: nfeData.numero,
      dataEmissao: new Date(nfeData.data_emissao),
      dataSaidaEntrada: nfeData.data_saida_entrada ? new Date(nfeData.data_saida_entrada) : undefined,
      naturezaOperacao: nfeData.natureza_operacao,
      tipoOperacao: nfeData.tipo_operacao,
      finalidadeNfe: nfeData.finalidade_nfe,
      ambiente: nfeData.ambiente,
      
      // Destinatário
      destinatarioTipo: nfeData.destinatario_tipo,
      destinatarioDocumento: nfeData.destinatario_documento,
      destinatarioNome: nfeData.destinatario_nome,
      destinatarioEmail: nfeData.destinatario_email,
      destinatarioTelefone: nfeData.destinatario_telefone,
      destinatarioIe: nfeData.destinatario_ie,
      destinatarioEndereco: nfeData.destinatario_endereco,
      
      // Valores
      valorProdutos: parseFloat(nfeData.valor_produtos),
      valorFrete: parseFloat(nfeData.valor_frete || 0),
      valorSeguro: parseFloat(nfeData.valor_seguro || 0),
      valorDesconto: parseFloat(nfeData.valor_desconto || 0),
      valorOutrasDespesas: parseFloat(nfeData.valor_outras_despesas || 0),
      valorIcms: parseFloat(nfeData.valor_icms || 0),
      valorIcmsSt: parseFloat(nfeData.valor_icms_st || 0),
      valorIcmsDesonerado: parseFloat(nfeData.valor_icms_desonerado || 0),
      valorFcp: parseFloat(nfeData.valor_fcp || 0),
      valorIpi: parseFloat(nfeData.valor_ipi || 0),
      valorPis: parseFloat(nfeData.valor_pis || 0),
      valorCofins: parseFloat(nfeData.valor_cofins || 0),
      valorTotalNota: parseFloat(nfeData.valor_total_nota),
      
      // Transporte
      modalidadeFrete: nfeData.modalidade_frete,
      transportadoraDocumento: nfeData.transportadora_documento,
      transportadoraNome: nfeData.transportadora_nome,
      veiculoPlaca: nfeData.veiculo_placa,
      veiculoUf: nfeData.veiculo_uf,
      
      // Pagamento
      formaPagamento: nfeData.forma_pagamento,
      meioPagamento: nfeData.meio_pagamento,
      
      // Informações Adicionais
      informacoesComplementares: nfeData.informacoes_complementares,
      informacoesFisco: nfeData.informacoes_fisco,
      
      // Status
      status: nfeData.status,
      chaveAcesso: nfeData.chave_acesso,
      protocolo: nfeData.protocolo,
      dataAutorizacao: nfeData.data_autorizacao ? new Date(nfeData.data_autorizacao) : undefined,
      xmlAssinado: nfeData.xml_assinado,
      xmlAutorizado: nfeData.xml_autorizado,
      
      createdAt: new Date(nfeData.created_at),
      updatedAt: new Date(nfeData.updated_at)
    };
    
    const itens: NFeItem[] = itensData.map((item: any) => ({
      id: item.id,
      nfeId: item.nfe_id,
      numeroItem: item.numero_item,
      
      // Produto
      codigoProduto: item.codigo_produto,
      ean: item.ean,
      descricao: item.descricao,
      ncm: item.ncm,
      cest: item.cest,
      cfop: item.cfop,
      
      // Quantidades e Valores
      unidadeComercial: item.unidade_comercial,
      quantidadeComercial: parseFloat(item.quantidade_comercial),
      valorUnitarioComercial: parseFloat(item.valor_unitario_comercial),
      unidadeTributavel: item.unidade_tributavel,
      quantidadeTributavel: parseFloat(item.quantidade_tributavel),
      valorUnitarioTributavel: parseFloat(item.valor_unitario_tributavel),
      valorTotalBruto: parseFloat(item.valor_total_bruto),
      valorFrete: parseFloat(item.valor_frete || 0),
      valorSeguro: parseFloat(item.valor_seguro || 0),
      valorDesconto: parseFloat(item.valor_desconto || 0),
      valorOutrasDespesas: parseFloat(item.valor_outras_despesas || 0),
      
      // Impostos
      origem: item.origem,
      
      // ICMS
      cstIcms: item.cst_icms,
      csosn: item.csosn,
      modalidadeBcIcms: item.modalidade_bc_icms,
      baseCalculoIcms: parseFloat(item.base_calculo_icms || 0),
      aliquotaIcms: parseFloat(item.aliquota_icms || 0),
      valorIcms: parseFloat(item.valor_icms || 0),
      modalidadeBcIcmsSt: item.modalidade_bc_icms_st,
      baseCalculoIcmsSt: parseFloat(item.base_calculo_icms_st || 0),
      aliquotaIcmsSt: parseFloat(item.aliquota_icms_st || 0),
      valorIcmsSt: parseFloat(item.valor_icms_st || 0),
      
      // IPI
      cstIpi: item.cst_ipi,
      baseCalculoIpi: parseFloat(item.base_calculo_ipi || 0),
      aliquotaIpi: parseFloat(item.aliquota_ipi || 0),
      valorIpi: parseFloat(item.valor_ipi || 0),
      
      // PIS
      cstPis: item.cst_pis,
      baseCalculoPis: parseFloat(item.base_calculo_pis || 0),
      aliquotaPis: parseFloat(item.aliquota_pis || 0),
      valorPis: parseFloat(item.valor_pis || 0),
      
      // COFINS
      cstCofins: item.cst_cofins,
      baseCalculoCofins: parseFloat(item.base_calculo_cofins || 0),
      aliquotaCofins: parseFloat(item.aliquota_cofins || 0),
      valorCofins: parseFloat(item.valor_cofins || 0),
      
      // Informações Adicionais
      informacoesAdicionais: item.informacoes_adicionais
    }));
    
    const emitente: Emitente = {
      id: emitenteData.id,
      userId: emitenteData.user_id,
      
      // Identificação
      cnpj: emitenteData.cnpj,
      razaoSocial: emitenteData.razao_social,
      nomeFantasia: emitenteData.nome_fantasia,
      inscricaoEstadual: emitenteData.inscricao_estadual,
      inscricaoMunicipal: emitenteData.inscricao_municipal,
      cnae: emitenteData.cnae,
      crt: emitenteData.crt,
      
      // Endereço
      logradouro: emitenteData.logradouro,
      numero: emitenteData.numero,
      complemento: emitenteData.complemento,
      bairro: emitenteData.bairro,
      codigoMunicipio: emitenteData.codigo_municipio,
      cidade: emitenteData.cidade,
      estado: emitenteData.estado,
      cep: emitenteData.cep,
      
      // Contato
      telefone: emitenteData.telefone,
      email: emitenteData.email,
      
      // Configurações NF-e (não usadas na geração de XML, mas presentes no tipo)
      ambienteNfe: emitenteData.ambiente_nfe,
      serieNfe: emitenteData.serie_nfe,
      numeroUltimaNfe: emitenteData.numero_ultima_nfe,
      
      ativo: emitenteData.ativo,
      createdAt: new Date(emitenteData.created_at),
      updatedAt: new Date(emitenteData.updated_at)
    };
    
    // 7. Gerar XML
    console.log('[FISCAL_ROUTES] Gerando XML...');
    const result = await generateXmlNFe(nfe, itens, emitente);
    
    if (!result.success) {
      console.error('[FISCAL_ROUTES] Erro ao gerar XML:', result.error);
      return c.json(result, 400);
    }
    
    console.log('[FISCAL_ROUTES] ✅ XML gerado com sucesso!');
    console.log('[FISCAL_ROUTES] Chave de acesso:', result.data!.chaveAcesso);
    console.log('[FISCAL_ROUTES] Tamanho:', result.data!.xml.length, 'bytes');
    
    // 8. Atualizar NF-e no banco com a chave de acesso e XML
    const { error: updateError } = await supabase
      .from('fiscal_nfes')
      .update({
        chave_acesso: result.data!.chaveAcesso,
        xml_assinado: result.data!.xml, // Por enquanto, salva sem assinatura
        status: 'xml_gerado',
        updated_at: new Date().toISOString()
      })
      .eq('id', nfeId);
    
    if (updateError) {
      console.error('[FISCAL_ROUTES] Erro ao atualizar NF-e:', updateError);
    } else {
      console.log('[FISCAL_ROUTES] NF-e atualizada no banco');
    }
    
    // 9. Criar log
    await supabase
      .from('fiscal_logs')
      .insert({
        user_id: user.id,
        tipo: 'xml_gerado',
        operacao: 'gerar_xml',
        detalhes: {
          nfe_id: nfeId,
          chave_acesso: result.data!.chaveAcesso,
          tamanho_xml: result.data!.xml.length
        },
        status: 'sucesso'
      });
    
    // 10. Retornar resposta
    return c.json({
      success: true,
      data: {
        chaveAcesso: result.data!.chaveAcesso,
        xml: result.data!.xml,
        tamanho: result.data!.xml.length
      },
      message: 'XML gerado com sucesso'
    });
    
  } catch (error: any) {
    console.error('[FISCAL_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao gerar XML',
      message: error.message
    }, 500);
  }
});

// ============================================================================
// GET /fiscal/xml/:nfeId
// Descrição: Retorna o XML de uma NF-e já gerada
// Auth: Requer token de autenticação
// ============================================================================
fiscal.get('/xml/:nfeId', async (c) => {
  try {
    const nfeId = c.req.param('nfeId');
    
    // Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token de autenticação não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido ou expirado' }, 401);
    }
    
    // Buscar NF-e
    const { data: nfeData, error: nfeError } = await supabase
      .from('fiscal_nfes')
      .select('chave_acesso, xml_assinado, status')
      .eq('id', nfeId)
      .eq('user_id', user.id)
      .single();
    
    if (nfeError || !nfeData) {
      return c.json({ success: false, error: 'NF-e não encontrada' }, 404);
    }
    
    if (!nfeData.xml_assinado) {
      return c.json({ success: false, error: 'XML ainda não foi gerado para esta NF-e' }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        chaveAcesso: nfeData.chave_acesso,
        xml: nfeData.xml_assinado,
        status: nfeData.status
      }
    });
    
  } catch (error: any) {
    console.error('[FISCAL_ROUTES] Erro ao buscar XML:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar XML',
      message: error.message
    }, 500);
  }
});

export default fiscal;
