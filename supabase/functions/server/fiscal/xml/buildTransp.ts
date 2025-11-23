// ============================================================================
// BUILDER: TRANSP - Transporte da NF-e
// Descrição: Monta o bloco <transp> do XML da NF-e
// ============================================================================

import { NFe } from '../types.ts';
import { formatCNPJ, formatCPF, formatPlaca, sanitizeXML, removeAcentos } from '../utils/formatters.ts';

/**
 * Monta o bloco <transp> - Informações de Transporte
 * 
 * Estrutura:
 * <transp>
 *   <modFrete>modalidade frete</modFrete>
 *   <transporta>
 *     <CNPJ>CNPJ</CNPJ>
 *     <xNome>Nome</xNome>
 *     <IE>IE</IE>
 *     <xEnder>Endereço</xEnder>
 *     <xMun>Município</xMun>
 *     <UF>UF</UF>
 *   </transporta>
 *   <veicTransp>
 *     <placa>Placa</placa>
 *     <UF>UF</UF>
 *   </veicTransp>
 * </transp>
 */
export function buildTransp(nfe: NFe): string {
  let xml = '    <transp>\n';
  
  // Modalidade do Frete
  // 0=Emitente, 1=Destinatário, 2=Terceiros, 3=Próprio Remetente, 4=Próprio Destinatário, 9=Sem Frete
  xml += `      <modFrete>${nfe.modalidadeFrete}</modFrete>\n`;
  
  // Se houver transportadora
  if (nfe.transportadoraDocumento && nfe.transportadoraNome) {
    xml += '      <transporta>\n';
    
    // CNPJ ou CPF da transportadora
    if (nfe.transportadoraDocumento.length === 14) {
      xml += `        <CNPJ>${formatCNPJ(nfe.transportadoraDocumento)}</CNPJ>\n`;
    } else {
      xml += `        <CPF>${formatCPF(nfe.transportadoraDocumento)}</CPF>\n`;
    }
    
    // Nome/Razão Social
    xml += `        <xNome>${sanitizeXML(removeAcentos(nfe.transportadoraNome))}</xNome>\n`;
    
    // Inscrição Estadual (opcional)
    // IE, endereço, município e UF são opcionais
    
    xml += '      </transporta>\n';
  }
  
  // Se houver veículo
  if (nfe.veiculoPlaca && nfe.veiculoUf) {
    xml += '      <veicTransp>\n';
    xml += `        <placa>${formatPlaca(nfe.veiculoPlaca)}</placa>\n`;
    xml += `        <UF>${nfe.veiculoUf}</UF>\n`;
    xml += '      </veicTransp>\n';
  }
  
  xml += '    </transp>\n';
  
  return xml;
}

/**
 * Valida as informações de transporte
 */
export function validateTransp(nfe: NFe): string[] {
  const errors: string[] = [];
  
  // Modalidade de frete é obrigatória
  if (nfe.modalidadeFrete === undefined) {
    errors.push('Modalidade de frete é obrigatória');
  }
  
  if (nfe.modalidadeFrete < 0 || nfe.modalidadeFrete > 9) {
    errors.push('Modalidade de frete deve estar entre 0 e 9');
  }
  
  // Se informou transportadora, validar dados
  if (nfe.transportadoraDocumento) {
    if (!nfe.transportadoraNome) {
      errors.push('Nome da transportadora é obrigatório quando informado o documento');
    }
  }
  
  // Se informou placa, UF é obrigatória
  if (nfe.veiculoPlaca && !nfe.veiculoUf) {
    errors.push('UF do veículo é obrigatória quando informada a placa');
  }
  
  return errors;
}
