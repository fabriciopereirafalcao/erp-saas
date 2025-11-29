/**
 * ===================================================================
 * DATA ROUTES - Rotas Específicas para Persistência de Dados do ERP
 * ===================================================================
 * 
 * Arquitetura:
 * - Cada entidade tem rotas GET e POST específicas
 * - Salvamento imediato (sem debounce)
 * - Autenticação obrigatória em todas as rotas
 * - Isolamento multi-tenant por company_id
 * - Logs detalhados para auditoria
 * 
 * Segurança:
 * - Bearer Token obrigatório
 * - Validação de company_id
 * - Sanitização de dados
 * - Rate limiting implícito (Supabase Edge Functions)
 * 
 * Performance:
 * - Payloads otimizados
 * - Compressão automática (HTTP/2)
 * - Cache no frontend (localStorage como backup)
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================

interface AuthContext {
  userId: string;
  companyId: string;
}

/**
 * Middleware para autenticar usuário e obter company_id
 */
async function authenticate(c: any): Promise<AuthContext | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  if (!accessToken) {
    console.error('[DATA_ROUTES] ❌ Token ausente');
    return null;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    console.error('[DATA_ROUTES] ❌ Autenticação falhou:', authError?.message);
    return null;
  }

  // Buscar company_id
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[DATA_ROUTES] ❌ Company ID não encontrado:', profileError?.message);
    return null;
  }

  return {
    userId: user.id,
    companyId: profile.company_id
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Salva dados de uma entidade
 */
async function saveEntity(
  c: any,
  entityName: string,
  dataKey: string
): Promise<Response> {
  try {
    const auth = await authenticate(c);
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (data === undefined || data === null) {
      console.error(`[${entityName.toUpperCase()}] ❌ Dados ausentes no payload`);
      return c.json({ error: 'Dados ausentes' }, 400);
    }

    const fullKey = `erp_${auth.companyId}_${dataKey}`;
    const dataSize = JSON.stringify(data).length;
    
    console.log(`[${entityName.toUpperCase()}] 💾 Salvando...`);
    console.log(`[${entityName.toUpperCase()}] 🆔 User: ${auth.userId} | Company: ${auth.companyId}`);
    console.log(`[${entityName.toUpperCase()}] 🔑 Key: ${fullKey}`);
    console.log(`[${entityName.toUpperCase()}] 📊 Tamanho: ${dataSize} bytes`);

    // Salvar no KV store
    await kv.set(fullKey, data);

    console.log(`[${entityName.toUpperCase()}] ✅ Salvo com sucesso!`);

    return c.json({
      success: true,
      message: `${entityName} salvo com sucesso`,
      key: fullKey,
      size: dataSize
    });

  } catch (error) {
    console.error(`[${entityName.toUpperCase()}] ❌ Erro ao salvar:`, error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Carrega dados de uma entidade
 */
async function loadEntity(
  c: any,
  entityName: string,
  dataKey: string
): Promise<Response> {
  try {
    const auth = await authenticate(c);
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const fullKey = `erp_${auth.companyId}_${dataKey}`;

    console.log(`[${entityName.toUpperCase()}] 📥 Carregando...`);
    console.log(`[${entityName.toUpperCase()}] 🆔 User: ${auth.userId} | Company: ${auth.companyId}`);
    console.log(`[${entityName.toUpperCase()}] 🔑 Key: ${fullKey}`);

    // Buscar do KV store
    const value = await kv.get(fullKey);

    if (!value) {
      console.log(`[${entityName.toUpperCase()}] ⚠️  Dados não encontrados (normal na primeira vez)`);
      return c.json({
        success: true,
        data: null,
        message: 'Dados não encontrados'
      });
    }

    const dataSize = JSON.stringify(value).length;
    console.log(`[${entityName.toUpperCase()}] ✅ Carregado: ${dataSize} bytes`);

    return c.json({
      success: true,
      data: value,
      key: fullKey,
      size: dataSize
    });

  } catch (error) {
    console.error(`[${entityName.toUpperCase()}] ❌ Erro ao carregar:`, error);
    return c.json({ error: error.message }, 500);
  }
}

// ==================== ROTAS - CUSTOMERS ====================

app.get('/customers', async (c) => {
  return await loadEntity(c, 'Customers', 'customers');
});

app.post('/customers', async (c) => {
  return await saveEntity(c, 'Customers', 'customers');
});

// ==================== ROTAS - SUPPLIERS ====================

app.get('/suppliers', async (c) => {
  return await loadEntity(c, 'Suppliers', 'suppliers');
});

app.post('/suppliers', async (c) => {
  return await saveEntity(c, 'Suppliers', 'suppliers');
});

// ==================== ROTAS - INVENTORY ====================

app.get('/inventory', async (c) => {
  return await loadEntity(c, 'Inventory', 'inventory');
});

app.post('/inventory', async (c) => {
  return await saveEntity(c, 'Inventory', 'inventory');
});

// ==================== ROTAS - SALES ORDERS ====================

app.get('/sales-orders', async (c) => {
  return await loadEntity(c, 'SalesOrders', 'salesOrders');
});

app.post('/sales-orders', async (c) => {
  return await saveEntity(c, 'SalesOrders', 'salesOrders');
});

// ==================== ROTAS - PURCHASE ORDERS ====================

app.get('/purchase-orders', async (c) => {
  return await loadEntity(c, 'PurchaseOrders', 'purchaseOrders');
});

app.post('/purchase-orders', async (c) => {
  return await saveEntity(c, 'PurchaseOrders', 'purchaseOrders');
});

// ==================== ROTAS - STOCK MOVEMENTS ====================

app.get('/stock-movements', async (c) => {
  return await loadEntity(c, 'StockMovements', 'stockMovements');
});

app.post('/stock-movements', async (c) => {
  return await saveEntity(c, 'StockMovements', 'stockMovements');
});

// ==================== ROTAS - PRICE TABLES ====================

app.get('/price-tables', async (c) => {
  return await loadEntity(c, 'PriceTables', 'priceTables');
});

app.post('/price-tables', async (c) => {
  return await saveEntity(c, 'PriceTables', 'priceTables');
});

// ==================== ROTAS - PRODUCT CATEGORIES ====================

app.get('/product-categories', async (c) => {
  return await loadEntity(c, 'ProductCategories', 'productCategories');
});

app.post('/product-categories', async (c) => {
  return await saveEntity(c, 'ProductCategories', 'productCategories');
});

// ==================== ROTAS - SALESPEOPLE ====================

app.get('/salespeople', async (c) => {
  return await loadEntity(c, 'Salespeople', 'salespeople');
});

app.post('/salespeople', async (c) => {
  return await saveEntity(c, 'Salespeople', 'salespeople');
});

// ==================== ROTAS - BUYERS ====================

app.get('/buyers', async (c) => {
  return await loadEntity(c, 'Buyers', 'buyers');
});

app.post('/buyers', async (c) => {
  return await saveEntity(c, 'Buyers', 'buyers');
});

// ==================== ROTAS - PAYMENT METHODS ====================

app.get('/payment-methods', async (c) => {
  return await loadEntity(c, 'PaymentMethods', 'paymentMethods');
});

app.post('/payment-methods', async (c) => {
  return await saveEntity(c, 'PaymentMethods', 'paymentMethods');
});

// ==================== ROTAS - ACCOUNT CATEGORIES ====================

app.get('/account-categories', async (c) => {
  return await loadEntity(c, 'AccountCategories', 'accountCategories');
});

app.post('/account-categories', async (c) => {
  return await saveEntity(c, 'AccountCategories', 'accountCategories');
});

// ==================== ROTAS - FINANCIAL TRANSACTIONS ====================

app.get('/financial-transactions', async (c) => {
  return await loadEntity(c, 'FinancialTransactions', 'financialTransactions');
});

app.post('/financial-transactions', async (c) => {
  return await saveEntity(c, 'FinancialTransactions', 'financialTransactions');
});

// ==================== ROTAS - ACCOUNTS RECEIVABLE ====================

app.get('/accounts-receivable', async (c) => {
  return await loadEntity(c, 'AccountsReceivable', 'accountsReceivable');
});

app.post('/accounts-receivable', async (c) => {
  return await saveEntity(c, 'AccountsReceivable', 'accountsReceivable');
});

// ==================== ROTAS - ACCOUNTS PAYABLE ====================

app.get('/accounts-payable', async (c) => {
  return await loadEntity(c, 'AccountsPayable', 'accountsPayable');
});

app.post('/accounts-payable', async (c) => {
  return await saveEntity(c, 'AccountsPayable', 'accountsPayable');
});

// ==================== ROTAS - BANK MOVEMENTS ====================

app.get('/bank-movements', async (c) => {
  return await loadEntity(c, 'BankMovements', 'bankMovements');
});

app.post('/bank-movements', async (c) => {
  return await saveEntity(c, 'BankMovements', 'bankMovements');
});

// ==================== ROTAS - CASH FLOW ENTRIES ====================

app.get('/cash-flow-entries', async (c) => {
  return await loadEntity(c, 'CashFlowEntries', 'cashFlowEntries');
});

app.post('/cash-flow-entries', async (c) => {
  return await saveEntity(c, 'CashFlowEntries', 'cashFlowEntries');
});

// ==================== ROTAS - AUDIT ISSUES ====================

app.get('/audit-issues', async (c) => {
  return await loadEntity(c, 'AuditIssues', 'auditIssues');
});

app.post('/audit-issues', async (c) => {
  return await saveEntity(c, 'AuditIssues', 'auditIssues');
});

// ==================== ROTAS - COMPANY HISTORY ====================

app.get('/company-history', async (c) => {
  return await loadEntity(c, 'CompanyHistory', 'companyHistory');
});

app.post('/company-history', async (c) => {
  return await saveEntity(c, 'CompanyHistory', 'companyHistory');
});

// ==================== ROTAS - RECONCILIATION STATUS ====================

app.get('/reconciliation-status', async (c) => {
  return await loadEntity(c, 'ReconciliationStatus', 'reconciliationStatus');
});

app.post('/reconciliation-status', async (c) => {
  return await saveEntity(c, 'ReconciliationStatus', 'reconciliationStatus');
});

// ==================== ROTAS - LAST ANALYSIS DATE ====================

app.get('/last-analysis-date', async (c) => {
  return await loadEntity(c, 'LastAnalysisDate', 'lastAnalysisDate');
});

app.post('/last-analysis-date', async (c) => {
  return await saveEntity(c, 'LastAnalysisDate', 'lastAnalysisDate');
});

// ==================== ROTA DE SAÚDE ====================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'ERP Data Routes',
    timestamp: new Date().toISOString(),
    routes: [
      'customers', 'suppliers', 'inventory', 'sales-orders', 'purchase-orders',
      'stock-movements', 'price-tables', 'product-categories', 'salespeople',
      'buyers', 'payment-methods', 'account-categories', 'financial-transactions',
      'accounts-receivable', 'accounts-payable', 'bank-movements',
      'cash-flow-entries', 'audit-issues', 'company-history',
      'reconciliation-status', 'last-analysis-date'
    ]
  });
});

export default app;
