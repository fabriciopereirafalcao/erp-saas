/**
 * ===================================================================
 * USERS SERVICE - Gerenciamento de Usuários
 * ===================================================================
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

/**
 * Gera o próximo código sequencial para usuários
 * Formato: USR-001, USR-002, ..., USR-999
 */
async function generateNextUserCode(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('code')
    .eq('company_id', companyId)
    .like('code', 'USR-%')
    .order('code', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[USERS_SERVICE] ⚠️ Erro ao buscar códigos de usuários, gerando código padrão:', error);
    return 'USR-001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    const match = data[0].code.match(/^USR-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }
  
  const nextNumber = maxNumber + 1;
  return `USR-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Buscar todos os usuários da empresa
 */
export async function getUsers(companyId: string) {
  console.log(`[USERS_SERVICE] 📥 getUsers - companyId: ${companyId}`);
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao buscar usuários:', error);
    throw new Error(error.message);
  }
  
  console.log(`[USERS_SERVICE] ✅ ${data?.length || 0} usuários encontrados`);
  return data || [];
}

/**
 * Atualizar dados do usuário
 */
export async function updateUser(userId: string, updates: {
  name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}) {
  console.log(`[USERS_SERVICE] 💾 updateUser - userId: ${userId}`);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao atualizar usuário:', error);
    throw new Error(error.message);
  }
  
  console.log(`[USERS_SERVICE] ✅ Usuário atualizado com sucesso`);
  return { success: true };
}

/**
 * Atualizar apenas o código do usuário (auto-gerar se não tiver)
 */
export async function updateUserCode(companyId: string, userId: string) {
  console.log(`[USERS_SERVICE] 🔢 updateUserCode - userId: ${userId}`);
  const supabase = getSupabaseClient();
  
  // Verificar se já tem código
  const { data: user } = await supabase
    .from('users')
    .select('code')
    .eq('id', userId)
    .single();
  
  if (user?.code) {
    console.log(`[USERS_SERVICE] ℹ️ Usuário já possui código: ${user.code}`);
    return { success: true, code: user.code };
  }
  
  // Gerar novo código
  const newCode = await generateNextUserCode(companyId);
  
  const { error } = await supabase
    .from('users')
    .update({ code: newCode })
    .eq('id', userId);
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao atualizar código do usuário:', error);
    throw new Error(error.message);
  }
  
  console.log(`[USERS_SERVICE] ✅ Código ${newCode} atribuído ao usuário`);
  return { success: true, code: newCode };
}

/**
 * Soft delete - Desativar usuário
 */
export async function deactivateUser(userId: string) {
  console.log(`[USERS_SERVICE] 🚫 deactivateUser - userId: ${userId}`);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao desativar usuário:', error);
    throw new Error(error.message);
  }
  
  console.log(`[USERS_SERVICE] ✅ Usuário desativado com sucesso`);
  return { success: true };
}

/**
 * Reativar usuário (soft delete reverso)
 */
export async function reactivateUser(userId: string) {
  console.log(`[USERS_SERVICE] ♻️ reactivateUser - userId: ${userId}`);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao reativar usuário:', error);
    throw new Error(error.message);
  }
  
  console.log(`[USERS_SERVICE] ✅ Usuário reativado com sucesso`);
  return { success: true };
}

/**
 * Atualizar último login
 */
export async function updateLastLogin(userId: string) {
  console.log(`[USERS_SERVICE] 🕐 updateLastLogin - userId: ${userId}`);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({
      last_login: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error('[USERS_SERVICE] ❌ Erro ao atualizar last_login:', error);
    // Não lançar erro - não é crítico
  }
  
  return { success: true };
}
