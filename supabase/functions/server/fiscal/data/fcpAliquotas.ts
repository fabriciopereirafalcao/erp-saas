// ============================================================================
// DADOS: Alíquotas de FCP (Fundo de Combate à Pobreza) por UF
// Descrição: Tabela com alíquotas de FCP vigentes em cada estado
// Atualizado: 2024 (verificar atualizações anuais)
// ============================================================================

/**
 * FCP - Fundo de Combate à Pobreza
 * 
 * É um adicional de ICMS destinado ao combate à pobreza
 * Incide sobre operações com produtos supérfluos/luxo
 * Cada estado define suas próprias alíquotas e produtos
 */

export interface FCPConfig {
  uf: string;
  ativo: boolean;
  aliquota: number;                    // Alíquota padrão de FCP
  ncmsIncidencia?: string[];           // NCMs com incidência de FCP
  observacoes?: string;
}

/**
 * Configurações de FCP por UF (2024)
 * 
 * IMPORTANTE: Verificar legislação estadual atualizada
 * As alíquotas e regras mudam frequentemente
 */
export const FCP_POR_UF: Record<string, FCPConfig> = {
  'AC': {
    uf: 'AC',
    ativo: false,
    aliquota: 0,
  },
  'AL': {
    uf: 'AL',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% sobre base de cálculo do ICMS',
  },
  'AP': {
    uf: 'AP',
    ativo: false,
    aliquota: 0,
  },
  'AM': {
    uf: 'AM',
    ativo: false,
    aliquota: 0,
  },
  'BA': {
    uf: 'BA',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% para operações internas e interestaduais',
  },
  'CE': {
    uf: 'CE',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% sobre produtos específicos',
  },
  'DF': {
    uf: 'DF',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% sobre produtos supérfluos',
  },
  'ES': {
    uf: 'ES',
    ativo: false,
    aliquota: 0,
  },
  'GO': {
    uf: 'GO',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% para produtos específicos',
  },
  'MA': {
    uf: 'MA',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'MT': {
    uf: 'MT',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'MS': {
    uf: 'MS',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% sobre produtos específicos',
  },
  'MG': {
    uf: 'MG',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% (pode variar conforme produto)',
  },
  'PA': {
    uf: 'PA',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'PB': {
    uf: 'PB',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'PR': {
    uf: 'PR',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% sobre produtos supérfluos e importados',
  },
  'PE': {
    uf: 'PE',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'PI': {
    uf: 'PI',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'RJ': {
    uf: 'RJ',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% para produtos específicos',
  },
  'RN': {
    uf: 'RN',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'RS': {
    uf: 'RS',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% para produtos supérfluos',
  },
  'RO': {
    uf: 'RO',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'RR': {
    uf: 'RR',
    ativo: false,
    aliquota: 0,
  },
  'SC': {
    uf: 'SC',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2% para produtos específicos',
  },
  'SP': {
    uf: 'SP',
    ativo: false,
    aliquota: 0,
    observacoes: 'SP não cobra FCP atualmente',
  },
  'SE': {
    uf: 'SE',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
  'TO': {
    uf: 'TO',
    ativo: true,
    aliquota: 2,
    observacoes: 'FCP de 2%',
  },
};

/**
 * NCMs com incidência de FCP (produtos supérfluos/luxo)
 * 
 * EXEMPLOS - Cada estado tem sua própria lista
 * Consultar legislação estadual específica
 */
export const NCM_COM_FCP = [
  // Bebidas alcoólicas
  '2203', '2204', '2205', '2206', '2207', '2208',
  
  // Fumo e derivados
  '2402', '2403',
  
  // Cosméticos e perfumaria
  '3303', '3304', '3305', '3307',
  
  // Joias e bijuterias
  '7113', '7114', '7116', '7117',
  
  // Armas e munições
  '9301', '9302', '9303', '9304', '9305', '9306',
  
  // Produtos eletrônicos
  // Varia muito por estado
];

/**
 * Obtém a alíquota de FCP para uma UF
 */
export function getAliquotaFCP(uf: string): number {
  const config = FCP_POR_UF[uf.toUpperCase()];
  
  if (!config) {
    console.warn(`UF não encontrada para FCP: ${uf}`);
    return 0;
  }
  
  return config.ativo ? config.aliquota : 0;
}

/**
 * Verifica se FCP está ativo em uma UF
 */
export function isFCPAtivo(uf: string): boolean {
  const config = FCP_POR_UF[uf.toUpperCase()];
  return config ? config.ativo : false;
}

/**
 * Verifica se um NCM tem incidência de FCP
 * 
 * IMPORTANTE: Esta é uma verificação simplificada
 * Na prática, cada estado tem sua própria lista de NCMs
 * 
 * @param ncm NCM do produto (8 dígitos)
 * @param uf UF de destino
 */
export function hasIncidenciaFCP(ncm: string, uf: string): boolean {
  // Verificar se FCP está ativo na UF
  if (!isFCPAtivo(uf)) {
    return false;
  }
  
  // Verificar se o NCM está na lista de produtos com FCP
  // Esta é uma verificação simplificada baseada nos 4 primeiros dígitos
  const ncm4 = ncm.substring(0, 4);
  
  return NCM_COM_FCP.includes(ncm4);
}

/**
 * Calcula o valor do FCP
 * 
 * FCP = Base de Cálculo do ICMS × Alíquota FCP
 * 
 * @param baseCalculo Base de cálculo do ICMS
 * @param uf UF de destino
 * @param ncm NCM do produto (opcional para verificar incidência)
 */
export function calcularFCP(
  baseCalculo: number,
  uf: string,
  ncm?: string
): number {
  // Verificar se FCP está ativo
  if (!isFCPAtivo(uf)) {
    return 0;
  }
  
  // Se NCM foi fornecido, verificar incidência
  if (ncm && !hasIncidenciaFCP(ncm, uf)) {
    return 0;
  }
  
  // Calcular FCP
  const aliquota = getAliquotaFCP(uf);
  return baseCalculo * (aliquota / 100);
}

/**
 * Obtém informações completas de FCP para uma UF
 */
export function getFCPInfo(uf: string): FCPConfig {
  const config = FCP_POR_UF[uf.toUpperCase()];
  
  if (!config) {
    return {
      uf: uf.toUpperCase(),
      ativo: false,
      aliquota: 0,
      observacoes: 'UF não configurada',
    };
  }
  
  return config;
}

/**
 * Calcula FCP para diferencial de alíquota (DIFAL)
 * 
 * Para operações interestaduais de consumidor final não contribuinte,
 * o FCP pode incidir sobre o diferencial de alíquota
 * 
 * @param valorOperacao Valor da operação
 * @param aliquotaInterna Alíquota interna do estado de destino
 * @param aliquotaInterestadual Alíquota interestadual
 * @param uf UF de destino
 */
export function calcularFCPDifal(
  valorOperacao: number,
  aliquotaInterna: number,
  aliquotaInterestadual: number,
  uf: string
): number {
  if (!isFCPAtivo(uf)) {
    return 0;
  }
  
  const aliquotaFCP = getAliquotaFCP(uf);
  
  // FCP sobre DIFAL = Valor da Operação × (Alíquota FCP / 100)
  // Simplificação: na prática pode ter cálculos mais complexos
  return valorOperacao * (aliquotaFCP / 100);
}
