/**
 * ============================================================================
 * ASSINATURA DIGITAL XML NF-e - MÓDULO COMPLETO
 * ============================================================================
 * 
 * Este módulo implementa a assinatura digital XML-DSig conforme padrão SEFAZ
 * 
 * FORCE REDEPLOY: 2025-11-24 00:04:30 GMT
 * 
 * ============================================================================
 */

import { SignedXml } from 'npm:xml-crypto@6.0.0';
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';

// ============================================================================
// TIPOS
// ============================================================================

export interface CertificadoDigital {
  certificadoBase64: string; // Certificado X.509 em base64 (sem a chave privada)
  chavePrivadaPem: string;   // Chave privada em formato PEM
}

export interface ResultadoAssinatura {
  xmlAssinado: string;
  sucesso: boolean;
  erro?: string;
}

// ============================================================================
// CLASSE PERSONALIZADA PARA ASSINATURA XML NF-e
// ============================================================================

class NFeSignature extends SignedXml {
  constructor() {
    super();
    
    // Configurar algoritmos conforme SEFAZ 4.0
    this.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    this.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  }

  // Método para obter o XML canonizado
  getCanonXml(transforms: string[], node: Node): string {
    // Aplicar transformações conforme especificação
    let xml = new XMLSerializer().serializeToString(node);
    
    // Canonização C14N
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return this.getCanonicalXml(transforms, doc);
  }

  // Método auxiliar para canonização
  private getCanonicalXml(transforms: string[], node: any): string {
    // Implementação simplificada de C14N
    // Para produção, considere usar biblioteca especializada
    let xml = new XMLSerializer().serializeToString(node);
    
    // Remover espaços em branco entre tags
    xml = xml.replace(/>\s+</g, '><');
    
    return xml;
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Extrai certificado X.509 de arquivo PFX
 * @param pfxBase64 - Arquivo PFX em base64
 * @param senha - Senha do certificado
 * @returns Certificado e chave privada
 */
export function extrairCertificadoDePFX(
  pfxBase64: string,
  senha: string
): CertificadoDigital {
  try {
    // NOTA: Em ambiente de produção, usar biblioteca como 'node-forge' ou 'pkijs'
    // Para este protótipo, vamos assumir que o certificado já foi convertido
    
    // Decodificar base64
    const pfxBuffer = Uint8Array.from(atob(pfxBase64), c => c.charCodeAt(0));
    
    // TODO: Implementar extração real do PFX
    // Por enquanto, retornar formato esperado
    // Em produção, usar node-forge para extrair:
    // - p12.getBags({ bagType: forge.pki.oids.certBag })
    // - p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    
    throw new Error(
      'Extração de certificado PFX requer biblioteca adicional. ' +
      'Por favor, forneça certificado e chave privada em formato PEM separadamente.'
    );
  } catch (erro: any) {
    console.error('❌ Erro ao extrair certificado PFX:', erro);
    throw new Error(`Falha ao processar certificado: ${erro.message}`);
  }
}

/**
 * Valida formato do certificado X.509
 * @param certificadoBase64 - Certificado em base64
 * @returns true se válido
 */
export function validarCertificado(certificadoBase64: string): boolean {
  try {
    // Verificar se é base64 válido
    const decoded = atob(certificadoBase64);
    
    // Verificar tamanho mínimo
    if (decoded.length < 100) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE ASSINATURA
// ============================================================================

/**
 * Assina XML da NF-e com certificado digital
 * @param xmlString - XML não assinado
 * @param certificado - Certificado digital (chave privada + certificado X.509)
 * @returns XML assinado
 */
export function assinarXmlNFe(
  xmlString: string,
  certificado: CertificadoDigital
): ResultadoAssinatura {
  try {
    console.log('🔐 Iniciando assinatura digital do XML...');

    // 1. Parse do XML
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    
    if (!doc || doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML inválido ou malformado');
    }

    // 2. Localizar tag <infNFe>
    const infNFeElements = doc.getElementsByTagName('infNFe');
    
    if (infNFeElements.length === 0) {
      throw new Error('Tag <infNFe> não encontrada no XML');
    }

    const infNFe = infNFeElements[0];
    const infNFeId = infNFe.getAttribute('Id');
    
    if (!infNFeId) {
      throw new Error('Atributo Id não encontrado na tag <infNFe>');
    }

    console.log(`📋 Tag encontrada: ${infNFeId}`);

    // 3. Criar objeto de assinatura
    const signature = new SignedXml();
    
    // 4. Configurar chave privada
    signature.signingKey = certificado.chavePrivadaPem;

    // 4.1. Configurar algoritmos conforme SEFAZ 4.0
    signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    signature.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    // 5. Adicionar referência ao elemento a ser assinado
    signature.addReference({
      xpath: `//*[@Id='${infNFeId}']`,
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
      ]
    });

    // 6. Configurar KeyInfo com certificado X.509
    signature.keyInfoProvider = {
      getKeyInfo: () => {
        return `<X509Data><X509Certificate>${certificado.certificadoBase64}</X509Certificate></X509Data>`;
      }
    };

    // 7. Computar assinatura
    signature.computeSignature(xmlString, {
      location: { reference: "//*[local-name()='infNFe']", action: "after" }
    });

    // 8. Obter XML assinado
    const xmlAssinado = signature.getSignedXml();

    console.log('✅ XML assinado com sucesso');

    return {
      xmlAssinado,
      sucesso: true
    };

  } catch (erro: any) {
    console.error('❌ Erro ao assinar XML:', erro);
    
    return {
      xmlAssinado: '',
      sucesso: false,
      erro: erro.message || 'Erro desconhecido ao assinar XML'
    };
  }
}

// ============================================================================
// FUNÇÃO ALTERNATIVA: ASSINATURA SIMPLIFICADA (PARA TESTES)
// ============================================================================

/**
 * Assina XML usando certificado em formato PEM (simplificado)
 * @param xmlString - XML não assinado
 * @param chavePrivadaPem - Chave privada em formato PEM
 * @param certificadoBase64 - Certificado X.509 em base64 (sem headers PEM)
 * @returns XML assinado
 */
export function assinarXmlSimplificado(
  xmlString: string,
  chavePrivadaPem: string,
  certificadoBase64: string
): ResultadoAssinatura {
  
  const certificado: CertificadoDigital = {
    chavePrivadaPem,
    certificadoBase64
  };

  return assinarXmlNFe(xmlString, certificado);
}

// ============================================================================
// VALIDAÇÃO DE ASSINATURA
// ============================================================================

/**
 * Valida assinatura digital de um XML
 * @param xmlAssinado - XML com assinatura
 * @returns true se assinatura é válida
 */
export function validarAssinatura(xmlAssinado: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(xmlAssinado, 'text/xml');
    const signature = new SignedXml();
    
    const signatureElements = doc.getElementsByTagName('Signature');
    
    if (signatureElements.length === 0) {
      console.error('❌ Nenhuma assinatura encontrada no XML');
      return false;
    }

    const signatureNode = signatureElements[0];
    signature.loadSignature(signatureNode);
    
    const isValid = signature.checkSignature(xmlAssinado);
    
    if (isValid) {
      console.log('✅ Assinatura válida');
    } else {
      console.error('❌ Assinatura inválida');
    }
    
    return isValid;
    
  } catch (erro: any) {
    console.error('❌ Erro ao validar assinatura:', erro);
    return false;
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Converte certificado PEM para base64 puro (sem headers)
 * @param certPem - Certificado em formato PEM
 * @returns Certificado em base64
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
 * Formata chave privada para PEM se necessário
 * @param chave - Chave privada (PEM ou base64)
 * @returns Chave em formato PEM
 */
export function formatarChavePrivada(chave: string): string {
  // Se já está em formato PEM, retornar
  if (chave.includes('-----BEGIN')) {
    return chave;
  }
  
  // Caso contrário, adicionar headers PEM
  return `-----BEGIN PRIVATE KEY-----\n${chave}\n-----END PRIVATE KEY-----`;
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * Exemplo de como usar o módulo de assinatura
 * 
 * const certificado = {
 *   chavePrivadaPem: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
 *   certificadoBase64: 'MIIDXTCCAkWgAwIBAgI...' // sem headers PEM
 * };
 * 
 * const resultado = assinarXmlNFe(xmlNaoAssinado, certificado);
 * 
 * if (resultado.sucesso) {
 *   console.log('XML assinado:', resultado.xmlAssinado);
 * } else {
 *   console.error('Erro:', resultado.erro);
 * }
 */