// ============================================================================
// CALCULADORA: IPI (Imposto sobre Produtos Industrializados)
// Descrição: Motor de cálculo de IPI para NF-e
// Suporta: CST 00, 49, 50, 99
// ============================================================================

/**
 * CST de IPI
 */
export const CST_IPI = {
  '00': 'Entrada com recuperação de crédito',
  '01': 'Entrada tributada com alíquota zero',
  '02': 'Entrada isenta',
  '03': 'Entrada não tributada',
  '04': 'Entrada imune',
  '05': 'Entrada com suspensão',
  '49': 'Outras entradas',
  '50': 'Saída tributada',
  '51': 'Saída tributada com alíquota zero',
  '52': 'Saída isenta',
  '53': 'Saída não tributada',
  '54': 'Saída imune',
  '55': 'Saída com suspensão',
  '99': 'Outras saídas',
};

/**
 * Alíquotas de IPI por NCM (EXEMPLOS)
 * 
 * IMPORTANTE: Consultar TIPI (Tabela de Incidência do IPI) atualizada
 * As alíquotas variam de 0% a 330% dependendo do produto
 */
export const ALIQUOTAS_IPI_POR_NCM: Record<string, number> = {
  // Bebidas alcoólicas (alíquotas altas)
  '2203': 15,   // Cerveja
  '2204': 20,   // Vinho
  '2208': 30,   // Destilados
  
  // Refrigerantes
  '2202': 4,    // Refrigerantes
  
  // Fumo (alíquotas muito altas)
  '2402': 300,  // Charutos e cigarrilhas
  '2403': 330,  // Cigarros
  
  // Cosméticos
  '3303': 15,   // Perfumes
  '3304': 12,   // Maquiagem
  
  // Veículos
  '8702': 15,   // Ônibus
  '8703': 25,   // Automóveis de passeio
  '8704': 10,   // Caminhões
  
  // Eletrônicos
  '8528': 15,   // TVs
  '8517': 12,   // Celulares
  
  // Ar condicionado
  '8415': 20,   // Ar condicionado
  
  // Produtos não tributados ou isentos (0%)
  '8701': 0,    // Tratores
  '3004': 0,    // Medicamentos
  '0701': 0,    // Alimentos básicos
};

/**
 * Parâmetros para cálculo de IPI
 */
export interface IPICalculoParams {
  // Valores
  valorProdutos: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorDesconto?: number;
  
  // Tributação
  cst: string;               // CST do IPI
  ncm: string;               // NCM do produto
  
  // Alíquota (opcional - se não informado, busca na tabela por NCM)
  aliquota?: number;
  
  // Enquadramento
  codigoEnquadramento?: string;  // Código de enquadramento IPI
  
  // Cálculo por unidade (caso especial)
  calcularPorUnidade?: boolean;
  quantidade?: number;
  valorUnidade?: number;
}

/**
 * Resultado do cálculo de IPI
 */
export interface IPICalculoResult {
  baseCalculo: number;
  aliquota: number;
  valor: number;
  cst: string;
  codigoEnquadramento?: string;
  
  // Cálculo por unidade
  quantidadeUnidade?: number;
  valorUnidade?: number;
}

/**
 * Obtém a alíquota de IPI para um NCM
 */
export function getAliquotaIPI(ncm: string): number {
  // Normalizar NCM
  const ncmLimpo = ncm.replace(/[.-]/g, '');
  
  // Buscar alíquota exata (8 dígitos)
  if (ALIQUOTAS_IPI_POR_NCM[ncmLimpo] !== undefined) {
    return ALIQUOTAS_IPI_POR_NCM[ncmLimpo];
  }
  
  // Buscar por 4 primeiros dígitos
  if (ncmLimpo.length >= 4) {
    const ncm4 = ncmLimpo.substring(0, 4);
    if (ALIQUOTAS_IPI_POR_NCM[ncm4] !== undefined) {
      return ALIQUOTAS_IPI_POR_NCM[ncm4];
    }
  }
  
  // Não encontrou - assumir não tributado
  return 0;
}

/**
 * Calcula o valor total da operação (base de cálculo)
 */
function calcularValorOperacao(params: IPICalculoParams): number {
  return (
    params.valorProdutos +
    (params.valorFrete || 0) +
    (params.valorSeguro || 0) +
    (params.valorOutrasDespesas || 0) -
    (params.valorDesconto || 0)
  );
}

/**
 * Calcula IPI - CST 00 (Entrada com recuperação de crédito)
 */
function calcularCST00(params: IPICalculoParams, valorOperacao: number): IPICalculoResult {
  // Obter alíquota
  const aliquota = params.aliquota ?? getAliquotaIPI(params.ncm);
  
  // Base de cálculo = valor da operação
  const baseCalculo = valorOperacao;
  
  // Valor IPI
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '00',
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * Calcula IPI - CST 01, 02, 03, 04, 05 (Não tributado / Isento / Imune / Suspenso)
 */
function calcularCST_NaoTributado(params: IPICalculoParams, cst: string): IPICalculoResult {
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    cst,
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * Calcula IPI - CST 49 (Outras entradas)
 */
function calcularCST49(params: IPICalculoParams, valorOperacao: number): IPICalculoResult {
  // Obter alíquota
  const aliquota = params.aliquota ?? getAliquotaIPI(params.ncm);
  
  const baseCalculo = valorOperacao;
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '49',
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * Calcula IPI - CST 50 (Saída tributada)
 */
function calcularCST50(params: IPICalculoParams, valorOperacao: number): IPICalculoResult {
  // Verificar se é cálculo por unidade
  if (params.calcularPorUnidade && params.quantidade && params.valorUnidade) {
    const valor = params.quantidade * params.valorUnidade;
    
    return {
      baseCalculo: 0,
      aliquota: 0,
      valor,
      cst: '50',
      codigoEnquadramento: params.codigoEnquadramento,
      quantidadeUnidade: params.quantidade,
      valorUnidade: params.valorUnidade,
    };
  }
  
  // Cálculo normal por alíquota
  const aliquota = params.aliquota ?? getAliquotaIPI(params.ncm);
  const baseCalculo = valorOperacao;
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '50',
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * Calcula IPI - CST 51, 52, 53, 54, 55 (Saída não tributada / Isenta / Imune / Suspensa)
 */
function calcularCST_SaidaNaoTributada(params: IPICalculoParams, cst: string): IPICalculoResult {
  return {
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    cst,
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * Calcula IPI - CST 99 (Outras saídas)
 */
function calcularCST99(params: IPICalculoParams, valorOperacao: number): IPICalculoResult {
  // CST 99 pode ter diversas situações
  const aliquota = params.aliquota ?? getAliquotaIPI(params.ncm);
  const baseCalculo = valorOperacao;
  const valor = baseCalculo * (aliquota / 100);
  
  return {
    baseCalculo,
    aliquota,
    valor,
    cst: '99',
    codigoEnquadramento: params.codigoEnquadramento,
  };
}

/**
 * FUNÇÃO PRINCIPAL: Calcula IPI baseado no CST
 */
export function calcularIPI(params: IPICalculoParams): IPICalculoResult {
  // Validações
  if (!params.cst) {
    throw new Error('CST do IPI é obrigatório');
  }
  
  if (!params.ncm) {
    throw new Error('NCM é obrigatório para cálculo de IPI');
  }
  
  // Calcular valor da operação
  const valorOperacao = calcularValorOperacao(params);
  
  // Processar por CST
  switch (params.cst) {
    case '00':
      return calcularCST00(params, valorOperacao);
    
    case '01':
    case '02':
    case '03':
    case '04':
    case '05':
      return calcularCST_NaoTributado(params, params.cst);
    
    case '49':
      return calcularCST49(params, valorOperacao);
    
    case '50':
      return calcularCST50(params, valorOperacao);
    
    case '51':
    case '52':
    case '53':
    case '54':
    case '55':
      return calcularCST_SaidaNaoTributada(params, params.cst);
    
    case '99':
      return calcularCST99(params, valorOperacao);
    
    default:
      throw new Error(`CST IPI não suportado: ${params.cst}`);
  }
}

/**
 * Verifica se um produto é tributado pelo IPI
 */
export function isProdutoTributadoIPI(ncm: string): boolean {
  const aliquota = getAliquotaIPI(ncm);
  return aliquota > 0;
}

/**
 * Verifica se CST permite crédito de IPI (entrada)
 */
export function permiteCreditoIPI(cst: string): boolean {
  // CST 00 permite crédito
  return cst === '00';
}

/**
 * Valida CST IPI
 */
export function validarCSTIpi(cst: string): boolean {
  return cst in CST_IPI;
}

/**
 * Obtém descrição do CST IPI
 */
export function getDescricaoCSTIpi(cst: string): string {
  return CST_IPI[cst as keyof typeof CST_IPI] || 'CST não encontrado';
}
