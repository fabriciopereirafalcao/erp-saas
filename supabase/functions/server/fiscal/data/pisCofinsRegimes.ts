// ============================================================================
// DADOS: Regimes de PIS/COFINS
// Descrição: Alíquotas e regras de PIS/COFINS por regime tributário
// Atualizado: 2024
// ============================================================================

/**
 * Regimes de apuração de PIS/COFINS
 */
export type RegimePisCofins = 
  | 'cumulativo'           // Regime Cumulativo (Lucro Presumido)
  | 'nao_cumulativo'       // Regime Não-Cumulativo (Lucro Real)
  | 'simples_nacional';    // Simples Nacional (não destaca PIS/COFINS)

/**
 * CST de PIS/COFINS
 */
export const CST_PIS_COFINS = {
  // Regime Não-Cumulativo
  '01': { descricao: 'Operação Tributável - Base de Cálculo = Valor da Operação Alíquota Normal (Cumulativo/Não Cumulativo)', regime: 'nao_cumulativo' },
  '02': { descricao: 'Operação Tributável - Base de Cálculo = Valor da Operação (Alíquota Diferenciada)', regime: 'nao_cumulativo' },
  '03': { descricao: 'Operação Tributável - Base de Cálculo = Quantidade Vendida × Alíquota por Unidade de Produto', regime: 'nao_cumulativo' },
  '04': { descricao: 'Operação Tributável - Tributação Monofásica (Alíquota Zero)', regime: 'nao_cumulativo' },
  '05': { descricao: 'Operação Tributável (Substituição Tributária)', regime: 'nao_cumulativo' },
  '06': { descricao: 'Operação Tributável - Alíquota Zero', regime: 'nao_cumulativo' },
  '07': { descricao: 'Operação Isenta da Contribuição', regime: 'nao_cumulativo' },
  '08': { descricao: 'Operação Sem Incidência da Contribuição', regime: 'nao_cumulativo' },
  '09': { descricao: 'Operação com Suspensão da Contribuição', regime: 'nao_cumulativo' },
  
  // Regime Cumulativo
  '49': { descricao: 'Outras Operações de Saída', regime: 'cumulativo' },
  '50': { descricao: 'Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno', regime: 'cumulativo' },
  '51': { descricao: 'Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno', regime: 'cumulativo' },
  '52': { descricao: 'Operação com Direito a Crédito - Vinculada Exclusivamente a Receita de Exportação', regime: 'cumulativo' },
  '53': { descricao: 'Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno', regime: 'cumulativo' },
  '54': { descricao: 'Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação', regime: 'cumulativo' },
  '55': { descricao: 'Operação com Direito a Crédito - Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação', regime: 'cumulativo' },
  '56': { descricao: 'Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação', regime: 'cumulativo' },
  
  // Outras
  '60': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno', regime: 'nao_cumulativo' },
  '61': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno', regime: 'nao_cumulativo' },
  '62': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita de Exportação', regime: 'nao_cumulativo' },
  '63': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno', regime: 'nao_cumulativo' },
  '64': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação', regime: 'nao_cumulativo' },
  '65': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação', regime: 'nao_cumulativo' },
  '66': { descricao: 'Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação', regime: 'nao_cumulativo' },
  '67': { descricao: 'Crédito Presumido - Outras Operações', regime: 'nao_cumulativo' },
  
  '70': { descricao: 'Operação de Aquisição sem Direito a Crédito', regime: 'cumulativo' },
  '71': { descricao: 'Operação de Aquisição com Isenção', regime: 'cumulativo' },
  '72': { descricao: 'Operação de Aquisição com Suspensão', regime: 'cumulativo' },
  '73': { descricao: 'Operação de Aquisição a Alíquota Zero', regime: 'cumulativo' },
  '74': { descricao: 'Operação de Aquisição sem Incidência da Contribuição', regime: 'cumulativo' },
  '75': { descricao: 'Operação de Aquisição por Substituição Tributária', regime: 'cumulativo' },
  
  '98': { descricao: 'Outras Operações de Entrada', regime: 'cumulativo' },
  '99': { descricao: 'Outras Operações', regime: 'nao_cumulativo' },
};

/**
 * Alíquotas de PIS e COFINS
 */
export const ALIQUOTAS_PIS_COFINS = {
  // Regime Cumulativo (Lucro Presumido)
  cumulativo: {
    pis: 0.65,
    cofins: 3.00,
  },
  
  // Regime Não-Cumulativo (Lucro Real)
  naoCumulativo: {
    pis: 1.65,
    cofins: 7.60,
  },
  
  // Alíquotas Diferenciadas (Exemplos)
  combustiveis: {
    pis: 2.48,    // Varia por produto
    cofins: 11.40, // Varia por produto
  },
  
  // Monofásico
  monofasico: {
    pis: 0,
    cofins: 0,
  },
  
  // Alíquota Zero
  zero: {
    pis: 0,
    cofins: 0,
  },
};

/**
 * Obtém as alíquotas de PIS e COFINS baseado no CST
 */
export function getAliquotasPisCofins(cstPis: string, cstCofins: string): {
  pis: number;
  cofins: number;
  regime: RegimePisCofins;
} {
  // Validar CST
  const infoPis = CST_PIS_COFINS[cstPis as keyof typeof CST_PIS_COFINS];
  const infoCofins = CST_PIS_COFINS[cstCofins as keyof typeof CST_PIS_COFINS];
  
  if (!infoPis || !infoCofins) {
    throw new Error(`CST PIS/COFINS inválido: ${cstPis}/${cstCofins}`);
  }
  
  // Determinar regime
  let regime: RegimePisCofins = 'cumulativo';
  if (infoPis.regime === 'nao_cumulativo') {
    regime = 'nao_cumulativo';
  }
  
  // Determinar alíquotas baseado no CST
  let pis = 0;
  let cofins = 0;
  
  // CSTs com tributação normal
  if (['01', '02'].includes(cstPis)) {
    if (regime === 'nao_cumulativo') {
      pis = ALIQUOTAS_PIS_COFINS.naoCumulativo.pis;
    } else {
      pis = ALIQUOTAS_PIS_COFINS.cumulativo.pis;
    }
  }
  
  if (['01', '02'].includes(cstCofins)) {
    if (regime === 'nao_cumulativo') {
      cofins = ALIQUOTAS_PIS_COFINS.naoCumulativo.cofins;
    } else {
      cofins = ALIQUOTAS_PIS_COFINS.cumulativo.cofins;
    }
  }
  
  // CST 49 e 99 - Regime cumulativo
  if (cstPis === '49' || cstPis === '99') {
    pis = ALIQUOTAS_PIS_COFINS.cumulativo.pis;
  }
  
  if (cstCofins === '49' || cstCofins === '99') {
    cofins = ALIQUOTAS_PIS_COFINS.cumulativo.cofins;
  }
  
  // CSTs sem tributação (04, 05, 06, 07, 08, 09, 70-75, 98)
  const cstsSemTributacao = ['04', '05', '06', '07', '08', '09', '70', '71', '72', '73', '74', '75', '98'];
  
  if (cstsSemTributacao.includes(cstPis)) {
    pis = 0;
  }
  
  if (cstsSemTributacao.includes(cstCofins)) {
    cofins = 0;
  }
  
  return { pis, cofins, regime };
}

/**
 * Calcula PIS e COFINS
 */
export function calcularPisCofins(
  baseCalculo: number,
  cstPis: string,
  cstCofins: string,
  aliquotaPisCustom?: number,
  aliquotaCofinsCustom?: number
): {
  valorPis: number;
  valorCofins: number;
  aliquotaPis: number;
  aliquotaCofins: number;
  regime: RegimePisCofins;
} {
  // Obter alíquotas padrão
  const { pis, cofins, regime } = getAliquotasPisCofins(cstPis, cstCofins);
  
  // Usar alíquotas customizadas se fornecidas
  const aliquotaPis = aliquotaPisCustom ?? pis;
  const aliquotaCofins = aliquotaCofinsCustom ?? cofins;
  
  // Calcular valores
  const valorPis = baseCalculo * (aliquotaPis / 100);
  const valorCofins = baseCalculo * (aliquotaCofins / 100);
  
  return {
    valorPis,
    valorCofins,
    aliquotaPis,
    aliquotaCofins,
    regime,
  };
}

/**
 * Verifica se o CST permite crédito de PIS/COFINS
 */
export function permiteCredito(cst: string): boolean {
  const cstsComCredito = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66', '67'];
  return cstsComCredito.includes(cst);
}

/**
 * Obtém a descrição do CST
 */
export function getDescricaoCST(cst: string): string {
  const info = CST_PIS_COFINS[cst as keyof typeof CST_PIS_COFINS];
  return info ? info.descricao : 'CST não encontrado';
}

/**
 * Valida CST de PIS/COFINS
 */
export function validarCSTpisCofins(cst: string): boolean {
  return cst in CST_PIS_COFINS;
}
