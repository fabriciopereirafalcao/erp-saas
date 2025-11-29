// ============================================================================
// BUILDER: INFADIC - Informações Adicionais da NF-e
// Descrição: Monta o bloco <infAdic> do XML da NF-e
// ============================================================================

import { NFe } from '../types.ts';
import { sanitizeXML } from '../utils/formatters.ts';

/**
 * Monta o bloco <infAdic> - Informações Adicionais
 * 
 * Estrutura:
 * <infAdic>
 *   <infCpl>Informações Complementares</infCpl>
 *   <infAdFisco>Informações Adicionais de Interesse do Fisco</infAdFisco>
 * </infAdic>
 */
export function buildInfAdic(nfe: NFe): string {
  // Se não houver informações adicionais, não incluir o bloco
  if (!nfe.informacoesComplementares && !nfe.informacoesFisco) {
    return '';
  }
  
  let xml = '    <infAdic>\n';
  
  // Informações Complementares (de interesse do Contribuinte)
  if (nfe.informacoesComplementares) {
    const infCpl = sanitizeXML(nfe.informacoesComplementares);
    xml += `      <infCpl>${infCpl}</infCpl>\n`;
  }
  
  // Informações Adicionais de Interesse do Fisco
  if (nfe.informacoesFisco) {
    const infAdFisco = sanitizeXML(nfe.informacoesFisco);
    xml += `      <infAdFisco>${infAdFisco}</infAdFisco>\n`;
  }
  
  xml += '    </infAdic>\n';
  
  return xml;
}

/**
 * Adiciona informações tributárias obrigatórias
 * (Conforme Lei da Transparência - Lei 12.741/2012)
 */
export function adicionarInformacaoTributaria(nfe: NFe): string {
  const totalTributos = 
    nfe.valorIcms + 
    nfe.valorIcmsSt + 
    nfe.valorIpi + 
    nfe.valorPis + 
    nfe.valorCofins;
  
  const percentualTributos = nfe.valorTotalNota > 0 
    ? (totalTributos / nfe.valorTotalNota) * 100 
    : 0;
  
  let info = '';
  
  if (totalTributos > 0) {
    info += `Valor Aproximado dos Tributos: R$ ${totalTributos.toFixed(2)} (${percentualTributos.toFixed(2)}%) `;
    info += `Fonte: IBPT/empresometro.com.br`;
  }
  
  return info;
}

/**
 * Valida informações adicionais
 */
export function validateInfAdic(nfe: NFe): string[] {
  const errors: string[] = [];
  
  // Informações complementares têm limite de caracteres
  if (nfe.informacoesComplementares && nfe.informacoesComplementares.length > 5000) {
    errors.push('Informações complementares não podem exceder 5000 caracteres');
  }
  
  if (nfe.informacoesFisco && nfe.informacoesFisco.length > 2000) {
    errors.push('Informações adicionais do fisco não podem exceder 2000 caracteres');
  }
  
  return errors;
}
