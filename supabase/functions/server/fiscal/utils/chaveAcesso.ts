// ============================================================================
// GERADOR DE CHAVE DE ACESSO NF-e
// Descrição: Gera a chave de 44 dígitos conforme padrão SEFAZ
// ============================================================================

import { getCodigoUF, formatCNPJ, formatSerie, formatNumero } from './formatters.ts';

/**
 * Estrutura da chave de acesso (44 dígitos):
 * 
 * Posição | Tamanho | Conteúdo
 * --------|---------|--------------------------------------------------
 * 01-02   | 2       | Código da UF do emitente
 * 03-08   | 6       | Ano e Mês de emissão (AAMM)
 * 09-22   | 14      | CNPJ do emitente
 * 23-24   | 2       | Modelo (55=NF-e, 65=NFC-e)
 * 25-27   | 3       | Série
 * 28-36   | 9       | Número da NF-e
 * 37-37   | 1       | Forma de emissão (1=Normal)
 * 38-44   | 8       | Código numérico aleatório
 * 45-45   | 1       | Dígito verificador
 * 
 * Total: 44 dígitos + 1 dígito verificador = 44 dígitos
 */

export interface ChaveAcessoInput {
  uf: string;                    // UF do emitente
  dataEmissao: Date;             // Data de emissão
  cnpj: string;                  // CNPJ do emitente
  modelo: string;                // 55 ou 65
  serie: string;                 // Série da nota
  numero: number;                // Número da nota
  formaEmissao: number;          // 1=Normal, 2-9=Contingência
  codigoNumerico?: string;       // Opcional: código aleatório (8 dígitos)
}

/**
 * Gera a chave de acesso de 44 dígitos
 */
export function gerarChaveAcesso(input: ChaveAcessoInput): string {
  // 1. Código UF (2 dígitos)
  const codigoUF = getCodigoUF(input.uf);
  
  // 2. Ano e Mês (AAMM) - 6 dígitos (na verdade são 6: AAMM + 2 dígitos do ano)
  // Corrigindo: são 4 dígitos AAMM
  const ano = input.dataEmissao.getFullYear().toString().substring(2); // Últimos 2 dígitos
  const mes = String(input.dataEmissao.getMonth() + 1).padStart(2, '0');
  const anoMes = ano + mes; // 4 dígitos
  
  // 3. CNPJ (14 dígitos)
  const cnpj = formatCNPJ(input.cnpj).padStart(14, '0');
  
  // 4. Modelo (2 dígitos)
  const modelo = input.modelo.padStart(2, '0');
  
  // 5. Série (3 dígitos)
  const serie = formatSerie(input.serie);
  
  // 6. Número (9 dígitos)
  const numero = formatNumero(input.numero);
  
  // 7. Forma de Emissão (1 dígito)
  const formaEmissao = String(input.formaEmissao);
  
  // 8. Código Numérico (8 dígitos) - aleatório ou fornecido
  const codigoNumerico = input.codigoNumerico || gerarCodigoNumericoAleatorio();
  
  // Montar chave sem dígito verificador (43 dígitos)
  const chaveSemDV = 
    codigoUF +           // 2
    anoMes +             // 4
    cnpj +               // 14
    modelo +             // 2
    serie +              // 3
    numero +             // 9
    formaEmissao +       // 1
    codigoNumerico;      // 8
  
  // Total: 43 dígitos
  
  // 9. Calcular Dígito Verificador
  const digitoVerificador = calcularDigitoVerificador(chaveSemDV);
  
  // 10. Chave completa (44 dígitos)
  const chaveCompleta = chaveSemDV + digitoVerificador;
  
  console.log('[CHAVE_ACESSO] Gerada:', chaveCompleta);
  console.log('[CHAVE_ACESSO] Breakdown:');
  console.log('  - UF:', codigoUF);
  console.log('  - AAMM:', anoMes);
  console.log('  - CNPJ:', cnpj);
  console.log('  - Modelo:', modelo);
  console.log('  - Série:', serie);
  console.log('  - Número:', numero);
  console.log('  - Emissão:', formaEmissao);
  console.log('  - Código:', codigoNumerico);
  console.log('  - DV:', digitoVerificador);
  
  return chaveCompleta;
}

/**
 * Gera código numérico aleatório de 8 dígitos
 */
function gerarCodigoNumericoAleatorio(): string {
  const min = 10000000;
  const max = 99999999;
  const codigo = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(codigo);
}

/**
 * Calcula o dígito verificador da chave de acesso
 * Algoritmo: Módulo 11
 * 
 * Pesos: 2, 3, 4, 5, 6, 7, 8, 9 (repetindo da direita para esquerda)
 */
export function calcularDigitoVerificador(chave: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIndex = 0;
  
  // Multiplicar cada dígito pelo peso correspondente (da direita para esquerda)
  for (let i = chave.length - 1; i >= 0; i--) {
    const digito = parseInt(chave[i]);
    const peso = pesos[pesoIndex % pesos.length];
    soma += digito * peso;
    pesoIndex++;
  }
  
  // Calcular resto da divisão por 11
  const resto = soma % 11;
  
  // Dígito verificador
  let dv: number;
  if (resto === 0 || resto === 1) {
    dv = 0;
  } else {
    dv = 11 - resto;
  }
  
  return String(dv);
}

/**
 * Valida uma chave de acesso existente
 */
export function validarChaveAcesso(chave: string): boolean {
  // Validar tamanho
  if (chave.length !== 44) {
    return false;
  }
  
  // Validar se contém apenas números
  if (!/^\d+$/.test(chave)) {
    return false;
  }
  
  // Extrair chave sem DV e DV
  const chaveSemDV = chave.substring(0, 43);
  const dvInformado = chave.substring(43, 44);
  
  // Calcular DV esperado
  const dvCalculado = calcularDigitoVerificador(chaveSemDV);
  
  // Comparar
  return dvInformado === dvCalculado;
}

/**
 * Formata chave de acesso para exibição
 * Formato: 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999
 */
export function formatarChaveAcesso(chave: string): string {
  if (chave.length !== 44) {
    return chave;
  }
  
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Extrai informações da chave de acesso
 */
export function extrairInfoChaveAcesso(chave: string): {
  uf: string;
  anoMes: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numero: string;
  formaEmissao: string;
  codigoNumerico: string;
  dv: string;
} | null {
  if (chave.length !== 44) {
    return null;
  }
  
  return {
    uf: chave.substring(0, 2),
    anoMes: chave.substring(2, 6),
    cnpj: chave.substring(6, 20),
    modelo: chave.substring(20, 22),
    serie: chave.substring(22, 25),
    numero: chave.substring(25, 34),
    formaEmissao: chave.substring(34, 35),
    codigoNumerico: chave.substring(35, 43),
    dv: chave.substring(43, 44)
  };
}
