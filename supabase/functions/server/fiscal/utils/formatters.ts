// ============================================================================
// UTILITÁRIOS: Formatadores para XML NF-e
// Descrição: Funções para formatar valores conforme padrão SEFAZ
// ============================================================================

/**
 * Formata CNPJ (remove pontuação)
 */
export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CPF (remove pontuação)
 */
export function formatCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata CEP (remove pontuação)
 */
export function formatCEP(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Formata telefone (remove pontuação)
 */
export function formatTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/**
 * Formata valor monetário para XML (15 posições, 2 decimais)
 * Exemplo: 1234.56 → "1234.56"
 */
export function formatValor(valor: number, decimais: number = 2): string {
  return valor.toFixed(decimais);
}

/**
 * Formata quantidade para XML (15 posições, 4 decimais)
 * Exemplo: 10.5 → "10.5000"
 */
export function formatQuantidade(quantidade: number): string {
  return quantidade.toFixed(4);
}

/**
 * Formata alíquota (5 posições, 2 decimais)
 * Exemplo: 18 → "18.00"
 */
export function formatAliquota(aliquota: number): string {
  return aliquota.toFixed(2);
}

/**
 * Formata data e hora para padrão XML (ISO 8601)
 * Formato: YYYY-MM-DDTHH:mm:ss-03:00
 */
export function formatDateTime(date: Date): string {
  // Converter para timezone de Brasília (-03:00)
  const offset = -3 * 60; // -3 horas em minutos
  const localDate = new Date(date.getTime() + offset * 60 * 1000);
  
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Formata data (apenas data, sem hora)
 * Formato: YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Remove acentos e caracteres especiais (para campos de texto)
 */
export function removeAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/gi, '');
}

/**
 * Sanitiza texto para XML (remove caracteres inválidos)
 */
export function sanitizeXML(texto: string): string {
  if (!texto) return '';
  
  return texto
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .substring(0, 500); // Limite de 500 caracteres para campos de texto
}

/**
 * Formata número de série (3 dígitos, com zeros à esquerda)
 */
export function formatSerie(serie: string | number): string {
  return String(serie).padStart(3, '0');
}

/**
 * Formata número da nota (9 dígitos, com zeros à esquerda)
 */
export function formatNumero(numero: number): string {
  return String(numero).padStart(9, '0');
}

/**
 * Formata código do município (7 dígitos)
 */
export function formatCodigoMunicipio(codigo: string): string {
  return codigo.padStart(7, '0');
}

/**
 * Converte UF para código IBGE
 */
export function getCodigoUF(uf: string): string {
  const codigosUF: { [key: string]: string } = {
    'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
    'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
    'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
    'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
    'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
    'SE': '28', 'TO': '17'
  };
  
  return codigosUF[uf.toUpperCase()] || '00';
}

/**
 * Valida e formata NCM (8 dígitos)
 */
export function formatNCM(ncm: string): string {
  const cleaned = ncm.replace(/\D/g, '');
  return cleaned.padStart(8, '0').substring(0, 8);
}

/**
 * Valida e formata CFOP (4 dígitos)
 */
export function formatCFOP(cfop: string): string {
  const cleaned = cfop.replace(/\D/g, '');
  return cleaned.padStart(4, '0').substring(0, 4);
}

/**
 * Formata EAN/GTIN (13 ou 14 dígitos)
 */
export function formatEAN(ean: string): string {
  if (!ean) return '';
  const cleaned = ean.replace(/\D/g, '');
  return cleaned;
}

/**
 * Gera código numérico aleatório (8 dígitos) para chave de acesso
 */
export function gerarCodigoNumerico(): string {
  return String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
}

/**
 * Trunca string no tamanho máximo
 */
export function truncate(texto: string, maxLength: number): string {
  if (!texto) return '';
  return texto.substring(0, maxLength);
}

/**
 * Valida se string está vazia
 */
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Retorna valor ou string vazia se nulo
 */
export function valueOrEmpty(value: any): string {
  return isEmpty(value) ? '' : String(value);
}

/**
 * Formata placa de veículo (remove hífen)
 */
export function formatPlaca(placa: string): string {
  if (!placa) return '';
  return placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
}
