/**
 * Utilitários de Validação e Formatação de NCM
 * NCM = Nomenclatura Comum do Mercosul
 * Formato: 8 dígitos numéricos (XXXX.XX.XX)
 */

/**
 * Formata string para o padrão NCM (XXXX.XX.XX)
 * Remove caracteres não numéricos e aplica máscara
 */
export function formatNCM(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  const limited = numbers.slice(0, 8);
  
  // Aplica máscara XXXX.XX.XX
  if (limited.length <= 4) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 4)}.${limited.slice(4)}`;
  } else {
    return `${limited.slice(0, 4)}.${limited.slice(4, 6)}.${limited.slice(6, 8)}`;
  }
}

/**
 * Remove formatação do NCM, retornando apenas números
 */
export function unformatNCM(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida se o NCM está no formato correto
 * @returns { isValid: boolean, message?: string }
 */
export function validateNCM(value: string): { isValid: boolean; message?: string } {
  // Permite vazio (campo opcional)
  if (!value || value.trim() === '') {
    return { isValid: true };
  }
  
  // Remove formatação
  const numbers = unformatNCM(value);
  
  // Verifica se tem exatamente 8 dígitos
  if (numbers.length !== 8) {
    return { 
      isValid: false, 
      message: 'NCM deve conter 8 dígitos (formato: XXXX.XX.XX)' 
    };
  }
  
  // Verifica se são apenas números
  if (!/^\d{8}$/.test(numbers)) {
    return { 
      isValid: false, 
      message: 'NCM deve conter apenas números' 
    };
  }
  
  // Verifica se não é uma sequência inválida (ex: 00000000)
  if (numbers === '00000000') {
    return { 
      isValid: false, 
      message: 'NCM inválido' 
    };
  }
  
  return { isValid: true };
}

/**
 * Verifica se o NCM está completo (8 dígitos)
 */
export function isNCMComplete(value: string): boolean {
  const numbers = unformatNCM(value);
  return numbers.length === 8;
}

/**
 * Retorna placeholder formatado para NCM
 */
export function getNCMPlaceholder(): string {
  return '0000.00.00';
}
