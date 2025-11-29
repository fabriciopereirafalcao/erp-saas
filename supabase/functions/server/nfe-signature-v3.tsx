/**
 * ============================================================================
 * ASSINATURA DIGITAL XML NF-e - VERSÃO 3 (Manual com node:crypto)
 * ============================================================================
 * 
 * Implementação manual de XML-DSig usando node:crypto diretamente.
 * Esta versão NÃO usa xml-crypto devido a problemas com formato de chave.
 * 
 * FORCE REDEPLOY: 2024-11-27 20:45:00 GMT - Fix DOMParser MIME type
 * 
 * ============================================================================
 */

import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';
import { createSign, createHash } from 'node:crypto';

// ============================================================================
// TIPOS
// ============================================================================

export interface ResultadoAssinatura {
  xmlAssinado: string;
  sucesso: boolean;
  erro?: string;
}

// ============================================================================
// FUNÇÕES DE CANONICALIZAÇÃO C14N
// ============================================================================

/**
 * Canonicalização C14N simplificada (suficiente para NF-e)
 */
function canonicalizarXml(xmlString: string): string {
  // Remove espaços em branco entre tags
  let canonical = xmlString.replace(/>\s+</g, '><');
  
  // Remove comentários XML
  canonical = canonical.replace(/<!--[\s\S]*?-->/g, '');
  
  // Normaliza quebras de linha
  canonical = canonical.replace(/\r\n/g, '\n');
  canonical = canonical.replace(/\r/g, '\n');
  
  return canonical;
}

/**
 * Extrai e canonicaliza um elemento específico do XML
 */
function extrairElementoCanonicalizado(doc: Document, elementId: string): string {
  const element = doc.getElementById(elementId);
  if (!element) {
    // Fallback: buscar por atributo Id
    const elements = doc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].getAttribute('Id') === elementId) {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(elements[i]);
        return canonicalizarXml(xmlString);
      }
    }
    throw new Error(`Elemento com Id="${elementId}" não encontrado`);
  }
  
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(element);
  return canonicalizarXml(xmlString);
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE ASSINATURA
// ============================================================================

/**
 * Assina XML NF-e usando node:crypto diretamente
 * 
 * @param xmlString - XML não assinado
 * @param chavePrivadaPem - Chave privada em formato PEM
 * @param certificadoBase64 - Certificado X.509 em base64
 * @returns XML assinado
 */
export function assinarXmlManual(
  xmlString: string,
  chavePrivadaPem: string,
  certificadoBase64: string
): ResultadoAssinatura {
  try {
    console.log('🔐 [V3] Iniciando assinatura manual com node:crypto...');
    
    // 1. Parse do XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    
    // Verificar erros de parsing
    const parseError = doc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      throw new Error('Erro ao fazer parse do XML');
    }
    
    // 2. Encontrar tag <infNFe>
    const infNFeElements = doc.getElementsByTagName('infNFe');
    if (infNFeElements.length === 0) {
      throw new Error('Tag <infNFe> não encontrada no XML');
    }
    
    const infNFe = infNFeElements[0];
    const infNFeId = infNFe.getAttribute('Id');
    
    if (!infNFeId) {
      throw new Error('Atributo Id não encontrado na tag <infNFe>');
    }
    
    console.log(`📋 [V3] Tag encontrada: ${infNFeId}`);
    console.log(`📏 [V3] Chave privada: ${chavePrivadaPem.length} bytes`);
    
    // 3. Extrair e canonicalizar <infNFe>
    const infNFeCanonical = extrairElementoCanonicalizado(doc, infNFeId);
    console.log(`📐 [V3] XML canonicalizado: ${infNFeCanonical.length} bytes`);
    
    // 4. Calcular DigestValue (SHA-256 do elemento canonicalizado)
    const hash = createHash('sha256');
    hash.update(infNFeCanonical, 'utf8');
    const digestValue = hash.digest('base64');
    console.log(`🔢 [V3] DigestValue: ${digestValue.substring(0, 20)}...`);
    
    // 5. Montar SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
      `<Reference URI="#${infNFeId}">` +
        `<Transforms>` +
          `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
          `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
        `</Transforms>` +
        `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
        `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
    `</SignedInfo>`;
    
    // 6. Canonicalizar SignedInfo
    const signedInfoCanonical = canonicalizarXml(signedInfo);
    console.log(`📝 [V3] SignedInfo canonicalizado: ${signedInfoCanonical.length} bytes`);
    
    // 7. Assinar SignedInfo com RSA-SHA256
    const signer = createSign('RSA-SHA256');
    signer.update(signedInfoCanonical, 'utf8');
    
    // IMPORTANTE: Tentar com e sem passphrase
    let signatureValue: string;
    try {
      signatureValue = signer.sign(chavePrivadaPem, 'base64');
      console.log(`✍️ [V3] SignatureValue: ${signatureValue.substring(0, 20)}...`);
    } catch (signError: any) {
      console.error(`❌ [V3] Erro ao assinar:`, signError.message);
      
      // Se falhar, pode ser formato PKCS#1 (BEGIN RSA PRIVATE KEY)
      // Tentar converter para PKCS#8
      if (chavePrivadaPem.includes('BEGIN RSA PRIVATE KEY')) {
        console.log(`🔄 [V3] Tentando converter PKCS#1 para PKCS#8...`);
        throw new Error('Chave em formato PKCS#1. Converta para PKCS#8 (BEGIN PRIVATE KEY)');
      }
      
      throw new Error(`Erro ao assinar: ${signError.message}`);
    }
    
    // 8. Montar tag <Signature>
    const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      signedInfo +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
        `<X509Data>` +
          `<X509Certificate>${certificadoBase64}</X509Certificate>` +
        `</X509Data>` +
      `</KeyInfo>` +
    `</Signature>`;
    
    // 9. Inserir <Signature> no XML original
    // A tag <Signature> deve ser inserida como último filho de <infNFe>
    const serializer = new XMLSerializer();
    const signatureDoc = parser.parseFromString(signature, 'application/xml');
    const signatureNode = signatureDoc.documentElement;
    
    // Importar node para o documento original
    const importedSignature = doc.importNode(signatureNode, true);
    infNFe.appendChild(importedSignature);
    
    // 10. Serializar XML final
    const xmlAssinado = serializer.serializeToString(doc);
    
    console.log(`✅ [V3] XML assinado com sucesso! Tamanho: ${xmlAssinado.length} bytes`);
    
    return {
      xmlAssinado,
      sucesso: true
    };
    
  } catch (error: any) {
    console.error('❌ [V3] Erro ao assinar XML:', error);
    return {
      xmlAssinado: '',
      sucesso: false,
      erro: error.message || 'Erro desconhecido'
    };
  }
}

// ============================================================================
// FUNÇÃO AUXILIAR: Converter PEM para Base64
// ============================================================================

/**
 * Remove headers e footers PEM e retorna apenas o Base64
 */
export function pemParaBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
}

// ============================================================================
// WRAPPER SIMPLIFICADO
// ============================================================================

/**
 * Wrapper compatível com a API antiga
 */
export function assinarXmlSimplificado(
  xml: string,
  chavePrivadaPem: string,
  certificadoBase64: string
): ResultadoAssinatura {
  return assinarXmlManual(xml, chavePrivadaPem, certificadoBase64);
}
