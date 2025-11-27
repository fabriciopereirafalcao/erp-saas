/**
 * ============================================================================
 * VALIDADOR DE CERTIFICADO DIGITAL A1 – SUPABASE EDGE (DENO)
 * ============================================================================
 * Compatível com:
 * - Supabase Edge Runtime (Deno 2.x)
 * - Certificados A1 em .pfx
 * ============================================================================
 */

// ✅ SOLUÇÃO DEFINITIVA: npm: prefix (Deno 2.x nativo)
// Suporta Deno 2.x (Supabase Edge Runtime v2.1.4+)
// Importa node-forge diretamente do npm como módulo ESM
// Sem dependências de jQuery, window ou globalThis
// @ts-ignore
import forge from "npm:node-forge@1.3.1";

console.log('[CERT_VALIDATOR] ✅ Forge importado via npm: (Deno 2.x)');
console.log('[CERT_VALIDATOR] 🔍 forge type:', typeof forge);
console.log('[CERT_VALIDATOR] 🔍 forge keys:', Object.keys(forge || {}));

// ✅ VERIFICAÇÃO: garantir que módulos estão disponíveis
if (!forge || typeof forge !== 'object') {
  throw new Error('[CERT_VALIDATOR] ❌ node-forge não carregou corretamente!');
}

console.log('[CERT_VALIDATOR] 🔍 forge.pki exists:', !!forge.pki);
console.log('[CERT_VALIDATOR] 🔍 forge.pki type:', typeof forge.pki);

if (forge.pki) {
  console.log('[CERT_VALIDATOR] 🔍 forge.pki keys:', Object.keys(forge.pki || {}));
  console.log('[CERT_VALIDATOR] 🔍 forge.pki.pkcs12 exists:', !!forge.pki.pkcs12);
  
  if (forge.pki.pkcs12) {
    console.log('[CERT_VALIDATOR] 🔍 forge.pki.pkcs12 keys:', Object.keys(forge.pki.pkcs12 || {}));
  }
}

if (!forge.pki || !forge.pki.pkcs12) {
  throw new Error('[CERT_VALIDATOR] ❌ forge.pki.pkcs12 não disponível!');
}

console.log('[CERT_VALIDATOR] ✅ forge.pki.pkcs12 disponível');
console.log('[CERT_VALIDATOR] ✅ Módulos verificados!');

const { pki, asn1, util } = forge;

/* ------------------------------------------------------------------------- */

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
 * Converte Uint8Array → binary string (formato esperado pelo forge)
 */
function bufferToBinaryString(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return binary;
}

/**
 * ============================================================================
 * VALIDAR CERTIFICADO PFX
 * ============================================================================
 */
export function validarCertificado(pfxBuffer: Uint8Array, senha: string): CertificadoInfo {
  try {
    console.log("[CERT] Iniciando validação do certificado…");

    const binary = bufferToBinaryString(pfxBuffer);

    let asn;
    try {
      asn = asn1.fromDer(binary);
      console.log("[CERT] ASN.1 decodificado.");
    } catch (err) {
      console.error("[CERT] Erro ASN.1:", err);
      throw new Error("Arquivo .pfx inválido ou corrompido.");
    }

    let p12;
    try {
      p12 = pki.pkcs12.pkcs12FromAsn1(asn, senha, { strict: false });
      console.log("[CERT] PKCS#12 aberto.");
    } catch (err) {
      console.error("[CERT] Erro PKCS#12:", err);
      throw new Error("Senha incorreta ou certificado corrompido.");
    }

    const certBag = p12.getBags({ bagType: pki.oids.certBag })[pki.oids.certBag]?.[0];

    if (!certBag) {
      throw new Error("Nenhum certificado encontrado no PFX.");
    }

    const cert = certBag.cert;
    const subject = cert.subject.attributes;

    // Extrair CNPJ e Razão Social
    let cnpj = "";
    let razao = "";

    for (const attr of subject) {
      if (attr.name === "serialNumber") {
        const match = attr.value.match(/\d{14}/);
        if (match) cnpj = match[0];
      }

      if (attr.name === "commonName") {
        razao = attr.value;
        const match = attr.value.match(/\d{14}/);
        if (match && !cnpj) cnpj = match[0];
      }
    }

    if (!cnpj) throw new Error("Não foi possível extrair o CNPJ do certificado.");

    const validoDe = new Date(cert.validity.notBefore);
    const validoAte = new Date(cert.validity.notAfter);
    const hoje = new Date();

    const diasRestantes = Math.ceil((validoAte.getTime() - hoje.getTime()) / 86400000);
    const isValido = hoje >= validoDe && hoje <= validoAte;

    if (!isValido) {
      throw new Error(`Certificado expirado em ${validoAte.toLocaleDateString("pt-BR")}.`);
    }

    const emissor = cert.issuer.attributes.find(a => a.name === "commonName")?.value ?? "";

    return {
      cnpj,
      razaoSocial: razao,
      validoDe,
      validoAte,
      emissor,
      serialNumber: cert.serialNumber || "",
      tipoA1: true,
      isValido,
      diasRestantes
    };

  } catch (err) {
    console.error("[CERT] Erro final:", err);
    throw err;
  }
}

/**
 * ============================================================================
 * EXTRAIR CHAVE PRIVADA + CERTIFICADO X.509
 * ============================================================================
 */
export function extrairChaveECertificado(pfxBuffer: Uint8Array, senha: string) {
  console.log("[CERT] Extraindo chave privada…");

  const binary = bufferToBinaryString(pfxBuffer);
  const asn = asn1.fromDer(binary);

  const p12 = pki.pkcs12.pkcs12FromAsn1(asn, senha, { strict: false });

  const keyBag = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag })[pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const certBag = p12.getBags({ bagType: pki.oids.certBag })[pki.oids.certBag]?.[0];

  if (!keyBag) throw new Error("Chave privada não encontrada.");
  if (!certBag) throw new Error("Certificado não encontrado.");

  return {
    privateKey: keyBag.key,
    certificate: certBag.cert,
  };
}