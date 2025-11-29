// ============================================================================
// DADOS: MVA (Margem de Valor Agregado) para ICMS-ST
// Descrição: Tabelas de MVA por NCM e UF para cálculo de Substituição Tributária
// Atualizado: 2024 (verificar convênios e protocolos ICMS vigentes)
// ============================================================================

/**
 * MVA - Margem de Valor Agregado
 * 
 * Usado para cálculo de ICMS-ST (Substituição Tributária)
 * Varia por NCM, UF de origem e UF de destino
 */

export interface MVAConfig {
  ncm: string;              // NCM do produto (4 ou 8 dígitos)
  descricao: string;        // Descrição do produto
  mvaOriginal: number;      // MVA Original (%)
  mvaAjustada?: number;     // MVA Ajustada (%) - quando aplicável
  ufOrigem?: string;        // UF de origem (quando específico)
  ufDestino?: string;       // UF de destino (quando específico)
  protocolo?: string;       // Protocolo ICMS de referência
  observacoes?: string;
}

/**
 * Tabela de MVA por segmento (EXEMPLOS)
 * 
 * IMPORTANTE: Esta é uma tabela simplificada
 * Na prática, cada estado tem seus próprios protocolos e convênios
 * Consultar CONFAZ e legislação estadual específica
 */
export const MVA_TABELA: MVAConfig[] = [
  // ========================================
  // BEBIDAS ALCOÓLICAS
  // ========================================
  {
    ncm: '2203',
    descricao: 'Cervejas de malte',
    mvaOriginal: 40,
    protocolo: 'Protocolo ICMS 11/91',
  },
  {
    ncm: '2204',
    descricao: 'Vinhos',
    mvaOriginal: 50,
    protocolo: 'Protocolo ICMS 13/06',
  },
  {
    ncm: '2208',
    descricao: 'Aguardentes e licores',
    mvaOriginal: 70,
    protocolo: 'Protocolo ICMS 13/06',
  },
  
  // ========================================
  // REFRIGERANTES E ÁGUAS
  // ========================================
  {
    ncm: '2201',
    descricao: 'Águas minerais',
    mvaOriginal: 30,
  },
  {
    ncm: '2202',
    descricao: 'Refrigerantes',
    mvaOriginal: 35,
    protocolo: 'Protocolo ICMS 11/91',
  },
  
  // ========================================
  // COMBUSTÍVEIS
  // ========================================
  {
    ncm: '2710',
    descricao: 'Gasolina',
    mvaOriginal: 0, // Regime monofásico
    observacoes: 'Regime monofásico - ST recolhido na refinaria',
  },
  {
    ncm: '2710',
    descricao: 'Óleo diesel',
    mvaOriginal: 0,
    observacoes: 'Regime monofásico - ST recolhido na refinaria',
  },
  
  // ========================================
  // PRODUTOS FARMACÊUTICOS
  // ========================================
  {
    ncm: '3003',
    descricao: 'Medicamentos',
    mvaOriginal: 38.67,
    protocolo: 'Protocolo ICMS 76/94',
  },
  {
    ncm: '3004',
    descricao: 'Medicamentos',
    mvaOriginal: 38.67,
    protocolo: 'Protocolo ICMS 76/94',
  },
  
  // ========================================
  // COSMÉTICOS E PERFUMARIA
  // ========================================
  {
    ncm: '3303',
    descricao: 'Perfumes e cosméticos',
    mvaOriginal: 43.05,
    protocolo: 'Protocolo ICMS 191/17',
  },
  {
    ncm: '3304',
    descricao: 'Produtos de beleza',
    mvaOriginal: 43.05,
    protocolo: 'Protocolo ICMS 191/17',
  },
  
  // ========================================
  // PRODUTOS DE LIMPEZA
  // ========================================
  {
    ncm: '3401',
    descricao: 'Sabões e detergentes',
    mvaOriginal: 40,
    protocolo: 'Protocolo ICMS 197/17',
  },
  {
    ncm: '3402',
    descricao: 'Detergentes',
    mvaOriginal: 40,
    protocolo: 'Protocolo ICMS 197/17',
  },
  
  // ========================================
  // PNEUS
  // ========================================
  {
    ncm: '4011',
    descricao: 'Pneus novos de borracha',
    mvaOriginal: 33,
    protocolo: 'Protocolo ICMS 41/08',
  },
  
  // ========================================
  // CIMENTO
  // ========================================
  {
    ncm: '2523',
    descricao: 'Cimento Portland',
    mvaOriginal: 40,
    protocolo: 'Protocolo ICMS 11/85',
  },
  
  // ========================================
  // FERRAMENTAS
  // ========================================
  {
    ncm: '8201',
    descricao: 'Ferramentas manuais',
    mvaOriginal: 40,
  },
  
  // ========================================
  // MATERIAIS DE CONSTRUÇÃO
  // ========================================
  {
    ncm: '6907',
    descricao: 'Placas cerâmicas',
    mvaOriginal: 30,
  },
  {
    ncm: '6908',
    descricao: 'Placas cerâmicas',
    mvaOriginal: 30,
  },
  
  // ========================================
  // AUTOPEÇAS
  // ========================================
  {
    ncm: '8708',
    descricao: 'Autopeças',
    mvaOriginal: 41.38,
    protocolo: 'Protocolo ICMS 41/08',
  },
];

/**
 * MVA por UF (ajustes estaduais)
 * 
 * Cada estado pode ter MVAs específicas
 * Esta é uma tabela simplificada
 */
export const MVA_POR_UF: Record<string, { ajuste: number, observacao?: string }> = {
  'SP': { ajuste: 0, observacao: 'MVA padrão conforme protocolos' },
  'RJ': { ajuste: 0, observacao: 'MVA padrão conforme protocolos' },
  'MG': { ajuste: 0, observacao: 'MVA padrão conforme protocolos' },
  // Adicionar ajustes específicos por estado se necessário
};

/**
 * Obtém a MVA para um NCM
 * 
 * @param ncm NCM do produto (4 ou 8 dígitos)
 * @param ufDestino UF de destino (opcional)
 */
export function getMVA(ncm: string, ufDestino?: string): MVAConfig | null {
  // Normalizar NCM (remover pontos e traços)
  const ncmLimpo = ncm.replace(/[.-]/g, '');
  
  // Buscar MVA exata (8 dígitos)
  let mva = MVA_TABELA.find(m => m.ncm === ncmLimpo);
  
  // Se não encontrar, buscar por 4 primeiros dígitos
  if (!mva && ncmLimpo.length >= 4) {
    const ncm4 = ncmLimpo.substring(0, 4);
    mva = MVA_TABELA.find(m => m.ncm === ncm4);
  }
  
  if (!mva) {
    return null;
  }
  
  // Aplicar ajuste por UF se houver
  if (ufDestino) {
    const ajusteUF = MVA_POR_UF[ufDestino.toUpperCase()];
    if (ajusteUF && ajusteUF.ajuste !== 0) {
      return {
        ...mva,
        mvaAjustada: mva.mvaOriginal + ajusteUF.ajuste,
        ufDestino,
        observacoes: ajusteUF.observacao,
      };
    }
  }
  
  return mva;
}

/**
 * Verifica se um produto tem Substituição Tributária
 */
export function temSubstituicaoTributaria(ncm: string): boolean {
  return getMVA(ncm) !== null;
}

/**
 * Calcula a MVA ajustada baseado nas alíquotas
 * 
 * Fórmula: MVA Ajustada = [(1 + MVA Original) × (1 - ALQ inter) / (1 - ALQ intra)] - 1
 * 
 * @param mvaOriginal MVA original (%)
 * @param aliquotaInterestadual Alíquota interestadual (%)
 * @param aliquotaInterna Alíquota interna da UF de destino (%)
 */
export function calcularMVAAjustada(
  mvaOriginal: number,
  aliquotaInterestadual: number,
  aliquotaInterna: number
): number {
  const mva = mvaOriginal / 100;
  const aliqInter = aliquotaInterestadual / 100;
  const aliqIntra = aliquotaInterna / 100;
  
  const mvaAjustada = ((1 + mva) * (1 - aliqInter) / (1 - aliqIntra)) - 1;
  
  return mvaAjustada * 100;
}

/**
 * Calcula a base de cálculo do ICMS-ST
 * 
 * BC ST = Valor da Operação × (1 + MVA)
 * 
 * @param valorOperacao Valor da operação
 * @param mva MVA (%) - já ajustada se necessário
 */
export function calcularBaseCalculoST(
  valorOperacao: number,
  mva: number
): number {
  return valorOperacao * (1 + (mva / 100));
}

/**
 * Calcula o ICMS-ST
 * 
 * ICMS ST = (BC ST × Alíquota Interna) - ICMS Próprio
 * 
 * @param baseCalculoST Base de cálculo do ST
 * @param aliquotaInterna Alíquota interna da UF de destino
 * @param icmsProprio ICMS próprio já destacado
 */
export function calcularICMSST(
  baseCalculoST: number,
  aliquotaInterna: number,
  icmsProprio: number
): number {
  const icmsTotal = baseCalculoST * (aliquotaInterna / 100);
  const icmsST = icmsTotal - icmsProprio;
  
  return icmsST > 0 ? icmsST : 0;
}

/**
 * Calcula ST completo (wrapper)
 */
export function calcularSTCompleto(
  valorOperacao: number,
  ncm: string,
  aliquotaInterestadual: number,
  aliquotaInterna: number,
  icmsProprio: number,
  ufDestino?: string
): {
  temST: boolean;
  mvaOriginal?: number;
  mvaAjustada?: number;
  baseCalculoST?: number;
  valorST?: number;
  protocolo?: string;
} {
  // Verificar se tem ST
  const mvaConfig = getMVA(ncm, ufDestino);
  
  if (!mvaConfig) {
    return { temST: false };
  }
  
  // Calcular MVA ajustada
  const mvaAjustada = calcularMVAAjustada(
    mvaConfig.mvaOriginal,
    aliquotaInterestadual,
    aliquotaInterna
  );
  
  // Calcular BC ST
  const baseCalculoST = calcularBaseCalculoST(valorOperacao, mvaAjustada);
  
  // Calcular ICMS ST
  const valorST = calcularICMSST(baseCalculoST, aliquotaInterna, icmsProprio);
  
  return {
    temST: true,
    mvaOriginal: mvaConfig.mvaOriginal,
    mvaAjustada,
    baseCalculoST,
    valorST,
    protocolo: mvaConfig.protocolo,
  };
}

/**
 * Lista todos os NCMs com ST cadastrados
 */
export function listarNCMsComST(): string[] {
  return MVA_TABELA.map(m => m.ncm);
}

/**
 * Busca MVAs por descrição
 */
export function buscarMVAPorDescricao(termo: string): MVAConfig[] {
  const termoLower = termo.toLowerCase();
  return MVA_TABELA.filter(m => 
    m.descricao.toLowerCase().includes(termoLower)
  );
}
