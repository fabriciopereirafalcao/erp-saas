// ============================================================================
// BUILDER: TOTAL - Totalização da NF-e
// Descrição: Monta o bloco <total> do XML da NF-e
// ============================================================================

import { NFe } from '../types.ts';
import { formatValor } from '../utils/formatters.ts';

/**
 * Monta o bloco <total> - Valores Totais da NF-e
 * 
 * Estrutura:
 * <total>
 *   <ICMSTot>
 *     <vBC>Base de Cálculo ICMS</vBC>
 *     <vICMS>Valor ICMS</vICMS>
 *     <vICMSDeson>Valor ICMS Desonerado</vICMSDeson>
 *     <vFCP>Valor FCP</vFCP>
 *     <vBCST>Base de Cálculo ICMS ST</vBCST>
 *     <vST>Valor ICMS ST</vST>
 *     <vFCPST>Valor FCP ST</vFCPST>
 *     <vProd>Valor Produtos</vProd>
 *     <vFrete>Valor Frete</vFrete>
 *     <vSeg>Valor Seguro</vSeg>
 *     <vDesc>Valor Desconto</vDesc>
 *     <vII>Valor II</vII>
 *     <vIPI>Valor IPI</vIPI>
 *     <vIPIDevol>Valor IPI Devolvido</vIPIDevol>
 *     <vPIS>Valor PIS</vPIS>
 *     <vCOFINS>Valor COFINS</vCOFINS>
 *     <vOutro>Outras Despesas</vOutro>
 *     <vNF>Valor Total da NF-e</vNF>
 *   </ICMSTot>
 * </total>
 */
export function buildTotal(nfe: NFe): string {
  let xml = '    <total>\n';
  xml += '      <ICMSTot>\n';
  
  // Base de Cálculo do ICMS
  // Normalmente é a soma das bases de cálculo dos itens, mas simplificamos usando o valor dos produtos
  const vBC = nfe.valorProdutos - nfe.valorDesconto + nfe.valorFrete + nfe.valorSeguro + nfe.valorOutrasDespesas;
  xml += `        <vBC>${formatValor(vBC)}</vBC>\n`;
  
  // Valor Total do ICMS
  xml += `        <vICMS>${formatValor(nfe.valorIcms)}</vICMS>\n`;
  
  // Valor Total do ICMS Desonerado
  if (nfe.valorIcmsDesonerado > 0) {
    xml += `        <vICMSDeson>${formatValor(nfe.valorIcmsDesonerado)}</vICMSDeson>\n`;
  } else {
    xml += `        <vICMSDeson>0.00</vICMSDeson>\n`;
  }
  
  // Valor do FCP (Fundo de Combate à Pobreza)
  if (nfe.valorFcp > 0) {
    xml += `        <vFCP>${formatValor(nfe.valorFcp)}</vFCP>\n`;
  }
  
  // Base de Cálculo do ICMS ST
  if (nfe.valorIcmsSt > 0) {
    xml += `        <vBCST>${formatValor(nfe.valorIcmsSt)}</vBCST>\n`;
  } else {
    xml += `        <vBCST>0.00</vBCST>\n`;
  }
  
  // Valor Total do ICMS ST
  xml += `        <vST>${formatValor(nfe.valorIcmsSt)}</vST>\n`;
  
  // Valor do FCP retido por ST
  xml += `        <vFCPST>0.00</vFCPST>\n`;
  
  // Valor Total dos Produtos
  xml += `        <vProd>${formatValor(nfe.valorProdutos)}</vProd>\n`;
  
  // Valor Total do Frete
  xml += `        <vFrete>${formatValor(nfe.valorFrete)}</vFrete>\n`;
  
  // Valor Total do Seguro
  xml += `        <vSeg>${formatValor(nfe.valorSeguro)}</vSeg>\n`;
  
  // Valor Total do Desconto
  xml += `        <vDesc>${formatValor(nfe.valorDesconto)}</vDesc>\n`;
  
  // Valor Total do II (Imposto de Importação)
  xml += `        <vII>${formatValor(nfe.valorIi || 0)}</vII>\n`;
  
  // Valor Total do IPI
  xml += `        <vIPI>${formatValor(nfe.valorIpi)}</vIPI>\n`;
  
  // Valor do IPI Devolvido
  xml += `        <vIPIDevol>0.00</vIPIDevol>\n`;
  
  // Valor Total do PIS
  xml += `        <vPIS>${formatValor(nfe.valorPis)}</vPIS>\n`;
  
  // Valor Total do COFINS
  xml += `        <vCOFINS>${formatValor(nfe.valorCofins)}</vCOFINS>\n`;
  
  // Outras Despesas Acessórias
  xml += `        <vOutro>${formatValor(nfe.valorOutrasDespesas)}</vOutro>\n`;
  
  // Valor Total da NF-e
  xml += `        <vNF>${formatValor(nfe.valorTotalNota)}</vNF>\n`;
  
  xml += '      </ICMSTot>\n';
  xml += '    </total>\n';
  
  return xml;
}

/**
 * Valida os totalizadores da NF-e
 */
export function validateTotal(nfe: NFe): string[] {
  const errors: string[] = [];
  
  if (nfe.valorProdutos <= 0) {
    errors.push('Valor total dos produtos deve ser maior que zero');
  }
  
  if (nfe.valorTotalNota <= 0) {
    errors.push('Valor total da NF-e deve ser maior que zero');
  }
  
  // Validar cálculo do total
  const totalCalculado = 
    nfe.valorProdutos + 
    nfe.valorFrete + 
    nfe.valorSeguro + 
    nfe.valorOutrasDespesas + 
    nfe.valorIcmsSt + 
    nfe.valorIpi - 
    nfe.valorDesconto;
  
  const diferenca = Math.abs(totalCalculado - nfe.valorTotalNota);
  
  if (diferenca > 0.02) { // Tolerância de 2 centavos por arredondamento
    errors.push(`Valor total da NF-e inconsistente. Calculado: ${totalCalculado.toFixed(2)}, Informado: ${nfe.valorTotalNota.toFixed(2)}`);
  }
  
  return errors;
}
