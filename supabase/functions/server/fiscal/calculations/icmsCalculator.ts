// ============================================================================
// CALCULADORA: ICMS (Imposto sobre Circulação de Mercadorias e Serviços)
// Descrição: Motor de cálculo de ICMS para NF-e
// Suporta: CST 00, 10, 20, 30, 40, 41, 51, 60, 70, 90
//          CSOSN 101, 102, 103, 201, 202, 500, 900 (Simples Nacional)
// ============================================================================

import { getAliquotaInterna, getAliquotaInterestadual, isOperacaoInterestadual } from '../data/icmsAliquotas.ts';
import { calcularFCP } from '../data/fcpAliquotas.ts';

/**
 * Tipos de CST ICMS
 */
export const CST_ICMS = {
  '00': 'Tributada integralmente',
  '10': 'Tributada e com cobrança do ICMS por substituição tributária',
  '20': 'Com redução de base de cálculo',
  '30': 'Isenta ou não tributada e com cobrança do ICMS por substituição tributária',
  '40': 'Isenta',
  '41': 'Não tributada',
  '50': 'Suspensão',
  '51': 'Diferimento',
  '60': 'ICMS cobrado anteriormente por substituição tributária',
  '70': 'Com redução de base de cálculo e cobrança do ICMS por substituição tributária',
  '90': 'Outras',
};

/**
 * CSOSN - Código de Situação da Operação no Simples Nacional
 */
export const CSOSN = {
  '101': 'Tributada pelo Simples Nacional com permissão de crédito',
  '102': 'Tributada pelo Simples Nacional sem permissão de crédito',
  '103': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta',
  '201': 'Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária',
  '202': 'Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária',
  '203': 'Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária',
  '300': 'Imune',
  '400': 'Não tributada pelo Simples Nacional',
  '500': 'ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação',
  '900': 'Outros',
};

/**
 * Parâmetros para cálculo de ICMS
 */
export interface ICMSCalculoParams {
  // Valores
  valorProdutos: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorDesconto?: number;
  
  // Tributação
  cst?: string;              // CST para Regime Normal
  csosn?: string;            // CSOSN para Simples Nacional
  origem: number;            // Origem da mercadoria (0-8)
  
  // Localização
  ufOrigem: string;
  ufDestino: string;
  
  // Alíquotas (opcional - se não informado, usa tabela)
  aliquotaIcms?: number;
  reducaoBaseCalculo?: number; // % de redução da BC (para CST 20, 70)
  
  // ST
  modalidadeBcIcmsSt?: number;  // 0-6
  mva?: number;                 // Margem de Valor Agregado (%)
  reducaoBaseCalculoSt?: number;
  aliquotaIcmsSt?: number;
  
  // FCP
  calcularFcp?: boolean;
  aliquotaFcp?: number;
  
  // Produto
  ncm?: string;
  importado?: boolean;
}

/**
 * Resultado do cálculo de ICMS
 */
export interface ICMSCalculoResult {
  // Base de Cálculo
  baseCalculo: number;
  baseCalculoReduzida?: number;
  percentualReducao?: number;
  
  // ICMS
  aliquota: number;
  valor: number;
  
  // ICMS ST
  baseCalculoSt?: number;
  aliquotaSt?: number;
  valorSt?: number;
  mva?: number;
  
  // FCP
  baseCalculoFcp?: number;
  aliquotaFcp?: number;
  valorFcp?: number;
  
  // FCP ST
  baseCalculoFcpSt?: number;
  aliquotaFcpSt?: number;
  valorFcpSt?: number;
  
  // Modalidades
  modalidadeBc?: number;
  modalidadeBcSt?: number;
  
  // Informações
  cst?: string;
  csosn?: string;
  origem: number;
  isInterestadual: boolean;
}

/**
 * Calcula o valor total da operação (base de cálculo antes de reduções)
 */
function calcularValorOperacao(params: ICMSCalculoParams): number {
  return (
    params.valorProdutos +
    (params.valorFrete || 0) +
    (params.valorSeguro || 0) +
    (params.valorOutrasDespesas || 0) -
    (params.valorDesconto || 0)
  );
}

/**
 * Calcula ICMS - CST 00 (Tributada integralmente)
 */
function calcularCST00(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // Obter alíquota
  let aliquota: number;
  if (params.aliquotaIcms !== undefined) {
    aliquota = params.aliquotaIcms;
  } else if (isInter) {
    aliquota = getAliquotaInterestadual(params.ufOrigem, params.ufDestino, params.importado);
  } else {
    aliquota = getAliquotaInterna(params.ufDestino);
  }
  
  // Base de cálculo = valor da operação
  const baseCalculo = valorOperacao;
  
  // Valor ICMS
  const valor = baseCalculo * (aliquota / 100);
  
  // FCP (se aplicável)
  let fcpResult = {};
  if (params.calcularFcp) {
    const valorFcp = calcularFCP(baseCalculo, params.ufDestino, params.ncm);
    if (valorFcp > 0) {
      fcpResult = {
        baseCalculoFcp: baseCalculo,
        aliquotaFcp: params.aliquotaFcp,
        valorFcp,
      };
    }
  }
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '00',
    origem: params.origem,
    isInterestadual: isInter,
    modalidadeBc: 0, // Margem Valor Agregado (%)
    ...fcpResult,
  };
}

/**
 * Calcula ICMS - CST 20 (Com redução de base de cálculo)
 */
function calcularCST20(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  if (!params.reducaoBaseCalculo) {
    throw new Error('CST 20: Percentual de redução da BC é obrigatório');
  }
  
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // Obter alíquota
  let aliquota: number;
  if (params.aliquotaIcms !== undefined) {
    aliquota = params.aliquotaIcms;
  } else if (isInter) {
    aliquota = getAliquotaInterestadual(params.ufOrigem, params.ufDestino, params.importado);
  } else {
    aliquota = getAliquotaInterna(params.ufDestino);
  }
  
  // Base de cálculo com redução
  const baseCalculoReduzida = valorOperacao * (1 - (params.reducaoBaseCalculo / 100));
  
  // Valor ICMS
  const valor = baseCalculoReduzida * (aliquota / 100);
  
  return {
    baseCalculo: valorOperacao,
    baseCalculoReduzida,
    percentualReducao: params.reducaoBaseCalculo,
    aliquota,
    valor,
    cst: '20',
    origem: params.origem,
    isInterestadual: isInter,
    modalidadeBc: 3, // Valor da Operação
  };
}

/**
 * Calcula ICMS - CST 40, 41, 50 (Isenta / Não tributada / Suspensão)
 */
function calcularCST40_41_50(params: ICMSCalculoParams, cst: string): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    cst,
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CST 51 (Diferimento)
 */
function calcularCST51(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // Diferimento pode ter valor parcial diferido
  // Por simplicidade, assumimos diferimento total (valor = 0)
  
  return {
    baseCalculo: valorOperacao,
    aliquota: 0,
    valor: 0,
    cst: '51',
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CST 60 (ICMS cobrado anteriormente por ST)
 */
function calcularCST60(params: ICMSCalculoParams): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    cst: '60',
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CST 90 (Outras)
 */
function calcularCST90(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // CST 90 pode ter diversas situações
  // Usar alíquota e BC informadas ou calcular normalmente
  
  let baseCalculo = valorOperacao;
  
  // Aplicar redução se houver
  if (params.reducaoBaseCalculo) {
    baseCalculo = valorOperacao * (1 - (params.reducaoBaseCalculo / 100));
  }
  
  // Obter alíquota
  let aliquota = 0;
  if (params.aliquotaIcms !== undefined) {
    aliquota = params.aliquotaIcms;
  } else if (isInter) {
    aliquota = getAliquotaInterestadual(params.ufOrigem, params.ufDestino, params.importado);
  } else {
    aliquota = getAliquotaInterna(params.ufDestino);
  }
  
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '90',
    origem: params.origem,
    isInterestadual: isInter,
    modalidadeBc: 3,
  };
}

/**
 * Calcula ICMS - CSOSN 101 (Simples Nacional com permissão de crédito)
 */
function calcularCSOSN101(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // Simples Nacional: Alíquota de crédito conforme anexo
  // Simplificação: usar alíquota informada ou 0
  const aliquotaCredito = params.aliquotaIcms || 0;
  const valorCredito = valorOperacao * (aliquotaCredito / 100);
  
  return {
    baseCalculo: valorOperacao,
    aliquota: aliquotaCredito,
    valor: valorCredito,
    csosn: '101',
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CSOSN 102, 103, 300, 400 (Sem tributação)
 */
function calcularCSOSN_SemTributacao(params: ICMSCalculoParams, csosn: string): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    csosn,
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CSOSN 500 (ICMS cobrado anteriormente por ST)
 */
function calcularCSOSN500(params: ICMSCalculoParams): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    csosn: '500',
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * Calcula ICMS - CSOSN 900 (Outros)
 */
function calcularCSOSN900(params: ICMSCalculoParams, valorOperacao: number): ICMSCalculoResult {
  const isInter = isOperacaoInterestadual(params.ufOrigem, params.ufDestino);
  
  // CSOSN 900 permite tributação
  let baseCalculo = valorOperacao;
  
  if (params.reducaoBaseCalculo) {
    baseCalculo = valorOperacao * (1 - (params.reducaoBaseCalculo / 100));
  }
  
  const aliquota = params.aliquotaIcms || 0;
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    csosn: '900',
    origem: params.origem,
    isInterestadual: isInter,
  };
}

/**
 * FUNÇÃO PRINCIPAL: Calcula ICMS baseado no CST ou CSOSN
 */
export function calcularICMS(params: ICMSCalculoParams): ICMSCalculoResult {
  // Validações
  if (!params.ufOrigem || !params.ufDestino) {
    throw new Error('UF de origem e destino são obrigatórias');
  }
  
  if (!params.cst && !params.csosn) {
    throw new Error('CST ou CSOSN é obrigatório');
  }
  
  if (params.origem === undefined) {
    throw new Error('Origem da mercadoria é obrigatória');
  }
  
  // Calcular valor da operação
  const valorOperacao = calcularValorOperacao(params);
  
  // Processar por CST (Regime Normal)
  if (params.cst) {
    switch (params.cst) {
      case '00':
        return calcularCST00(params, valorOperacao);
      case '20':
        return calcularCST20(params, valorOperacao);
      case '40':
      case '41':
      case '50':
        return calcularCST40_41_50(params, params.cst);
      case '51':
        return calcularCST51(params, valorOperacao);
      case '60':
        return calcularCST60(params);
      case '90':
        return calcularCST90(params, valorOperacao);
      default:
        throw new Error(`CST ICMS não suportado: ${params.cst}`);
    }
  }
  
  // Processar por CSOSN (Simples Nacional)
  if (params.csosn) {
    switch (params.csosn) {
      case '101':
        return calcularCSOSN101(params, valorOperacao);
      case '102':
      case '103':
      case '300':
      case '400':
        return calcularCSOSN_SemTributacao(params, params.csosn);
      case '500':
        return calcularCSOSN500(params);
      case '900':
        return calcularCSOSN900(params, valorOperacao);
      default:
        throw new Error(`CSOSN não suportado: ${params.csosn}`);
    }
  }
  
  throw new Error('Não foi possível calcular ICMS');
}

/**
 * Valida CST ICMS
 */
export function validarCSTIcms(cst: string): boolean {
  return cst in CST_ICMS;
}

/**
 * Valida CSOSN
 */
export function validarCSOSN(csosn: string): boolean {
  return csosn in CSOSN;
}
