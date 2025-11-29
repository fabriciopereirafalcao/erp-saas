// ============================================================================
// MÓDULO: Descriptografia de Certificado
// Descrição: Recupera e descriptografa certificado do banco de dados
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import { CertificadoDecrypted, ApiResponse } from '../types.ts';
import { decryptData } from './crypto.ts';
import { isExpired } from './validate.ts';

/**
 * Recupera e descriptografa um certificado digital
 * 
 * @param certificadoId - ID do certificado
 * @param userId - ID do usuário (para validação RLS)
 * @returns Certificado descriptografado
 */
export async function decryptCertificate(
  certificadoId: string,
  userId: string
): Promise<ApiResponse<CertificadoDecrypted>> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[CERT_DECRYPT] Recuperando certificado:', certificadoId);

    // ========== 1. BUSCAR CERTIFICADO NO BANCO ==========
    
    const { data: cert, error: fetchError } = await supabase
      .from('fiscal_certificados')
      .select('*')
      .eq('id', certificadoId)
      .eq('user_id', userId)
      .eq('ativo', true)
      .single();

    if (fetchError || !cert) {
      console.error('[CERT_DECRYPT] Certificado não encontrado:', fetchError);
      return {
        success: false,
        error: 'Certificado não encontrado ou inativo'
      };
    }

    // ========== 2. VERIFICAR SE ESTÁ EXPIRADO ==========
    
    const validTo = new Date(cert.valid_to);
    if (isExpired(validTo)) {
      console.error('[CERT_DECRYPT] Certificado expirado:', validTo);
      
      // Marcar como inativo
      await supabase
        .from('fiscal_certificados')
        .update({ ativo: false })
        .eq('id', certificadoId);
      
      return {
        success: false,
        error: `Certificado expirado em ${validTo.toLocaleDateString('pt-BR')}`
      };
    }

    // ========== 3. VERIFICAR SE ESTÁ REVOGADO ==========
    
    if (cert.revogado) {
      console.error('[CERT_DECRYPT] Certificado revogado');
      return {
        success: false,
        error: 'Certificado revogado'
      };
    }

    // ========== 4. DESCRIPTOGRAFAR DADOS SENSÍVEIS ==========
    
    console.log('[CERT_DECRYPT] Descriptografando dados sensíveis...');
    
    try {
      const privateKey = await decryptData(cert.private_key_criptografada);
      const publicKey = await decryptData(cert.public_key_criptografada);
      
      let chain: string[] | undefined;
      if (cert.chain_criptografada) {
        const chainJson = await decryptData(cert.chain_criptografada);
        chain = JSON.parse(chainJson);
      }

      const certificateData: CertificadoDecrypted = {
        privateKey,
        publicKey,
        certificate: publicKey, // O certificado público é o mesmo
        chain,
        validFrom: new Date(cert.valid_from),
        validTo: new Date(cert.valid_to),
        subject: {
          cn: cert.subject_cn,
          ou: cert.subject_ou
        },
        issuer: {
          cn: cert.issuer_cn
        },
        serialNumber: cert.serial_number
      };

      console.log('[CERT_DECRYPT] ✅ Certificado descriptografado com sucesso');

      // ========== 5. ATUALIZAR ESTATÍSTICAS DE USO ==========
      
      await supabase
        .from('fiscal_certificados')
        .update({
          ultima_utilizacao: new Date().toISOString(),
          total_utilizacoes: cert.total_utilizacoes + 1
        })
        .eq('id', certificadoId);

      return {
        success: true,
        data: certificateData
      };

    } catch (decryptError: any) {
      console.error('[CERT_DECRYPT] Erro ao descriptografar:', decryptError);
      return {
        success: false,
        error: 'Erro ao descriptografar certificado',
        message: decryptError.message
      };
    }

  } catch (error: any) {
    console.error('[CERT_DECRYPT] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro ao recuperar certificado',
      message: error.message
    };
  }
}

/**
 * Recupera certificado ativo de um emitente
 * 
 * @param emitenteId - ID do emitente
 * @param userId - ID do usuário
 * @returns Certificado descriptografado
 */
export async function getCertificateByEmitente(
  emitenteId: string,
  userId: string
): Promise<ApiResponse<CertificadoDecrypted>> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[CERT_DECRYPT] Buscando certificado do emitente:', emitenteId);

    // ========== 1. BUSCAR CERTIFICADO ATIVO DO EMITENTE ==========
    
    const { data: cert, error: fetchError } = await supabase
      .from('fiscal_certificados')
      .select('id')
      .eq('emitente_id', emitenteId)
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !cert) {
      console.error('[CERT_DECRYPT] Certificado não encontrado para o emitente');
      return {
        success: false,
        error: 'Nenhum certificado ativo encontrado para este emitente'
      };
    }

    // ========== 2. DESCRIPTOGRAFAR CERTIFICADO ==========
    
    return await decryptCertificate(cert.id, userId);

  } catch (error: any) {
    console.error('[CERT_DECRYPT] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro ao buscar certificado do emitente',
      message: error.message
    };
  }
}

/**
 * Lista certificados de um usuário (sem descriptografar dados sensíveis)
 * 
 * @param userId - ID do usuário
 * @returns Lista de certificados
 */
export async function listCertificates(userId: string): Promise<ApiResponse> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: certificates, error } = await supabase
      .from('fiscal_certificados')
      .select(`
        id,
        emitente_id,
        nome_arquivo,
        subject_cn,
        subject_ou,
        issuer_cn,
        serial_number,
        valid_from,
        valid_to,
        ativo,
        revogado,
        ultima_utilizacao,
        total_utilizacoes,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CERT_DECRYPT] Erro ao listar certificados:', error);
      return {
        success: false,
        error: 'Erro ao listar certificados',
        message: error.message
      };
    }

    // Adicionar informações de expiração
    const certificatesWithStatus = certificates.map(cert => ({
      ...cert,
      expirado: isExpired(new Date(cert.valid_to)),
      diasRestantes: Math.floor(
        (new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    }));

    return {
      success: true,
      data: certificatesWithStatus
    };

  } catch (error: any) {
    console.error('[CERT_DECRYPT] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro ao listar certificados',
      message: error.message
    };
  }
}

/**
 * Revoga um certificado
 * 
 * @param certificadoId - ID do certificado
 * @param userId - ID do usuário
 * @param motivo - Motivo da revogação
 * @returns Resultado da operação
 */
export async function revokeCertificate(
  certificadoId: string,
  userId: string,
  motivo: string
): Promise<ApiResponse> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[CERT_DECRYPT] Revogando certificado:', certificadoId);

    const { error } = await supabase
      .from('fiscal_certificados')
      .update({
        revogado: true,
        ativo: false,
        motivo_revogacao: motivo
      })
      .eq('id', certificadoId)
      .eq('user_id', userId);

    if (error) {
      console.error('[CERT_DECRYPT] Erro ao revogar certificado:', error);
      return {
        success: false,
        error: 'Erro ao revogar certificado',
        message: error.message
      };
    }

    console.log('[CERT_DECRYPT] ✅ Certificado revogado com sucesso');

    return {
      success: true,
      message: 'Certificado revogado com sucesso'
    };

  } catch (error: any) {
    console.error('[CERT_DECRYPT] Erro inesperado:', error);
    return {
      success: false,
      error: 'Erro ao revogar certificado',
      message: error.message
    };
  }
}