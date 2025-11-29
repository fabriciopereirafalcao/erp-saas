// ============================================================================
// BUILDER: PAGAMENTO - Formas de Pagamento da NF-e
// Descrição: Monta o bloco <pag> do XML da NF-e
// ============================================================================

import { NFe } from '../types.ts';
import { formatValor } from '../utils/formatters.ts';

/**
 * Monta o bloco <pag> - Formas de Pagamento
 * 
 * Estrutura:
 * <pag>
 *   <detPag>
 *     <indPag>indicador pagamento</indPag>
 *     <tPag>tipo pagamento</tPag>
 *     <vPag>valor</vPag>
 *   </detPag>
 * </pag>
 */
export function buildPagamento(nfe: NFe): string {
  let xml = '    <pag>\n';
  
  // Se houver informações de meio de pagamento no JSON
  if (nfe.meioPagamento && Array.isArray(nfe.meioPagamento) && nfe.meioPagamento.length > 0) {
    // Múltiplas formas de pagamento
    nfe.meioPagamento.forEach((pagamento: any) => {
      xml += buildDetPag(pagamento);
    });
  } else {
    // Forma de pagamento única (padrão)
    const pagamento = {
      indPag: nfe.formaPagamento === 0 ? '0' : '1', // 0=À vista, 1=A prazo
      tPag: getTipoPagamentoPadrao(nfe.formaPagamento),
      vPag: nfe.valorTotalNota
    };
    
    xml += buildDetPag(pagamento);
  }
  
  // Valor do Troco (se aplicável - geralmente em NFC-e)
  if (nfe.modelo === '65') {
    xml += `      <vTroco>0.00</vTroco>\n`;
  }
  
  xml += '    </pag>\n';
  
  return xml;
}

/**
 * Monta um bloco <detPag> - Detalhe de Pagamento
 */
function buildDetPag(pagamento: any): string {
  let xml = '      <detPag>\n';
  
  // Indicador da Forma de Pagamento
  // 0=À vista, 1=A prazo
  const indPag = pagamento.indPag || '0';
  xml += `        <indPag>${indPag}</indPag>\n`;
  
  // Tipo de Pagamento
  // 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, 
  // 05=Crédito Loja, 10=Vale Alimentação, 11=Vale Refeição, 
  // 12=Vale Presente, 13=Vale Combustível, 14=Duplicata Mercantil,
  // 15=Boleto Bancário, 90=Sem pagamento, 99=Outros
  const tPag = pagamento.tPag || '99';
  xml += `        <tPag>${String(tPag).padStart(2, '0')}</tPag>\n`;
  
  // Valor do Pagamento
  const vPag = pagamento.vPag || pagamento.valor || 0;
  xml += `        <vPag>${formatValor(vPag)}</vPag>\n`;
  
  // Informações de Cartão (se aplicável)
  if ((tPag === '03' || tPag === '04') && pagamento.card) {
    xml += '        <card>\n';
    
    // Tipo de Integração
    // 1=TEF, 2=POS
    xml += `          <tpIntegra>${pagamento.card.tpIntegra || 2}</tpIntegra>\n`;
    
    // CNPJ da Credenciadora
    if (pagamento.card.cnpj) {
      xml += `          <CNPJ>${pagamento.card.cnpj}</CNPJ>\n`;
    }
    
    // Bandeira do Cartão
    // 01=Visa, 02=Mastercard, 03=American Express, 04=Sorocred, 99=Outros
    if (pagamento.card.bandeira) {
      xml += `          <tBand>${String(pagamento.card.bandeira).padStart(2, '0')}</tBand>\n`;
    }
    
    // Número de autorização
    if (pagamento.card.autorizacao) {
      xml += `          <cAut>${pagamento.card.autorizacao}</cAut>\n`;
    }
    
    xml += '        </card>\n';
  }
  
  xml += '      </detPag>\n';
  
  return xml;
}

/**
 * Retorna tipo de pagamento padrão baseado na forma de pagamento
 */
function getTipoPagamentoPadrao(formaPagamento: number): string {
  // 0=À vista, 1=A prazo
  if (formaPagamento === 0) {
    return '01'; // Dinheiro (padrão para à vista)
  } else {
    return '14'; // Duplicata Mercantil (padrão para a prazo)
  }
}

/**
 * Valida as informações de pagamento
 */
export function validatePagamento(nfe: NFe): string[] {
  const errors: string[] = [];
  
  // Forma de pagamento é obrigatória
  if (nfe.formaPagamento === undefined) {
    errors.push('Forma de pagamento é obrigatória');
  }
  
  // Validar soma dos pagamentos (se múltiplos)
  if (nfe.meioPagamento && Array.isArray(nfe.meioPagamento) && nfe.meioPagamento.length > 0) {
    const totalPago = nfe.meioPagamento.reduce((sum: number, pag: any) => {
      return sum + (pag.vPag || pag.valor || 0);
    }, 0);
    
    const diferenca = Math.abs(totalPago - nfe.valorTotalNota);
    
    if (diferenca > 0.02) { // Tolerância de 2 centavos
      errors.push(`Soma dos pagamentos (${totalPago.toFixed(2)}) difere do valor total da nota (${nfe.valorTotalNota.toFixed(2)})`);
    }
  }
  
  return errors;
}
