// ============================================================================
// CALCULADORA: PIS/COFINS
// Descrição: Motor de cálculo de PIS e COFINS para NF-e
// Suporta: Regime Cumulativo e Não-Cumulativo
// ============================================================================

import { 
  calcularPisCofins as calcularPisCofinsBase,
  getAliquotasPisCofins,
  permiteCredito,
  validarCSTpisCofins,
  getDescricaoCST,
  type RegimePisCofins
} from '../data/pisCofinsRegimes.ts';

/**
 * Parâmetros para cálculo de PIS/COFINS
 */
export interface PisCofinsCalculoParams {
  // Valores
  valorProdutos: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorDesconto?: number;
  valorIpi?: number;              // IPI pode compor ou não a BC
  
  // Tributação
  cstPis: string;
  cstCofins: string;
  
  // Alíquotas customizadas (opcional)
  aliquotaPis?: number;
  aliquotaCofins?: number;
  
  // Base de cálculo
  incluirIpiNaBase?: boolean;     // Se IPI compõe a BC
  
  // Regime
  regime?: RegimePisCofins;       // Se não informado, detecta pelo CST
}

/**
 * Resultado do cálculo de PIS/COFINS
 */
export interface PisCofinsCalculoResult {
  // PIS
  baseCalculoPis: number;
  aliquotaPis: number;
  valorPis: number;
  cstPis: string;
  
  // COFINS
  baseCalculoCofins: number;
  aliquotaCofins: number;
  valorCofins: number;
  cstCofins: string;
  
  // Informações
  regime: RegimePisCofins;
  permiteCreditoPis: boolean;
  permiteCreditoCofins: boolean;
}

/**
 * Calcula o valor total da operação (base de cálculo)
 */
function calcularBaseCalculo(params: PisCofinsCalculoParams): number {
  let base = (
    params.valorProdutos +
    (params.valorFrete || 0) +
    (params.valorSeguro || 0) +
    (params.valorOutrasDespesas || 0) -
    (params.valorDesconto || 0)
  );
  
  // Incluir IPI na base se configurado
  if (params.incluirIpiNaBase && params.valorIpi) {
    base += params.valorIpi;
  }
  
  return base;
}

/**
 * FUNÇÃO PRINCIPAL: Calcula PIS e COFINS
 */
export function calcularPisCofinsCompleto(params: PisCofinsCalculoParams): PisCofinsCalculoResult {
  // Validações
  if (!params.cstPis || !params.cstCofins) {
    throw new Error('CST PIS e COFINS são obrigatórios');
  }
  
  if (!validarCSTpisCofins(params.cstPis)) {
    throw new Error(`CST PIS inválido: ${params.cstPis}`);
  }
  
  if (!validarCSTpisCofins(params.cstCofins)) {
    throw new Error(`CST COFINS inválido: ${params.cstCofins}`);
  }
  
  // Calcular base de cálculo
  const baseCalculo = calcularBaseCalculo(params);
  
  // Calcular PIS/COFINS usando função base
  const resultado = calcularPisCofinsBase(
    baseCalculo,
    params.cstPis,
    params.cstCofins,
    params.aliquotaPis,
    params.aliquotaCofins
  );
  
  // Verificar se permite crédito
  const permiteCreditoPis = permiteCredito(params.cstPis);
  const permiteCreditoCofins = permiteCredito(params.cstCofins);
  
  return {
    baseCalculoPis: baseCalculo,
    aliquotaPis: resultado.aliquotaPis,
    valorPis: resultado.valorPis,
    cstPis: params.cstPis,
    
    baseCalculoCofins: baseCalculo,
    aliquotaCofins: resultado.aliquotaCofins,
    valorCofins: resultado.valorCofins,
    cstCofins: params.cstCofins,
    
    regime: resultado.regime,
    permiteCreditoPis,
    permiteCreditoCofins,
  };
}

/**
 * Calcula apenas PIS
 */
export function calcularPIS(params: {
  baseCalculo: number;
  cst: string;
  aliquota?: number;
}): {
  baseCalculo: number;
  aliquota: number;
  valor: number;
  cst: string;
} {
  if (!validarCSTpisCofins(params.cst)) {
    throw new Error(`CST PIS inválido: ${params.cst}`);
  }
  
  // Se alíquota foi fornecida, usar ela
  if (params.aliquota !== undefined) {
    return {
      baseCalculo: params.baseCalculo,
      aliquota: params.aliquota,
      valor: params.baseCalculo * (params.aliquota / 100),
      cst: params.cst,
    };
  }
  
  // Obter alíquota padrão
  const { pis } = getAliquotasPisCofins(params.cst, params.cst);
  
  return {
    baseCalculo: params.baseCalculo,
    aliquota: pis,
    valor: params.baseCalculo * (pis / 100),
    cst: params.cst,
  };
}

/**
 * Calcula apenas COFINS
 */
export function calcularCOFINS(params: {
  baseCalculo: number;
  cst: string;
  aliquota?: number;
}): {
  baseCalculo: number;
  aliquota: number;
  valor: number;
  cst: string;
} {
  if (!validarCSTpisCofins(params.cst)) {
    throw new Error(`CST COFINS inválido: ${params.cst}`);
  }
  
  // Se alíquota foi fornecida, usar ela
  if (params.aliquota !== undefined) {
    return {
      baseCalculo: params.baseCalculo,
      aliquota: params.aliquota,
      valor: params.baseCalculo * (params.aliquota / 100),
      cst: params.cst,
    };
  }
  
  // Obter alíquota padrão
  const { cofins } = getAliquotasPisCofins(params.cst, params.cst);
  
  return {
    baseCalculo: params.baseCalculo,
    aliquota: cofins,
    valor: params.baseCalculo * (cofins / 100),
    cst: params.cst,
  };
}

/**
 * Verifica se a operação permite crédito de PIS/COFINS
 */
export function verificaCredito(cstPis: string, cstCofins: string): {
  permiteCreditoPis: boolean;
  permiteCreditoCofins: boolean;
} {
  return {
    permiteCreditoPis: permiteCredito(cstPis),
    permiteCreditoCofins: permiteCredito(cstCofins),
  };
}

/**
 * Obtém descrições dos CSTs
 */
export function getDescricoesCst(cstPis: string, cstCofins: string): {
  descricaoPis: string;
  descricaoCofins: string;
} {
  return {
    descricaoPis: getDescricaoCST(cstPis),
    descricaoCofins: getDescricaoCST(cstCofins),
  };
}

/**
 * Detecta regime tributário pelos CSTs
 */
export function detectarRegime(cstPis: string, cstCofins: string): RegimePisCofins {
  const { regime } = getAliquotasPisCofins(cstPis, cstCofins);
  return regime;
}

/**
 * Calcula crédito de PIS/COFINS (para entradas com direito a crédito)
 */
export function calcularCreditoPisCofins(params: {
  valorOperacao: number;
  cstPis: string;
  cstCofins: string;
  aliquotaPis?: number;
  aliquotaCofins?: number;
}): {
  valorCreditoPis: number;
  valorCreditoCofins: number;
  totalCredito: number;
} {
  // Verificar se permite crédito
  const { permiteCreditoPis, permiteCreditoCofins } = verificaCredito(
    params.cstPis,
    params.cstCofins
  );
  
  let valorCreditoPis = 0;
  let valorCreditoCofins = 0;
  
  if (permiteCreditoPis) {
    const aliquota = params.aliquotaPis ?? getAliquotasPisCofins(params.cstPis, params.cstPis).pis;
    valorCreditoPis = params.valorOperacao * (aliquota / 100);
  }
  
  if (permiteCreditoCofins) {
    const aliquota = params.aliquotaCofins ?? getAliquotasPisCofins(params.cstCofins, params.cstCofins).cofins;
    valorCreditoCofins = params.valorOperacao * (aliquota / 100);
  }
  
  return {
    valorCreditoPis,
    valorCreditoCofins,
    totalCredito: valorCreditoPis + valorCreditoCofins,
  };
}

/**
 * Calcula PIS/COFINS para Simples Nacional
 * 
 * IMPORTANTE: Empresas do Simples Nacional não destacam PIS/COFINS na nota
 * Este valor é apenas informativo para controle interno
 */
export function calcularPisCofinsSimples(params: {
  valorOperacao: number;
  aliquotaSimples: number;  // Alíquota efetiva do Simples Nacional
  percentualPisCofins: number; // % do Simples correspondente a PIS/COFINS
}): {
  baseCalculo: number;
  percentualPisCofins: number;
  valorPisCofinsImplicito: number;
} {
  const valorPisCofinsImplicito = params.valorOperacao * (params.aliquotaSimples / 100) * (params.percentualPisCofins / 100);
  
  return {
    baseCalculo: params.valorOperacao,
    percentualPisCofins: params.percentualPisCofins,
    valorPisCofinsImplicito,
  };
}

/**
 * Valida conjunto de CSTs PIS/COFINS
 */
export function validarCstsPisCofins(cstPis: string, cstCofins: string): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];
  
  if (!validarCSTpisCofins(cstPis)) {
    erros.push(`CST PIS inválido: ${cstPis}`);
  }
  
  if (!validarCSTpisCofins(cstCofins)) {
    erros.push(`CST COFINS inválido: ${cstCofins}`);
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}

// Exportar funções auxiliares do módulo de dados
export {
  getAliquotasPisCofins,
  permiteCredito,
  validarCSTpisCofins,
  getDescricaoCST,
  type RegimePisCofins,
};
