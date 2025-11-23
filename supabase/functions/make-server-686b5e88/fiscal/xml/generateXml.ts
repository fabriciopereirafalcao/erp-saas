// ============================================================================
// GERADOR DE XML NF-e 4.0
// Descrição: Monta o XML completo da NF-e conforme layout SEFAZ
// ============================================================================

import { NFe, NFeItem, Emitente, XmlNFeOutput, ApiResponse } from '../types.ts';
import { gerarChaveAcesso, ChaveAcessoInput } from '../utils/chaveAcesso.ts';
import { buildIde, validateIde } from './buildIde.ts';
import { buildEmit, validateEmit } from './buildEmit.ts';
import { buildDest, validateDest } from './buildDest.ts';
import { buildDet, validateDet } from './buildDet.ts';
import { buildTotal, validateTotal } from './buildTotal.ts';
import { buildTransp, validateTransp } from './buildTransp.ts';
import { buildPagamento, validatePagamento } from './buildPagamento.ts';
import { buildInfAdic, validateInfAdic, adicionarInformacaoTributaria } from './buildInfAdic.ts';

/**
 * Gera o XML completo da NF-e (sem assinatura)
 * 
 * @param nfe - Dados da NF-e
 * @param itens - Itens da NF-e
 * @param emitente - Dados do emitente
 * @returns XML completo (sem assinatura) e chave de acesso
 */
export async function generateXmlNFe(
  nfe: NFe,
  itens: NFeItem[],
  emitente: Emitente
): Promise<ApiResponse<{ xml: string; chaveAcesso: string }>> {
  try {
    console.log('[XML_GENERATOR] Iniciando geração de XML...');
    console.log('[XML_GENERATOR] NF-e:', nfe.numero, 'Série:', nfe.serie);
    console.log('[XML_GENERATOR] Emitente:', emitente.razaoSocial);
    console.log('[XML_GENERATOR] Itens:', itens.length);

    // ========== 1. VALIDAÇÕES ==========
    
    console.log('[XML_GENERATOR] Validando dados...');
    const validationErrors = validateNFeData(nfe, itens, emitente);
    
    if (validationErrors.length > 0) {
      console.error('[XML_GENERATOR] Erros de validação:', validationErrors);
      return {
        success: false,
        error: 'Dados inválidos para geração do XML',
        message: validationErrors.join('; ')
      };
    }

    // ========== 2. GERAR CHAVE DE ACESSO ==========
    
    console.log('[XML_GENERATOR] Gerando chave de acesso...');
    
    const chaveInput: ChaveAcessoInput = {
      uf: emitente.estado || 'SP',
      dataEmissao: new Date(nfe.dataEmissao),
      cnpj: emitente.cnpj,
      modelo: nfe.modelo,
      serie: nfe.serie,
      numero: nfe.numero,
      formaEmissao: 1 // 1=Normal
    };
    
    const chaveAcesso = gerarChaveAcesso(chaveInput);
    console.log('[XML_GENERATOR] Chave de acesso:', chaveAcesso);

    // ========== 3. ADICIONAR INFORMAÇÕES TRIBUTÁRIAS ==========
    
    const infoTributaria = adicionarInformacaoTributaria(nfe);
    if (infoTributaria && !nfe.informacoesComplementares?.includes(infoTributaria)) {
      nfe.informacoesComplementares = nfe.informacoesComplementares 
        ? `${nfe.informacoesComplementares} | ${infoTributaria}`
        : infoTributaria;
    }

    // ========== 4. MONTAR XML ==========
    
    console.log('[XML_GENERATOR] Montando XML...');
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">\n';
    xml += `  <infNFe versao="4.00" Id="NFe${chaveAcesso}">\n`;
    
    // IDE - Identificação
    console.log('[XML_GENERATOR] Montando bloco IDE...');
    xml += buildIde(nfe, emitente, chaveAcesso);
    
    // EMIT - Emitente
    console.log('[XML_GENERATOR] Montando bloco EMIT...');
    xml += buildEmit(emitente);
    
    // DEST - Destinatário
    console.log('[XML_GENERATOR] Montando bloco DEST...');
    xml += buildDest(nfe);
    
    // DET - Detalhamento dos Produtos/Serviços
    console.log('[XML_GENERATOR] Montando bloco DET...');
    xml += buildDet(itens, emitente);
    
    // TOTAL - Valores Totais
    console.log('[XML_GENERATOR] Montando bloco TOTAL...');
    xml += buildTotal(nfe);
    
    // TRANSP - Transporte
    console.log('[XML_GENERATOR] Montando bloco TRANSP...');
    xml += buildTransp(nfe);
    
    // PAG - Pagamento
    console.log('[XML_GENERATOR] Montando bloco PAG...');
    xml += buildPagamento(nfe);
    
    // INFADIC - Informações Adicionais
    console.log('[XML_GENERATOR] Montando bloco INFADIC...');
    const infAdic = buildInfAdic(nfe);
    if (infAdic) {
      xml += infAdic;
    }
    
    xml += '  </infNFe>\n';
    xml += '</NFe>';

    console.log('[XML_GENERATOR] ✅ XML gerado com sucesso!');
    console.log('[XML_GENERATOR] Tamanho:', xml.length, 'bytes');

    return {
      success: true,
      data: {
        xml,
        chaveAcesso
      },
      message: 'XML gerado com sucesso'
    };

  } catch (error: any) {
    console.error('[XML_GENERATOR] Erro ao gerar XML:', error);
    return {
      success: false,
      error: 'Erro ao gerar XML da NF-e',
      message: error.message
    };
  }
}

/**
 * Valida todos os dados necessários para gerar a NF-e
 */
function validateNFeData(
  nfe: NFe,
  itens: NFeItem[],
  emitente: Emitente
): string[] {
  const errors: string[] = [];
  
  // Validar IDE
  errors.push(...validateIde(nfe, emitente));
  
  // Validar EMIT
  errors.push(...validateEmit(emitente));
  
  // Validar DEST
  errors.push(...validateDest(nfe));
  
  // Validar DET (itens)
  errors.push(...validateDet(itens));
  
  // Validar TOTAL
  errors.push(...validateTotal(nfe));
  
  // Validar TRANSP
  errors.push(...validateTransp(nfe));
  
  // Validar PAG
  errors.push(...validatePagamento(nfe));
  
  // Validar INFADIC
  errors.push(...validateInfAdic(nfe));
  
  return errors;
}

/**
 * Formata XML com indentação (para debug)
 */
export function formatXmlForDebug(xml: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  } catch {
    return xml;
  }
}

/**
 * Extrai apenas o bloco <infNFe> do XML (usado para assinatura)
 */
export function extractInfNFe(xml: string): string {
  const inicio = xml.indexOf('<infNFe');
  const fim = xml.indexOf('</infNFe>') + '</infNFe>'.length;
  
  if (inicio === -1 || fim === -1) {
    throw new Error('Bloco infNFe não encontrado no XML');
  }
  
  return xml.substring(inicio, fim);
}

/**
 * Calcula tamanho do XML em bytes
 */
export function getXmlSize(xml: string): number {
  return new Blob([xml]).size;
}

/**
 * Valida estrutura básica do XML
 */
export function validateXmlStructure(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Verificar declaração XML
  if (!xml.startsWith('<?xml')) {
    errors.push('XML deve começar com declaração <?xml');
  }
  
  // Verificar encoding UTF-8
  if (!xml.includes('encoding="UTF-8"')) {
    errors.push('XML deve usar encoding UTF-8');
  }
  
  // Verificar namespace
  if (!xml.includes('xmlns="http://www.portalfiscal.inf.br/nfe"')) {
    errors.push('Namespace da NF-e não encontrado');
  }
  
  // Verificar versão
  if (!xml.includes('versao="4.00"')) {
    errors.push('Versão do layout deve ser 4.00');
  }
  
  // Verificar blocos obrigatórios
  const blocosObrigatorios = ['<infNFe', '<ide>', '<emit>', '<dest>', '<det', '<total>', '<transp>', '<pag>'];
  blocosObrigatorios.forEach(bloco => {
    if (!xml.includes(bloco)) {
      errors.push(`Bloco obrigatório não encontrado: ${bloco}`);
    }
  });
  
  // Verificar chave de acesso
  if (!xml.includes('Id="NFe') || !xml.match(/Id="NFe\d{44}"/)) {
    errors.push('Chave de acesso inválida ou não encontrada');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
