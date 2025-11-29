// ============================================================================
// CALCULADORA: FCP (Fundo de Combate à Pobreza)
// Descrição: Motor de cálculo de FCP para NF-e
// ============================================================================

import {
  getAliquotaFCP,
  isFCPAtivo,
  hasIncidenciaFCP,
  calcularFCP as calcularFCPBase,
  calcularFCPDifal,
  getFCPInfo,
} from '../data/fcpAliquotas.ts';

/**
 * Parâmetros para cálculo de FCP
 */
export interface FCPCalculoParams {
  // Base de cálculo
  baseCalculo: number;
  
  // Localização
  ufDestino: string;
  
  // Produto
  ncm?: string;
  
  // Alíquota customizada (opcional)
  aliquota?: number;
  
  // Forçar cálculo mesmo se NCM não estiver na lista
  forcarCalculo?: boolean;
}

/**
 * Resultado do cálculo de FCP
 */
export interface FCPCalculoResult {
  ativo: boolean;
  baseCalculo: number;
  aliquota: number;
  valor: number;
  uf: string;
  temIncidencia: boolean;
  observacoes?: string;
}

/**
 * Parâmetros para cálculo de FCP ST (Substituição Tributária)
 */
export interface FCPSTCalculoParams {
  baseCalculoST: number;
  ufDestino: string;
  ncm?: string;
  aliquota?: number;
}

/**
 * Resultado do cálculo de FCP ST
 */
export interface FCPSTCalculoResult {
  ativo: boolean;
  baseCalculoST: number;
  aliquota: number;
  valorST: number;
  uf: string;
}

/**
 * Parâmetros para cálculo de FCP DIFAL
 */
export interface FCPDifalCalculoParams {
  valorOperacao: number;
  aliquotaInterna: number;
  aliquotaInterestadual: number;
  ufDestino: string;
  aliquotaFcp?: number;
}

/**
 * FUNÇÃO PRINCIPAL: Calcula FCP
 */
export function calcularFCPCompleto(params: FCPCalculoParams): FCPCalculoResult {
  // Validações
  if (!params.ufDestino) {
    throw new Error('UF de destino é obrigatória');
  }
  
  if (params.baseCalculo < 0) {
    throw new Error('Base de cálculo não pode ser negativa');
  }
  
  const uf = params.ufDestino.toUpperCase();
  
  // Verificar se FCP está ativo na UF
  const ativo = isFCPAtivo(uf);
  
  if (!ativo) {
    return {
      ativo: false,
      baseCalculo: 0,
      aliquota: 0,
      valor: 0,
      uf,
      temIncidencia: false,
      observacoes: 'FCP não está ativo neste estado',
    };
  }
  
  // Verificar incidência por NCM (se fornecido e não forçado)
  let temIncidencia = true;
  if (params.ncm && !params.forcarCalculo) {
    temIncidencia = hasIncidenciaFCP(params.ncm, uf);
    
    if (!temIncidencia) {
      return {
        ativo: true,
        baseCalculo: 0,
        aliquota: 0,
        valor: 0,
        uf,
        temIncidencia: false,
        observacoes: 'Produto não tem incidência de FCP',
      };
    }
  }
  
  // Obter alíquota
  const aliquota = params.aliquota ?? getAliquotaFCP(uf);
  
  // Calcular valor
  const valor = params.baseCalculo * (aliquota / 100);
  
  // Obter informações da UF
  const info = getFCPInfo(uf);
  
  return {
    ativo: true,
    baseCalculo: params.baseCalculo,
    aliquota,
    valor,
    uf,
    temIncidencia: true,
    observacoes: info.observacoes,
  };
}

/**
 * Calcula FCP para ICMS ST (Substituição Tributária)
 */
export function calcularFCPST(params: FCPSTCalculoParams): FCPSTCalculoResult {
  // Validações
  if (!params.ufDestino) {
    throw new Error('UF de destino é obrigatória');
  }
  
  const uf = params.ufDestino.toUpperCase();
  
  // Verificar se FCP está ativo
  const ativo = isFCPAtivo(uf);
  
  if (!ativo) {
    return {
      ativo: false,
      baseCalculoST: 0,
      aliquota: 0,
      valorST: 0,
      uf,
    };
  }
  
  // Obter alíquota
  const aliquota = params.aliquota ?? getAliquotaFCP(uf);
  
  // Calcular FCP ST
  const valorST = params.baseCalculoST * (aliquota / 100);
  
  return {
    ativo: true,
    baseCalculoST: params.baseCalculoST,
    aliquota,
    valorST,
    uf,
  };
}

/**
 * Calcula FCP para DIFAL (Diferencial de Alíquota)
 * 
 * Para operações interestaduais de consumidor final não contribuinte
 */
export function calcularFCPDifalCompleto(params: FCPDifalCalculoParams): {
  ativo: boolean;
  baseCalculo: number;
  aliquota: number;
  valor: number;
  uf: string;
} {
  // Validações
  if (!params.ufDestino) {
    throw new Error('UF de destino é obrigatória');
  }
  
  const uf = params.ufDestino.toUpperCase();
  
  // Verificar se FCP está ativo
  const ativo = isFCPAtivo(uf);
  
  if (!ativo) {
    return {
      ativo: false,
      baseCalculo: 0,
      aliquota: 0,
      valor: 0,
      uf,
    };
  }
  
  // Calcular FCP sobre DIFAL
  const valor = calcularFCPDifal(
    params.valorOperacao,
    params.aliquotaInterna,
    params.aliquotaInterestadual,
    uf
  );
  
  const aliquota = params.aliquotaFcp ?? getAliquotaFCP(uf);
  
  return {
    ativo: true,
    baseCalculo: params.valorOperacao,
    aliquota,
    valor,
    uf,
  };
}

/**
 * Verifica se um produto tem incidência de FCP em uma UF
 */
export function verificarIncidenciaFCP(ncm: string, uf: string): {
  temIncidencia: boolean;
  fcpAtivo: boolean;
  aliquota: number;
} {
  const fcpAtivo = isFCPAtivo(uf);
  
  if (!fcpAtivo) {
    return {
      temIncidencia: false,
      fcpAtivo: false,
      aliquota: 0,
    };
  }
  
  const temIncidencia = hasIncidenciaFCP(ncm, uf);
  const aliquota = getAliquotaFCP(uf);
  
  return {
    temIncidencia,
    fcpAtivo: true,
    aliquota,
  };
}

/**
 * Obtém informações de FCP para uma UF
 */
export function obterInfoFCP(uf: string): {
  ativo: boolean;
  aliquota: number;
  observacoes?: string;
} {
  const info = getFCPInfo(uf);
  
  return {
    ativo: info.ativo,
    aliquota: info.aliquota,
    observacoes: info.observacoes,
  };
}

/**
 * Calcula FCP Efetivo (valor que realmente será recolhido)
 * 
 * Em alguns casos, o FCP pode ser partilhado entre origem e destino
 */
export function calcularFCPEfetivo(params: {
  valorFcp: number;
  percentualDestino?: number; // % do FCP que fica com o destino
}): {
  valorFcpOrigem: number;
  valorFcpDestino: number;
  valorFcpTotal: number;
} {
  const percentualDestino = params.percentualDestino ?? 100; // Padrão: 100% destino
  
  const valorFcpDestino = params.valorFcp * (percentualDestino / 100);
  const valorFcpOrigem = params.valorFcp - valorFcpDestino;
  
  return {
    valorFcpOrigem,
    valorFcpDestino,
    valorFcpTotal: params.valorFcp,
  };
}

/**
 * Lista estados com FCP ativo
 */
export function listarEstadosComFCP(): string[] {
  // Importar dados diretamente
  return Object.keys({
    'AL': true, 'BA': true, 'CE': true, 'DF': true, 'GO': true,
    'MA': true, 'MT': true, 'MS': true, 'MG': true, 'PA': true,
    'PB': true, 'PR': true, 'PE': true, 'PI': true, 'RJ': true,
    'RN': true, 'RS': true, 'RO': true, 'SC': true, 'SE': true,
    'TO': true,
  });
}

// Exportar funções do módulo de dados
export {
  getAliquotaFCP,
  isFCPAtivo,
  hasIncidenciaFCP,
  getFCPInfo,
};
