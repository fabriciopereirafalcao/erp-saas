// ============================================================================
// BUILDER: DEST - Destinatário da NF-e
// Descrição: Monta o bloco <dest> do XML da NF-e
// ============================================================================

import { NFe } from '../types.ts';
import { 
  formatCNPJ, 
  formatCPF,
  formatCEP, 
  formatTelefone,
  sanitizeXML,
  removeAcentos 
} from '../utils/formatters.ts';

/**
 * Monta o bloco <dest> - Identificação do Destinatário/Remetente
 * 
 * Estrutura:
 * <dest>
 *   <CNPJ>ou</CNPJ><CPF>CPF</CPF>
 *   <xNome>Nome/Razão Social</xNome>
 *   <enderDest>
 *     <xLgr>Logradouro</xLgr>
 *     <nro>Número</nro>
 *     <xCpl>Complemento</xCpl>
 *     <xBairro>Bairro</xBairro>
 *     <cMun>Código Município</cMun>
 *     <xMun>Nome Município</xMun>
 *     <UF>UF</UF>
 *     <CEP>CEP</CEP>
 *     <cPais>Código País</cPais>
 *     <xPais>Nome País</xPais>
 *     <fone>Telefone</fone>
 *   </enderDest>
 *   <indIEDest>Indicador IE</indIEDest>
 *   <IE>Inscrição Estadual</IE>
 *   <email>Email</email>
 * </dest>
 */
export function buildDest(nfe: NFe): string {
  let xml = '    <dest>\n';
  
  // CNPJ ou CPF (obrigatório)
  if (nfe.destinatarioTipo === 'PJ') {
    xml += `      <CNPJ>${formatCNPJ(nfe.destinatarioDocumento)}</CNPJ>\n`;
  } else {
    xml += `      <CPF>${formatCPF(nfe.destinatarioDocumento)}</CPF>\n`;
  }
  
  // Nome/Razão Social (obrigatório)
  xml += `      <xNome>${sanitizeXML(removeAcentos(nfe.destinatarioNome))}</xNome>\n`;
  
  // Endereço do Destinatário
  if (nfe.destinatarioEndereco) {
    const endereco = nfe.destinatarioEndereco;
    
    xml += '      <enderDest>\n';
    xml += `        <xLgr>${sanitizeXML(removeAcentos(endereco.logradouro || ''))}</xLgr>\n`;
    xml += `        <nro>${sanitizeXML(endereco.numero || 'S/N')}</nro>\n`;
    
    if (endereco.complemento) {
      xml += `        <xCpl>${sanitizeXML(removeAcentos(endereco.complemento))}</xCpl>\n`;
    }
    
    xml += `        <xBairro>${sanitizeXML(removeAcentos(endereco.bairro || ''))}</xBairro>\n`;
    xml += `        <cMun>${endereco.codigoMunicipio || '3550308'}</cMun>\n`;
    xml += `        <xMun>${sanitizeXML(removeAcentos(endereco.cidade || ''))}</xMun>\n`;
    xml += `        <UF>${endereco.estado || 'SP'}</UF>\n`;
    
    if (endereco.cep) {
      xml += `        <CEP>${formatCEP(endereco.cep)}</CEP>\n`;
    }
    
    xml += `        <cPais>1058</cPais>\n`; // Brasil
    xml += `        <xPais>BRASIL</xPais>\n`;
    
    if (nfe.destinatarioTelefone) {
      xml += `        <fone>${formatTelefone(nfe.destinatarioTelefone)}</fone>\n`;
    }
    
    xml += '      </enderDest>\n';
  }
  
  // Indicador de Inscrição Estadual
  // 1=Contribuinte ICMS, 2=Isento, 9=Não contribuinte
  let indIEDest = '9'; // Não contribuinte (padrão para PF)
  
  if (nfe.destinatarioTipo === 'PJ') {
    if (nfe.destinatarioIe && nfe.destinatarioIe.toUpperCase() !== 'ISENTO') {
      indIEDest = '1'; // Contribuinte
      xml += `      <indIEDest>${indIEDest}</indIEDest>\n`;
      xml += `      <IE>${nfe.destinatarioIe.replace(/\D/g, '')}</IE>\n`;
    } else {
      indIEDest = '2'; // Isento
      xml += `      <indIEDest>${indIEDest}</indIEDest>\n`;
    }
  } else {
    xml += `      <indIEDest>${indIEDest}</indIEDest>\n`;
  }
  
  // Email (opcional)
  if (nfe.destinatarioEmail) {
    xml += `      <email>${sanitizeXML(nfe.destinatarioEmail)}</email>\n`;
  }
  
  xml += '    </dest>\n';
  
  return xml;
}

/**
 * Valida os dados do Destinatário
 */
export function validateDest(nfe: NFe): string[] {
  const errors: string[] = [];
  
  if (!nfe.destinatarioTipo || (nfe.destinatarioTipo !== 'PF' && nfe.destinatarioTipo !== 'PJ')) {
    errors.push('Tipo do destinatário deve ser PF ou PJ');
  }
  
  if (!nfe.destinatarioDocumento || nfe.destinatarioDocumento.length === 0) {
    errors.push('CPF/CNPJ do destinatário é obrigatório');
  }
  
  if (!nfe.destinatarioNome || nfe.destinatarioNome.length === 0) {
    errors.push('Nome/Razão Social do destinatário é obrigatório');
  }
  
  // Endereço é obrigatório para operações com destinatário
  if (!nfe.destinatarioEndereco) {
    errors.push('Endereço do destinatário é obrigatório');
  } else {
    const endereco = nfe.destinatarioEndereco;
    
    if (!endereco.logradouro) {
      errors.push('Logradouro do destinatário é obrigatório');
    }
    
    if (!endereco.bairro) {
      errors.push('Bairro do destinatário é obrigatório');
    }
    
    if (!endereco.cidade) {
      errors.push('Cidade do destinatário é obrigatória');
    }
    
    if (!endereco.estado) {
      errors.push('UF do destinatário é obrigatória');
    }
    
    if (!endereco.codigoMunicipio) {
      errors.push('Código do município do destinatário é obrigatório');
    }
  }
  
  return errors;
}
