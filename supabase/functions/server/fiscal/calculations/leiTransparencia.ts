// ============================================================================
// CALCULADORA: Lei da Transparência (Lei 12.741/2012)
// Descrição: Cálculo de impostos aproximados sobre produtos
// Obrigatoriedade: Informar ao consumidor a carga tributária aproximada
// ============================================================================

/**
 * Lei da Transparência (Lei 12.741/2012)
 * 
 * Obriga empresas a informarem o valor aproximado dos tributos
 * embutidos no preço de produtos e serviços
 * 
 * Deve ser informado no documento fiscal e no estabelecimento
 */

/**
 * Alíquotas médias de impostos por tipo de produto (%)
 * 
 * Fonte: IBPT (Instituto Brasileiro de Planejamento Tributário)
 * 
 * IMPORTANTE: Estes são valores médios aproximados
 * O ideal é consultar a tabela IBPT atualizada por NCM
 */
export const ALIQUOTAS_MEDIAS_IBPT = {
  // Alimentos e Bebidas
  alimentosBebidas: {
    federal: 13.45,
    estadual: 12.00,
    municipal: 0.00,
  },
  
  // Vestuário
  vestuario: {
    federal: 16.48,
    estadual: 18.00,
    municipal: 0.00,
  },
  
  // Eletrônicos
  eletronicos: {
    federal: 22.50,
    estadual: 18.00,
    municipal: 0.00,
  },
  
  // Veículos
  veiculos: {
    federal: 30.00,
    estadual: 12.00,
    municipal: 0.00,
  },
  
  // Combustíveis
  combustiveis: {
    federal: 32.00,
    estadual: 25.00,
    municipal: 0.00,
  },
  
  // Serviços
  servicos: {
    federal: 13.45,
    estadual: 0.00,
    municipal: 5.00,
  },
  
  // Medicamentos
  medicamentos: {
    federal: 12.00,
    estadual: 12.00,
    municipal: 0.00,
  },
  
  // Materiais de Construção
  construcao: {
    federal: 17.24,
    estadual: 12.00,
    municipal: 0.00,
  },
  
  // Padrão (quando não identificado)
  padrao: {
    federal: 15.00,
    estadual: 12.00,
    municipal: 0.00,
  },
};

/**
 * Parâmetros para cálculo da Lei da Transparência
 */
export interface LeiTransparenciaParams {
  // Valor do produto/serviço
  valorTotal: number;
  
  // NCM do produto (opcional - para buscar alíquota específica)
  ncm?: string;
  
  // Alíquotas customizadas (se obtidas da tabela IBPT)
  aliquotaFederal?: number;
  aliquotaEstadual?: number;
  aliquotaMunicipal?: number;
  
  // Tipo de produto (se NCM não fornecido)
  tipoProduto?: keyof typeof ALIQUOTAS_MEDIAS_IBPT;
  
  // Token IBPT (se disponível para consulta online)
  tokenIBPT?: string;
}

/**
 * Resultado do cálculo da Lei da Transparência
 */
export interface LeiTransparenciaResult {
  valorTotal: number;
  
  // Impostos Federais
  aliquotaFederal: number;
  valorFederal: number;
  
  // Impostos Estaduais
  aliquotaEstadual: number;
  valorEstadual: number;
  
  // Impostos Municipais
  aliquotaMunicipal: number;
  valorMunicipal: number;
  
  // Totais
  aliquotaTotal: number;
  valorTotal: number;
  
  // Fonte
  fonte: string;
  
  // Texto formatado para exibição
  textoLegal: string;
}

/**
 * Obtém alíquotas baseadas no NCM (simplificado)
 * 
 * Na prática, deveria consultar a tabela IBPT completa
 */
function getAliquotasPorNCM(ncm: string): {
  federal: number;
  estadual: number;
  municipal: number;
} {
  const ncmLimpo = ncm.replace(/[.-]/g, '');
  const ncm4 = ncmLimpo.substring(0, 4);
  
  // Mapeamento simplificado NCM -> Categoria
  const mapNCMCategoria: Record<string, keyof typeof ALIQUOTAS_MEDIAS_IBPT> = {
    // Alimentos (01-23)
    '0701': 'alimentosBebidas',
    '0702': 'alimentosBebidas',
    '2201': 'alimentosBebidas',
    '2202': 'alimentosBebidas',
    '2203': 'combustiveis', // Cerveja tem tributação alta
    '2204': 'combustiveis',
    '2208': 'combustiveis',
    
    // Vestuário (61-63)
    '6101': 'vestuario',
    '6201': 'vestuario',
    
    // Eletrônicos (84-85)
    '8415': 'eletronicos',
    '8517': 'eletronicos',
    '8528': 'eletronicos',
    
    // Veículos (87)
    '8701': 'veiculos',
    '8702': 'veiculos',
    '8703': 'veiculos',
    '8704': 'veiculos',
    
    // Combustíveis (27)
    '2710': 'combustiveis',
    
    // Medicamentos (30)
    '3003': 'medicamentos',
    '3004': 'medicamentos',
    
    // Materiais de Construção
    '2523': 'construcao', // Cimento
    '6907': 'construcao', // Cerâmica
    '6908': 'construcao',
  };
  
  const categoria = mapNCMCategoria[ncm4] || 'padrao';
  return ALIQUOTAS_MEDIAS_IBPT[categoria];
}

/**
 * FUNÇÃO PRINCIPAL: Calcula impostos aproximados (Lei da Transparência)
 */
export function calcularLeiTransparencia(params: LeiTransparenciaParams): LeiTransparenciaResult {
  // Validações
  if (params.valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }
  
  // Obter alíquotas
  let aliquotaFederal: number;
  let aliquotaEstadual: number;
  let aliquotaMunicipal: number;
  let fonte: string;
  
  if (params.aliquotaFederal !== undefined && 
      params.aliquotaEstadual !== undefined && 
      params.aliquotaMunicipal !== undefined) {
    // Alíquotas fornecidas (da tabela IBPT)
    aliquotaFederal = params.aliquotaFederal;
    aliquotaEstadual = params.aliquotaEstadual;
    aliquotaMunicipal = params.aliquotaMunicipal;
    fonte = 'IBPT - Tabela oficial';
  } else if (params.ncm) {
    // Buscar por NCM
    const aliquotas = getAliquotasPorNCM(params.ncm);
    aliquotaFederal = aliquotas.federal;
    aliquotaEstadual = aliquotas.estadual;
    aliquotaMunicipal = aliquotas.municipal;
    fonte = 'IBPT - Valores aproximados';
  } else if (params.tipoProduto) {
    // Usar tipo de produto fornecido
    const aliquotas = ALIQUOTAS_MEDIAS_IBPT[params.tipoProduto];
    aliquotaFederal = aliquotas.federal;
    aliquotaEstadual = aliquotas.estadual;
    aliquotaMunicipal = aliquotas.municipal;
    fonte = 'IBPT - Valores médios por categoria';
  } else {
    // Usar valores padrão
    const aliquotas = ALIQUOTAS_MEDIAS_IBPT.padrao;
    aliquotaFederal = aliquotas.federal;
    aliquotaEstadual = aliquotas.estadual;
    aliquotaMunicipal = aliquotas.municipal;
    fonte = 'IBPT - Valores médios gerais';
  }
  
  // Calcular valores
  const valorFederal = params.valorTotal * (aliquotaFederal / 100);
  const valorEstadual = params.valorTotal * (aliquotaEstadual / 100);
  const valorMunicipal = params.valorTotal * (aliquotaMunicipal / 100);
  
  const aliquotaTotal = aliquotaFederal + aliquotaEstadual + aliquotaMunicipal;
  const valorTotalImpostos = valorFederal + valorEstadual + valorMunicipal;
  
  // Gerar texto legal
  const textoLegal = gerarTextoLegal({
    valorTotal: params.valorTotal,
    valorTotalImpostos,
    aliquotaTotal,
    fonte,
  });
  
  return {
    valorTotal: params.valorTotal,
    
    aliquotaFederal,
    valorFederal,
    
    aliquotaEstadual,
    valorEstadual,
    
    aliquotaMunicipal,
    valorMunicipal,
    
    aliquotaTotal,
    valorTotal: valorTotalImpostos,
    
    fonte,
    textoLegal,
  };
}

/**
 * Gera o texto legal para exibição no documento fiscal
 */
function gerarTextoLegal(params: {
  valorTotal: number;
  valorTotalImpostos: number;
  aliquotaTotal: number;
  fonte: string;
}): string {
  const valorFormatado = params.valorTotalImpostos.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  
  const percentualFormatado = params.aliquotaTotal.toFixed(2);
  
  return `Valor aproximado dos tributos: ${valorFormatado} (${percentualFormatado}%) ` +
         `Fonte: ${params.fonte}`;
}

/**
 * Gera texto detalhado para exibição
 */
export function gerarTextoDetalhadoLei(result: LeiTransparenciaResult): string {
  const linhas = [
    'INFORMAÇÃO DOS TRIBUTOS INCIDENTES (Lei 12.741/2012)',
    '',
    `Valor do Produto/Serviço: ${result.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    '',
    'Tributos Aproximados:',
    `  Federal: ${result.valorFederal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${result.aliquotaFederal.toFixed(2)}%)`,
    `  Estadual: ${result.valorEstadual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${result.aliquotaEstadual.toFixed(2)}%)`,
    `  Municipal: ${result.valorMunicipal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${result.aliquotaMunicipal.toFixed(2)}%)`,
    '',
    `TOTAL DE TRIBUTOS: ${result.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${result.aliquotaTotal.toFixed(2)}%)`,
    '',
    `Fonte: ${result.fonte}`,
  ];
  
  return linhas.join('\n');
}

/**
 * Calcula Lei da Transparência para múltiplos itens
 */
export function calcularLeiTransparenciaMultiplos(
  itens: Array<{
    valorTotal: number;
    ncm?: string;
    aliquotaFederal?: number;
    aliquotaEstadual?: number;
    aliquotaMunicipal?: number;
  }>
): {
  itens: LeiTransparenciaResult[];
  total: {
    valorTotal: number;
    valorFederal: number;
    valorEstadual: number;
    valorMunicipal: number;
    valorTotalImpostos: number;
    aliquotaMedia: number;
  };
} {
  const resultados = itens.map(item => calcularLeiTransparencia(item));
  
  const total = resultados.reduce(
    (acc, result) => ({
      valorTotal: acc.valorTotal + result.valorTotal,
      valorFederal: acc.valorFederal + result.valorFederal,
      valorEstadual: acc.valorEstadual + result.valorEstadual,
      valorMunicipal: acc.valorMunicipal + result.valorMunicipal,
      valorTotalImpostos: acc.valorTotalImpostos + result.valorTotal,
    }),
    {
      valorTotal: 0,
      valorFederal: 0,
      valorEstadual: 0,
      valorMunicipal: 0,
      valorTotalImpostos: 0,
    }
  );
  
  const aliquotaMedia = (total.valorTotalImpostos / total.valorTotal) * 100;
  
  return {
    itens: resultados,
    total: {
      ...total,
      aliquotaMedia,
    },
  };
}

/**
 * Valida se a Lei da Transparência se aplica
 * 
 * Aplica-se a:
 * - Venda ao consumidor final
 * - Produtos e serviços
 */
export function validarAplicacaoLei(params: {
  destinatarioFinal: boolean;
  tipoOperacao: 'venda' | 'compra' | 'devolucao' | 'outros';
}): {
  aplicavel: boolean;
  motivo?: string;
} {
  if (!params.destinatarioFinal) {
    return {
      aplicavel: false,
      motivo: 'Lei da Transparência se aplica apenas a vendas para consumidor final',
    };
  }
  
  if (params.tipoOperacao !== 'venda') {
    return {
      aplicavel: false,
      motivo: 'Lei da Transparência se aplica apenas a operações de venda',
    };
  }
  
  return { aplicavel: true };
}

/**
 * Obtém URL para consulta IBPT (se token disponível)
 */
export function getUrlConsultaIBPT(tokenIBPT: string, ncm: string, uf: string): string {
  // URL exemplo - verificar documentação oficial IBPT
  return `https://apidoni.ibpt.org.br/api/v1/produtos?token=${tokenIBPT}&cnpj=&ncm=${ncm}&uf=${uf}`;
}
