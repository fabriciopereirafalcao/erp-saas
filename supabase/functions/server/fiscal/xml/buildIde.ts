// ============================================================================
// BUILDER: IDE - Identificação da NF-e
// Descrição: Monta o bloco <ide> do XML da NF-e
// ============================================================================

import { NFe, Emitente } from '../types.ts';
import { 
  formatNumero, 
  formatSerie, 
  formatDateTime,
  getCodigoUF,
  formatCodigoMunicipio 
} from '../utils/formatters.ts';

/**
 * Monta o bloco <ide> - Identificação da NF-e
 * 
 * Estrutura:
 * <ide>
 *   <cUF>código UF</cUF>
 *   <cNF>código numérico</cNF>
 *   <natOp>natureza operação</natOp>
 *   <mod>modelo</mod>
 *   <serie>série</serie>
 *   <nNF>número</nNF>
 *   <dhEmi>data emissão</dhEmi>
 *   <dhSaiEnt>data saída</dhSaiEnt>
 *   <tpNF>tipo operação</tpNF>
 *   <idDest>destino operação</idDest>
 *   <cMunFG>município</cMunFG>
 *   <tpImp>tipo impressão</tpImp>
 *   <tpEmis>tipo emissão</tpEmis>
 *   <cDV>dígito verificador</cDV>
 *   <tpAmb>ambiente</tpAmb>
 *   <finNFe>finalidade</finNFe>
 *   <indFinal>consumidor final</indFinal>
 *   <indPres>presença</indPres>
 *   <procEmi>processo emissão</procEmi>
 *   <verProc>versão processo</verProc>
 * </ide>
 */
export function buildIde(nfe: NFe, emitente: Emitente, chaveAcesso: string): string {
  // Extrair código numérico e DV da chave de acesso
  const codigoNumerico = chaveAcesso.substring(35, 43);
  const dv = chaveAcesso.substring(43, 44);
  
  // Código da UF do emitente
  const cUF = getCodigoUF(emitente.estado || 'SP');
  
  // Código do município (7 dígitos)
  const cMunFG = formatCodigoMunicipio(emitente.codigoMunicipio || '3550308'); // São Paulo default
  
  // Determinar destino da operação
  // 1=Interna, 2=Interestadual, 3=Exterior
  let idDest = '1';
  if (nfe.destinatarioEndereco?.estado) {
    if (nfe.destinatarioEndereco.estado !== emitente.estado) {
      idDest = '2'; // Interestadual
    }
  }
  
  // Determinar se é consumidor final
  // 0=Não, 1=Sim
  const indFinal = nfe.destinatarioTipo === 'PF' ? '1' : '0';
  
  // Presença do comprador
  // 0=Não se aplica, 1=Presencial, 2=Internet, 3=Teleatendimento, 4=Entrega em domicílio, 9=Outros
  const indPres = nfe.modelo === '65' ? '1' : '0'; // NFC-e sempre presencial
  
  let xml = '    <ide>\n';
  xml += `      <cUF>${cUF}</cUF>\n`;
  xml += `      <cNF>${codigoNumerico}</cNF>\n`;
  xml += `      <natOp>${nfe.naturezaOperacao}</natOp>\n`;
  xml += `      <mod>${nfe.modelo}</mod>\n`;
  xml += `      <serie>${formatSerie(nfe.serie)}</serie>\n`;
  xml += `      <nNF>${formatNumero(nfe.numero)}</nNF>\n`;
  xml += `      <dhEmi>${formatDateTime(nfe.dataEmissao)}</dhEmi>\n`;
  
  // Data de saída/entrada (opcional)
  if (nfe.dataSaidaEntrada) {
    xml += `      <dhSaiEnt>${formatDateTime(nfe.dataSaidaEntrada)}</dhSaiEnt>\n`;
  }
  
  xml += `      <tpNF>${nfe.tipoOperacao}</tpNF>\n`;
  xml += `      <idDest>${idDest}</idDest>\n`;
  xml += `      <cMunFG>${cMunFG}</cMunFG>\n`;
  xml += `      <tpImp>1</tpImp>\n`; // 1=DANFE Retrato
  xml += `      <tpEmis>1</tpEmis>\n`; // 1=Emissão normal
  xml += `      <cDV>${dv}</cDV>\n`;
  xml += `      <tpAmb>${nfe.ambiente}</tpAmb>\n`;
  xml += `      <finNFe>${nfe.finalidadeNfe}</finNFe>\n`;
  xml += `      <indFinal>${indFinal}</indFinal>\n`;
  xml += `      <indPres>${indPres}</indPres>\n`;
  xml += `      <procEmi>0</procEmi>\n`; // 0=Emissão com aplicativo do contribuinte
  xml += `      <verProc>1.0.0</verProc>\n`; // Versão do aplicativo
  xml += '    </ide>\n';
  
  return xml;
}

/**
 * Valida os dados do bloco IDE
 */
export function validateIde(nfe: NFe, emitente: Emitente): string[] {
  const errors: string[] = [];
  
  if (!nfe.naturezaOperacao || nfe.naturezaOperacao.length === 0) {
    errors.push('Natureza da operação é obrigatória');
  }
  
  if (!nfe.modelo || (nfe.modelo !== '55' && nfe.modelo !== '65')) {
    errors.push('Modelo deve ser 55 (NF-e) ou 65 (NFC-e)');
  }
  
  if (!nfe.serie) {
    errors.push('Série é obrigatória');
  }
  
  if (!nfe.numero || nfe.numero <= 0) {
    errors.push('Número da nota é obrigatório e deve ser maior que zero');
  }
  
  if (!nfe.dataEmissao) {
    errors.push('Data de emissão é obrigatória');
  }
  
  if (nfe.tipoOperacao !== 0 && nfe.tipoOperacao !== 1) {
    errors.push('Tipo de operação deve ser 0 (Entrada) ou 1 (Saída)');
  }
  
  if (!nfe.ambiente || (nfe.ambiente !== 1 && nfe.ambiente !== 2)) {
    errors.push('Ambiente deve ser 1 (Produção) ou 2 (Homologação)');
  }
  
  if (!emitente.estado) {
    errors.push('UF do emitente é obrigatória');
  }
  
  if (!emitente.codigoMunicipio) {
    errors.push('Código do município do emitente é obrigatório');
  }
  
  return errors;
}
