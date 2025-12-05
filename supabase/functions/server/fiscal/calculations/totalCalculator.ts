// ============================================================================
// CALCULADORA: TOTAL (Totalizador de NF-e)
// Descrição: Calcula todos os totais da NF-e conforme layout SEFAZ
// ============================================================================

/**
 * Totalizador de NF-e
 * 
 * Calcula e valida todos os totais conforme grupo W (Total da NF-e)
 * do layout da NF-e 4.0
 */

/**
 * Item da NF-e com valores calculados
 */
export interface ItemNFe {
  // Produto
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  
  // Quantidades e valores
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
  
  // Impostos
  icms: {
    baseCalculo: number;
    valor: number;
    aliquota: number;
  };
  
  icmsSt?: {
    baseCalculo: number;
    valor: number;
  };
  
  ipi?: {
    baseCalculo: number;
    valor: number;
  };
  
  pis: {
    baseCalculo: number;
    valor: number;
  };
  
  cofins: {
    baseCalculo: number;
    valor: number;
  };
  
  fcp?: {
    valor: number;
  };
  
  fcpSt?: {
    valor: number;
  };
}

/**
 * Resultado da totalização da NF-e
 */
export interface TotalizacaoNFe {
  // W02 - ICMSTot (Grupo de valores totais da NF-e)
  totais: {
    // Base de Cálculo do ICMS (W03)
    baseCalculoIcms: number;
    
    // Valor Total do ICMS (W04)
    valorIcms: number;
    
    // Valor Total do ICMS Desonerado (W04a)
    valorIcmsDesonerado: number;
    
    // Valor Total do FCP (W04c)
    valorFcp: number;
    
    // Base de Cálculo do ICMS ST (W05)
    baseCalculoIcmsSt: number;
    
    // Valor Total do ICMS ST (W06)
    valorIcmsSt: number;
    
    // Valor Total do FCP ST (W06a)
    valorFcpSt: number;
    
    // Valor Total do FCP ST Retido (W06b)
    valorFcpStRetido: number;
    
    // Valor Total dos Produtos (W07)
    valorProdutos: number;
    
    // Valor Total do Frete (W08)
    valorFrete: number;
    
    // Valor Total do Seguro (W09)
    valorSeguro: number;
    
    // Valor Total do Desconto (W10)
    valorDesconto: number;
    
    // Valor Total do II (W11)
    valorII: number;
    
    // Valor Total do IPI (W12)
    valorIpi: number;
    
    // Valor Total do IPI Devolvido (W12a)
    valorIpiDevolvido: number;
    
    // Valor do PIS (W13)
    valorPis: number;
    
    // Valor do COFINS (W14)
    valorCofins: number;
    
    // Valor Total de Outras Despesas (W15)
    valorOutrasDespesas: number;
    
    // Valor Total da NF-e (W16)
    valorTotal: number;
    
    // Valor aproximado total de tributos (W16a) - Lei da Transparência
    valorTributos: number;
  };
  
  // Detalhamento por item
  itens: ItemNFe[];
  
  // Quantidade de itens
  quantidadeItens: number;
}

/**
 * Parâmetros para totalização
 */
export interface TotalizacaoParams {
  itens: ItemNFe[];
  valorIcmsDesonerado?: number;
  valorFcpStRetido?: number;
  valorII?: number;
  valorIpiDevolvido?: number;
  valorTributos?: number;  // Lei da Transparência (calculado separadamente)
}

/**
 * FUNÇÃO PRINCIPAL: Totaliza a NF-e
 */
export function totalizarNFe(params: TotalizacaoParams): TotalizacaoNFe {
  // Validações
  if (!params.itens || params.itens.length === 0) {
    throw new Error('É necessário ter pelo menos um item para totalizar');
  }
  
  // Inicializar totalizadores
  let baseCalculoIcms = 0;
  let valorIcms = 0;
  let baseCalculoIcmsSt = 0;
  let valorIcmsSt = 0;
  let valorFcp = 0;
  let valorFcpSt = 0;
  let valorProdutos = 0;
  let valorFrete = 0;
  let valorSeguro = 0;
  let valorDesconto = 0;
  let valorIpi = 0;
  let valorPis = 0;
  let valorCofins = 0;
  let valorOutrasDespesas = 0;
  
  // Totalizar itens
  for (const item of params.itens) {
    // Produtos
    valorProdutos += item.valorTotal;
    
    // Agregados
    if (item.valorFrete) valorFrete += item.valorFrete;
    if (item.valorSeguro) valorSeguro += item.valorSeguro;
    if (item.valorDesconto) valorDesconto += item.valorDesconto;
    if (item.valorOutrasDespesas) valorOutrasDespesas += item.valorOutrasDespesas;
    
    // ICMS
    baseCalculoIcms += item.icms.baseCalculo;
    valorIcms += item.icms.valor;
    
    // ICMS ST
    if (item.icmsSt) {
      baseCalculoIcmsSt += item.icmsSt.baseCalculo;
      valorIcmsSt += item.icmsSt.valor;
    }
    
    // IPI
    if (item.ipi) {
      valorIpi += item.ipi.valor;
    }
    
    // PIS/COFINS
    valorPis += item.pis.valor;
    valorCofins += item.cofins.valor;
    
    // FCP
    if (item.fcp) {
      valorFcp += item.fcp.valor;
    }
    
    // FCP ST
    if (item.fcpSt) {
      valorFcpSt += item.fcpSt.valor;
    }
  }
  
  // Calcular valor total da NF-e
  // Fórmula: Produtos + Frete + Seguro + Outras Despesas + IPI + ST - Desconto
  const valorTotal = 
    valorProdutos +
    valorFrete +
    valorSeguro +
    valorOutrasDespesas +
    valorIpi +
    valorIcmsSt -
    valorDesconto;
  
  return {
    totais: {
      baseCalculoIcms: arredondar(baseCalculoIcms),
      valorIcms: arredondar(valorIcms),
      valorIcmsDesonerado: arredondar(params.valorIcmsDesonerado || 0),
      valorFcp: arredondar(valorFcp),
      baseCalculoIcmsSt: arredondar(baseCalculoIcmsSt),
      valorIcmsSt: arredondar(valorIcmsSt),
      valorFcpSt: arredondar(valorFcpSt),
      valorFcpStRetido: arredondar(params.valorFcpStRetido || 0),
      valorProdutos: arredondar(valorProdutos),
      valorFrete: arredondar(valorFrete),
      valorSeguro: arredondar(valorSeguro),
      valorDesconto: arredondar(valorDesconto),
      valorII: arredondar(params.valorII || 0),
      valorIpi: arredondar(valorIpi),
      valorIpiDevolvido: arredondar(params.valorIpiDevolvido || 0),
      valorPis: arredondar(valorPis),
      valorCofins: arredondar(valorCofins),
      valorOutrasDespesas: arredondar(valorOutrasDespesas),
      valorTotal: arredondar(valorTotal),
      valorTributos: arredondar(params.valorTributos || 0),
    },
    itens: params.itens,
    quantidadeItens: params.itens.length,
  };
}

/**
 * Valida totalização da NF-e
 * 
 * Verifica se os totais estão consistentes
 */
export function validarTotalizacao(totalizacao: TotalizacaoNFe): {
  valido: boolean;
  erros: string[];
  avisos: string[];
} {
  const erros: string[] = [];
  const avisos: string[] = [];
  
  // Validar valor total
  const valorCalculado = 
    totalizacao.totais.valorProdutos +
    totalizacao.totais.valorFrete +
    totalizacao.totais.valorSeguro +
    totalizacao.totais.valorOutrasDespesas +
    totalizacao.totais.valorIpi +
    totalizacao.totais.valorIcmsSt -
    totalizacao.totais.valorDesconto;
  
  const diferenca = Math.abs(valorCalculado - totalizacao.totais.valorTotal);
  
  if (diferenca > 0.02) {  // Tolerância de 2 centavos por arredondamento
    erros.push(
      `Valor total inconsistente. Calculado: ${valorCalculado.toFixed(2)}, ` +
      `Informado: ${totalizacao.totais.valorTotal.toFixed(2)}`
    );
  }
  
  // Validar valores negativos
  if (totalizacao.totais.valorTotal < 0) {
    erros.push('Valor total da NF-e não pode ser negativo');
  }
  
  if (totalizacao.totais.valorProdutos <= 0) {
    erros.push('Valor dos produtos deve ser maior que zero');
  }
  
  // Validar BC ICMS
  if (totalizacao.totais.baseCalculoIcms > 0 && totalizacao.totais.valorIcms === 0) {
    avisos.push('Base de cálculo de ICMS informada mas valor do ICMS é zero');
  }
  
  // Validar BC ICMS ST
  if (totalizacao.totais.baseCalculoIcmsSt > 0 && totalizacao.totais.valorIcmsSt === 0) {
    avisos.push('Base de cálculo de ICMS ST informada mas valor do ST é zero');
  }
  
  // Validar FCP
  if (totalizacao.totais.valorFcp > 0 && totalizacao.totais.baseCalculoIcms === 0) {
    erros.push('FCP informado mas não há base de cálculo de ICMS');
  }
  
  // Validar itens
  if (totalizacao.quantidadeItens === 0) {
    erros.push('NF-e deve ter pelo menos um item');
  }
  
  if (totalizacao.quantidadeItens > 990) {
    avisos.push('NF-e com mais de 990 itens pode ter problemas de transmissão');
  }
  
  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
}

/**
 * Arredonda valor para 2 casas decimais
 */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Calcula percentual de impostos sobre o valor total
 */
export function calcularPercentualImpostos(totalizacao: TotalizacaoNFe): {
  percentualIcms: number;
  percentualIpi: number;
  percentualPisCofins: number;
  percentualTotal: number;
} {
  const total = totalizacao.totais.valorTotal;
  
  if (total === 0) {
    return {
      percentualIcms: 0,
      percentualIpi: 0,
      percentualPisCofins: 0,
      percentualTotal: 0,
    };
  }
  
  const percentualIcms = (totalizacao.totais.valorIcms / total) * 100;
  const percentualIpi = (totalizacao.totais.valorIpi / total) * 100;
  const percentualPisCofins = ((totalizacao.totais.valorPis + totalizacao.totais.valorCofins) / total) * 100;
  const percentualTotal = percentualIcms + percentualIpi + percentualPisCofins;
  
  return {
    percentualIcms: arredondar(percentualIcms),
    percentualIpi: arredondar(percentualIpi),
    percentualPisCofins: arredondar(percentualPisCofins),
    percentualTotal: arredondar(percentualTotal),
  };
}

/**
 * Gera resumo de impostos da NF-e
 */
export function gerarResumoImpostos(totalizacao: TotalizacaoNFe): string {
  const percentuais = calcularPercentualImpostos(totalizacao);
  
  const linhas = [
    '═══════════════════════════════════════════════════',
    '            RESUMO DE IMPOSTOS - NF-e             ',
    '═══════════════════════════════════════════════════',
    '',
    `Valor dos Produtos:     R$ ${totalizacao.totais.valorProdutos.toFixed(2).padStart(12)}`,
    `Frete:                  R$ ${totalizacao.totais.valorFrete.toFixed(2).padStart(12)}`,
    `Seguro:                 R$ ${totalizacao.totais.valorSeguro.toFixed(2).padStart(12)}`,
    `Outras Despesas:        R$ ${totalizacao.totais.valorOutrasDespesas.toFixed(2).padStart(12)}`,
    `Desconto:               R$ ${totalizacao.totais.valorDesconto.toFixed(2).padStart(12)}`,
    '───────────────────────────────────────────────────',
    '',
    'IMPOSTOS:',
    `  ICMS (${percentuais.percentualIcms.toFixed(2)}%):         R$ ${totalizacao.totais.valorIcms.toFixed(2).padStart(12)}`,
    `  ICMS ST:              R$ ${totalizacao.totais.valorIcmsSt.toFixed(2).padStart(12)}`,
    `  IPI (${percentuais.percentualIpi.toFixed(2)}%):           R$ ${totalizacao.totais.valorIpi.toFixed(2).padStart(12)}`,
    `  PIS:                  R$ ${totalizacao.totais.valorPis.toFixed(2).padStart(12)}`,
    `  COFINS:               R$ ${totalizacao.totais.valorCofins.toFixed(2).padStart(12)}`,
    `  FCP:                  R$ ${totalizacao.totais.valorFcp.toFixed(2).padStart(12)}`,
    '───────────────────────────────────────────────────',
    `VALOR TOTAL DA NF-e:    R$ ${totalizacao.totais.valorTotal.toFixed(2).padStart(12)}`,
    '═══════════════════════════════════════════════════',
    '',
    `Total de Itens: ${totalizacao.quantidadeItens}`,
    `Carga Tributária: ${percentuais.percentualTotal.toFixed(2)}%`,
  ];
  
  if (totalizacao.totais.valorTributos > 0) {
    linhas.push('');
    linhas.push(`Tributos Aproximados (Lei 12.741/2012): R$ ${totalizacao.totais.valorTributos.toFixed(2)}`);
  }
  
  return linhas.join('\n');
}

/**
 * Calcula rateio proporcional de frete/seguro/despesas entre itens
 */
export function ratearValores(params: {
  itens: Array<{ valorTotal: number }>;
  valorFrete?: number;
  valorSeguro?: number;
  valorOutrasDespesas?: number;
  valorDesconto?: number;
}): Array<{
  valorFrete: number;
  valorSeguro: number;
  valorOutrasDespesas: number;
  valorDesconto: number;
}> {
  const totalProdutos = params.itens.reduce((sum, item) => sum + item.valorTotal, 0);
  
  if (totalProdutos === 0) {
    throw new Error('Total de produtos não pode ser zero para rateio');
  }
  
  return params.itens.map((item, index) => {
    const percentual = item.valorTotal / totalProdutos;
    const isUltimo = index === params.itens.length - 1;
    
    // Calcular rateio proporcional
    let valorFrete = (params.valorFrete || 0) * percentual;
    let valorSeguro = (params.valorSeguro || 0) * percentual;
    let valorOutrasDespesas = (params.valorOutrasDespesas || 0) * percentual;
    let valorDesconto = (params.valorDesconto || 0) * percentual;
    
    // Arredondar
    valorFrete = arredondar(valorFrete);
    valorSeguro = arredondar(valorSeguro);
    valorOutrasDespesas = arredondar(valorOutrasDespesas);
    valorDesconto = arredondar(valorDesconto);
    
    // No último item, ajustar diferença de arredondamento
    if (isUltimo) {
      // Calcular totais rateados até agora
      const totalFreteRateado = params.itens.slice(0, -1).reduce((sum, _, i) => {
        return sum + arredondar((params.valorFrete || 0) * (params.itens[i].valorTotal / totalProdutos));
      }, 0);
      
      // Ajustar último item com diferença
      valorFrete = (params.valorFrete || 0) - totalFreteRateado;
      
      // Repetir para outros valores...
    }
    
    return {
      valorFrete,
      valorSeguro,
      valorOutrasDespesas,
      valorDesconto,
    };
  });
}
