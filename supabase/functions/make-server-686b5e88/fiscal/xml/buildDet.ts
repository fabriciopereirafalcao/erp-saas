// ============================================================================
// BUILDER: DET - Detalhamento de Produtos e Serviços da NF-e
// Descrição: Monta o bloco <det> do XML da NF-e (itens/produtos)
// ============================================================================

import { NFeItem, Emitente } from '../types.ts';
import { 
  formatValor,
  formatQuantidade,
  formatAliquota,
  formatNCM,
  formatCFOP,
  formatEAN,
  sanitizeXML,
  removeAcentos 
} from '../utils/formatters.ts';

/**
 * Monta os blocos <det> - Detalhamento dos Produtos/Serviços
 * 
 * Um bloco <det> para cada item da nota
 */
export function buildDet(itens: NFeItem[], emitente: Emitente): string {
  let xml = '';
  
  itens.forEach((item, index) => {
    xml += buildItemDet(item, index);
  });
  
  return xml;
}

/**
 * Monta um único bloco <det> para um item
 */
function buildItemDet(item: NFeItem, index: number): string {
  const nItem = index + 1;
  
  let xml = `    <det nItem="${nItem}">\n`;
  
  // ========== PRODUTO ==========
  xml += buildProd(item);
  
  // ========== IMPOSTOS ==========
  xml += buildImposto(item);
  
  // ========== INFORMAÇÕES ADICIONAIS DO ITEM ==========
  if (item.informacoesAdicionais) {
    xml += `      <infAdProd>${sanitizeXML(item.informacoesAdicionais)}</infAdProd>\n`;
  }
  
  xml += '    </det>\n';
  
  return xml;
}

/**
 * Monta o bloco <prod> - Produto
 */
function buildProd(item: NFeItem): string {
  let xml = '      <prod>\n';
  
  // Código do produto
  xml += `        <cProd>${sanitizeXML(item.codigoProduto)}</cProd>\n`;
  
  // EAN (opcional)
  if (item.ean) {
    xml += `        <cEAN>${formatEAN(item.ean)}</cEAN>\n`;
  } else {
    xml += `        <cEAN>SEM GTIN</cEAN>\n`;
  }
  
  // Descrição
  xml += `        <xProd>${sanitizeXML(removeAcentos(item.descricao))}</xProd>\n`;
  
  // NCM (obrigatório)
  xml += `        <NCM>${formatNCM(item.ncm)}</NCM>\n`;
  
  // CEST (opcional, mas obrigatório para alguns produtos)
  if (item.cest) {
    xml += `        <CEST>${item.cest.replace(/\D/g, '')}</CEST>\n`;
  }
  
  // CFOP
  xml += `        <CFOP>${formatCFOP(item.cfop)}</CFOP>\n`;
  
  // Unidade Comercial
  xml += `        <uCom>${sanitizeXML(item.unidadeComercial)}</uCom>\n`;
  
  // Quantidade Comercial
  xml += `        <qCom>${formatQuantidade(item.quantidadeComercial)}</qCom>\n`;
  
  // Valor Unitário Comercial
  xml += `        <vUnCom>${formatValor(item.valorUnitarioComercial, 10)}</vUnCom>\n`;
  
  // Valor Total Bruto
  xml += `        <vProd>${formatValor(item.valorTotalBruto)}</vProd>\n`;
  
  // EAN Tributável (opcional)
  if (item.eanTributavel) {
    xml += `        <cEANTrib>${formatEAN(item.eanTributavel)}</cEANTrib>\n`;
  } else {
    xml += `        <cEANTrib>SEM GTIN</cEANTrib>\n`;
  }
  
  // Unidade Tributável
  xml += `        <uTrib>${sanitizeXML(item.unidadeTributavel)}</uTrib>\n`;
  
  // Quantidade Tributável
  xml += `        <qTrib>${formatQuantidade(item.quantidadeTributavel)}</qTrib>\n`;
  
  // Valor Unitário Tributável
  xml += `        <vUnTrib>${formatValor(item.valorUnitarioTributavel, 10)}</vUnTrib>\n`;
  
  // Frete (se houver)
  if (item.valorFrete > 0) {
    xml += `        <vFrete>${formatValor(item.valorFrete)}</vFrete>\n`;
  }
  
  // Seguro (se houver)
  if (item.valorSeguro > 0) {
    xml += `        <vSeg>${formatValor(item.valorSeguro)}</vSeg>\n`;
  }
  
  // Desconto (se houver)
  if (item.valorDesconto > 0) {
    xml += `        <vDesc>${formatValor(item.valorDesconto)}</vDesc>\n`;
  }
  
  // Outras Despesas (se houver)
  if (item.valorOutrasDespesas > 0) {
    xml += `        <vOutro>${formatValor(item.valorOutrasDespesas)}</vOutro>\n`;
  }
  
  // Indica se compõe o total da NF-e
  xml += `        <indTot>1</indTot>\n`; // 1=Sim
  
  xml += '      </prod>\n';
  
  return xml;
}

/**
 * Monta o bloco <imposto> - Tributos
 */
function buildImposto(item: NFeItem): string {
  let xml = '      <imposto>\n';
  
  // Valor Total dos Tributos (aproximado)
  const vTotTrib = item.valorIcms + item.valorIpi + item.valorPis + item.valorCofins;
  if (vTotTrib > 0) {
    xml += `        <vTotTrib>${formatValor(vTotTrib)}</vTotTrib>\n`;
  }
  
  // ========== ICMS ==========
  xml += buildICMS(item);
  
  // ========== IPI ==========
  if (item.valorIpi > 0 || item.cstIpi) {
    xml += buildIPI(item);
  }
  
  // ========== PIS ==========
  xml += buildPIS(item);
  
  // ========== COFINS ==========
  xml += buildCOFINS(item);
  
  xml += '      </imposto>\n';
  
  return xml;
}

/**
 * Monta o bloco de ICMS
 */
function buildICMS(item: NFeItem): string {
  let xml = '        <ICMS>\n';
  
  // Usar CSOSN (Simples Nacional) ou CST (Regime Normal)
  if (item.csosn) {
    // Simples Nacional
    xml += buildICMS_SN(item);
  } else {
    // Regime Normal
    xml += buildICMS_Normal(item);
  }
  
  xml += '        </ICMS>\n';
  
  return xml;
}

/**
 * ICMS - Simples Nacional (CSOSN)
 */
function buildICMS_SN(item: NFeItem): string {
  const csosn = item.csosn || '102';
  let xml = '';
  
  switch (csosn) {
    case '101': // Tributada com permissão de crédito
      xml += '          <ICMSSN101>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${csosn}</CSOSN>\n`;
      if (item.aliquotaIcms > 0) {
        xml += `            <pCredSN>${formatAliquota(item.aliquotaIcms)}</pCredSN>\n`;
        xml += `            <vCredICMSSN>${formatValor(item.valorIcms)}</vCredICMSSN>\n`;
      }
      xml += '          </ICMSSN101>\n';
      break;
      
    case '102': // Tributada sem permissão de crédito
    case '103': // Isenção
    case '300': // Imune
    case '400': // Não tributada
      xml += '          <ICMSSN102>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${csosn}</CSOSN>\n`;
      xml += '          </ICMSSN102>\n';
      break;
      
    case '201': // Com permissão de crédito e ST
    case '202': // Sem permissão de crédito e ST
    case '203': // Isenção e ST
      xml += '          <ICMSSN201>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${csosn}</CSOSN>\n`;
      if (item.baseCalculoIcmsSt > 0) {
        xml += `            <modBCST>${item.modalidadeBcIcmsSt || 4}</modBCST>\n`;
        xml += `            <vBCST>${formatValor(item.baseCalculoIcmsSt)}</vBCST>\n`;
        xml += `            <pICMSST>${formatAliquota(item.aliquotaIcmsSt)}</pICMSST>\n`;
        xml += `            <vICMSST>${formatValor(item.valorIcmsSt)}</vICMSST>\n`;
      }
      xml += '          </ICMSSN201>\n';
      break;
      
    case '500': // Com ST
      xml += '          <ICMSSN500>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${csosn}</CSOSN>\n`;
      xml += '          </ICMSSN500>\n';
      break;
      
    case '900': // Outros
      xml += '          <ICMSSN900>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${csosn}</CSOSN>\n`;
      if (item.baseCalculoIcms > 0) {
        xml += `            <modBC>${item.modalidadeBcIcms || 3}</modBC>\n`;
        xml += `            <vBC>${formatValor(item.baseCalculoIcms)}</vBC>\n`;
        xml += `            <pICMS>${formatAliquota(item.aliquotaIcms)}</pICMS>\n`;
        xml += `            <vICMS>${formatValor(item.valorIcms)}</vICMS>\n`;
      }
      xml += '          </ICMSSN900>\n';
      break;
      
    default:
      // Usar 102 como padrão
      xml += '          <ICMSSN102>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>102</CSOSN>\n`;
      xml += '          </ICMSSN102>\n';
  }
  
  return xml;
}

/**
 * ICMS - Regime Normal (CST)
 */
function buildICMS_Normal(item: NFeItem): string {
  const cst = item.cstIcms || '00';
  let xml = '';
  
  switch (cst) {
    case '00': // Tributada integralmente
      xml += '          <ICMS00>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CST>${cst}</CST>\n`;
      xml += `            <modBC>${item.modalidadeBcIcms || 3}</modBC>\n`;
      xml += `            <vBC>${formatValor(item.baseCalculoIcms)}</vBC>\n`;
      xml += `            <pICMS>${formatAliquota(item.aliquotaIcms)}</pICMS>\n`;
      xml += `            <vICMS>${formatValor(item.valorIcms)}</vICMS>\n`;
      xml += '          </ICMS00>\n';
      break;
      
    case '10': // Tributada com ST
      xml += '          <ICMS10>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CST>${cst}</CST>\n`;
      xml += `            <modBC>${item.modalidadeBcIcms || 3}</modBC>\n`;
      xml += `            <vBC>${formatValor(item.baseCalculoIcms)}</vBC>\n`;
      xml += `            <pICMS>${formatAliquota(item.aliquotaIcms)}</pICMS>\n`;
      xml += `            <vICMS>${formatValor(item.valorIcms)}</vICMS>\n`;
      xml += `            <modBCST>${item.modalidadeBcIcmsSt || 4}</modBCST>\n`;
      xml += `            <vBCST>${formatValor(item.baseCalculoIcmsSt)}</vBCST>\n`;
      xml += `            <pICMSST>${formatAliquota(item.aliquotaIcmsSt)}</pICMSST>\n`;
      xml += `            <vICMSST>${formatValor(item.valorIcmsSt)}</vICMSST>\n`;
      xml += '          </ICMS10>\n';
      break;
      
    case '20': // Com redução de BC
    case '40': // Isenta
    case '41': // Não tributada
    case '50': // Suspensão
    case '51': // Diferimento
    case '60': // Cobrado anteriormente por ST
    case '70': // Com redução de BC e ST
    case '90': // Outros
      xml += `          <ICMS${cst}>\n`;
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CST>${cst}</CST>\n`;
      xml += `          </ICMS${cst}>\n`;
      break;
      
    default:
      xml += '          <ICMS00>\n';
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CST>00</CST>\n`;
      xml += `            <modBC>3</modBC>\n`;
      xml += `            <vBC>0.00</vBC>\n`;
      xml += `            <pICMS>0.00</pICMS>\n`;
      xml += `            <vICMS>0.00</vICMS>\n`;
      xml += '          </ICMS00>\n';
  }
  
  return xml;
}

/**
 * Monta o bloco de IPI
 */
function buildIPI(item: NFeItem): string {
  let xml = '        <IPI>\n';
  xml += '          <cEnq>999</cEnq>\n'; // Código de Enquadramento (999=Outros)
  
  const cst = item.cstIpi || '99';
  
  if (item.valorIpi > 0) {
    xml += '          <IPITrib>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += `            <vBC>${formatValor(item.baseCalculoIpi)}</vBC>\n`;
    xml += `            <pIPI>${formatAliquota(item.aliquotaIpi)}</pIPI>\n`;
    xml += `            <vIPI>${formatValor(item.valorIpi)}</vIPI>\n`;
    xml += '          </IPITrib>\n';
  } else {
    xml += '          <IPINT>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += '          </IPINT>\n';
  }
  
  xml += '        </IPI>\n';
  
  return xml;
}

/**
 * Monta o bloco de PIS
 */
function buildPIS(item: NFeItem): string {
  let xml = '        <PIS>\n';
  
  const cst = item.cstPis || '99';
  
  if (item.valorPis > 0) {
    xml += '          <PISAliq>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += `            <vBC>${formatValor(item.baseCalculoPis)}</vBC>\n`;
    xml += `            <pPIS>${formatAliquota(item.aliquotaPis)}</pPIS>\n`;
    xml += `            <vPIS>${formatValor(item.valorPis)}</vPIS>\n`;
    xml += '          </PISAliq>\n';
  } else {
    xml += '          <PISNT>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += '          </PISNT>\n';
  }
  
  xml += '        </PIS>\n';
  
  return xml;
}

/**
 * Monta o bloco de COFINS
 */
function buildCOFINS(item: NFeItem): string {
  let xml = '        <COFINS>\n';
  
  const cst = item.cstCofins || '99';
  
  if (item.valorCofins > 0) {
    xml += '          <COFINSAliq>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += `            <vBC>${formatValor(item.baseCalculoCofins)}</vBC>\n`;
    xml += `            <pCOFINS>${formatAliquota(item.aliquotaCofins)}</pCOFINS>\n`;
    xml += `            <vCOFINS>${formatValor(item.valorCofins)}</vCOFINS>\n`;
    xml += '          </COFINSAliq>\n';
  } else {
    xml += '          <COFINSNT>\n';
    xml += `            <CST>${cst}</CST>\n`;
    xml += '          </COFINSNT>\n';
  }
  
  xml += '        </COFINS>\n';
  
  return xml;
}

/**
 * Valida os itens da NF-e
 */
export function validateDet(itens: NFeItem[]): string[] {
  const errors: string[] = [];
  
  if (!itens || itens.length === 0) {
    errors.push('A NF-e deve ter pelo menos um item');
    return errors;
  }
  
  itens.forEach((item, index) => {
    const itemNum = index + 1;
    
    if (!item.codigoProduto) {
      errors.push(`Item ${itemNum}: Código do produto é obrigatório`);
    }
    
    if (!item.descricao) {
      errors.push(`Item ${itemNum}: Descrição do produto é obrigatória`);
    }
    
    if (!item.ncm) {
      errors.push(`Item ${itemNum}: NCM é obrigatório`);
    }
    
    if (!item.cfop) {
      errors.push(`Item ${itemNum}: CFOP é obrigatório`);
    }
    
    if (item.quantidadeComercial <= 0) {
      errors.push(`Item ${itemNum}: Quantidade deve ser maior que zero`);
    }
    
    if (item.valorUnitarioComercial <= 0) {
      errors.push(`Item ${itemNum}: Valor unitário deve ser maior que zero`);
    }
    
    if (item.origem === undefined || item.origem < 0 || item.origem > 8) {
      errors.push(`Item ${itemNum}: Origem do produto deve estar entre 0 e 8`);
    }
  });
  
  return errors;
}
