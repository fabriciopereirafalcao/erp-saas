/**
 * ============================================================================
 * ASSINADOR DIGITAL XML – PADRÃO SEFAZ
 * FORCE REDEPLOY: 2024-11-27 21:15:00 GMT - Fix forge.md.sha1 API
 * ============================================================================
 */

import { DOMParser, XMLSerializer } from "npm:xmldom@0.6.0";
import { createHash } from "node:crypto";

// ✅ SOLUÇÃO DEFINITIVA: npm: prefix (Deno 2.x nativo)
// @ts-ignore
import forge from "npm:node-forge@1.3.1";

console.log('[XML_SIGNER] ✅ Forge importado via npm:');
console.log('[XML_SIGNER] Verificando módulos do forge...');
console.log('[XML_SIGNER] forge.pki:', typeof forge.pki);
console.log('[XML_SIGNER] forge.md:', typeof forge.md);
console.log('[XML_SIGNER] forge.md.sha1:', typeof forge.md?.sha1);
console.log('[XML_SIGNER] forge.asn1:', typeof forge.asn1);

// Verificação
if (!forge || !forge.pki || !forge.md || !forge.asn1) {
  throw new Error('[XML_SIGNER] ❌ node-forge módulos não disponíveis!');
}

const { md, pki, asn1 } = forge;

import { extrairChaveECertificado } from "./validator.tsx";

/* ------------------------------------------------------------------------- */

function canonicalizarXML(xml: string): string {
  return xml
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

export async function assinarXMLComCertificado(
  xmlString: string,
  pfxBuffer: Uint8Array,
  senha: string
): Promise<string> {
  
  console.log("[XML] Iniciando assinatura…");
  console.log("[XML] Tamanho do XML recebido:", xmlString?.length || 0);

  const { privateKey, certificate } = extrairChaveECertificado(pfxBuffer, senha);

  console.log("[XML] Fazendo parse do XML com xmldom...");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  if (!doc) throw new Error("Erro ao fazer parse do XML");

  const infNFeElements = doc.getElementsByTagName("infNFe");
  
  if (infNFeElements.length === 0) throw new Error("Elemento infNFe não encontrado.");
  
  const infNFe = infNFeElements[0];
  const id = infNFe.getAttribute("Id");

  if (!id) throw new Error("infNFe sem atributo Id.");

  const serializer = new XMLSerializer();
  const infNFeXml = serializer.serializeToString(infNFe);
  const canonical = canonicalizarXML(infNFeXml);

  console.log("[XML] Calculando digest SHA-1 do conteúdo...");
  // Digest do conteúdo usando node:crypto
  const hashContent = createHash('sha1');
  hashContent.update(canonical, 'utf8');
  const digestValue = hashContent.digest('base64');

  // SignedInfo
  const signedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
    `<Reference URI="#${id}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  const signedInfoCanonical = canonicalizarXML(signedInfo);

  console.log("[XML] Calculando digest SHA-1 do SignedInfo com forge...");
  // Usar forge.md.sha1 para criar o digest que o privateKey.sign() espera
  const mdForSign = forge.md.sha1.create();
  mdForSign.update(signedInfoCanonical, 'utf8');
  
  console.log("[XML] Assinando com RSA-SHA1...");
  // Assinatura RSA usando o MessageDigest do forge
  const assinatura = privateKey.sign(mdForSign);
  const signatureValue = btoa(assinatura);

  // Exportar certificado
  const certDer = asn1.toDer(pki.certificateToAsn1(certificate)).getBytes();
  const x509Certificate = btoa(certDer);

  // Montar XML
  const signature =
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><X509Data>` +
    `<X509Certificate>${x509Certificate}</X509Certificate>` +
    `</X509Data></KeyInfo>` +
    `</Signature>`;

  // Inserir após </infNFe>
  const xmlAssinado = xmlString.replace("</infNFe>", `</infNFe>${signature}`);

  console.log("[XML] XML assinado com sucesso.");

  return xmlAssinado;
}