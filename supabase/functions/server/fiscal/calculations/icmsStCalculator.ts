// ============================================================================
// CALCULADORA: ICMS-ST (Substituição Tributária)
// Descrição: Motor de cálculo de ICMS-ST para NF-e
// ============================================================================

import {
  getMVA,
  calcularMVAAjustada,
  calcularBaseCalculoST,
  calcularICMSST,
  calcularSTCompleto,
  temSubstituicaoTributaria,
} from '../data/mvaTable.ts';

/**
 * Parâmetros para cálculo de ICMS-ST
 */
export interface ICMSSTCalculoParams {
  // Valores
  valorOperacao: number;
  valorIpi?: number;              // IPI pode compor a BC-ST
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorDesconto?: number;
  
  // Produto
  ncm: string;
  
  // ICMS Próprio (já destacado)
  valorIcmsProprio: number;
  
  // Alíquotas
  aliquotaInterestadual: number;
  aliquotaInterna: number;        // Alíquota interna da UF de destino
  
  // MVA
  mva?: number;                   // MVA customizado (se não informado, busca na tabela)
  mvaAjustado?: number;           // MVA já ajustado (se fornecido, não recalcula)
  
  // UFs
  ufOrigem: string;
  ufDestino: string;
  
  // Modalidade da Base de Cálculo ST
  modalidadeBcSt?: number;        // 0-6
  
  // Redução de BC ST
  reducaoBaseCalculoSt?: number;  // % de redução
  
  // FCP ST
  calcularFcpSt?: boolean;
  aliquotaFcpSt?: number;
}

/**
 * Resultado do cálculo de ICMS-ST
 */
export interface ICMSSTCalculoResult {
  // ST
  temST: boolean;
  baseCalculoST: number;
  aliquotaST: number;
  valorST: number;
  
  // MVA
  mvaOriginal: number;
  mvaAjustado: number;
  
  // ICMS Próprio (para referência)
  valorIcmsProprio: number;
  
  // FCP ST
  baseCalculoFcpSt?: number;
  aliquotaFcpSt?: number;
  valorFcpSt?: number;
  
  // Modalidade
  modalidadeBcSt: number;
  
  // Informações
  protocolo?: string;
  ncm: string;
}

/**
 * Calcula o valor da operação (base para cálculo do ST)
 */
function calcularValorOperacaoST(params: ICMSSTCalculoParams): number {
  let valor = params.valorOperacao;
  
  // Adicionar componentes
  if (params.valorIpi) valor += params.valorIpi;
  if (params.valorFrete) valor += params.valorFrete;
  if (params.valorSeguro) valor += params.valorSeguro;
  if (params.valorOutrasDespesas) valor += params.valorOutrasDespesas;
  if (params.valorDesconto) valor -= params.valorDesconto;
  
  return valor;
}

/**
 * FUNÇÃO PRINCIPAL: Calcula ICMS-ST
 */
export function calcularICMSSTCompleto(params: ICMSSTCalculoParams): ICMSSTCalculoResult {
  // Validações
  if (!params.ncm) {
    throw new Error('NCM é obrigatório para cálculo de ICMS-ST');
  }
  
  if (!params.ufOrigem || !params.ufDestino) {
    throw new Error('UF de origem e destino são obrigatórias');
  }
  
  // Verificar se o produto tem ST
  const mvaConfig = getMVA(params.ncm, params.ufDestino);
  
  if (!mvaConfig && !params.mva) {
    // Produto não tem ST
    return {
      temST: false,
      baseCalculoST: 0,
      aliquotaST: 0,
      valorST: 0,
      mvaOriginal: 0,
      mvaAjustado: 0,
      valorIcmsProprio: params.valorIcmsProprio,
      modalidadeBcSt: params.modalidadeBcSt || 4,
      ncm: params.ncm,
    };
  }
  
  // Obter MVA
  let mvaOriginal: number;
  let mvaAjustado: number;
  
  if (params.mvaAjustado !== undefined) {
    // MVA ajustado fornecido
    mvaAjustado = params.mvaAjustado;
    mvaOriginal = params.mva || (mvaConfig?.mvaOriginal || 0);
  } else if (params.mva !== undefined) {
    // MVA customizado fornecido
    mvaOriginal = params.mva;
    mvaAjustado = calcularMVAAjustada(
      mvaOriginal,
      params.aliquotaInterestadual,
      params.aliquotaInterna
    );
  } else {
    // Usar MVA da tabela
    mvaOriginal = mvaConfig!.mvaOriginal;
    mvaAjustado = calcularMVAAjustada(
      mvaOriginal,
      params.aliquotaInterestadual,
      params.aliquotaInterna
    );
  }
  
  // Calcular valor da operação
  const valorOperacao = calcularValorOperacaoST(params);
  
  // Calcular Base de Cálculo do ST
  let baseCalculoST = calcularBaseCalculoST(valorOperacao, mvaAjustado);
  
  // Aplicar redução se houver
  if (params.reducaoBaseCalculoSt) {
    baseCalculoST = baseCalculoST * (1 - (params.reducaoBaseCalculoSt / 100));
  }
  
  // Calcular ICMS ST
  const valorST = calcularICMSST(
    baseCalculoST,
    params.aliquotaInterna,
    params.valorIcmsProprio
  );
  
  // FCP ST (se aplicável)
  let fcpStResult = {};
  if (params.calcularFcpSt && params.aliquotaFcpSt) {
    const valorFcpSt = baseCalculoST * (params.aliquotaFcpSt / 100);
    fcpStResult = {
      baseCalculoFcpSt: baseCalculoST,
      aliquotaFcpSt: params.aliquotaFcpSt,
      valorFcpSt,
    };
  }
  
  return {
    temST: true,
    baseCalculoST,
    aliquotaST: params.aliquotaInterna,
    valorST,
    mvaOriginal,
    mvaAjustado,
    valorIcmsProprio: params.valorIcmsProprio,
    modalidadeBcSt: params.modalidadeBcSt || 4, // 4 = Margem Valor Agregado (%)
    protocolo: mvaConfig?.protocolo,
    ncm: params.ncm,
    ...fcpStResult,
  };
}

/**
 * Calcula ST usando wrapper simplificado
 */
export function calcularSTSimplificado(params: {
  valorOperacao: number;
  ncm: string;
  aliquotaInterestadual: number;
  aliquotaInterna: number;
  icmsProprio: number;
  ufDestino?: string;
}): {
  temST: boolean;
  mvaOriginal?: number;
  mvaAjustada?: number;
  baseCalculoST?: number;
  valorST?: number;
  protocolo?: string;
} {
  return calcularSTCompleto(
    params.valorOperacao,
    params.ncm,
    params.aliquotaInterestadual,
    params.aliquotaInterna,
    params.icmsProprio,
    params.ufDestino
  );
}

/**
 * Calcula apenas a Base de Cálculo do ST
 */
export function calcularBaseSTSimples(
  valorOperacao: number,
  mva: number,
  valorIpi?: number
): number {
  let base = valorOperacao;
  
  if (valorIpi) {
    base += valorIpi;
  }
  
  return calcularBaseCalculoST(base, mva);
}

/**
 * Calcula MVA ajustada
 */
export function calcularMVAAjustadaSimples(
  mvaOriginal: number,
  aliquotaInter: number,
  aliquotaIntra: number
): number {
  return calcularMVAAjustada(mvaOriginal, aliquotaInter, aliquotaIntra);
}

/**
 * Verifica se produto tem ST
 */
export function verificarST(ncm: string): {
  temST: boolean;
  mva?: number;
  protocolo?: string;
  descricao?: string;
} {
  const mvaConfig = getMVA(ncm);
  
  if (!mvaConfig) {
    return { temST: false };
  }
  
  return {
    temST: true,
    mva: mvaConfig.mvaOriginal,
    protocolo: mvaConfig.protocolo,
    descricao: mvaConfig.descricao,
  };
}

/**
 * Calcula ST para operação de entrada (ressarcimento)
 * 
 * Quando o substituto recebe mercadoria com ST já recolhido
 */
export function calcularSTEntrada(params: {
  valorOperacao: number;
  valorSTRecolhido: number;  // ST já pago anteriormente
  valorSTDue: number;        // ST que deveria ser pago
}): {
  temRessarcimento: boolean;
  valorRessarcimento: number;
  valorComplemento: number;
} {
  const diferenca = params.valorSTRecolhido - params.valorSTDue;
  
  if (diferenca > 0) {
    // Há valor a ressarcir
    return {
      temRessarcimento: true,
      valorRessarcimento: diferenca,
      valorComplemento: 0,
    };
  } else if (diferenca < 0) {
    // Há complemento a recolher
    return {
      temRessarcimento: false,
      valorRessarcimento: 0,
      valorComplemento: Math.abs(diferenca),
    };
  }
  
  // Valores iguais
  return {
    temRessarcimento: false,
    valorRessarcimento: 0,
    valorComplemento: 0,
  };
}

/**
 * Calcula partilha ICMS ST entre origem e destino
 * 
 * Para operações interestaduais com consumidor final
 */
export function calcularPartilhaST(params: {
  valorST: number;
  anoOperacao: number;  // Ano para definir % da partilha
}): {
  valorOrigem: number;
  valorDestino: number;
  percentualDestino: number;
} {
  // Partilha progressiva conforme EC 87/2015
  let percentualDestino: number;
  
  if (params.anoOperacao >= 2019) {
    percentualDestino = 100; // 100% destino a partir de 2019
  } else if (params.anoOperacao === 2018) {
    percentualDestino = 80;  // 80% destino em 2018
  } else if (params.anoOperacao === 2017) {
    percentualDestino = 60;  // 60% destino em 2017
  } else if (params.anoOperacao === 2016) {
    percentualDestino = 40;  // 40% destino em 2016
  } else {
    percentualDestino = 20;  // 20% destino em 2015
  }
  
  const valorDestino = params.valorST * (percentualDestino / 100);
  const valorOrigem = params.valorST - valorDestino;
  
  return {
    valorOrigem,
    valorDestino,
    percentualDestino,
  };
}

// Exportar funções do módulo de dados
export {
  getMVA,
  calcularMVAAjustada,
  calcularBaseCalculoST,
  calcularICMSST,
  temSubstituicaoTributaria,
};
