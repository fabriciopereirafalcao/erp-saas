// ============================================================================
// BUILDER: EMIT - Emitente da NF-e
// Descrição: Monta o bloco <emit> do XML da NF-e
// ============================================================================

import { Emitente } from '../types.ts';
import { 
  formatCNPJ, 
  formatCEP, 
  formatTelefone,
  sanitizeXML,
  removeAcentos 
} from '../utils/formatters.ts';

/**
 * Monta o bloco <emit> - Identificação do Emitente
 * 
 * Estrutura:
 * <emit>
 *   <CNPJ>CNPJ</CNPJ>
 *   <xNome>Razão Social</xNome>
 *   <xFant>Nome Fantasia</xFant>
 *   <enderEmit>
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
 *   </enderEmit>
 *   <IE>Inscrição Estadual</IE>
 *   <IM>Inscrição Municipal</IM>
 *   <CNAE>CNAE</CNAE>
 *   <CRT>Código Regime Tributário</CRT>
 * </emit>
 */
export function buildEmit(emitente: Emitente): string {
  let xml = '    <emit>\n';
  
  // CNPJ (obrigatório)
  xml += `      <CNPJ>${formatCNPJ(emitente.cnpj)}</CNPJ>\n`;
  
  // Razão Social (obrigatório)
  xml += `      <xNome>${sanitizeXML(removeAcentos(emitente.razaoSocial))}</xNome>\n`;
  
  // Nome Fantasia (opcional)
  if (emitente.nomeFantasia) {
    xml += `      <xFant>${sanitizeXML(removeAcentos(emitente.nomeFantasia))}</xFant>\n`;
  }
  
  // Endereço do Emitente
  xml += '      <enderEmit>\n';
  xml += `        <xLgr>${sanitizeXML(removeAcentos(emitente.logradouro || ''))}</xLgr>\n`;
  xml += `        <nro>${sanitizeXML(emitente.numero || 'S/N')}</nro>\n`;
  
  if (emitente.complemento) {
    xml += `        <xCpl>${sanitizeXML(removeAcentos(emitente.complemento))}</xCpl>\n`;
  }
  
  xml += `        <xBairro>${sanitizeXML(removeAcentos(emitente.bairro || ''))}</xBairro>\n`;
  xml += `        <cMun>${emitente.codigoMunicipio || '3550308'}</cMun>\n`;
  xml += `        <xMun>${sanitizeXML(removeAcentos(emitente.cidade || ''))}</xMun>\n`;
  xml += `        <UF>${emitente.estado || 'SP'}</UF>\n`;
  
  if (emitente.cep) {
    xml += `        <CEP>${formatCEP(emitente.cep)}</CEP>\n`;
  }
  
  xml += `        <cPais>1058</cPais>\n`; // Brasil
  xml += `        <xPais>BRASIL</xPais>\n`;
  
  if (emitente.telefone) {
    xml += `        <fone>${formatTelefone(emitente.telefone)}</fone>\n`;
  }
  
  xml += '      </enderEmit>\n';
  
  // Inscrição Estadual (obrigatório)
  if (emitente.inscricaoEstadual) {
    xml += `      <IE>${emitente.inscricaoEstadual.replace(/\D/g, '')}</IE>\n`;
  } else {
    xml += `      <IE>ISENTO</IE>\n`;
  }
  
  // Inscrição Municipal (opcional)
  if (emitente.inscricaoMunicipal) {
    xml += `      <IM>${emitente.inscricaoMunicipal.replace(/\D/g, '')}</IM>\n`;
  }
  
  // CNAE (opcional)
  if (emitente.cnae) {
    xml += `      <CNAE>${emitente.cnae.replace(/\D/g, '')}</CNAE>\n`;
  }
  
  // CRT - Código de Regime Tributário (obrigatório)
  // 1=Simples Nacional, 2=Simples Nacional - excesso, 3=Regime Normal
  xml += `      <CRT>${emitente.crt}</CRT>\n`;
  
  xml += '    </emit>\n';
  
  return xml;
}

/**
 * Valida os dados do Emitente
 */
export function validateEmit(emitente: Emitente): string[] {
  const errors: string[] = [];
  
  if (!emitente.cnpj || emitente.cnpj.length === 0) {
    errors.push('CNPJ do emitente é obrigatório');
  }
  
  if (!emitente.razaoSocial || emitente.razaoSocial.length === 0) {
    errors.push('Razão social do emitente é obrigatória');
  }
  
  if (!emitente.logradouro) {
    errors.push('Logradouro do emitente é obrigatório');
  }
  
  if (!emitente.bairro) {
    errors.push('Bairro do emitente é obrigatório');
  }
  
  if (!emitente.cidade) {
    errors.push('Cidade do emitente é obrigatória');
  }
  
  if (!emitente.estado) {
    errors.push('UF do emitente é obrigatória');
  }
  
  if (!emitente.codigoMunicipio) {
    errors.push('Código do município do emitente é obrigatório');
  }
  
  if (!emitente.crt || (emitente.crt < 1 || emitente.crt > 3)) {
    errors.push('CRT do emitente deve ser 1, 2 ou 3');
  }
  
  return errors;
}
