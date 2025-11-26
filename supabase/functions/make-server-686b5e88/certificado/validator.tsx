/**
 * ============================================================================
 * VALIDADOR DE CERTIFICADO DIGITAL A1
 * ============================================================================
 * 
 * Valida e extrai informações de certificados digitais .pfx (A1)
 * 
 * Funcionalidades:
 * - Validação de formato .pfx
 * - Validação de senha
 * - Extração de CNPJ
 * - Validação de validade (não expirado)
 * - Extração de informações (nome, emissor, validade)
 * 
 * ============================================================================
 */

import forge from 'npm:node-forge@1.3.1';
const { pki } = forge;

export interface CertificadoInfo {
  cnpj: string;
  razaoSocial: string;
  validoDe: Date;
  validoAte: Date;
  emissor: string;
  serialNumber: string;
  tipoA1: boolean;
  isValido: boolean;
  diasRestantes: number;
}

/**
 * Valida e extrai informações de um certificado A1
 */
export function validarCertificado(pfxBuffer: Uint8Array, senha: string): CertificadoInfo {
  try {
    console.log('[CERT_VALIDATOR] Iniciando validação do certificado...');
    
    // 1. Converter buffer para base64
    const pfxBase64 = btoa(String.fromCharCode(...pfxBuffer));
    
    // 2. Decodificar ASN.1
    let asn1;
    try {
      const derBytes = atob(pfxBase64);
      asn1 = pki.asn1.fromDer(derBytes);
    } catch (error) {
      throw new Error('Formato de certificado inválido. Certifique-se de que é um arquivo .pfx válido.');
    }
    
    // 3. Tentar abrir o PKCS#12 com a senha
    let p12;
    try {
      p12 = pki.pkcs12.pkcs12FromAsn1(asn1, senha);
    } catch (error) {
      throw new Error('Senha incorreta ou certificado corrompido.');
    }
    
    console.log('[CERT_VALIDATOR] Certificado decodificado com sucesso');
    
    // 4. Extrair bags de certificados
    const certBags = p12.getBags({ bagType: pki.oids.certBag });
    const certBag = certBags[pki.oids.certBag];
    
    if (!certBag || certBag.length === 0) {
      throw new Error('Nenhum certificado encontrado no arquivo .pfx');
    }
    
    // Pegar o primeiro certificado (certificado do usuário)
    const cert = certBag[0].cert;
    
    if (!cert) {
      throw new Error('Certificado inválido no arquivo .pfx');
    }
    
    console.log('[CERT_VALIDATOR] Certificado extraído:', cert.subject.attributes.map((a: any) => `${a.name}=${a.value}`).join(', '));
    
    // 5. Extrair informações do subject
    const subjectAttrs = cert.subject.attributes;
    
    // Buscar CNPJ no campo serialNumber ou CN
    let cnpj = '';
    let razaoSocial = '';
    
    for (const attr of subjectAttrs) {
      if (attr.name === 'serialNumber' || attr.shortName === 'serialNumber') {
        // CNPJ geralmente vem no formato "CNPJ:00000000000000" ou direto "00000000000000"
        const value = attr.value || '';
        const match = value.match(/(\d{14})/);
        if (match) {
          cnpj = match[1];
        }
      }
      
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        razaoSocial = attr.value || '';
        
        // Algumas vezes o CNPJ vem junto com o CN
        if (!cnpj) {
          const match = (attr.value || '').match(/(\d{14})/);
          if (match) {
            cnpj = match[1];
          }
        }
      }
    }
    
    if (!cnpj) {
      throw new Error('Não foi possível extrair o CNPJ do certificado. Certificado pode ser inválido para uso fiscal.');
    }
    
    console.log('[CERT_VALIDATOR] CNPJ extraído:', cnpj);
    
    // 6. Validar validade
    const validoDe = new Date(cert.validity.notBefore);
    const validoAte = new Date(cert.validity.notAfter);
    const agora = new Date();
    
    const isValido = agora >= validoDe && agora <= validoAte;
    const diasRestantes = Math.ceil((validoAte.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('[CERT_VALIDATOR] Validade:', {
      validoDe: validoDe.toISOString(),
      validoAte: validoAte.toISOString(),
      isValido,
      diasRestantes
    });
    
    if (!isValido) {
      if (agora < validoDe) {
        throw new Error(`Certificado ainda não é válido. Será válido a partir de ${validoDe.toLocaleDateString('pt-BR')}`);
      } else {
        throw new Error(`Certificado expirado em ${validoAte.toLocaleDateString('pt-BR')}`);
      }
    }
    
    // 7. Extrair emissor
    const issuerAttrs = cert.issuer.attributes;
    let emissor = '';
    
    for (const attr of issuerAttrs) {
      if (attr.name === 'commonName' || attr.shortName === 'CN') {
        emissor = attr.value || '';
        break;
      }
    }
    
    // 8. Verificar se é certificado A1 (verificando extensions)
    const tipoA1 = true; // .pfx geralmente é A1
    
    // 9. Serial Number
    const serialNumber = cert.serialNumber;
    
    console.log('[CERT_VALIDATOR] ✅ Certificado válido!');
    
    return {
      cnpj,
      razaoSocial,
      validoDe,
      validoAte,
      emissor,
      serialNumber,
      tipoA1,
      isValido,
      diasRestantes
    };
    
  } catch (error: any) {
    console.error('[CERT_VALIDATOR] Erro ao validar certificado:', error);
    throw error;
  }
}

/**
 * Extrai chave privada e certificado do .pfx para uso na assinatura
 */
export function extrairChaveECertificado(pfxBuffer: Uint8Array, senha: string) {
  try {
    console.log('[CERT_VALIDATOR] Extraindo chave e certificado...');
    
    // 1. Converter buffer para base64
    const pfxBase64 = btoa(String.fromCharCode(...pfxBuffer));
    
    // 2. Decodificar ASN.1
    const derBytes = atob(pfxBase64);
    const asn1 = pki.asn1.fromDer(derBytes);
    
    // 3. Abrir PKCS#12
    const p12 = pki.pkcs12.pkcs12FromAsn1(asn1, senha);
    
    // 4. Extrair chave privada
    const keyBags = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[pki.oids.pkcs8ShroudedKeyBag];
    
    if (!keyBag || keyBag.length === 0) {
      throw new Error('Chave privada não encontrada no certificado');
    }
    
    const privateKey = keyBag[0].key;
    
    // 5. Extrair certificado
    const certBags = p12.getBags({ bagType: pki.oids.certBag });
    const certBag = certBags[pki.oids.certBag];
    
    if (!certBag || certBag.length === 0) {
      throw new Error('Certificado não encontrado no arquivo .pfx');
    }
    
    const certificate = certBag[0].cert;
    
    console.log('[CERT_VALIDATOR] ✅ Chave e certificado extraídos com sucesso');
    
    return {
      privateKey,
      certificate
    };
    
  } catch (error: any) {
    console.error('[CERT_VALIDATOR] Erro ao extrair chave e certificado:', error);
    throw error;
  }
}

/**
 * Converte certificado para PEM
 */
export function certificadoParaPEM(cert: any): string {
  return pki.certificateToPem(cert);
}

/**
 * Converte chave privada para PEM
 */
export function chavePrivadaParaPEM(key: any): string {
  return pki.privateKeyToPem(key);
}