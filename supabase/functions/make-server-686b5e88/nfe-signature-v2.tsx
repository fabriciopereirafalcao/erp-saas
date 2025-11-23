/**
 * ============================================================================
 * ASSINATURA DIGITAL XML NF-e - VERSÃO ALTERNATIVA
 * ============================================================================
 * 
 * Implementação alternativa usando node:crypto diretamente
 * para evitar problemas com a biblioteca xml-crypto
 * 
 * ============================================================================
 */

import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';
import { createSign } from 'node:crypto';

export interface CertificadoDigital {
  certificadoBase64: string;
  chavePrivadaPem: string;
}

export interface ResultadoAssinatura {
  xmlAssinado: string;
  sucesso: boolean;
  erro?: string;
}

/**
 * Canonização C14N simplificada
 */
function canonicalizarXml(xmlString: string): string {
  // Remover espaços em branco entre tags
  let canonical = xmlString.replace(/>\s+</g, '><');
  
  // Remover quebras de linha e tabs
  canonical = canonical.replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, '');
  
  return canonical;
}

/**
 * Cria hash SHA-256 de um XML canonizado
 */
function criarDigest(xml: string): string {
  const crypto = await import('node:crypto');
  const hash = crypto.createHash('sha256');
  hash.update(xml, 'utf8');
  return hash.digest('base64');
}

/**
 * Assina XML manualmente usando node:crypto
 */
export async function assinarXmlManual(
  xmlString: string,
  certificado: CertificadoDigital
): Promise<ResultadoAssinatura> {
  try {
    console.log('🔐 [V2] Iniciando assinatura manual...');

    // 1. Parse do XML
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    
    if (!doc || doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML inválido ou malformado');
    }

    // 2. Localizar <infNFe>
    const infNFeElements = doc.getElementsByTagName('infNFe');
    if (infNFeElements.length === 0) {
      throw new Error('Tag <infNFe> não encontrada');
    }

    const infNFe = infNFeElements[0];
    const infNFeId = infNFe.getAttribute('Id');
    
    if (!infNFeId) {
      throw new Error('Atributo Id não encontrado em <infNFe>');
    }

    console.log(`📋 [V2] Tag encontrada: ${infNFeId}`);

    // 3. Serializar e canonizar <infNFe>
    const serializer = new XMLSerializer();
    const infNFeXml = serializer.serializeToString(infNFe);
    const infNFeCanonizado = canonicalizarXml(infNFeXml);

    console.log(`📏 [V2] XML canonizado: ${infNFeCanonizado.length} bytes`);

    // 4. Criar digest (hash SHA-256)
    const digestValue = await criarDigest(infNFeCanonizado);
    console.log(`🔢 [V2] Digest criado: ${digestValue.substring(0, 20)}...`);

    // 5. Criar SignedInfo
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

    // 6. Canonizar SignedInfo
    const signedInfoCanonizado = canonicalizarXml(signedInfo);

    // 7. Assinar SignedInfo com RSA-SHA256
    const sign = createSign('RSA-SHA256');
    sign.update(signedInfoCanonizado, 'utf8');
    const signatureValue = sign.sign(certificado.chavePrivadaPem, 'base64');

    console.log(`✍️ [V2] Assinatura criada: ${signatureValue.substring(0, 20)}...`);

    // 8. Criar tag <Signature>
    const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      signedInfo +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
        `<X509Data>` +
          `<X509Certificate>${certificado.certificadoBase64}</X509Certificate>` +
        `</X509Data>` +
      `</KeyInfo>` +
    `</Signature>`;

    // 9. Localizar tag <NFe> para inserir assinatura
    const nfeElements = doc.getElementsByTagName('NFe');
    if (nfeElements.length === 0) {
      throw new Error('Tag <NFe> não encontrada');
    }

    const nfe = nfeElements[0];
    
    // 10. Parse da signature como documento XML
    const signatureDoc = new DOMParser().parseFromString(signature, 'text/xml');
    const signatureNode = signatureDoc.documentElement;

    // 11. Importar e inserir após <infNFe>
    const importedSignature = doc.importNode(signatureNode, true);
    
    // Inserir após infNFe
    if (infNFe.nextSibling) {
      nfe.insertBefore(importedSignature, infNFe.nextSibling);
    } else {
      nfe.appendChild(importedSignature);
    }

    // 12. Serializar documento final
    const xmlAssinado = serializer.serializeToString(doc);

    console.log('✅ [V2] XML assinado com sucesso!');
    console.log(`📦 [V2] Tamanho final: ${xmlAssinado.length} bytes`);

    return {
      xmlAssinado,
      sucesso: true
    };

  } catch (erro: any) {
    console.error('❌ [V2] Erro ao assinar XML:', erro);
    return {
      xmlAssinado: '',
      sucesso: false,
      erro: erro.message || 'Erro desconhecido'
    };
  }
}

/**
 * Converte certificado PEM para base64 puro
 */
export function pemParaBase64(certPem: string): string {
  return certPem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Função simplificada para usar no endpoint
 */
export async function assinarXmlV2(
  xmlString: string,
  chavePrivadaPem: string,
  certificadoBase64: string
): Promise<ResultadoAssinatura> {
  
  const certificado: CertificadoDigital = {
    chavePrivadaPem,
    certificadoBase64
  };

  return await assinarXmlManual(xmlString, certificado);
}
