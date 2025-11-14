/**
 * Utilitários para Validação e Busca de CEP
 * Integração com API ViaCEP
 */

export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Busca dados de endereço pelo CEP usando ViaCEP
 */
export const buscarCEP = async (cep: string): Promise<CEPData | null> => {
  try {
    // Remove caracteres não numéricos
    const cleanCEP = cep.replace(/\D/g, '');
    
    // Valida formato
    if (cleanCEP.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }
    
    // Faz requisição para ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CEP');
    }
    
    const data: CEPData = await response.json();
    
    // Verifica se CEP foi encontrado
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

/**
 * Formata CEP para o padrão 99999-999
 */
export const formatCEP = (cep: string): string => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return cep;
  return clean.replace(/(\\d{5})(\\d{3})/, '$1-$2');
};

/**
 * Valida formato de CEP
 */
export const validateCEPFormat = (cep: string): boolean => {
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
};
