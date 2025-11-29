// ============================================================================
// HELPERS: Funções auxiliares para cálculos fiscais
// Descrição: Utilitários compartilhados entre calculadores
// ============================================================================

import type {
  ParametrosNFe,
  NFeCalculoResult,
  ItemCalculoCompleto,
  ItemCalculoResult,
  ConfiguracaoArredondamento,
} from './calculationTypes.ts';

import { calcularICMS } from './icmsCalculator.ts';
import { calcularIPI } from './ipiCalculator.ts';
import { calcularPisCofinsCompleto } from './pisCofinsCalculator.ts';
import { calcularFCPCompleto } from './fcpCalculator.ts';
import { calcularICMSSTCompleto } from './icmsStCalculator.ts';
import { calcularLeiTransparencia } from './leiTransparencia.ts';
import { totalizarNFe, validarTotalizacao, type ItemNFe } from './totalCalculator.ts';
import { getAliquotaInterna, getAliquotaInterestadual } from '../data/icmsAliquotas.ts';

/**
 * FUNÇÃO PRINCIPAL: Calcula TODOS os impostos de uma NF-e
 * 
 * Este é o orquestrador que chama todos os calculadores
 */
export async function calcularNFeCompleta(params: ParametrosNFe): Promise<NFeCalculoResult> {
  try {
    // Validar parâmetros
    validarParametros(params);
    
    // Calcular cada item
    const itensCalculados: ItemCalculoResult[] = [];
    const itensParaTotalizacao: ItemNFe[] = [];
    
    for (const item of params.itens) {
      const itemCalculado = await calcularItem(item, params);
      itensCalculados.push(itemCalculado);
      
      // Converter para formato de totalização
      itensParaTotalizacao.push(converterParaTotalizacao(item, itemCalculado));
    }
    
    // Calcular Lei da Transparência (se habilitado)
    let valorTributos = 0;
    if (params.opcoes?.calcularLeiTransparencia) {
      const leiTransp = calcularLeiTransparencia({
        valorTotal: itensParaTotalizacao.reduce((sum, i) => sum + i.valorTotal, 0),
        tokenIBPT: params.opcoes.tokenIBPT,
      });
      valorTributos = leiTransp.valorTotal;
    }
    
    // Totalizar NF-e
    const totalizacao = totalizarNFe({
      itens: itensParaTotalizacao,
      valorTributos,
    });
    
    // Validar totalização
    const validacao = validarTotalizacao(totalizacao);
    
    return {
      itens: itensCalculados,
      totais: {
        baseCalculoICMS: totalizacao.totais.baseCalculoIcms,
        valorICMS: totalizacao.totais.valorIcms,
        baseCalculoICMSST: totalizacao.totais.baseCalculoIcmsSt,
        valorICMSST: totalizacao.totais.valorIcmsSt,
        valorFCP: totalizacao.totais.valorFcp,
        valorFCPST: totalizacao.totais.valorFcpSt,
        valorProdutos: totalizacao.totais.valorProdutos,
        valorFrete: totalizacao.totais.valorFrete,
        valorSeguro: totalizacao.totais.valorSeguro,
        valorDesconto: totalizacao.totais.valorDesconto,
        valorII: totalizacao.totais.valorII,
        valorIPI: totalizacao.totais.valorIpi,
        valorPIS: totalizacao.totais.valorPis,
        valorCOFINS: totalizacao.totais.valorCofins,
        valorOutrasDespesas: totalizacao.totais.valorOutrasDespesas,
        valorTotal: totalizacao.totais.valorTotal,
        valorTributos: totalizacao.totais.valorTributos,
      },
      validacoes: {
        valido: validacao.valido,
        erros: validacao.erros,
        avisos: validacao.avisos,
      },
      dataCalculo: new Date().toISOString(),
      versaoCalculadora: '1.0.0',
    };
  } catch (error) {
    throw new Error(`Erro ao calcular NF-e: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Calcula todos os impostos de um item
 */
async function calcularItem(
  item: ItemCalculoCompleto,
  params: ParametrosNFe
): Promise<ItemCalculoResult> {
  const ufOrigem = params.emitente.uf;
  const ufDestino = params.destinatario.uf;
  
  // 1. Calcular ICMS
  const icmsResult = calcularICMS({
    valorProdutos: item.valorTotalBruto,
    valorFrete: item.valorFrete,
    valorSeguro: item.valorSeguro,
    valorOutrasDespesas: item.valorOutrasDespesas,
    valorDesconto: item.valorDesconto,
    cst: item.icms.cst,
    csosn: item.icms.csosn,
    origem: item.origem,
    ufOrigem,
    ufDestino,
    aliquotaIcms: item.icms.aliquota,
    reducaoBaseCalculo: item.icms.reducaoBC,
    importado: item.importado,
  });
  
  // 2. Calcular IPI (se aplicável)
  let ipiResult = null;
  if (item.ipi) {
    ipiResult = calcularIPI({
      valorProdutos: item.valorTotalBruto,
      valorFrete: item.valorFrete,
      valorSeguro: item.valorSeguro,
      valorOutrasDespesas: item.valorOutrasDespesas,
      valorDesconto: item.valorDesconto,
      cst: item.ipi.cst,
      ncm: item.ncm,
      aliquota: item.ipi.aliquota,
      codigoEnquadramento: item.ipi.codigoEnquadramento,
    });
  }
  
  // 3. Calcular PIS/COFINS
  const pisCofinsResult = calcularPisCofinsCompleto({
    valorProdutos: item.valorTotalBruto,
    valorFrete: item.valorFrete,
    valorSeguro: item.valorSeguro,
    valorOutrasDespesas: item.valorOutrasDespesas,
    valorDesconto: item.valorDesconto,
    valorIpi: ipiResult?.valor || 0,
    cstPis: item.pis.cst,
    cstCofins: item.cofins.cst,
    aliquotaPis: item.pis.aliquota,
    aliquotaCofins: item.cofins.aliquota,
    incluirIpiNaBase: false,  // Geralmente não inclui
  });
  
  // 4. Calcular FCP (se habilitado)
  let fcpResult = null;
  if (params.opcoes?.calcularFCP && item.icms.aliquotaFCP) {
    fcpResult = calcularFCPCompleto({
      baseCalculo: icmsResult.baseCalculo,
      ufDestino,
      ncm: item.ncm,
      aliquota: item.icms.aliquotaFCP,
    });
  }
  
  // 5. Calcular ICMS-ST (se aplicável)
  let stResult = null;
  if (item.icms.modalidadeBCST !== undefined) {
    const aliquotaInter = getAliquotaInterestadual(ufOrigem, ufDestino, item.importado);
    const aliquotaIntra = getAliquotaInterna(ufDestino);
    
    stResult = calcularICMSSTCompleto({
      valorOperacao: item.valorTotalBruto,
      valorIpi: ipiResult?.valor,
      valorFrete: item.valorFrete,
      valorSeguro: item.valorSeguro,
      valorOutrasDespesas: item.valorOutrasDespesas,
      valorDesconto: item.valorDesconto,
      ncm: item.ncm,
      valorIcmsProprio: icmsResult.valor,
      aliquotaInterestadual: aliquotaInter,
      aliquotaInterna: aliquotaIntra,
      mva: item.icms.mva,
      ufOrigem,
      ufDestino,
      modalidadeBcSt: item.icms.modalidadeBCST,
      reducaoBaseCalculoSt: item.icms.reducaoBCST,
      calcularFcpSt: params.opcoes?.calcularFCP,
      aliquotaFcpSt: item.icms.aliquotaFCPST,
    });
  }
  
  // 6. Calcular Lei da Transparência (se habilitado)
  let tributosResult = null;
  if (item.informarTributos && params.opcoes?.calcularLeiTransparencia) {
    tributosResult = calcularLeiTransparencia({
      valorTotal: item.valorTotalBruto,
      ncm: item.ncm,
    });
  }
  
  // Montar resultado
  return {
    numeroItem: item.numeroItem,
    valorProdutos: item.valorTotalBruto,
    valorTotal: calcularValorTotalItem(item, icmsResult.valor, ipiResult?.valor || 0, stResult?.valorST || 0),
    
    icms: {
      origem: item.origem,
      cst: icmsResult.cst,
      csosn: icmsResult.csosn,
      modalidadeBC: icmsResult.modalidadeBc || 3,
      baseCalculo: icmsResult.baseCalculo,
      aliquota: icmsResult.aliquota,
      valor: icmsResult.valor,
      
      modalidadeBCST: stResult?.modalidadeBcSt,
      baseCalculoST: stResult?.baseCalculoST,
      mva: stResult?.mvaAjustado,
      aliquotaST: stResult?.aliquotaST,
      valorST: stResult?.valorST,
      
      valorFCP: fcpResult?.valor,
      valorFCPST: stResult?.valorFcpSt,
    },
    
    ipi: ipiResult ? {
      cst: ipiResult.cst,
      baseCalculo: ipiResult.baseCalculo,
      aliquota: ipiResult.aliquota,
      valor: ipiResult.valor,
    } : undefined,
    
    pis: {
      cst: pisCofinsResult.cstPis,
      baseCalculo: pisCofinsResult.baseCalculoPis,
      aliquota: pisCofinsResult.aliquotaPis,
      valor: pisCofinsResult.valorPis,
    },
    
    cofins: {
      cst: pisCofinsResult.cstCofins,
      baseCalculo: pisCofinsResult.baseCalculoCofins,
      aliquota: pisCofinsResult.aliquotaCofins,
      valor: pisCofinsResult.valorCofins,
    },
    
    tributos: tributosResult ? {
      valorAproximado: tributosResult.valorTotal,
      fonte: tributosResult.fonte,
    } : undefined,
  };
}

/**
 * Calcula o valor total de um item
 */
function calcularValorTotalItem(
  item: ItemCalculoCompleto,
  valorIcms: number,
  valorIpi: number,
  valorSt: number
): number {
  return (
    item.valorTotalBruto +
    (item.valorFrete || 0) +
    (item.valorSeguro || 0) +
    (item.valorOutrasDespesas || 0) +
    valorIpi +
    valorSt -
    (item.valorDesconto || 0)
  );
}

/**
 * Converte item calculado para formato de totalização
 */
function converterParaTotalizacao(
  item: ItemCalculoCompleto,
  calculado: ItemCalculoResult
): ItemNFe {
  return {
    codigo: item.codigoProduto,
    descricao: item.descricao,
    ncm: item.ncm,
    cfop: item.cfop,
    unidade: item.unidadeComercial,
    quantidade: item.quantidadeComercial,
    valorUnitario: item.valorUnitarioComercial,
    valorTotal: item.valorTotalBruto,
    valorFrete: item.valorFrete,
    valorSeguro: item.valorSeguro,
    valorDesconto: item.valorDesconto,
    valorOutrasDespesas: item.valorOutrasDespesas,
    
    icms: {
      baseCalculo: calculado.icms.baseCalculo,
      valor: calculado.icms.valor,
      aliquota: calculado.icms.aliquota,
    },
    
    icmsSt: calculado.icms.valorST ? {
      baseCalculo: calculado.icms.baseCalculoST!,
      valor: calculado.icms.valorST,
    } : undefined,
    
    ipi: calculado.ipi ? {
      baseCalculo: calculado.ipi.baseCalculo,
      valor: calculado.ipi.valor,
    } : undefined,
    
    pis: {
      baseCalculo: calculado.pis.baseCalculo,
      valor: calculado.pis.valor,
    },
    
    cofins: {
      baseCalculo: calculado.cofins.baseCalculo,
      valor: calculado.cofins.valor,
    },
    
    fcp: calculado.icms.valorFCP ? {
      valor: calculado.icms.valorFCP,
    } : undefined,
    
    fcpSt: calculado.icms.valorFCPST ? {
      valor: calculado.icms.valorFCPST,
    } : undefined,
  };
}

/**
 * Valida parâmetros da NF-e
 */
function validarParametros(params: ParametrosNFe): void {
  if (!params.emitente || !params.emitente.cnpj) {
    throw new Error('CNPJ do emitente é obrigatório');
  }
  
  if (!params.destinatario || !params.destinatario.documento) {
    throw new Error('CPF/CNPJ do destinatário é obrigatório');
  }
  
  if (!params.itens || params.itens.length === 0) {
    throw new Error('NF-e deve ter pelo menos um item');
  }
  
  if (params.itens.length > 990) {
    throw new Error('NF-e não pode ter mais de 990 itens');
  }
  
  // Validar cada item
  params.itens.forEach((item, index) => {
    if (!item.ncm || item.ncm.length < 8) {
      throw new Error(`Item ${index + 1}: NCM inválido`);
    }
    
    if (!item.cfop || item.cfop.length !== 4) {
      throw new Error(`Item ${index + 1}: CFOP inválido`);
    }
    
    if (item.quantidadeComercial <= 0) {
      throw new Error(`Item ${index + 1}: Quantidade deve ser maior que zero`);
    }
    
    if (item.valorUnitarioComercial <= 0) {
      throw new Error(`Item ${index + 1}: Valor unitário deve ser maior que zero`);
    }
  });
}

/**
 * Arredonda valor para N casas decimais
 */
export function arredondar(valor: number, casasDecimais = 2): number {
  const fator = Math.pow(10, casasDecimais);
  return Math.round(valor * fator) / fator;
}

/**
 * Arredonda com configuração customizada
 */
export function arredondarCustomizado(
  valor: number,
  config: ConfiguracaoArredondamento
): number {
  const fator = Math.pow(10, config.casasDecimais);
  
  switch (config.metodo) {
    case 'round':
      return Math.round(valor * fator) / fator;
    case 'floor':
      return Math.floor(valor * fator) / fator;
    case 'ceil':
      return Math.ceil(valor * fator) / fator;
    default:
      return Math.round(valor * fator) / fator;
  }
}

/**
 * Formata valor monetário
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number, casasDecimais = 2): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validar dígitos verificadores
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validar primeiro dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;
  
  if (digito1 !== parseInt(cpf.charAt(9))) return false;
  
  // Validar segundo dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  
  if (digito2 !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * Normaliza NCM (remove pontos e traços)
 */
export function normalizarNCM(ncm: string): string {
  return ncm.replace(/[.-]/g, '').padEnd(8, '0');
}

/**
 * Normaliza CFOP
 */
export function normalizarCFOP(cfop: string): string {
  return cfop.replace(/[^\d]/g, '').padStart(4, '0');
}

/**
 * Detecta se documento é CPF ou CNPJ
 */
export function detectarTipoDocumento(documento: string): 'cpf' | 'cnpj' | 'invalido' {
  const doc = documento.replace(/[^\d]/g, '');
  
  if (doc.length === 11) {
    return validarCPF(doc) ? 'cpf' : 'invalido';
  } else if (doc.length === 14) {
    return validarCNPJ(doc) ? 'cnpj' : 'invalido';
  }
  
  return 'invalido';
}
