/**
 * VALIDAÇÃO E CONSULTA DE CNPJ
 * 
 * Utiliza APIs públicas para consultar dados da Receita Federal:
 * - BrasilAPI (principal)
 * - ReceitaWS (fallback)
 */

export interface CNPJData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  naturezaJuridica: string;
  atividadePrincipal: string;
  dataAbertura: string;
  situacao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  capitalSocial: number;
}

interface BrasilAPIResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  natureza_juridica: string;
  cnae_fiscal_descricao: string;
  data_inicio_atividade: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  capital_social: number;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
}

interface ReceitaWSResponse {
  cnpj: string;
  nome: string;
  fantasia: string;
  natureza_juridica: string;
  atividade_principal: Array<{
    text: string;
  }>;
  data_situacao: string;
  situacao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  capital_social: string;
}

/**
 * Valida formato de CNPJ
 */
export function isValidCNPJFormat(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.length === 14;
}

/**
 * Valida dígitos verificadores do CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

/**
 * Formata CNPJ: 00.000.000/0001-00
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Remove formatação do CNPJ
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Consulta CNPJ via BrasilAPI (PRINCIPAL)
 */
async function consultarCNPJBrasilAPI(cnpj: string): Promise<CNPJData> {
  const cleaned = cleanCNPJ(cnpj);
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cleaned}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`BrasilAPI Error: ${response.status}`);
  }
  
  const data: BrasilAPIResponse = await response.json();
  
  // Formatar telefone
  const telefone = data.ddd_telefone_1 
    ? data.ddd_telefone_1.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
    : '';
  
  return {
    cnpj: formatCNPJ(data.cnpj),
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || data.razao_social || '',
    naturezaJuridica: data.natureza_juridica || '',
    atividadePrincipal: data.cnae_fiscal_descricao || '',
    dataAbertura: data.data_inicio_atividade || '',
    situacao: data.descricao_situacao_cadastral || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.municipio || '',
    estado: data.uf || '',
    cep: data.cep ? data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '',
    telefone: telefone,
    email: '', // BrasilAPI não retorna email
    capitalSocial: data.capital_social || 0
  };
}

/**
 * Consulta CNPJ via ReceitaWS (FALLBACK)
 */
async function consultarCNPJReceitaWS(cnpj: string): Promise<CNPJData> {
  const cleaned = cleanCNPJ(cnpj);
  const url = `https://www.receitaws.com.br/v1/cnpj/${cleaned}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`ReceitaWS Error: ${response.status}`);
  }
  
  const data: ReceitaWSResponse = await response.json();
  
  if (data.cnpj === undefined) {
    throw new Error('CNPJ não encontrado');
  }
  
  return {
    cnpj: formatCNPJ(data.cnpj),
    razaoSocial: data.nome || '',
    nomeFantasia: data.fantasia || data.nome || '',
    naturezaJuridica: data.natureza_juridica || '',
    atividadePrincipal: data.atividade_principal?.[0]?.text || '',
    dataAbertura: data.data_situacao || '',
    situacao: data.situacao || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.municipio || '',
    estado: data.uf || '',
    cep: data.cep ? data.cep.replace(/\./g, '-') : '',
    telefone: data.telefone || '',
    email: data.email || '',
    capitalSocial: parseFloat(data.capital_social?.replace(/\./g, '').replace(',', '.') || '0')
  };
}

/**
 * FUNÇÃO PRINCIPAL: Consulta CNPJ com fallback automático
 * 
 * Tenta BrasilAPI primeiro, se falhar usa ReceitaWS
 */
export async function consultarCNPJ(cnpj: string): Promise<CNPJData> {
  const cleaned = cleanCNPJ(cnpj);
  
  // Validar formato
  if (!isValidCNPJFormat(cleaned)) {
    throw new Error('CNPJ inválido: formato incorreto');
  }
  
  // Validar dígitos verificadores
  if (!isValidCNPJ(cleaned)) {
    throw new Error('CNPJ inválido: dígitos verificadores incorretos');
  }
  
  // Tentar BrasilAPI primeiro
  try {
    console.log('🔍 Consultando CNPJ via BrasilAPI...');
    const resultado = await consultarCNPJBrasilAPI(cnpj);
    console.log('✅ CNPJ encontrado via BrasilAPI');
    return resultado;
  } catch (error) {
    console.warn('⚠️ BrasilAPI falhou, tentando ReceitaWS...', error);
    
    // Fallback para ReceitaWS
    try {
      const resultado = await consultarCNPJReceitaWS(cnpj);
      console.log('✅ CNPJ encontrado via ReceitaWS');
      return resultado;
    } catch (fallbackError) {
      console.error('❌ Ambas as APIs falharam:', fallbackError);
      throw new Error('Não foi possível consultar o CNPJ. Verifique o número e tente novamente.');
    }
  }
}

/**
 * Máscara de CNPJ para input
 */
export function maskCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.substring(0, 14);
  
  return limited
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
