// ============================================================================
// MÓDULO: Criptografia AES-256-GCM
// Descrição: Funções para criptografar/descriptografar dados sensíveis
// ============================================================================

import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';

/**
 * Gera uma chave de criptografia determinística baseada em segredo do ambiente
 * IMPORTANTE: A chave é derivada do SUPABASE_SERVICE_ROLE_KEY para garantir
 * que apenas o servidor pode descriptografar os dados
 */
function getEncryptionKey(): Uint8Array {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
  }
  
  // Usar PBKDF2 para derivar uma chave de 256 bits
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(secret);
  
  // Criar um hash SHA-256 do segredo para usar como chave
  return crypto.subtle.digest('SHA-256', keyMaterial).then(
    hash => new Uint8Array(hash)
  );
}

/**
 * Criptografa dados usando AES-256-GCM
 * 
 * @param plaintext - Texto plano para criptografar
 * @returns String base64 no formato: iv:ciphertext:tag
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    // Gerar IV (Initialization Vector) aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits para GCM
    
    // Obter chave de criptografia
    const keyBytes = await getEncryptionKey();
    
    // Importar chave para uso com Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Converter texto para bytes
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    // Criptografar
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 128 bits de autenticação
      },
      key,
      plaintextBytes
    );
    
    // Converter para base64 e combinar iv:ciphertext
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    
    return `${ivBase64}:${ciphertextBase64}`;
    
  } catch (error) {
    console.error('[CRYPTO] Erro ao criptografar:', error);
    throw new Error('Falha na criptografia de dados sensíveis');
  }
}

/**
 * Descriptografa dados usando AES-256-GCM
 * 
 * @param encrypted - String criptografada no formato: iv:ciphertext:tag
 * @returns Texto plano descriptografado
 */
export async function decryptData(encrypted: string): Promise<string> {
  try {
    // Separar IV e ciphertext
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de dados criptografados inválido');
    }
    
    const [ivBase64, ciphertextBase64] = parts;
    
    // Converter de base64 para bytes
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const ciphertextBytes = new Uint8Array(atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));
    
    // Obter chave de criptografia
    const keyBytes = await getEncryptionKey();
    
    // Importar chave para uso com Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Descriptografar
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      ciphertextBytes
    );
    
    // Converter bytes para string
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
    
  } catch (error) {
    console.error('[CRYPTO] Erro ao descriptografar:', error);
    throw new Error('Falha na descriptografia de dados sensíveis');
  }
}

/**
 * Testa se a criptografia está funcionando corretamente
 */
export async function testCrypto(): Promise<boolean> {
  try {
    const testData = 'Teste de criptografia AES-256-GCM';
    const encrypted = await encryptData(testData);
    const decrypted = await decryptData(encrypted);
    
    return testData === decrypted;
  } catch (error) {
    console.error('[CRYPTO] Erro no teste:', error);
    return false;
  }
}
