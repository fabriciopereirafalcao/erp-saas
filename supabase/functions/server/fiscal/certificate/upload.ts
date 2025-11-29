// ============================================================================
// MÓDULO: Upload de Certificado Digital A1
// Descrição: Recebe arquivo PFX, valida, extrai chaves e armazena criptografado
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as forge from 'npm:node-forge@1.3.1';
import { CertificadoUploadInput, CertificadoDecrypted, ApiResponse } from '../types.ts';
import { validateCertificate } from './validate.ts';
import { encryptData, decryptData } from './crypto.ts';

/**
 * Faz upload do certificado digital A1
 * 
 * @param input - Dados do certificado
 * @param userId - ID do usuário
 * @returns Informações do certificado cadastrado
 */
export async function uploadCertificate(
  input: CertificadoUploadInput,
  userId: string
): Promise<ApiResponse> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[CERT_UPLOAD] Iniciando upload de certificado...');
    console.log('[CERT_UPLOAD] Emitente ID:', input.emitenteId);
    console.log('[CERT_UPLOAD] Nome do arquivo:', input.nomeArquivo);
    console.log('[CERT_UPLOAD] Tamanho:', input.arquivo.length, 'bytes');

    // ========== 1. VALIDAÇÕES INICIAIS ==========
    
    // Validar tamanho do arquivo (máx 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (input.arquivo.length > MAX_SIZE) {
      return {
        success: false,
        error: 'Arquivo muito grande. Tamanho máximo: 5MB'
      };
    }

    // Validar extensão
    if (!input.nomeArquivo.toLowerCase().endsWith('.pfx') && 
        !input.nomeArquivo.toLowerCase().endsWith('.p12')) {
      return {
        success: false,
        error: 'Formato inválido. Use arquivo .pfx ou .p12'
      };
    }

    // Verificar se emitente existe e pertence ao usuário
    const { data: emitente, error: emitenteError } = await supabase
      .from('fiscal_emitentes')
      .select('id, cnpj, razao_social')
      .eq('id', input.emitenteId)
      .eq('user_id', userId)
      .single();

    if (emitenteError || !emitente) {
      console.error('[CERT_UPLOAD] Emitente não encontrado:', emitenteError);
      return {
        success: false,
        error: 'Emitente não encontrado'
      };
    }

    // ========== 2. PROCESSAR CERTIFICADO PFX ==========
    
    console.log('[CERT_UPLOAD] Processando arquivo PFX...');
    
    let certificateData: CertificadoDecrypted;
    try {
      // Converter Buffer para base64 para processar com node-forge
      const base64Pfx = input.arquivo.toString('base64');
      const der = forge.util.decode64(base64Pfx);
      
      // Parse do arquivo PFX
      const asn1 = forge.asn1.fromDer(der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, input.senha);
      
      // Extrair chave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const pkcs8Bags = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      
      if (!pkcs8Bags || pkcs8Bags.length === 0) {
        throw new Error('Chave privada não encontrada no certificado');
      }
      
      const privateKey = pkcs8Bags[0].key;
      if (!privateKey) {
        throw new Error('Não foi possível extrair a chave privada');
      }

      // Extrair certificado público
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const pkcs12CertBags = certBags[forge.pki.oids.certBag];
      
      if (!pkcs12CertBags || pkcs12CertBags.length === 0) {
        throw new Error('Certificado público não encontrado');
      }

      const certificate = pkcs12CertBags[0].cert;
      if (!certificate) {
        throw new Error('Não foi possível extrair o certificado público');
      }

      // Extrair cadeia de certificação (se houver)
      const chain: string[] = [];
      for (let i = 1; i < pkcs12CertBags.length; i++) {
        if (pkcs12CertBags[i].cert) {
          chain.push(forge.pki.certificateToPem(pkcs12CertBags[i].cert));
        }
      }

      // Converter chave privada para PEM
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
      const certificatePem = forge.pki.certificateToPem(certificate);

      // Extrair informações do certificado
      const subject = certificate.subject.attributes;
      const issuer = certificate.issuer.attributes;
      const serialNumber = certificate.serialNumber;
      const validFrom = certificate.validity.notBefore;
      const validTo = certificate.validity.notAfter;

      // Extrair CN e OU do subject
      const cnAttr = subject.find((attr: any) => attr.shortName === 'CN' || attr.name === 'commonName');
      const ouAttr = subject.find((attr: any) => attr.shortName === 'OU' || attr.name === 'organizationalUnitName');
      const issuerCnAttr = issuer.find((attr: any) => attr.shortName === 'CN' || attr.name === 'commonName');

      certificateData = {
        privateKey: privateKeyPem,
        publicKey: certificatePem,
        certificate: certificatePem,
        chain: chain.length > 0 ? chain : undefined,
        validFrom: validFrom,
        validTo: validTo,
        subject: {
          cn: cnAttr?.value || 'Desconhecido',
          ou: ouAttr?.value
        },
        issuer: {
          cn: issuerCnAttr?.value || 'Desconhecido'
        },
        serialNumber: serialNumber
      };

      console.log('[CERT_UPLOAD] Certificado processado com sucesso');
      console.log('[CERT_UPLOAD] Subject CN:', certificateData.subject.cn);
      console.log('[CERT_UPLOAD] Validade:', validFrom, 'até', validTo);

    } catch (error: any) {
      console.error('[CERT_UPLOAD] Erro ao processar PFX:', error);
      return {
        success: false,
        error: 'Erro ao processar certificado. Verifique a senha e o arquivo.',
        message: error.message
      };
    }

    // ========== 3. VALIDAR CERTIFICADO ==========
    
    console.log('[CERT_UPLOAD] Validando certificado...');
    const validationResult = await validateCertificate(certificateData);
    
    if (!validationResult.valid) {
      console.error('[CERT_UPLOAD] Certificado inválido:', validationResult.errors);
      return {
        success: false,
        error: 'Certificado inválido',
        message: validationResult.errors?.join('; ')
      };
    }

    // ========== 4. CRIPTOGRAFAR DADOS SENSÍVEIS ==========
    
    console.log('[CERT_UPLOAD] Criptografando dados sensíveis...');
    
    const senhaCriptografada = await encryptData(input.senha);
    const privateKeyCriptografada = await encryptData(certificateData.privateKey);
    const publicKeyCriptografada = await encryptData(certificateData.publicKey);
    const chainCriptografada = certificateData.chain 
      ? await encryptData(JSON.stringify(certificateData.chain))
      : null;

    // ========== 5. ARMAZENAR PFX NO SUPABASE STORAGE ==========
    
    const storageBucket = 'fiscal-certificates';
    const storagePath = `${userId}/${input.emitenteId}/${Date.now()}_${input.nomeArquivo}`;
    
    console.log('[CERT_UPLOAD] Fazendo upload para storage:', storagePath);

    // Criar bucket se não existir
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === storageBucket);
    
    if (!bucketExists) {
      console.log('[CERT_UPLOAD] Criando bucket:', storageBucket);
      await supabase.storage.createBucket(storageBucket, {
        public: false,
        fileSizeLimit: MAX_SIZE
      });
    }

    // Upload do arquivo original (criptografado)
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, input.arquivo, {
        contentType: 'application/x-pkcs12',
        upsert: false
      });

    if (uploadError) {
      console.error('[CERT_UPLOAD] Erro no upload:', uploadError);
      return {
        success: false,
        error: 'Erro ao fazer upload do certificado',
        message: uploadError.message
      };
    }

    // ========== 6. DESATIVAR CERTIFICADOS ANTIGOS ==========
    
    console.log('[CERT_UPLOAD] Desativando certificados antigos...');
    await supabase
      .from('fiscal_certificados')
      .update({ ativo: false })
      .eq('emitente_id', input.emitenteId)
      .eq('ativo', true);

    // ========== 7. SALVAR NO BANCO DE DADOS ==========
    
    console.log('[CERT_UPLOAD] Salvando no banco de dados...');
    const { data: certificado, error: insertError } = await supabase
      .from('fiscal_certificados')
      .insert({
        user_id: userId,
        emitente_id: input.emitenteId,
        nome_arquivo: input.nomeArquivo,
        tamanho_bytes: input.arquivo.length,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        senha_criptografada: senhaCriptografada,
        private_key_criptografada: privateKeyCriptografada,
        public_key_criptografada: publicKeyCriptografada,
        chain_criptografada: chainCriptografada,
        subject_cn: certificateData.subject.cn,
        subject_ou: certificateData.subject.ou,
        issuer_cn: certificateData.issuer.cn,
        serial_number: certificateData.serialNumber,
        valid_from: certificateData.validFrom.toISOString(),
        valid_to: certificateData.validTo.toISOString(),
        ativo: true,
        revogado: false,
        total_utilizacoes: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CERT_UPLOAD] Erro ao salvar no banco:', insertError);
      
      // Tentar limpar o storage
      await supabase.storage
        .from(storageBucket)
        .remove([storagePath]);
      
      return {
        success: false,
        error: 'Erro ao salvar certificado no banco de dados',
        message: insertError.message
      };
    }

    // ========== 8. ATUALIZAR REFERÊNCIA NO EMITENTE ==========
    
    await supabase
      .from('fiscal_emitentes')
      .update({ certificado_id: certificado.id })
      .eq('id', input.emitenteId);

    console.log('[CERT_UPLOAD] ✅ Upload concluído com sucesso!');
    console.log('[CERT_UPLOAD] Certificado ID:', certificado.id);

    return {
      success: true,
      data: {
        id: certificado.id,
        nomeArquivo: certificado.nome_arquivo,
        subjectCn: certificado.subject_cn,
        validFrom: certificado.valid_from,
        validTo: certificado.valid_to,
        ativo: certificado.ativo
      },
      message: 'Certificado digital cadastrado com sucesso!'
    };

  } catch (error: any) {
    console.error('[CERT_UPLOAD] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro ao processar certificado',
      message: error.message
    };
  }
}