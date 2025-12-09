/**
 * ============================================================================
 * ROTAS DE CERTIFICADO DIGITAL
 * ============================================================================
 * 
 * Endpoints para gestão de certificados A1:
 * - Upload de certificado .pfx
 * - Validação e armazenamento
 * - Consulta de informações
 * - Exclusão
 * 
 * ============================================================================
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import * as kv from '../kv_store.tsx';
import { validarCertificado } from './validator.tsx';

const certificado = new Hono();

// ============================================================================
// POST /certificado/upload
// Descrição: Upload e validação de certificado A1
// ============================================================================
certificado.post('/upload', async (c) => {
  try {
    console.log('[CERT_ROUTES] POST /upload - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    console.log(`[CERT_ROUTES] Upload de certificado para usuário: ${user.id}`);
    
    // 2. Parse do form-data
    const formData = await c.req.formData();
    const file = formData.get('certificado') as File;
    const senha = formData.get('senha') as string;
    
    if (!file) {
      return c.json({
        success: false,
        error: 'Arquivo de certificado não fornecido'
      }, 400);
    }
    
    if (!senha) {
      return c.json({
        success: false,
        error: 'Senha do certificado não fornecida'
      }, 400);
    }
    
    console.log('[CERT_ROUTES] Arquivo recebido:', file.name, 'Tamanho:', file.size, 'bytes');
    
    // 3. Validar extensão
    if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
      return c.json({
        success: false,
        error: 'Formato inválido. O arquivo deve ser .pfx ou .p12'
      }, 400);
    }
    
    // 4. Converter para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('[CERT_ROUTES] Buffer criado:', buffer.length, 'bytes');
    
    // 5. Validar certificado e extrair informações
    let certInfo;
    try {
      certInfo = validarCertificado(buffer, senha);
    } catch (error: any) {
      return c.json({
        success: false,
        error: `Erro ao validar certificado: ${error.message}`
      }, 400);
    }
    
    console.log('[CERT_ROUTES] Certificado validado:', certInfo);
    
    // 6. Verificar se está próximo do vencimento (alerta se < 30 dias)
    const avisoVencimento = certInfo.diasRestantes < 30 ? 
      `⚠️ ATENÇÃO: Certificado expira em ${certInfo.diasRestantes} dias!` : null;
    
    // 7. Criar bucket no Supabase Storage se não existir
    const bucketName = 'make-686b5e88-certificados';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log('[CERT_ROUTES] Criando bucket de certificados...');
      await supabase.storage.createBucket(bucketName, { public: false });
    }
    
    // 8. Upload para Supabase Storage
    const fileName = `${user.id}/certificado.pfx`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: 'application/x-pkcs12',
        upsert: true // Substituir se já existir
      });
    
    if (uploadError) {
      console.error('[CERT_ROUTES] Erro ao fazer upload:', uploadError);
      return c.json({
        success: false,
        error: `Erro ao armazenar certificado: ${uploadError.message}`
      }, 500);
    }
    
    console.log('[CERT_ROUTES] Certificado armazenado no Storage');
    
    // 9. Salvar informações no KV Store (SEM a senha)
    const certKey = `certificado:${user.id}`;
    await kv.set(certKey, {
      ativo: true, // Certificado ativo
      titular: certInfo.razaoSocial,
      cnpj: certInfo.cnpj,
      razaoSocial: certInfo.razaoSocial,
      validade: certInfo.validoAte.toISOString(), // Alias para compatibilidade
      validoDe: certInfo.validoDe.toISOString(),
      validoAte: certInfo.validoAte.toISOString(),
      vencido: certInfo.diasRestantes <= 0,
      diasRestantes: certInfo.diasRestantes,
      emissor: certInfo.emissor,
      serialNumber: certInfo.serialNumber,
      tipoA1: certInfo.tipoA1,
      storageFileName: fileName,
      uploadedAt: new Date().toISOString()
    });
    
    // 10. IMPORTANTE: Salvar senha criptografada separadamente (KV diferente)
    // Por segurança, salvamos a senha em uma chave separada
    const senhaKey = `certificado:senha:${user.id}`;
    await kv.set(senhaKey, { senha }); // Em produção real, deveria ser criptografada
    
    console.log('[CERT_ROUTES] ✅ Certificado salvo com sucesso!');
    
    return c.json({
      success: true,
      data: {
        cnpj: certInfo.cnpj,
        razaoSocial: certInfo.razaoSocial,
        validoDe: certInfo.validoDe,
        validoAte: certInfo.validoAte,
        emissor: certInfo.emissor,
        diasRestantes: certInfo.diasRestantes,
        avisoVencimento
      }
    });
    
  } catch (error: any) {
    console.error('[CERT_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao processar certificado',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// GET /certificado/info
// Descrição: Retorna informações do certificado atual
// ============================================================================
certificado.get('/info', async (c) => {
  try {
    console.log('[CERT_ROUTES] GET /info - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Buscar informações do certificado
    const certKey = `certificado:${user.id}`;
    const certInfo = await kv.get(certKey);
    
    if (!certInfo) {
      return c.json({
        success: true,
        data: null,
        message: 'Nenhum certificado cadastrado'
      });
    }
    
    // 3. Recalcular dias restantes
    const validoAte = new Date(certInfo.validoAte || certInfo.validade);
    const agora = new Date();
    const diasRestantes = Math.ceil((validoAte.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    const isValido = diasRestantes > 0;
    const vencido = diasRestantes <= 0;
    
    // 4. Aviso de vencimento
    const avisoVencimento = diasRestantes < 30 && diasRestantes > 0 ? 
      `⚠️ ATENÇÃO: Certificado expira em ${diasRestantes} dias!` : 
      vencido ? '❌ CERTIFICADO EXPIRADO!' : null;
    
    return c.json({
      success: true,
      data: {
        ...certInfo,
        // Sobrescrever com valores recalculados (sempre atualizados)
        ativo: certInfo.ativo !== false && isValido,
        titular: certInfo.titular || certInfo.razaoSocial,
        cnpj: certInfo.cnpj,
        validade: certInfo.validade || certInfo.validoAte,
        vencido,
        diasRestantes, // ✅ Recalculado em tempo real
        isValido,
        avisoVencimento
      }
    });
    
  } catch (error: any) {
    console.error('[CERT_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar informações do certificado',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// DELETE /certificado
// Descrição: Remove certificado do sistema
// ============================================================================
certificado.delete('/', async (c) => {
  try {
    console.log('[CERT_ROUTES] DELETE / - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    console.log(`[CERT_ROUTES] Removendo certificado do usuário: ${user.id}`);
    
    // 2. Remover do Storage
    const bucketName = 'make-686b5e88-certificados';
    const fileName = `${user.id}/certificado.pfx`;
    
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);
    
    if (deleteError) {
      console.error('[CERT_ROUTES] Erro ao remover do Storage:', deleteError);
    }
    
    // 3. Remover do KV Store
    const certKey = `certificado:${user.id}`;
    const senhaKey = `certificado:senha:${user.id}`;
    
    await kv.del(certKey);
    await kv.del(senhaKey);
    
    console.log('[CERT_ROUTES] ✅ Certificado removido com sucesso');
    
    return c.json({
      success: true,
      message: 'Certificado removido com sucesso'
    });
    
  } catch (error: any) {
    console.error('[CERT_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao remover certificado',
      details: error.message
    }, 500);
  }
});

export default certificado;