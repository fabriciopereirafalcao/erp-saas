// ============================================================================
// TIPOS: Definições de tipos para cálculos fiscais
// Descrição: Tipos compartilhados entre todos os calculadores
// ============================================================================

/**
 * Regime Tributário do Emitente
 */
export type RegimeTributario = 
  | 'simples_nacional'   // 1 - Simples Nacional
  | 'lucro_presumido'    // 2 - Lucro Presumido (Regime Normal)
  | 'lucro_real'         // 3 - Lucro Real (Regime Normal)
  | 'mei';               // 4 - MEI

/**
 * Tipo de Operação
 */
export type TipoOperacao = 'entrada' | 'saida';

/**
 * Finalidade da NF-e
 */
export type FinalidadeNFe = 
  | 'normal'             // 1 - NF-e normal
  | 'complementar'       // 2 - NF-e complementar
  | 'ajuste'             // 3 - NF-e de ajuste
  | 'devolucao';         // 4 - Devolução de mercadoria

/**
 * Indicador de Presença
 */
export type IndicadorPresenca = 
  | 'nao_se_aplica'      // 0 - Não se aplica
  | 'presencial'         // 1 - Operação presencial
  | 'internet'           // 2 - Operação não presencial, pela Internet
  | 'teleatendimento'    // 3 - Operação não presencial, Teleatendimento
  | 'entrega_domicilio'  // 4 - NFC-e em operação com entrega a domicílio
  | 'outros';            // 9 - Operação não presencial, outros

/**
 * Origem da Mercadoria
 */
export type OrigemMercadoria = 
  | 0  // Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8
  | 1  // Estrangeira - Importação direta, exceto a indicada no código 6
  | 2  // Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7
  | 3  // Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%
  | 4  // Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos
  | 5  // Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%
  | 6  // Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX
  | 7  // Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX
  | 8; // Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%

/**
 * Modalidade da Base de Cálculo ICMS
 */
export type ModalidadeBCIcms = 
  | 0  // Margem Valor Agregado (%)
  | 1  // Pauta (Valor)
  | 2  // Preço Tabelado Máx. (valor)
  | 3; // Valor da operação

/**
 * Modalidade da Base de Cálculo ICMS ST
 */
export type ModalidadeBCIcmsST = 
  | 0  // Preço tabelado ou máximo sugerido
  | 1  // Lista Negativa (valor)
  | 2  // Lista Positiva (valor)
  | 3  // Lista Neutra (valor)
  | 4  // Margem Valor Agregado (%)
  | 5  // Pauta (valor)
  | 6; // Valor da Operação

/**
 * Dados completos de um item da NF-e para cálculo
 */
export interface ItemCalculoCompleto {
  // Identificação
  numeroItem: number;
  codigoProduto: string;
  codigoEAN?: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidadeComercial: string;
  
  // Quantidades e valores
  quantidadeComercial: number;
  valorUnitarioComercial: number;
  valorTotalBruto: number;
  
  // Agregados
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
  
  // Indicadores
  origem: OrigemMercadoria;
  importado: boolean;
  
  // Tributação ICMS
  icms: {
    cst?: string;
    csosn?: string;
    modalidadeBC?: ModalidadeBCIcms;
    aliquota?: number;
    reducaoBC?: number;
    
    // ST
    modalidadeBCST?: ModalidadeBCIcmsST;
    mva?: number;
    aliquotaST?: number;
    reducaoBCST?: number;
    
    // FCP
    aliquotaFCP?: number;
    aliquotaFCPST?: number;
  };
  
  // Tributação IPI
  ipi?: {
    cst: string;
    aliquota?: number;
    codigoEnquadramento?: string;
  };
  
  // Tributação PIS
  pis: {
    cst: string;
    aliquota?: number;
  };
  
  // Tributação COFINS
  cofins: {
    cst: string;
    aliquota?: number;
  };
  
  // Lei da Transparência
  informarTributos?: boolean;
}

/**
 * Resultado completo do cálculo de um item
 */
export interface ItemCalculoResult {
  // Identificação
  numeroItem: number;
  
  // Valores base
  valorProdutos: number;
  valorTotal: number;
  
  // ICMS
  icms: {
    origem: OrigemMercadoria;
    cst?: string;
    csosn?: string;
    modalidadeBC: number;
    baseCalculo: number;
    aliquota: number;
    valor: number;
    
    // ST
    modalidadeBCST?: number;
    baseCalculoST?: number;
    mva?: number;
    aliquotaST?: number;
    valorST?: number;
    
    // FCP
    valorFCP?: number;
    valorFCPST?: number;
  };
  
  // IPI
  ipi?: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  
  // PIS
  pis: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  
  // COFINS
  cofins: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  
  // Lei da Transparência
  tributos?: {
    valorAproximado: number;
    fonte: string;
  };
}

/**
 * Parâmetros gerais da NF-e para cálculo
 */
export interface ParametrosNFe {
  // Emitente
  emitente: {
    cnpj: string;
    uf: string;
    regimeTributario: RegimeTributario;
    crt: number;  // 1=Simples, 2=Simples com ST, 3=Regime Normal
  };
  
  // Destinatário
  destinatario: {
    documento: string;  // CPF ou CNPJ
    uf: string;
    contribuinteICMS: boolean;
    consumidorFinal: boolean;
  };
  
  // Operação
  operacao: {
    tipo: TipoOperacao;
    natureza: string;
    finalidade: FinalidadeNFe;
    presenca: IndicadorPresenca;
  };
  
  // Itens
  itens: ItemCalculoCompleto[];
  
  // Totais extras
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
  
  // Opções
  opcoes?: {
    calcularFCP?: boolean;
    calcularLeiTransparencia?: boolean;
    ratearFreteDesconto?: boolean;
    tokenIBPT?: string;
  };
}

/**
 * Resultado completo do cálculo da NF-e
 */
export interface NFeCalculoResult {
  // Itens calculados
  itens: ItemCalculoResult[];
  
  // Totais
  totais: {
    baseCalculoICMS: number;
    valorICMS: number;
    baseCalculoICMSST: number;
    valorICMSST: number;
    valorFCP: number;
    valorFCPST: number;
    valorProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorII: number;
    valorIPI: number;
    valorPIS: number;
    valorCOFINS: number;
    valorOutrasDespesas: number;
    valorTotal: number;
    valorTributos: number;  // Lei da Transparência
  };
  
  // Validações
  validacoes: {
    valido: boolean;
    erros: string[];
    avisos: string[];
  };
  
  // Metadados
  dataCalculo: string;
  versaoCalculadora: string;
}

/**
 * Erro de cálculo fiscal
 */
export class ErroCalculoFiscal extends Error {
  constructor(
    message: string,
    public codigo: string,
    public detalhes?: Record<string, any>
  ) {
    super(message);
    this.name = 'ErroCalculoFiscal';
  }
}

/**
 * Configurações de arredondamento
 */
export interface ConfiguracaoArredondamento {
  casasDecimais: number;
  metodo: 'round' | 'floor' | 'ceil';
}

/**
 * Constantes de cálculo
 */
export const CONSTANTES_CALCULO = {
  VERSAO: '1.0.0',
  CASAS_DECIMAIS_VALOR: 2,
  CASAS_DECIMAIS_QUANTIDADE: 4,
  CASAS_DECIMAIS_ALIQUOTA: 2,
  MAX_ITENS_NFE: 990,
  TOLERANCIA_ARREDONDAMENTO: 0.02,
} as const;

/**
 * Mapeamento CRT (Código Regime Tributário)
 */
export const CRT_MAP: Record<RegimeTributario, number> = {
  'simples_nacional': 1,
  'lucro_presumido': 3,
  'lucro_real': 3,
  'mei': 1,
};

/**
 * Helper: Converte regime tributário para CRT
 */
export function regimeParaCRT(regime: RegimeTributario): number {
  return CRT_MAP[regime];
}

/**
 * Helper: Converte CRT para regime tributário
 */
export function crtParaRegime(crt: number): RegimeTributario {
  switch (crt) {
    case 1:
    case 2:
      return 'simples_nacional';
    case 3:
      return 'lucro_presumido';  // Pode ser também lucro_real
    default:
      throw new Error(`CRT inválido: ${crt}`);
  }
}
