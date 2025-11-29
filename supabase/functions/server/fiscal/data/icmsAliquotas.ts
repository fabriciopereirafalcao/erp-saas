// ============================================================================
// DADOS: Alíquotas de ICMS por UF
// Descrição: Tabela com alíquotas internas e interestaduais de ICMS
// Atualizado: 2024 (verificar atualizações anuais)
// ============================================================================

/**
 * Alíquota de ICMS por UF
 */
export interface ICMSAliquota {
  uf: string;
  aliquotaInterna: number;        // Alíquota para operações dentro do estado
  aliquotaInterestadual?: number; // Alíquota para operações entre estados (se aplicável)
  fcp?: number;                   // FCP (Fundo de Combate à Pobreza)
}

/**
 * Tabela de alíquotas internas por UF (2024)
 * Fonte: Legislação estadual de cada UF
 */
export const ALIQUOTAS_INTERNAS: Record<string, number> = {
  'AC': 17,  // Acre
  'AL': 18,  // Alagoas
  'AP': 18,  // Amapá
  'AM': 18,  // Amazonas
  'BA': 18,  // Bahia
  'CE': 18,  // Ceará
  'DF': 18,  // Distrito Federal
  'ES': 17,  // Espírito Santo
  'GO': 17,  // Goiás
  'MA': 18,  // Maranhão
  'MT': 17,  // Mato Grosso
  'MS': 17,  // Mato Grosso do Sul
  'MG': 18,  // Minas Gerais
  'PA': 17,  // Pará
  'PB': 18,  // Paraíba
  'PR': 18,  // Paraná (19% para alguns produtos)
  'PE': 18,  // Pernambuco
  'PI': 18,  // Piauí
  'RJ': 18,  // Rio de Janeiro (20% para alguns produtos)
  'RN': 18,  // Rio Grande do Norte
  'RS': 18,  // Rio Grande do Sul
  'RO': 17.5,// Rondônia
  'RR': 17,  // Roraima
  'SC': 17,  // Santa Catarina
  'SP': 18,  // São Paulo
  'SE': 18,  // Sergipe
  'TO': 18,  // Tocantins
};

/**
 * Alíquotas interestaduais (2024)
 * Conforme Resolução do Senado Federal nº 13/2012
 */
export const ALIQUOTAS_INTERESTADUAIS = {
  // Para operações de Sul/Sudeste (exceto ES) para Norte/Nordeste/Centro-Oeste e ES
  REGRA_7: 7,
  
  // Para operações entre Sul/Sudeste
  REGRA_12: 12,
  
  // Para importados
  IMPORTADOS: 4,
};

/**
 * Obtém a alíquota de ICMS para operação interna
 */
export function getAliquotaInterna(uf: string): number {
  const aliquota = ALIQUOTAS_INTERNAS[uf.toUpperCase()];
  
  if (!aliquota) {
    throw new Error(`UF inválida ou alíquota não cadastrada: ${uf}`);
  }
  
  return aliquota;
}

/**
 * Obtém a alíquota de ICMS para operação interestadual
 * 
 * Regras (Resolução Senado 13/2012):
 * - Sul/Sudeste (exceto ES) → Norte/Nordeste/CO/ES: 7%
 * - Sul/Sudeste → Sul/Sudeste: 12%
 * - Importados: 4%
 * 
 * @param ufOrigem UF do emitente
 * @param ufDestino UF do destinatário
 * @param importado Se o produto é importado
 */
export function getAliquotaInterestadual(
  ufOrigem: string,
  ufDestino: string,
  importado = false
): number {
  // Se for importado, usa alíquota de 4%
  if (importado) {
    return ALIQUOTAS_INTERESTADUAIS.IMPORTADOS;
  }
  
  const origem = ufOrigem.toUpperCase();
  const destino = ufDestino.toUpperCase();
  
  // Mesma UF = alíquota interna
  if (origem === destino) {
    return getAliquotaInterna(origem);
  }
  
  // Regiões para cálculo
  const sulSudeste = ['RS', 'SC', 'PR', 'SP', 'RJ', 'MG'];
  const norteCentroNordeste = ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'DF', 'GO', 'MT', 'MS', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'];
  
  const origemSulSudeste = sulSudeste.includes(origem) && origem !== 'ES';
  const destinoNorteCentroNordeste = norteCentroNordeste.includes(destino) || destino === 'ES';
  
  // Sul/Sudeste (exceto ES) → Norte/Nordeste/CO/ES: 7%
  if (origemSulSudeste && destinoNorteCentroNordeste) {
    return ALIQUOTAS_INTERESTADUAIS.REGRA_7;
  }
  
  // Demais casos: 12%
  return ALIQUOTAS_INTERESTADUAIS.REGRA_12;
}

/**
 * Verifica se a operação é interestadual
 */
export function isOperacaoInterestadual(ufOrigem: string, ufDestino: string): boolean {
  return ufOrigem.toUpperCase() !== ufDestino.toUpperCase();
}

/**
 * Obtém informações completas de ICMS para uma operação
 */
export function getICMSInfo(
  ufOrigem: string,
  ufDestino: string,
  importado = false
): {
  isInterestadual: boolean;
  aliquota: number;
  aliquotaInterna: number;
  aliquotaInterestadual?: number;
  diferencialAliquota?: number;
} {
  const isInter = isOperacaoInterestadual(ufOrigem, ufDestino);
  const aliquotaInterna = getAliquotaInterna(ufDestino);
  
  if (!isInter) {
    // Operação interna
    return {
      isInterestadual: false,
      aliquota: aliquotaInterna,
      aliquotaInterna,
    };
  }
  
  // Operação interestadual
  const aliquotaInterestadual = getAliquotaInterestadual(ufOrigem, ufDestino, importado);
  const diferencialAliquota = aliquotaInterna - aliquotaInterestadual;
  
  return {
    isInterestadual: true,
    aliquota: aliquotaInterestadual,
    aliquotaInterna,
    aliquotaInterestadual,
    diferencialAliquota: diferencialAliquota > 0 ? diferencialAliquota : undefined,
  };
}

/**
 * Alíquotas reduzidas para produtos específicos (EXEMPLOS)
 * Cada estado tem sua própria legislação de produtos com alíquota reduzida
 */
export const PRODUTOS_ALIQUOTA_REDUZIDA: Record<string, { ncms: string[], aliquota: number }[]> = {
  'SP': [
    { ncms: ['0701', '0702'], aliquota: 12 }, // Alimentos básicos
  ],
  'MG': [
    { ncms: ['0701', '0702'], aliquota: 12 }, // Alimentos básicos
  ],
  // Adicionar mais conforme necessário
};

/**
 * Verifica se um produto tem alíquota reduzida em determinada UF
 */
export function getAliquotaReduzida(uf: string, ncm: string): number | null {
  const produtos = PRODUTOS_ALIQUOTA_REDUZIDA[uf.toUpperCase()];
  
  if (!produtos) {
    return null;
  }
  
  for (const produto of produtos) {
    if (produto.ncms.some(ncmProduto => ncm.startsWith(ncmProduto))) {
      return produto.aliquota;
    }
  }
  
  return null;
}
