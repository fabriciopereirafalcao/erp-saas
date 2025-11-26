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
    const asn1 = pki.asn1.fromDer(binaryString);
    
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