/**
 * ============================================================================
 * ASSINADOR DIGITAL XML – PADRÃO SEFAZ
 * ============================================================================
 */

import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

// ✅ IMPORTAÇÃO ROBUSTA: namespace completo
// @ts-ignore
import * as forgeAll from "https://esm.sh/node-forge@1.3.1?bundle";

// Normalizar: alguns CDNs exportam como default, outros como namespace
const forge = (forgeAll as any).default || forgeAll;

// Verificação rápida
if (!forge || !forge.pki || !forge.md || !forge.asn1) {
  throw new Error('[XML_SIGNER] ❌ node-forge módulos não disponíveis!');
}

const md = forge.md;
const pki = forge.pki;
const asn1 = forge.asn1;

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

  const { privateKey, certificate } = extrairChaveECertificado(pfxBuffer, senha);

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  if (!doc) throw new Error("Erro ao fazer parse do XML");

  const infNFe = doc.querySelector("infNFe");
  
  if (!infNFe) throw new Error("Elemento infNFe não encontrado.");

  const id = infNFe.getAttribute("Id");

  if (!id) throw new Error("infNFe sem atributo Id.");

  const canonical = canonicalizarXML(infNFe.toString());

  // Digest do conteúdo
  const sha1 = md.sha1.create();
  sha1.update(canonical, "utf8");
  const digestValue = btoa(sha1.digest().bytes());

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

  // Digest do SignedInfo
  const sha1SignedInfo = md.sha1.create();
  sha1SignedInfo.update(signedInfoCanonical, "utf8");
  const digestSignedInfo = sha1SignedInfo.digest();

  // Assinatura RSA-SHA1
  const assinatura = privateKey.sign(digestSignedInfo);
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