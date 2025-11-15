/**
 * Máscaras de Input para Formulários
 * Aplicação automática de formatação durante digitação
 */

/**
 * Máscara para CPF: 999.999.999-99
 */
export const maskCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value.slice(0, 14); // Limita ao tamanho máximo
};

/**
 * Máscara para CNPJ: 99.999.999/9999-99
 */
export const maskCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 14) {
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  return value.slice(0, 18); // Limita ao tamanho máximo
};

/**
 * Máscara para CEP: 99999-999
 */
export const maskCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  }
  return value.slice(0, 9); // Limita ao tamanho máximo
};

/**
 * Máscara para Telefone: (99) 9999-9999 ou (99) 99999-9999
 */
export const maskPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    // Telefone fixo: (99) 9999-9999
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else if (numbers.length === 11) {
    // Celular: (99) 99999-9999
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
  
  return value.slice(0, 15); // Limita ao tamanho máximo
};

/**
 * Máscara para valores monetários: R$ 9.999,99
 */
export const maskMoney = (value: string): string => {
  // Remove tudo exceto números
  let numbers = value.replace(/\D/g, '');
  
  // Converte para número com 2 casas decimais
  const amount = parseFloat(numbers) / 100;
  
  if (isNaN(amount)) {
    return 'R$ 0,00';
  }
  
  // Formata para moeda brasileira
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Máscara para valores numéricos com casas decimais
 */
export const maskDecimal = (value: string, decimals: number = 2): string => {
  const numbers = value.replace(/[^\d,.-]/g, '');
  
  // Substitui vírgula por ponto
  const normalized = numbers.replace(',', '.');
  
  // Parse para número
  const num = parseFloat(normalized);
  
  if (isNaN(num)) {
    return '';
  }
  
  return num.toFixed(decimals);
};

/**
 * Máscara para Inscrição Estadual (formato genérico)
 */
export const maskIE = (value: string, state?: string): string => {
  const numbers = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Aceita ISENTO
  if (numbers === 'ISENTO') {
    return 'ISENTO';
  }
  
  // Formata conforme estado (implementação básica)
  if (numbers.length <= 14) {
    return numbers;
  }
  
  return value.slice(0, 14);
};

/**
 * Remove máscara de qualquer string, deixando apenas números
 */
export const removeMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Aplica máscara baseado no tipo de documento
 */
export const maskDocument = (value: string, type: 'CPF' | 'CNPJ'): string => {
  return type === 'CPF' ? maskCPF(value) : maskCNPJ(value);
};

/**
 * Detecta automaticamente se é CPF ou CNPJ e aplica máscara
 */
export const maskCPForCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    return maskCPF(value);
  } else {
    return maskCNPJ(value);
  }
};

/**
 * Máscara para NCM (8 dígitos)
 */
export const maskNCM = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{4})(\d{1,4})/, '$1.$2');
  }
  
  return value.slice(0, 9);
};

/**
 * Máscara para percentual: 99,99%
 */
export const maskPercentage = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  const num = parseInt(numbers) / 100;
  
  if (num > 100) return '100,00%';
  
  return num.toFixed(2).replace('.', ',') + '%';
};
