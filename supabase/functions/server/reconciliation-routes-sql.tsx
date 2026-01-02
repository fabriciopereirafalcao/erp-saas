/**
 * ================================================================================
 * ROTAS SQL - Conciliação Bancária e Períodos Fechados
 * ================================================================================
 * 
 * SUBSTITUIÇÃO DE ARQUITETURA:
 * - ANTES: companies.settings (JSONB)
 * - DEPOIS: Tabelas SQL dedicadas
 * 
 * TABELAS UTILIZADAS:
 * - bank_reconciliations
 * - financial_closed_periods
 * - closed_period_adjustments
 * - reconciliation_audit_logs
 * 
 * BENEFÍCIOS:
 * - Persistência real entre deploys
 * - Auditoria confiável e imutável
 * - Queries eficientes com índices
 * - Escalabilidade funcional
 * - Conformidade contábil
 * 
 * SEGURANÇA:
 * - RLS (Row Level Security) ativo
 * - Autenticação obrigatória
 * - Isolamento multi-tenant por company_id
 * - Logs imutáveis de auditoria
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Helper para autenticação
async function authenticate(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('[AUTH] Erro ao autenticar:', error?.message);
    return null;
  }

  // Buscar company_id do usuário (tabela users)
  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .limit(1)
    .single();

  if (roleError || !userData) {
    console.error('[AUTH] Erro ao buscar company_id:', roleError?.message);
    return null;
  }

  return {
    userId: user.id,
    userEmail: user.email,
    companyId: userData.company_id,
    role: userData.role
  };
}

// Helper para criar cliente Supabase
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// ================================================================================
// ROTAS - BANK RECONCILIATIONS
// ================================================================================

/**
 * GET /bank-reconciliations
 * Lista todas as conciliações da empresa
 */
app.get('/bank-reconciliations', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('bank_reconciliations')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('reference_date', { ascending: false });

    if (error) {
      console.error('[RECONCILIATIONS] Erro ao buscar:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[RECONCILIATIONS] ✅ ${data?.length || 0} conciliações carregadas`);
    return c.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[RECONCILIATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /bank-reconciliations/set-status
 * Define status de conciliação para uma data específica
 */
app.post('/bank-reconciliations/set-status', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { bankAccountId, referenceDate, status, confirmedBalance, expectedBalance, difference, transactionCount, auditData } = body;

    const supabase = getSupabaseClient();

    // Upsert (insert ou update)
    const { data, error } = await supabase
      .from('bank_reconciliations')
      .upsert({
        company_id: auth.companyId,
        bank_account_id: bankAccountId,
        reference_date: referenceDate,
        status: status ? 'reconciled' : 'open',
        confirmed_balance: confirmedBalance,
        expected_balance: expectedBalance,
        difference: difference,
        transaction_count: transactionCount,
        reconciled_at: status ? new Date().toISOString() : null,
        reconciled_by: status ? auth.userId : null,
        reconciled_by_name: status ? (auditData?.userName || auth.userEmail) : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,bank_account_id,reference_date'
      })
      .select()
      .single();

    if (error) {
      console.error('[RECONCILIATIONS] Erro ao salvar:', error);
      return c.json({ error: error.message }, 500);
    }

    // Se tiver dados de auditoria, criar log
    if (auditData) {
      const reconciliationKey = `${bankAccountId}-${referenceDate}`;
      
      await supabase
        .from('reconciliation_audit_logs')
        .insert({
          company_id: auth.companyId,
          reconciliation_id: data.id,
          reconciliation_key: reconciliationKey,
          bank_account_id: bankAccountId,
          reference_date: referenceDate,
          action: status ? 'reconcile' : 'unconcile',
          confirmed_balance: confirmedBalance,
          expected_balance: expectedBalance,
          difference: difference,
          transaction_count: transactionCount,
          reason: auditData.reason,
          transaction_id: auditData.transactionId,
          transaction_description: auditData.transactionDescription,
          transaction_amount: auditData.transactionAmount,
          automatic: auditData.automatic || false,
          user_id: auth.userId,
          user_name: auditData.userName || auth.userEmail,
          timestamp: new Date().toISOString()
        });
    }

    console.log(`[RECONCILIATIONS] ✅ Status salvo: ${status ? 'conciliado' : 'desconciliado'}`);
    return c.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[RECONCILIATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /bank-reconciliations/status/:bankAccountId/:referenceDate
 * Verifica se uma data específica está conciliada
 */
app.get('/bank-reconciliations/status/:bankAccountId/:referenceDate', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { bankAccountId, referenceDate } = c.req.param();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('bank_reconciliations')
      .select('status')
      .eq('company_id', auth.companyId)
      .eq('bank_account_id', bankAccountId)
      .eq('reference_date', referenceDate)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[RECONCILIATIONS] Erro ao verificar status:', error);
      return c.json({ error: error.message }, 500);
    }

    const isReconciled = data?.status === 'reconciled' || data?.status === 'closed';

    return c.json({
      success: true,
      isReconciled: isReconciled,
      status: data?.status || 'open'
    });

  } catch (error) {
    console.error('[RECONCILIATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ================================================================================
// ROTAS - RECONCILIATION AUDIT LOGS
// ================================================================================

/**
 * GET /reconciliation-audit
 * Lista logs de auditoria de conciliações
 */
app.get('/reconciliation-audit', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reconciliation_audit_logs')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[AUDIT] Erro ao buscar logs:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[AUDIT] ✅ ${data?.length || 0} logs carregados`);
    return c.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[AUDIT] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ================================================================================
// ROTAS - FINANCIAL CLOSED PERIODS
// ================================================================================

/**
 * GET /closed-periods
 * Lista períodos fechados da empresa
 */
app.get('/closed-periods', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('financial_closed_periods')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('status', 'closed')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (error) {
      console.error('[CLOSED PERIODS] Erro ao buscar:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[CLOSED PERIODS] ✅ ${data?.length || 0} períodos fechados carregados`);
    return c.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[CLOSED PERIODS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /closed-periods/close
 * Fecha um período contábil
 */
app.post('/closed-periods/close', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { month, year, isFirstPeriod, justification } = body;

    const supabase = getSupabaseClient();

    // Verificar se já existe um período FECHADO (ignorar períodos reabertos)
    const { data: existing } = await supabase
      .from('financial_closed_periods')
      .select('id, status')
      .eq('company_id', auth.companyId)
      .eq('period_month', month)
      .eq('period_year', year)
      .eq('status', 'closed') // ✅ FIX: Filtrar apenas períodos fechados
      .single();

    if (existing) {
      return c.json({ error: 'Período já está fechado' }, 400);
    }
    
    // ✅ NOVO: Se existe período reaberto, atualizar ao invés de inserir
    const { data: reopenedPeriod } = await supabase
      .from('financial_closed_periods')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('period_month', month)
      .eq('period_year', year)
      .eq('status', 'reopened')
      .single();

    let data, error;
    
    if (reopenedPeriod) {
      // Atualizar período reaberto para fechado novamente
      const result = await supabase
        .from('financial_closed_periods')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: auth.userId,
          closed_by_name: auth.userEmail || 'Usuário',
          closed_justification: justification,
          updated_at: new Date().toISOString()
        })
        .eq('id', reopenedPeriod.id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Inserir novo período fechado
      const result = await supabase
        .from('financial_closed_periods')
        .insert({
          company_id: auth.companyId,
          period_month: month,
          period_year: year,
          status: 'closed',
          is_first_period: isFirstPeriod || false,
          closed_at: new Date().toISOString(),
          closed_by: auth.userId,
          closed_by_name: auth.userEmail || 'Usuário',
          closed_justification: justification
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[CLOSED PERIODS] Erro ao fechar período:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[CLOSED PERIODS] ✅ Período ${month}/${year} fechado`);
    return c.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[CLOSED PERIODS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /closed-periods/reopen
 * Reabre um período fechado
 */
app.post('/closed-periods/reopen', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { month, year, justification } = body;

    if (!justification) {
      return c.json({ error: 'Justificativa obrigatória para reabertura' }, 400);
    }

    const supabase = getSupabaseClient();

    // Atualizar período
    const { data, error } = await supabase
      .from('financial_closed_periods')
      .update({
        status: 'reopened',
        reopened_at: new Date().toISOString(),
        reopened_by: auth.userId,
        reopened_by_name: auth.userEmail || 'Usuário',
        reopened_justification: justification,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', auth.companyId)
      .eq('period_month', month)
      .eq('period_year', year)
      .eq('status', 'closed')
      .select()
      .single();

    if (error) {
      console.error('[CLOSED PERIODS] Erro ao reabrir:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[CLOSED PERIODS] ✅ Período ${month}/${year} reaberto`);
    return c.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[CLOSED PERIODS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /closed-periods/check/:year/:month
 * Verifica se um período está fechado
 */
app.get('/closed-periods/check/:year/:month', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { year, month } = c.req.param();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('financial_closed_periods')
      .select('status')
      .eq('company_id', auth.companyId)
      .eq('period_year', parseInt(year))
      .eq('period_month', parseInt(month))
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[CLOSED PERIODS] Erro ao verificar:', error);
      return c.json({ error: error.message }, 500);
    }

    const isClosed = data?.status === 'closed';

    return c.json({
      success: true,
      isClosed: isClosed,
      status: data?.status || 'open'
    });

  } catch (error) {
    console.error('[CLOSED PERIODS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ================================================================================
// ROTAS - CLOSED PERIOD ADJUSTMENTS
// ================================================================================

/**
 * GET /closed-period-adjustments
 * Lista ajustes em períodos fechados
 */
app.get('/closed-period-adjustments', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('closed_period_adjustments')
      .select('*, financial_closed_periods(*)')
      .eq('company_id', auth.companyId)
      .order('adjusted_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[ADJUSTMENTS] Erro ao buscar:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[ADJUSTMENTS] ✅ ${data?.length || 0} ajustes carregados`);
    return c.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[ADJUSTMENTS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /closed-period-adjustments/create
 * Registra ajuste autorizado em período fechado
 */
app.post('/closed-period-adjustments/create', async (c) => {
  try {
    const auth = await authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    // Verificar se é admin
    if (auth.role !== 'admin') {
      return c.json({ error: 'Apenas administradores podem criar ajustes' }, 403);
    }

    const body = await c.req.json();
    const { periodId, action, transactionId, transactionDescription, transactionAmount, transactionDate, adminPassword, justification } = body;

    if (!justification) {
      return c.json({ error: 'Justificativa obrigatória' }, 400);
    }

    const supabase = getSupabaseClient();

    // Inserir ajuste (registro imutável)
    const { data, error } = await supabase
      .from('closed_period_adjustments')
      .insert({
        company_id: auth.companyId,
        period_id: periodId,
        action: action,
        transaction_id: transactionId,
        transaction_description: transactionDescription,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        admin_user_id: auth.userId,
        admin_user_name: auth.userEmail || 'Admin',
        admin_password_hash: adminPassword, // TODO: Hash properly
        justification: justification,
        adjusted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[ADJUSTMENTS] Erro ao criar ajuste:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[ADJUSTMENTS] ✅ Ajuste registrado: ${action} em ${transactionDate}`);
    return c.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[ADJUSTMENTS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ================================================================================
// ROTA DE SAÚDE
// ================================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Reconciliation Routes (SQL)',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL (Tabelas SQL)',
    tables: [
      'bank_reconciliations',
      'financial_closed_periods',
      'closed_period_adjustments',
      'reconciliation_audit_logs'
    ]
  });
});

export default app;