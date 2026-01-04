/**
 * ================================================================================
 * BACKEND - Financial Transaction Routes (Governança de Transações)
 * ================================================================================
 * 
 * RESPONSABILIDADE:
 * - Rotas para cancelamento e substituição de transações financeiras
 * - Validação LGPD (dados sensíveis em motivos)
 * - Aplicação de FinancialTransactionPolicy
 * - Registro de auditoria completo
 * 
 * ROTAS:
 * - POST /cancel - Cancelar transação (soft delete)
 * - POST /substitute - Substituir transação
 * - POST /reverse-settlement - Estornar liquidação de transação
 * 
 * SEGURANÇA:
 * - Backend NUNCA confia no frontend
 * - Validação server-side obrigatória
 * - Logs detalhados de auditoria
 * 
 * ARQUITETURA:
 * - Transações são salvas no Postgres (tabela financial_transactions)
 * - Usa sqlService para autenticação e isolamento multi-tenant
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import { sqlService } from './services/sql-service.ts';

const app = new Hono();

// Helper para obter Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// ================================================================================
// HELPER - Validar se string é UUID válido
// ================================================================================
const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// ================================================================================
// HELPER - Validação de motivo (LGPD)
// ================================================================================
const validateReason = (reason: string): { valid: boolean; error?: string } => {
  // Limite de caracteres
  if (!reason || reason.trim().length === 0) {
    return {
      valid: false,
      error: 'Motivo é obrigatório'
    };
  }

  if (reason.length > 200) {
    return {
      valid: false,
      error: 'Motivo deve ter no máximo 200 caracteres'
    };
  }

  // Evitar dados sensíveis (regex básico)
  const sensitivePatternsRegex = /\b(cpf|rg|cnpj|senha|cartão|cartao|banco|conta|agencia|agência)\b/i;
  if (sensitivePatternsRegex.test(reason)) {
    return {
      valid: false,
      error: 'Motivo não deve conter dados pessoais sensíveis (CPF, RG, senhas, etc.)'
    };
  }

  return { valid: true };
};

// ================================================================================
// HELPER - Converter dados do Postgres para formato frontend
// ================================================================================
const convertTransactionToFrontend = (row: any) => {
  return {
    id: row.sku || row.id,
    type: row.type === 'income' ? 'Receita' : 'Despesa',
    category: row.category_name || row.category,
    categoryId: row.category_id,
    categoryName: row.category_name || row.category,
    description: row.description,
    amount: parseFloat(row.amount),
    date: row.transaction_date,
    transactionDate: row.transaction_date,
    dueDate: row.due_date,
    effectiveDate: row.effective_date,
    paymentDate: row.effective_date,
    status: row.status,
    partyType: row.party_type,
    partyId: row.party_id,
    partyName: row.party_name,
    paymentMethod: row.payment_method,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    bankAccountId: row.bank_account_id,
    bankAccountName: row.bank_account_name,
    costCenterId: row.cost_center_id,
    costCenterName: row.cost_center_name,
    origin: row.origin || 'Manual',
    reference: row.reference,
    installmentNumber: row.installment_number,
    totalInstallments: row.total_installments,
    administrative_status: row.administrative_status || 'active',
    administrativeStatus: row.administrative_status || 'ATIVA',
    cancellationReason: row.cancellation_reason,
    canceledAt: row.canceled_at,
    canceledBy: row.canceled_by,
    canceledByName: row.canceled_by_name,
    replacedBy: row.replaced_by,
    replaces: row.replaces,
    replacementReason: row.replacement_reason,
    reversalHistory: row.reversal_history || [],
    lastReversedAt: row.last_reversed_at,
    lastReversedBy: row.last_reversed_by,
    reversalReason: row.reversal_reason
  };
};

// ================================================================================
// POST /cancel - Cancelar transação (soft delete)
// ================================================================================
app.post('/cancel', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { transactionId, reason, userId, userName } = body;

    console.log(`📝 [CANCEL] Solicitação de cancelamento - Transação: ${transactionId}, Empresa: ${auth.companyId}`);

    // Validações básicas
    if (!transactionId || !reason || !userId) {
      return c.json({
        success: false,
        error: 'Dados incompletos (transactionId, reason, userId obrigatórios)'
      }, 400);
    }

    // ✅ VALIDAÇÃO LGPD - Motivo
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      console.warn(`⚠️ [CANCEL] Validação de motivo falhou: ${reasonValidation.error}`);
      return c.json({
        success: false,
        error: reasonValidation.error
      }, 400);
    }

    const supabase = getSupabaseClient();

    // Buscar transação
    const { data: transaction, error: fetchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('sku', transactionId)
      .single();

    if (fetchError || !transaction) {
      console.warn(`⚠️ [CANCEL] Transação não encontrada: ${transactionId}`);
      return c.json({
        success: false,
        error: 'Transação não encontrada'
      }, 404);
    }

    // ✅ VALIDAÇÃO: Apenas transações PENDENTES podem ser canceladas
    const pendingStatuses = ['A Pagar', 'A Receber', 'Vencido'];
    if (!pendingStatuses.includes(transaction.status)) {
      console.warn(`⚠️ [CANCEL] Transação já liquidada. Status: ${transaction.status}`);
      return c.json({
        success: false,
        error: 'Apenas transações pendentes podem ser canceladas'
      }, 400);
    }

    // ✅ VALIDAÇÃO: Transação não pode estar já cancelada
    if (transaction.administrative_status === 'canceled') {
      console.warn(`⚠️ [CANCEL] Transação já cancelada anteriormente`);
      return c.json({
        success: false,
        error: 'Esta transação já foi cancelada'
      }, 400);
    }

    // Atualizar transação (Soft Delete)
    const now = new Date().toISOString();
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('financial_transactions')
      .update({
        administrative_status: 'canceled',
        cancellation_reason: reason,
        canceled_at: now,
        canceled_by: userId,
        canceled_by_name: userName
      })
      .eq('company_id', auth.companyId)
      .eq('sku', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [CANCEL] Erro ao atualizar transação:', updateError);
      return c.json({
        success: false,
        error: 'Erro ao cancelar transação'
      }, 500);
    }

    console.log(`✅ [CANCEL] Transação cancelada com sucesso`);
    console.log(`   🔄 Transação: ${transactionId}`);
    console.log(`   💰 Valor: R$ ${parseFloat(transaction.amount).toFixed(2)}`);
    console.log(`   👤 Usuário: ${userName} (${userId})`);
    console.log(`   📝 Motivo: ${reason}`);

    return c.json({
      success: true,
      message: 'Transação cancelada com sucesso',
      transaction: convertTransactionToFrontend(updatedTransaction)
    });

  } catch (error) {
    console.error('❌ [CANCEL] Erro ao cancelar transação:', error);
    return c.json({
      success: false,
      error: 'Erro ao cancelar transação'
    }, 500);
  }
});

// ================================================================================
// POST /substitute - Substituir transação
// ================================================================================
app.post('/substitute', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { oldTransactionId, newTransactionData, reason, userId, userName } = body;

    console.log(`🔄 [SUBSTITUTE] Solicitação de substituição - Transação: ${oldTransactionId}, Empresa: ${auth.companyId}`);

    // Validações básicas
    if (!oldTransactionId || !newTransactionData || !reason || !userId) {
      return c.json({
        success: false,
        error: 'Dados incompletos'
      }, 400);
    }

    // ✅ VALIDAÇÃO LGPD - Motivo
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      console.warn(`⚠️ [SUBSTITUTE] Validação de motivo falhou: ${reasonValidation.error}`);
      return c.json({
        success: false,
        error: reasonValidation.error
      }, 400);
    }

    const supabase = getSupabaseClient();

    // Buscar transação antiga
    const { data: oldTransaction, error: fetchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('sku', oldTransactionId)
      .single();

    if (fetchError || !oldTransaction) {
      console.warn(`⚠️ [SUBSTITUTE] Transação não encontrada: ${oldTransactionId}`);
      return c.json({
        success: false,
        error: 'Transação não encontrada'
      }, 404);
    }

    // ✅ VALIDAÇÃO: Apenas transações ATIVAS podem ser substituídas
    if (oldTransaction.administrative_status && 
        oldTransaction.administrative_status !== 'active' && 
        oldTransaction.administrative_status !== 'ATIVA') {
      console.warn(`⚠️ [SUBSTITUTE] Transação não está ativa. Status: ${oldTransaction.administrative_status}`);
      return c.json({
        success: false,
        error: 'Apenas transações ativas podem ser substituídas'
      }, 400);
    }

    // Gerar SKU para nova transação
    const now = new Date().toISOString();
    
    // Buscar último SKU para gerar o próximo
    const { data: lastTransaction } = await supabase
      .from('financial_transactions')
      .select('sku')
      .eq('company_id', auth.companyId)
      .like('sku', 'FT-%')
      .order('sku', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (lastTransaction && lastTransaction.length > 0 && lastTransaction[0]?.sku) {
      const match = lastTransaction[0].sku.match(/^FT-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const newSku = `FT-${String(nextNumber).padStart(4, '0')}`;

    // 1. Arquivar transação antiga (soft delete + marca de substituída)
    const { error: updateOldError } = await supabase
      .from('financial_transactions')
      .update({
        administrative_status: 'substituted',
        replacement_reason: reason,
        replaced_by: newSku,
        canceled_at: now,
        canceled_by: userId,
        canceled_by_name: userName
      })
      .eq('company_id', auth.companyId)
      .eq('sku', oldTransactionId);

    if (updateOldError) {
      console.error('❌ [SUBSTITUTE] Erro ao arquivar transação antiga:', updateOldError);
      return c.json({
        success: false,
        error: 'Erro ao arquivar transação antiga'
      }, 500);
    }

    // 2. Criar nova transação
    const newTransactionRow = {
      company_id: auth.companyId,
      sku: newSku,
      type: newTransactionData.type === 'Receita' ? 'income' : 'expense',
      transaction_date: newTransactionData.date || newTransactionData.transactionDate || oldTransaction.transaction_date,
      due_date: newTransactionData.dueDate,
      amount: newTransactionData.amount.toString(),
      status: newTransactionData.status,
      description: newTransactionData.description,
      party_type: newTransactionData.partyType,
      party_id: isValidUUID(newTransactionData.partyId) ? newTransactionData.partyId : null, // ✅ VALIDAR UUID
      party_name: newTransactionData.partyName,
      category: newTransactionData.category || oldTransaction.category,
      category_id: isValidUUID(newTransactionData.categoryId) ? newTransactionData.categoryId : null, // ✅ VALIDAR UUID
      category_name: newTransactionData.categoryName,
      account: newTransactionData.account || oldTransaction.account || '', // ✅ OBRIGATÓRIO (NOT NULL)
      cost_center_id: isValidUUID(newTransactionData.costCenterId) ? newTransactionData.costCenterId : null, // ✅ VALIDAR UUID
      cost_center_name: newTransactionData.costCenterName || null,
      bank_account_id: isValidUUID(newTransactionData.bankAccountId) ? newTransactionData.bankAccountId : null, // ✅ VALIDAR UUID
      bank_account_name: newTransactionData.bankAccountName || null,
      payment_method_id: isValidUUID(newTransactionData.paymentMethodId) ? newTransactionData.paymentMethodId : null, // ✅ VALIDAR UUID
      payment_method_name: newTransactionData.paymentMethodName || null,
      effective_date: newTransactionData.effectiveDate || null,
      origin: newTransactionData.origin || 'Manual',
      reference: newTransactionData.reference || null,
      installment_number: newTransactionData.installmentNumber || null,
      total_installments: newTransactionData.totalInstallments || null,
      administrative_status: 'active',
      replaces: oldTransactionId,
      replacement_reason: reason
    };

    console.log('🔍 [SUBSTITUTE] Dados da nova transação:', JSON.stringify(newTransactionRow, null, 2));

    const { data: newTransaction, error: createError } = await supabase
      .from('financial_transactions')
      .insert(newTransactionRow)
      .select()
      .single();

    if (createError) {
      console.error('❌ [SUBSTITUTE] Erro ao criar nova transação:', createError);
      console.error('❌ [SUBSTITUTE] Detalhes do erro:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      });
      console.error('❌ [SUBSTITUTE] Dados enviados:', JSON.stringify(newTransactionRow, null, 2));
      
      // Rollback: restaurar transação antiga
      await supabase
        .from('financial_transactions')
        .update({
          administrative_status: 'active',
          replacement_reason: null,
          replaced_by: null,
          canceled_at: null,
          canceled_by: null,
          canceled_by_name: null
        })
        .eq('company_id', auth.companyId)
        .eq('sku', oldTransactionId);

      return c.json({
        success: false,
        error: `Erro ao criar nova transação: ${createError.message}`,
        details: createError.details || createError.hint
      }, 500);
    }

    console.log(`✅ [SUBSTITUTE] Substituição concluída`);
    console.log(`   🔄 Transação antiga: ${oldTransactionId} → Nova: ${newSku}`);
    console.log(`   💰 Valor antigo: R$ ${parseFloat(oldTransaction.amount).toFixed(2)} → Novo: R$ ${parseFloat(newTransaction.amount).toFixed(2)}`);
    console.log(`   👤 Usuário: ${userName} (${userId})`);
    console.log(`   📝 Motivo: ${reason}`);

    // Buscar a transação antiga atualizada para retornar
    const { data: oldTransactionUpdated } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('sku', oldTransactionId)
      .single();

    return c.json({
      success: true,
      message: 'Transação substituída com sucesso',
      oldTransaction: convertTransactionToFrontend(oldTransactionUpdated),
      newTransaction: convertTransactionToFrontend(newTransaction)
    });

  } catch (error) {
    console.error('❌ [SUBSTITUTE] Erro ao substituir transação:', error);
    return c.json({
      success: false,
      error: 'Erro ao substituir transação'
    }, 500);
  }
});

// ================================================================================
// POST /reverse-settlement - Estornar liquidação de transação
// ================================================================================
app.post('/reverse-settlement', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { transactionId, reason, userId, userName } = body;

    console.log(`↩️ [REVERSE] Solicitação de estorno de liquidação - Transação: ${transactionId}, Empresa: ${auth.companyId}`);

    // Validações básicas
    if (!transactionId || !reason || !userId) {
      return c.json({
        success: false,
        error: 'Dados incompletos'
      }, 400);
    }

    // ✅ VALIDAÇÃO LGPD - Motivo
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      console.warn(`⚠️ [REVERSE] Validação de motivo falhou: ${reasonValidation.error}`);
      return c.json({
        success: false,
        error: reasonValidation.error
      }, 400);
    }

    const supabase = getSupabaseClient();

    // Buscar transação
    const { data: transaction, error: fetchError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('sku', transactionId)
      .single();

    if (fetchError || !transaction) {
      console.warn(`⚠️ [REVERSE] Transação não encontrada: ${transactionId}`);
      return c.json({
        success: false,
        error: 'Transação não encontrada'
      }, 404);
    }

    // ✅ VALIDAÇÃO: Transação deve estar liquidada
    const liquidatedStatuses = ['Pago', 'Recebido'];
    if (!liquidatedStatuses.includes(transaction.status)) {
      console.warn(`⚠️ [REVERSE] Transação não está liquidada. Status atual: ${transaction.status}`);
      return c.json({
        success: false,
        error: 'Apenas transações liquidadas podem ter estorno de liquidação'
      }, 400);
    }

    // ✅ VALIDAÇÃO: Transação deve estar ATIVA
    if (transaction.administrative_status && 
        transaction.administrative_status !== 'active' &&
        transaction.administrative_status !== 'ATIVA') {
      console.warn(`⚠️ [REVERSE] Transação não está ativa. Status: ${transaction.administrative_status}`);
      return c.json({
        success: false,
        error: 'Apenas transações ativas podem ter estorno de liquidação'
      }, 400);
    }

    // Determinar novo status (volta para pendente)
    const now = new Date();
    const dueDate = new Date(transaction.due_date);
    let newStatus: string;
    
    if (transaction.type === 'income') {
      newStatus = now > dueDate ? 'Vencido' : 'A Receber';
    } else {
      newStatus = now > dueDate ? 'Vencido' : 'A Pagar';
    }

    // Guardar dados da liquidação original
    const originalSettlement = {
      status: transaction.status,
      effectiveDate: transaction.effective_date,
      paymentMethod: transaction.payment_method,
      paymentMethodId: transaction.payment_method_id,
      paymentMethodName: transaction.payment_method_name,
      bankAccountId: transaction.bank_account_id,
      bankAccountName: transaction.bank_account_name
    };

    // Adicionar ao histórico de estornos
    const reversalHistory = transaction.reversal_history || [];
    reversalHistory.push({
      reversedAt: now.toISOString(),
      reversedBy: userId,
      reversedByName: userName,
      reason: reason,
      originalSettlement: originalSettlement
    });

    // Reverter liquidação
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('financial_transactions')
      .update({
        status: newStatus,
        effective_date: null,
        payment_method: null,
        payment_method_id: null,
        payment_method_name: null,
        bank_account_id: null,
        bank_account_name: null,
        reversal_history: reversalHistory,
        last_reversed_at: now.toISOString(),
        last_reversed_by: userId,
        reversal_reason: reason
      })
      .eq('company_id', auth.companyId)
      .eq('sku', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [REVERSE] Erro ao estornar liquidação:', updateError);
      return c.json({
        success: false,
        error: 'Erro ao estornar liquidação'
      }, 500);
    }

    console.log(`✅ [REVERSE] Estorno de liquidação concluído`);
    console.log(`   🔄 Transação: ${transactionId}`);
    console.log(`   📊 Status: ${originalSettlement.status} → ${newStatus}`);
    console.log(`   💰 Valor: R$ ${parseFloat(transaction.amount).toFixed(2)}`);
    console.log(`   👤 Usuário: ${userName} (${userId})`);
    console.log(`   📝 Motivo: ${reason}`);

    return c.json({
      success: true,
      message: 'Liquidação estornada com sucesso',
      transaction: convertTransactionToFrontend(updatedTransaction)
    });

  } catch (error) {
    console.error('❌ [REVERSE] Erro ao estornar liquidação:', error);
    return c.json({
      success: false,
      error: 'Erro ao estornar liquidação'
    }, 500);
  }
});

export default app;