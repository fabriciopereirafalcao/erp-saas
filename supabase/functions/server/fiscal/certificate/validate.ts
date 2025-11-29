// ============================================================================
// MÓDULO: Validação de Certificado Digital
// Descrição: Valida certificado A1 (validade, cadeia, tipo)
// ============================================================================

import { CertificadoDecrypted } from '../types.ts';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Valida um certificado digital A1
 * 
 * @param certificate - Certificado descriptografado
 * @returns Resultado da validação
 */
export async function validateCertificate(
  certificate: CertificadoDecrypted
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    console.log('[CERT_VALIDATE] Iniciando validação do certificado...');

    // ========== 1. VALIDAR VALIDADE TEMPORAL ==========
    
    const now = new Date();
    const validFrom = new Date(certificate.validFrom);
    const validTo = new Date(certificate.validTo);

    if (now < validFrom) {
      errors.push(`Certificado ainda não é válido. Início da validade: ${validFrom.toLocaleDateString('pt-BR')}`);
    }

    if (now > validTo) {
      errors.push(`Certificado expirado em ${validTo.toLocaleDateString('pt-BR')}`);
    }

    // Avisar se está próximo do vencimento (menos de 30 dias)
    const diasRestantes = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes > 0 && diasRestantes <= 30) {
      warnings.push(`Certificado expira em ${diasRestantes} dias (${validTo.toLocaleDateString('pt-BR')})`);
    }

    console.log('[CERT_VALIDATE] Validade:', validFrom.toLocaleDateString(), 'até', validTo.toLocaleDateString());
    console.log('[CERT_VALIDATE] Dias restantes:', diasRestantes);

    // ========== 2. VALIDAR CHAVES ==========
    
    if (!certificate.privateKey || certificate.privateKey.length < 100) {
      errors.push('Chave privada inválida ou não encontrada');
    }

    if (!certificate.publicKey || certificate.publicKey.length < 100) {
      errors.push('Certificado público inválido ou não encontrado');
    }

    // Verificar se começa com os headers corretos
    if (!certificate.privateKey.includes('BEGIN PRIVATE KEY') && 
        !certificate.privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      errors.push('Formato de chave privada inválido');
    }

    if (!certificate.publicKey.includes('BEGIN CERTIFICATE')) {
      errors.push('Formato de certificado público inválido');
    }

    // ========== 3. VALIDAR SUBJECT (CN deve existir) ==========
    
    if (!certificate.subject || !certificate.subject.cn) {
      errors.push('Common Name (CN) não encontrado no certificado');
    } else {
      console.log('[CERT_VALIDATE] Subject CN:', certificate.subject.cn);
    }

    // ========== 4. VALIDAR ISSUER ==========
    
    if (!certificate.issuer || !certificate.issuer.cn) {
      warnings.push('Emissor do certificado não identificado');
    } else {
      console.log('[CERT_VALIDATE] Issuer CN:', certificate.issuer.cn);
    }

    // ========== 5. VALIDAR SERIAL NUMBER ==========
    
    if (!certificate.serialNumber) {
      warnings.push('Número de série do certificado não encontrado');
    } else {
      console.log('[CERT_VALIDATE] Serial Number:', certificate.serialNumber);
    }

    // ========== 6. VALIDAR TIPO DO CERTIFICADO ==========
    
    // Certificados e-CNPJ e e-CPF são válidos para NF-e
    const validTypes = ['e-CNPJ', 'e-CPF', 'NF-e', 'A1'];
    const subjectCn = certificate.subject.cn.toUpperCase();
    
    const isValidType = validTypes.some(type => 
      subjectCn.includes(type.toUpperCase())
    );

    if (!isValidType) {
      warnings.push('Tipo de certificado não identificado como e-CNPJ ou e-CPF. Verifique se é válido para NF-e.');
    }

    // ========== 7. VALIDAR CADEIA DE CERTIFICAÇÃO ==========
    
    if (!certificate.chain || certificate.chain.length === 0) {
      warnings.push('Cadeia de certificação não encontrada. Pode causar problemas na validação pela SEFAZ.');
    } else {
      console.log('[CERT_VALIDATE] Cadeia de certificação:', certificate.chain.length, 'certificados');
    }

    // ========== RESULTADO ==========
    
    const valid = errors.length === 0;

    if (valid) {
      console.log('[CERT_VALIDATE] ✅ Certificado validado com sucesso!');
      if (warnings.length > 0) {
        console.warn('[CERT_VALIDATE] ⚠️ Avisos:', warnings);
      }
    } else {
      console.error('[CERT_VALIDATE] ❌ Certificado inválido!');
      console.error('[CERT_VALIDATE] Erros:', errors);
    }

    return {
      valid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error: any) {
    console.error('[CERT_VALIDATE] Erro na validação:', error);
    return {
      valid: false,
      errors: ['Erro ao validar certificado: ' + error.message]
    };
  }
}

/**
 * Verifica se um certificado está próximo do vencimento
 * 
 * @param validTo - Data de validade do certificado
 * @param diasAlerta - Número de dias antes do vencimento para alertar
 * @returns true se está próximo do vencimento
 */
export function isNearExpiration(validTo: Date, diasAlerta: number = 30): boolean {
  const now = new Date();
  const diasRestantes = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diasRestantes > 0 && diasRestantes <= diasAlerta;
}

/**
 * Verifica se um certificado está expirado
 * 
 * @param validTo - Data de validade do certificado
 * @returns true se está expirado
 */
export function isExpired(validTo: Date): boolean {
  return new Date() > validTo;
}

/**
 * Calcula dias restantes até o vencimento
 * 
 * @param validTo - Data de validade do certificado
 * @returns Número de dias restantes (negativo se expirado)
 */
export function daysUntilExpiration(validTo: Date): number {
  const now = new Date();
  return Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
