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
 * 
 * SEGURANÇA:
 * - Backend NUNCA confia no frontend
 * - Validação server-side obrigatória
 * - Logs detalhados de auditoria
 */

import { Hono } from 'npm:hono@4.6.14';
import * as kv from './kv_store.tsx';
import { createTransactionPolicy } from './FinancialTransactionPolicy.ts';

const app = new Hono();

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
// HELPER - Buscar períodos fechados
// ================================================================================
const getClosedPeriods = async (): Promise<any[]> => {
  const periods = await kv.getByPrefix('closed-period-');
  return periods.map(p => p.value);
};

// ================================================================================
// HELPER - Buscar datas conciliadas
// ================================================================================
const getReconciledDates = async (): Promise<string[]> => {
  const reconciliationStatus = await kv.get('reconciliationStatus');
  if (!reconciliationStatus) return [];

  return Object.keys(reconciliationStatus)
    .filter(key => reconciliationStatus[key] === true);
};

// ================================================================================
// HELPER - Gerar ID
// ================================================================================
const generateId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ================================================================================
// POST /cancel - Cancelar transação (soft delete)
// ================================================================================
app.post('/cancel', async (c) => {
  try {
    const body = await c.req.json();
    const { transactionId, reason, userId, userName } = body;

    console.log(`📝 [CANCEL] Solicitação de cancelamento - Transação: ${transactionId}`);

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

    // Buscar transação
    const transaction = await kv.get(`transaction-${transactionId}`);
    if (!transaction) {
      return c.json({
        success: false,
        error: 'Transação não encontrada'
      }, 404);
    }

    // Buscar dados para policy
    const closedPeriods = await getClosedPeriods();
    const reconciledDates = await getReconciledDates();

    // ✅ VALIDAÇÃO DE POLICY
    const policy = createTransactionPolicy(
      transaction,
      { id: userId, email: '', name: userName },
      closedPeriods,
      reconciledDates
    );

    const canCancelResult = policy.canCancel();
    if (!canCancelResult.allowed) {
      console.warn(`⚠️ [CANCEL] Policy bloqueou cancelamento: ${canCancelResult.reason}`);
      return c.json({
        success: false,
        error: canCancelResult.reason
      }, 403);
    }

    // ✅ EXECUTAR CANCELAMENTO (SOFT DELETE)
    const now = new Date().toISOString();
    
    transaction.administrativeStatus = 'CANCELADA';
    transaction.cancelledBy = userId;
    transaction.cancelledByName = userName;
    transaction.cancelledAt = now;
    transaction.cancellationReason = reason;

    // Salvar transação atualizada
    await kv.set(`transaction-${transactionId}`, transaction);

    console.log(`✅ [CANCEL] Transação ${transactionId} cancelada com sucesso`);
    console.log(`   👤 Usuário: ${userName} (${userId})`);
    console.log(`   📝 Motivo: ${reason}`);

    return c.json({
      success: true,
      message: 'Transação cancelada com sucesso',
      transaction
    });

  } catch (error) {
    console.error('❌ [CANCEL] Erro ao cancelar transação:', error);
    return c.json({
      success: false,
      error: `Erro interno: ${error.message}`
    }, 500);
  }
});

// ================================================================================
// POST /substitute - Substituir transação
// ================================================================================
app.post('/substitute', async (c) => {
  try {
    const body = await c.req.json();
    const { oldTransactionId, newTransactionData, reason, userId, userName } = body;

    console.log(`🔄 [SUBSTITUTE] Solicitação de substituição - Transação: ${oldTransactionId}`);

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

    // Buscar transação antiga
    const oldTransaction = await kv.get(`transaction-${oldTransactionId}`);
    if (!oldTransaction) {
      return c.json({
        success: false,
        error: 'Transação não encontrada'
      }, 404);
    }

    // Buscar dados para policy
    const closedPeriods = await getClosedPeriods();
    const reconciledDates = await getReconciledDates();

    // ✅ VALIDAÇÃO DE POLICY
    const policy = createTransactionPolicy(
      oldTransaction,
      { id: userId, email: '', name: userName },
      closedPeriods,
      reconciledDates
    );

    const canSubstituteResult = policy.canSubstitute();
    if (!canSubstituteResult.allowed) {
      console.warn(`⚠️ [SUBSTITUTE] Policy bloqueou substituição: ${canSubstituteResult.reason}`);
      return c.json({
        success: false,
        error: canSubstituteResult.reason
      }, 403);
    }

    // ✅ CRIAR NOVA TRANSAÇÃO
    const now = new Date().toISOString();
    const newId = generateId();

    const newTransaction = {
      ...newTransactionData,
      id: newId,
      
      // ✅ HERDA vínculo com pedido (CRÍTICO)
      origin: oldTransaction.origin,
      reference: oldTransaction.reference,
      
      // ✅ Nova transação nasce ATIVA
      administrativeStatus: 'ATIVA',
      
      // ✅ Vínculo de substituição
      substitutes: oldTransactionId,
      
      // Metadados
      createdBy: userId,
      createdByName: userName,
      createdAt: now
    };

    // ✅ MARCAR ANTIGA COMO SUBSTITUÍDA
    oldTransaction.administrativeStatus = 'SUBSTITUIDA';
    oldTransaction.substitutedBy = newId;
    oldTransaction.substitutedByName = userName;
    oldTransaction.substitutedAt = now;
    oldTransaction.substitutionReason = reason;

    // Salvar ambas as transações
    await kv.set(`transaction-${newId}`, newTransaction);
    await kv.set(`transaction-${oldTransactionId}`, oldTransaction);

    console.log(`✅ [SUBSTITUTE] Substituição concluída`);
    console.log(`   ❌ Antiga: ${oldTransactionId} → SUBSTITUIDA`);
    console.log(`   ✅ Nova: ${newId} → ATIVA`);
    console.log(`   🔗 Origem: ${oldTransaction.origin}${oldTransaction.reference ? ` (Pedido: ${oldTransaction.reference})` : ''}`);
    console.log(`   👤 Usuário: ${userName} (${userId})`);
    console.log(`   📝 Motivo: ${reason}`);

    return c.json({
      success: true,
      message: 'Transação substituída com sucesso',
      oldTransaction,
      newTransaction
    });

  } catch (error) {
    console.error('❌ [SUBSTITUTE] Erro ao substituir transação:', error);
    return c.json({
      success: false,
      error: `Erro interno: ${error.message}`
    }, 500);
  }
});

export default app;
