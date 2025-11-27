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

// ✅ SOLUÇÃO DEFINITIVA: JSDelivr com +esm que converte para ESM mantendo TODOS os módulos
// JSDelivr +esm não faz tree-shaking agressivo como esm.sh
// @ts-ignore
import forge from "https://cdn.jsdelivr.net/npm/node-forge@1.3.1/+esm";

console.log('[CERT_VALIDATOR] 🔍 Forge loaded via JSDelivr +esm');
console.log('[CERT_VALIDATOR] 🔍 Forge type:', typeof forge);
console.log('[CERT_VALIDATOR] 🔍 Forge keys:', forge ? Object.keys(forge).slice(0, 10) : 'undefined');
console.log('[CERT_VALIDATOR] 🔍 pki exists:', !!(forge && forge.pki));
console.log('[CERT_VALIDATOR] 🔍 pki.pkcs12 exists:', !!(forge && forge.pki && forge.pki.pkcs12));

// Agora todos os módulos estão disponíveis via forge:
const asn1 = forge.asn1;  // ✅ Módulo asn1
const pki = forge.pki;    // ✅ Módulo pki (com pkcs12 incluído!)

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
    console.log('[CERT_VALIDATOR] Tamanho do buffer:', pfxBuffer.length, 'bytes');
    
    // 1. Converter Uint8Array para string binária (forge espera string de bytes)
    let binaryString = '';
    for (let i = 0; i < pfxBuffer.length; i++) {
      binaryString += String.fromCharCode(pfxBuffer[i]);
    }
    
    console.log('[CERT_VALIDATOR] Binary string criada:', binaryString.length, 'chars');
    
    // 2. Decodificar ASN.1 diretamente da string binária
    let decodedAsn1;
    try {
      // ✅ CORRETO: usar asn1.fromDer(), não pki.asn1.fromDer()
      decodedAsn1 = asn1.fromDer(binaryString);
      console.log('[CERT_VALIDATOR] ASN.1 decodificado com sucesso');
    } catch (error: any) {
      console.error('[CERT_VALIDATOR] Erro ao decodificar ASN.1:', error.message);
      throw new Error('Formato de certificado inválido. Certifique-se de que é um arquivo .pfx válido.');
    }
    
    // 3. Tentar abrir o PKCS#12 com a senha
    let p12;
    try {
      // ✅ IMPORTANTE: usar { strict: false } para certificados brasileiros no Deno Edge
      p12 = pki.pkcs12.pkcs12FromAsn1(decodedAsn1, senha, { strict: false });
      console.log('[CERT_VALIDATOR] PKCS#12 aberto com sucesso');
    } catch (error: any) {
      console.error('[CERT_VALIDATOR] Erro ao abrir PKCS#12:', error.message);
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
      throw new Error(`Certificado expirado. Válido até: ${validoAte.toLocaleDateString('pt-BR')}`);
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
    
    // 8. Extrair serial number
    const serialNumber = cert.serialNumber || '';
    
    console.log('[CERT_VALIDATOR] ✅ Validação concluída com sucesso!');
    
    return {
      cnpj,
      razaoSocial,
      validoDe,
      validoAte,
      emissor,
      serialNumber,
      tipoA1: true,
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
    
    // 1. Converter Uint8Array para string binária (mesmo método do validarCertificado)
    let binaryString = '';
    for (let i = 0; i < pfxBuffer.length; i++) {
      binaryString += String.fromCharCode(pfxBuffer[i]);
    }
    
    // 2. Decodificar ASN.1 diretamente
    // ✅ CORRETO: usar asn1.fromDer(), não pki.asn1.fromDer()
    const decodedAsn1 = asn1.fromDer(binaryString);
    
    // 3. Abrir PKCS#12 com { strict: false } para certificados brasileiros
    const p12 = pki.pkcs12.pkcs12FromAsn1(decodedAsn1, senha, { strict: false });
    
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