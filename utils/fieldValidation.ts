/**
 * Utilitários de Validação de Campos Críticos
 * 
 * Este módulo implementa validações para campos obrigatórios
 * especialmente para emissão de NFe e compliance fiscal
 */

// ==================== TIPOS ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fields: FieldValidation[];
}

export interface FieldValidation {
  field: string;
  label: string;
  isValid: boolean;
  message?: string;
  value?: any;
  required: boolean;
  type: 'error' | 'warning' | 'success' | 'info';
}

// ==================== VALIDAÇÃO DE DOCUMENTOS ====================

/**
 * Valida CPF
 */
export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

/**
 * Valida CNPJ
 */
export const validateCNPJ = (cnpj: string): boolean => {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  let digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

/**
 * Valida CPF ou CNPJ
 */
export const validateDocument = (document: string, type?: 'PF' | 'PJ'): boolean => {
  if (!document) return false;
  
  const clean = document.replace(/\D/g, '');
  
  if (type === 'PF' || clean.length === 11) {
    return validateCPF(document);
  }
  
  if (type === 'PJ' || clean.length === 14) {
    return validateCNPJ(document);
  }
  
  return false;
};

// ==================== VALIDAÇÃO DE E-MAIL ====================

/**
 * Valida E-mail com verificação robusta
 * 
 * Regras:
 * - Deve conter @ e pelo menos um ponto após o @
 * - Não pode ter espaços
 * - Parte local (antes do @) não pode estar vazia
 * - Domínio (depois do @) deve ter formato válido
 * - Domínio deve ter pelo menos um ponto
 * - Extensão do domínio deve ter pelo menos 2 caracteres
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Remove espaços em branco
  const trimmedEmail = email.trim();
  
  // Verifica se tem espaços (e-mail não pode ter espaços)
  if (/\s/.test(trimmedEmail)) {
    console.log('❌ validateEmail: E-mail contém espaços:', email);
    return false;
  }
  
  // Regex robusto para validação de e-mail
  // ^[^\s@]+ - início deve ter pelo menos 1 caractere que não seja espaço ou @
  // @ - deve ter exatamente um @
  // [^\s@]+ - depois do @ deve ter pelo menos 1 caractere que não seja espaço ou @
  // \. - deve ter pelo menos um ponto no domínio
  // [^\s@]{2,}$ - extensão do domínio deve ter pelo menos 2 caracteres
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    console.log('❌ validateEmail: E-mail não passou no regex básico:', email);
    return false;
  }
  
  // Validações adicionais
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) {
    console.log('❌ validateEmail: E-mail não tem exatamente um @:', email);
    return false;
  }
  
  const [localPart, domain] = parts;
  
  // Parte local não pode estar vazia ou começar/terminar com ponto
  if (!localPart || localPart.startsWith('.') || localPart.endsWith('.')) {
    console.log('❌ validateEmail: Parte local inválida:', email);
    return false;
  }
  
  // Domínio não pode estar vazio ou começar/terminar com ponto ou hífen
  if (!domain || domain.startsWith('.') || domain.endsWith('.') || 
      domain.startsWith('-') || domain.endsWith('-')) {
    console.log('❌ validateEmail: Domínio inválido:', email);
    return false;
  }
  
  // Domínio deve ter pelo menos um ponto
  if (!domain.includes('.')) {
    console.log('❌ validateEmail: Domínio não contém ponto:', email);
    return false;
  }
  
  // Validar que não há pontos consecutivos
  if (trimmedEmail.includes('..')) {
    console.log('❌ validateEmail: E-mail contém pontos consecutivos:', email);
    return false;
  }
  
  console.log('✅ validateEmail: E-mail válido:', email);
  return true;
};

/**
 * Valida Inscrição Estadual (formato genérico)
 */
export const validateIE = (ie: string, state?: string): boolean => {
  if (!ie) return false;
  
  // ISENTO é válido
  if (ie.toUpperCase() === 'ISENTO') return true;
  
  // Remover caracteres não numéricos
  const clean = ie.replace(/\D/g, '');
  
  // Deve ter entre 8 e 14 dígitos
  if (clean.length < 8 || clean.length > 14) return false;
  
  // Validação específica por estado pode ser implementada
  // Por enquanto, validação básica de formato
  return true;
};

// ==================== VALIDAÇÃO DE ENDEREÇO ====================

/**
 * Valida CEP
 */
export const validateCEP = (cep: string): boolean => {
  if (!cep) return false;
  
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
};

/**
 * Valida endereço completo
 */
export const validateAddress = (address: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  
  if (!address.street || address.street.trim() === '') {
    missingFields.push('Logradouro');
  }
  
  if (!address.number || address.number.trim() === '') {
    missingFields.push('Número');
  }
  
  if (!address.neighborhood || address.neighborhood.trim() === '') {
    missingFields.push('Bairro');
  }
  
  if (!address.city || address.city.trim() === '') {
    missingFields.push('Cidade');
  }
  
  if (!address.state || address.state.trim() === '') {
    missingFields.push('Estado');
  }
  
  if (!address.zipCode || !validateCEP(address.zipCode)) {
    missingFields.push('CEP');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

// ==================== VALIDAÇÃO DE CLIENTE ====================

export const validateCustomer = (customer: {
  documentType?: 'PF' | 'PJ';
  document?: string;
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: FieldValidation[] = [];
  
  // Documento
  const docValid = customer.document && validateDocument(customer.document, customer.documentType);
  fields.push({
    field: 'document',
    label: customer.documentType === 'PJ' ? 'CNPJ' : 'CPF',
    isValid: !!docValid,
    message: docValid ? 'Válido' : 'Documento inválido',
    value: customer.document,
    required: true,
    type: docValid ? 'success' : 'error'
  });
  if (!docValid) {
    errors.push(`${customer.documentType === 'PJ' ? 'CNPJ' : 'CPF'} inválido ou não informado`);
  }
  
  // Nome
  const nameValid = customer.name && customer.name.trim().length >= 3;
  fields.push({
    field: 'name',
    label: 'Nome/Razão Social',
    isValid: !!nameValid,
    message: nameValid ? 'Válido' : 'Nome deve ter no mínimo 3 caracteres',
    value: customer.name,
    required: true,
    type: nameValid ? 'success' : 'error'
  });
  if (!nameValid) {
    errors.push('Nome/Razão Social inválido');
  }
  
  // Email (campo opcional)
  const emailProvided = customer.email && customer.email.trim().length > 0;
  const emailValid = emailProvided && validateEmail(customer.email);
  // Considera "completo" se tem @ e ponto (pode estar errado mas foi tentado preencher)
  const emailLooksComplete = customer.email && customer.email.includes('@') && customer.email.includes('.');
  
  fields.push({
    field: 'email',
    label: 'E-mail',
    isValid: !emailProvided || !!emailValid, // Válido se não fornecido ou se válido
    message: !emailProvided ? 'Campo opcional' : (emailValid ? 'Válido' : 'E-mail inválido'),
    value: customer.email,
    required: false,
    type: !emailProvided ? 'info' : (emailValid ? 'success' : 'warning')
  });
  
  // Só adiciona warning se o e-mail parece completo mas está inválido
  // Ignora e-mails parcialmente digitados (ex: "teste@" ainda sendo digitado)
  if (emailProvided && emailLooksComplete && !emailValid) {
    warnings.push('E-mail informado está incompleto ou inválido');
  }
  
  // Telefone (campo opcional)
  const phoneValid = customer.phone && customer.phone.replace(/\D/g, '').length >= 10;
  const phoneProvided = customer.phone && customer.phone.trim().length > 0;
  const phoneLooksComplete = customer.phone && customer.phone.replace(/\D/g, '').length >= 8; // Pelo menos 8 dígitos
  
  fields.push({
    field: 'phone',
    label: 'Telefone',
    isValid: !phoneProvided || !!phoneValid, // Válido se não fornecido ou se válido
    message: !phoneProvided ? 'Campo opcional' : (phoneValid ? 'Válido' : 'Telefone inválido'),
    value: customer.phone,
    required: false,
    type: !phoneProvided ? 'info' : (phoneValid ? 'success' : 'warning')
  });
  
  // Só adiciona warning se o telefone parece completo mas está inválido
  // Ignora telefones parcialmente digitados (ex: "11 9" ainda sendo digitado)
  if (phoneProvided && phoneLooksComplete && !phoneValid) {
    warnings.push('Telefone informado está incompleto (mínimo 10 dígitos)');
  }
  
  // Endereço
  const addressValidation = validateAddress({
    street: customer.street,
    number: customer.number,
    neighborhood: customer.neighborhood,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode
  });
  
  if (!addressValidation.isValid) {
    errors.push(`Endereço incompleto: ${addressValidation.missingFields.join(', ')}`);
    addressValidation.missingFields.forEach(field => {
      fields.push({
        field: field.toLowerCase(),
        label: field,
        isValid: false,
        message: 'Campo obrigatório não preenchido',
        required: true,
        type: 'error'
      });
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fields
  };
};

// ==================== VALIDAÇÃO DE PRODUTO ====================

export const validateProduct = (product: {
  productName?: string;
  ncm?: string;
  quantity?: number;
  unitPrice?: number;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: FieldValidation[] = [];
  
  // Nome do Produto
  const nameValid = product.productName && product.productName.trim().length >= 3;
  fields.push({
    field: 'productName',
    label: 'Nome do Produto',
    isValid: !!nameValid,
    message: nameValid ? 'Válido' : 'Nome deve ter no mínimo 3 caracteres',
    value: product.productName,
    required: true,
    type: nameValid ? 'success' : 'error'
  });
  if (!nameValid) {
    errors.push('Nome do produto inválido');
  }
  
  // NCM (obrigatório para NFe)
  const ncmValid = product.ncm && product.ncm.replace(/\D/g, '').length === 8;
  fields.push({
    field: 'ncm',
    label: 'NCM',
    isValid: !!ncmValid,
    message: ncmValid ? 'Válido' : 'NCM deve ter 8 dígitos',
    value: product.ncm,
    required: true,
    type: ncmValid ? 'success' : 'error'
  });
  if (!ncmValid) {
    errors.push('NCM inválido ou não informado (obrigatório para NFe)');
  }
  
  // Quantidade
  const qtyValid = product.quantity && product.quantity > 0;
  fields.push({
    field: 'quantity',
    label: 'Quantidade',
    isValid: !!qtyValid,
    message: qtyValid ? 'Válido' : 'Quantidade deve ser maior que zero',
    value: product.quantity,
    required: true,
    type: qtyValid ? 'success' : 'error'
  });
  if (!qtyValid) {
    errors.push('Quantidade inválida');
  }
  
  // Preço Unitário
  const priceValid = product.unitPrice && product.unitPrice > 0;
  fields.push({
    field: 'unitPrice',
    label: 'Preço Unitário',
    isValid: !!priceValid,
    message: priceValid ? 'Válido' : 'Preço deve ser maior que zero',
    value: product.unitPrice,
    required: true,
    type: priceValid ? 'success' : 'error'
  });
  if (!priceValid) {
    errors.push('Preço unitário inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fields
  };
};

// ==================== VALIDAÇÃO DE EMPRESA ====================

export const validateCompany = (company: {
  cnpj?: string;
  companyName?: string;
  stateRegistration?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: FieldValidation[] = [];
  
  // CNPJ
  const cnpjValid = company.cnpj && validateCNPJ(company.cnpj);
  fields.push({
    field: 'cnpj',
    label: 'CNPJ',
    isValid: !!cnpjValid,
    message: cnpjValid ? 'Válido' : 'CNPJ inválido',
    value: company.cnpj,
    required: true,
    type: cnpjValid ? 'success' : 'error'
  });
  if (!cnpjValid) {
    errors.push('CNPJ da empresa inválido ou não informado');
  }
  
  // Razão Social
  const nameValid = company.companyName && company.companyName.trim().length >= 3;
  fields.push({
    field: 'companyName',
    label: 'Razão Social',
    isValid: !!nameValid,
    message: nameValid ? 'Válido' : 'Razão Social deve ter no mínimo 3 caracteres',
    value: company.companyName,
    required: true,
    type: nameValid ? 'success' : 'error'
  });
  if (!nameValid) {
    errors.push('Razão Social inválida');
  }
  
  // Inscrição Estadual
  const ieValid = company.stateRegistration && validateIE(company.stateRegistration);
  fields.push({
    field: 'stateRegistration',
    label: 'Inscrição Estadual',
    isValid: !!ieValid,
    message: ieValid ? 'Válido' : 'IE inválida',
    value: company.stateRegistration,
    required: true,
    type: ieValid ? 'success' : 'error'
  });
  if (!ieValid) {
    errors.push('Inscrição Estadual inválida ou não informada');
  }
  
  // Endereço
  const addressValidation = validateAddress({
    street: company.street,
    number: company.number,
    neighborhood: company.neighborhood,
    city: company.city,
    state: company.state,
    zipCode: company.zipCode
  });
  
  if (!addressValidation.isValid) {
    errors.push(`Endereço da empresa incompleto: ${addressValidation.missingFields.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fields
  };
};

// ==================== VALIDAÇÃO DE NFE ====================

export const validateNFeData = (data: {
  company?: any;
  customer?: any;
  product?: any;
  cfop?: string;
  cst?: string;
  icmsRate?: number;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fields: FieldValidation[] = [];
  
  // Validar Empresa
  if (data.company) {
    const companyValidation = validateCompany(data.company);
    if (!companyValidation.isValid) {
      errors.push('Dados da empresa inválidos para emissão de NFe');
      errors.push(...companyValidation.errors);
    }
  } else {
    errors.push('Dados da empresa não informados');
  }
  
  // Validar Cliente
  if (data.customer) {
    const customerValidation = validateCustomer(data.customer);
    if (!customerValidation.isValid) {
      errors.push('Dados do cliente inválidos para emissão de NFe');
      errors.push(...customerValidation.errors);
    }
  } else {
    errors.push('Dados do cliente não informados');
  }
  
  // Validar Produto
  if (data.product) {
    const productValidation = validateProduct(data.product);
    if (!productValidation.isValid) {
      errors.push('Dados do produto inválidos para emissão de NFe');
      errors.push(...productValidation.errors);
    }
  } else {
    errors.push('Dados do produto não informados');
  }
  
  // CFOP
  const cfopValid = data.cfop && data.cfop.length === 4 && /^\d{4}$/.test(data.cfop);
  fields.push({
    field: 'cfop',
    label: 'CFOP',
    isValid: !!cfopValid,
    message: cfopValid ? 'Válido' : 'CFOP deve ter 4 dígitos',
    value: data.cfop,
    required: true,
    type: cfopValid ? 'success' : 'error'
  });
  if (!cfopValid) {
    errors.push('CFOP inválido ou não informado');
  }
  
  // CST/CSOSN
  const cstValid = data.cst && (data.cst.length === 2 || data.cst.length === 3);
  fields.push({
    field: 'cst',
    label: 'CST/CSOSN',
    isValid: !!cstValid,
    message: cstValid ? 'Válido' : 'CST/CSOSN inválido',
    value: data.cst,
    required: true,
    type: cstValid ? 'success' : 'error'
  });
  if (!cstValid) {
    errors.push('CST/CSOSN inválido ou não informado');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fields
  };
};

// ==================== FORMATAR DOCUMENTOS ====================

/**
 * Formata CPF: 000.000.000-00
 */
export const formatCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export const formatCNPJ = (cnpj: string): string => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata CEP: 00000-000
 */
export const formatCEP = (cep: string): string => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return cep;
  return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};
