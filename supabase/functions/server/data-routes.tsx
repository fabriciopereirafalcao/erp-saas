/**
 * ===================================================================
 * DATA ROUTES - Rotas Específicas para Persistência de Dados do ERP
 * ===================================================================
 * 
 * Arquitetura:
 * - Cada entidade tem rotas GET e POST específicas
 * - Salvamento direto no PostgreSQL (substituindo KV Store)
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
 * - Queries SQL otimizadas
 * - Indexes no banco de dados
 * - RLS para isolamento
 */

import { Hono } from 'npm:hono@4.6.14';
import { sqlService } from './services/sql-service.ts';
import { sqlServiceExtended } from './services/sql-service-extended.ts';
import * as dreService from './services/dre-service.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

console.log('🔧 [DATA-ROUTES] Módulo carregado - inicializando rotas...');

const app = new Hono();

console.log('🔧 [DATA-ROUTES] Hono app criado com sucesso');

// ==================== ROTAS - CUSTOMERS ====================

app.get('/customers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[CUSTOMERS] 📥 Carregando customers da empresa ${auth.companyId}`);
    const customers = await sqlService.getCustomers(auth.companyId);
    
    console.log(`[CUSTOMERS] ✅ ${customers.length} customers carregados`);
    return c.json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('[CUSTOMERS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/customers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[CUSTOMERS] 💾 Salvando ${data.length} customers para empresa ${auth.companyId}`);
    const result = await sqlService.saveCustomers(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} customers salvos com sucesso`
    });

  } catch (error) {
    console.error('[CUSTOMERS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - SUPPLIERS ====================

app.get('/suppliers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[SUPPLIERS] 📥 Carregando suppliers da empresa ${auth.companyId}`);
    const suppliers = await sqlService.getSuppliers(auth.companyId);
    
    console.log(`[SUPPLIERS] ✅ ${suppliers.length} suppliers carregados`);
    return c.json({
      success: true,
      data: suppliers
    });

  } catch (error) {
    console.error('[SUPPLIERS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/suppliers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[SUPPLIERS] 💾 Salvando ${data.length} suppliers para empresa ${auth.companyId}`);
    const result = await sqlService.saveSuppliers(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} suppliers salvos com sucesso`
    });

  } catch (error) {
    console.error('[SUPPLIERS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - INVENTORY ====================

app.get('/inventory', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[INVENTORY] 📥 Carregando products da empresa ${auth.companyId}`);
    const products = await sqlService.getProducts(auth.companyId);
    
    console.log(`[INVENTORY] ✅ ${products.length} products carregados`);
    return c.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('[INVENTORY] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/inventory', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[INVENTORY] 💾 Salvando ${data.length} products para empresa ${auth.companyId}`);
    const result = await sqlService.saveProducts(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} products salvos com sucesso`
    });

  } catch (error) {
    console.error('[INVENTORY] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - SALES ORDERS ====================

// ✅ NOVA ROTA: Criar pedido único com SKU gerado imediatamente
app.post('/create-sales-order', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { orderData, isExceptional } = body;
    
    if (!orderData || typeof orderData !== 'object') {
      console.error('[CREATE SALES ORDER] ❌ Dados inválidos recebidos:', body);
      return c.json({ error: 'orderData deve ser um objeto' }, 400);
    }

    console.log(`[CREATE SALES ORDER] ➕ Criando novo sales order para empresa ${auth.companyId}`);
    console.log(`[CREATE SALES ORDER] 📦 Is Exceptional: ${isExceptional}`);
    
    // Adicionar flag isExceptional aos dados do pedido
    const dataWithFlags = {
      ...orderData,
      isExceptionalOrder: isExceptional || false
    };
    
    const createdOrder = await sqlServiceExtended.createSalesOrder(auth.companyId, dataWithFlags);
    
    console.log(`[CREATE SALES ORDER] ✅ Sales order criado: ${createdOrder.id}`);
    return c.json(createdOrder);

  } catch (error) {
    console.error('[CREATE SALES ORDER] ❌ Erro ao criar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ✅ NOVA ROTA: Criar pedido de compra único com SKU gerado imediatamente
app.post('/create-purchase-order', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { orderData, isExceptional } = body;
    
    if (!orderData || typeof orderData !== 'object') {
      console.error('[CREATE PURCHASE ORDER] ❌ Dados inválidos recebidos:', body);
      return c.json({ error: 'orderData deve ser um objeto' }, 400);
    }

    console.log(`[CREATE PURCHASE ORDER] ➕ Criando novo purchase order para empresa ${auth.companyId}`);
    console.log(`[CREATE PURCHASE ORDER] 📦 Is Exceptional: ${isExceptional}`);
    
    // Adicionar flag isExceptional aos dados do pedido
    const dataWithFlags = {
      ...orderData,
      isExceptionalOrder: isExceptional || false
    };
    
    const createdOrder = await sqlServiceExtended.createPurchaseOrder(auth.companyId, dataWithFlags);
    
    console.log(`[CREATE PURCHASE ORDER] ✅ Purchase order criado: ${createdOrder.id}`);
    return c.json(createdOrder);

  } catch (error) {
    console.error('[CREATE PURCHASE ORDER] ❌ Erro ao criar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ✅ NOVA ROTA: Criar transação financeira única com SKU gerado imediatamente
app.post('/create-financial-transaction', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    const { transactionData } = body;
    
    if (!transactionData || typeof transactionData !== 'object') {
      console.error('[CREATE FINANCIAL TRANSACTION] ❌ Dados inválidos recebidos:', body);
      return c.json({ error: 'transactionData deve ser um objeto' }, 400);
    }

    console.log(`[CREATE FINANCIAL TRANSACTION] ➕ Criando nova transação financeira para empresa ${auth.companyId}`);
    
    const createdTransaction = await sqlServiceExtended.createFinancialTransaction(auth.companyId, transactionData);
    
    console.log(`[CREATE FINANCIAL TRANSACTION] ✅ Transação criada: ${createdTransaction.id} (SKU: ${createdTransaction.sku})`);
    return c.json(createdTransaction);

  } catch (error) {
    console.error('[CREATE FINANCIAL TRANSACTION] ❌ Erro ao criar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/sales-orders', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[SALES ORDERS] 📥 Carregando sales orders da empresa ${auth.companyId}`);
    const salesOrders = await sqlServiceExtended.getSalesOrders(auth.companyId);
    
    console.log(`[SALES ORDERS] ✅ ${salesOrders.length} sales orders carregados`);
    return c.json({
      success: true,
      data: salesOrders
    });

  } catch (error) {
    console.error('[SALES ORDERS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/sales-orders', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[SALES ORDERS] 💾 Salvando ${data.length} sales orders para empresa ${auth.companyId}`);
    const result = await sqlServiceExtended.saveSalesOrders(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} sales orders salvos com sucesso`
    });

  } catch (error) {
    console.error('[SALES ORDERS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PURCHASE ORDERS ====================

app.get('/purchase-orders', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[PURCHASE ORDERS] 📥 Carregando purchase orders da empresa ${auth.companyId}`);
    const purchaseOrders = await sqlService.getPurchaseOrders(auth.companyId);
    
    console.log(`[PURCHASE ORDERS] ✅ ${purchaseOrders.length} purchase orders carregados`);
    return c.json({
      success: true,
      data: purchaseOrders
    });

  } catch (error) {
    console.error('[PURCHASE ORDERS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/purchase-orders', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[PURCHASE ORDERS] 💾 Salvando ${data.length} purchase orders para empresa ${auth.companyId}`);
    const result = await sqlService.savePurchaseOrders(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} purchase orders salvos com sucesso`
    });

  } catch (error) {
    console.error('[PURCHASE ORDERS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - STOCK MOVEMENTS ====================

app.get('/stock-movements', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[STOCK MOVEMENTS] 📥 Carregando stock movements da empresa ${auth.companyId}`);
    const stockMovements = await sqlService.getStockMovements(auth.companyId);
    
    console.log(`[STOCK MOVEMENTS] ✅ ${stockMovements.length} stock movements carregados`);
    return c.json({
      success: true,
      data: stockMovements
    });

  } catch (error) {
    console.error('[STOCK MOVEMENTS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/stock-movements', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[STOCK MOVEMENTS] 💾 Salvando ${data.length} stock movements para empresa ${auth.companyId}`);
    const result = await sqlService.saveStockMovements(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} stock movements salvos com sucesso`
    });

  } catch (error) {
    console.error('[STOCK MOVEMENTS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PRICE TABLES ====================

app.get('/price-tables', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[PRICE TABLES] 📥 Carregando price tables da empresa ${auth.companyId}`);
    const priceTables = await sqlService.getPriceTables(auth.companyId);
    
    console.log(`[PRICE TABLES] ✅ ${priceTables.length} price tables carregados`);
    return c.json({
      success: true,
      data: priceTables
    });

  } catch (error) {
    console.error('[PRICE TABLES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/price-tables', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[PRICE TABLES] 💾 Salvando ${data.length} price tables para empresa ${auth.companyId}`);
    const result = await sqlService.savePriceTables(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} price tables salvos com sucesso`
    });

  } catch (error) {
    console.error('[PRICE TABLES] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PRODUCT CATEGORIES ====================

app.get('/product-categories', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[PRODUCT CATEGORIES] 📥 Carregando product categories da empresa ${auth.companyId}`);
    const productCategories = await sqlService.getProductCategories(auth.companyId);
    
    console.log(`[PRODUCT CATEGORIES] ✅ ${productCategories.length} product categories carregados`);
    return c.json({
      success: true,
      data: productCategories
    });

  } catch (error) {
    console.error('[PRODUCT CATEGORIES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/product-categories', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[PRODUCT CATEGORIES] 💾 Salvando ${data.length} product categories para empresa ${auth.companyId}`);
    const result = await sqlService.saveProductCategories(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} product categories salvos com sucesso`
    });

  } catch (error) {
    console.error('[PRODUCT CATEGORIES] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - SALESPEOPLE ====================

app.get('/salespeople', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[SALESPEOPLE] 📥 Carregando salespeople da empresa ${auth.companyId}`);
    const salespeople = await sqlService.getSalespeople(auth.companyId);
    
    console.log(`[SALESPEOPLE] ✅ ${salespeople.length} salespeople carregados`);
    return c.json({
      success: true,
      data: salespeople
    });

  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/salespeople', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[SALESPEOPLE] 💾 Salvando ${data.length} salespeople para empresa ${auth.companyId}`);
    const result = await sqlService.saveSalespeople(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} salespeople salvos com sucesso`
    });

  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - BUYERS ====================

app.get('/buyers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[BUYERS] 📥 Carregando buyers da empresa ${auth.companyId}`);
    const buyers = await sqlService.getBuyers(auth.companyId);
    
    console.log(`[BUYERS] ✅ ${buyers.length} buyers carregados`);
    return c.json({
      success: true,
      data: buyers
    });

  } catch (error) {
    console.error('[BUYERS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/buyers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[BUYERS] 💾 Salvando ${data.length} buyers para empresa ${auth.companyId}`);
    const result = await sqlService.saveBuyers(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} buyers salvos com sucesso`
    });

  } catch (error) {
    console.error('[BUYERS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PAYMENT METHODS ====================

app.get('/payment-methods', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[PAYMENT METHODS] 📥 Carregando payment methods da empresa ${auth.companyId}`);
    const paymentMethods = await sqlService.getPaymentMethods(auth.companyId);
    
    console.log(`[PAYMENT METHODS] ✅ ${paymentMethods.length} payment methods carregados`);
    return c.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    console.error('[PAYMENT METHODS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/payment-methods', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[PAYMENT METHODS] 💾 Salvando ${data.length} payment methods para empresa ${auth.companyId}`);
    const result = await sqlService.savePaymentMethods(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} payment methods salvos com sucesso`
    });

  } catch (error) {
    console.error('[PAYMENT METHODS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - ACCOUNT CATEGORIES ====================

// ⚠️ IMPORTANTE: Rota específica DEVE vir ANTES da rota genérica
app.post('/account-categories/init-default', async (c) => {
  console.log('[INIT CHART] 🎯 Rota /account-categories/init-default CHAMADA!');
  
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { accounts } = await c.req.json();
    
    if (!Array.isArray(accounts)) {
      return c.json({ error: 'Accounts devem ser um array' }, 400);
    }

    console.log(`[INIT CHART] 🌱 Inicializando plano de contas padrão para empresa ${auth.companyId} com ${accounts.length} contas`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ==================== ETAPA 0: Buscar linhas DRE ====================
    console.log('[INIT CHART] 🔍 Buscando linhas DRE...');
    
    const { data: dreLines, error: dreError } = await supabase
      .from('dre_lines')
      .select('id, code');
    
    if (dreError) {
      console.error('[INIT CHART] ❌ Erro ao buscar linhas DRE:', dreError);
      throw new Error(dreError.message);
    }
    
    // Criar mapa code → id
    const dreLineMap = new Map<string, string>();
    dreLines.forEach((line: any) => {
      dreLineMap.set(line.code, line.id);
    });
    
    console.log(`[INIT CHART] ✅ ${dreLines.length} linhas DRE carregadas`);
    
    // Mapear dreLineItem (string do frontend) → code da tabela dre_lines
    // Frontend usa valores como 'RECEITA_BRUTA', 'DEDUCOES', etc.
    // Tabela dre_lines usa códigos como 'RB', 'DED', 'CMV', etc.
    const dreItemToLineCode: Record<string, string> = {
      'RECEITA_BRUTA': 'RB',              // Receita Bruta → RB
      'DEDUCOES': 'DED',                   // Deduções → DED
      'IMPOSTOS_VENDAS': 'DED',            // Impostos sobre vendas também são deduções → DED
      'CMV': 'CMV',                        // Custo das Mercadorias Vendidas → CMV
      'DESPESAS_VENDAS': 'DC',             // Despesas com Vendas → DC (Despesas Comerciais)
      'DESPESAS_ADMINISTRATIVAS': 'DA',    // Despesas Administrativas → DA
      'DESPESAS_FINANCEIRAS': 'DF',        // Despesas Financeiras → DF
      'RECEITAS_FINANCEIRAS': 'RF',        // Receitas Financeiras → RF
    };
    
    // Log do mapeamento para debug
    console.log('[INIT CHART] 📋 Códigos DRE disponíveis:', Array.from(dreLineMap.keys()).join(', '));
    console.log('[INIT CHART] 📋 Mapeamento dreLineItem → code:', JSON.stringify(dreItemToLineCode, null, 2));
    
    // ==================== ETAPA 1: INSERT todas as contas SEM parent_id ====================
    console.log('[INIT CHART] 📝 Etapa 1: Inserindo contas com dre_line_id...');
    
    const rowsToInsert = accounts.map((account) => {
      const accountTypeNormalized = account.accountType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Se for analítica, mapear para dre_line_id
      let dreLineId = null;
      if (accountTypeNormalized === 'analitica' && account.dreLineItem) {
        const dreCode = dreItemToLineCode[account.dreLineItem];
        dreLineId = dreCode ? dreLineMap.get(dreCode) : null;
        
        if (!dreLineId) {
          console.warn(`[INIT CHART] ⚠️ Linha DRE não encontrada para ${account.dreLineItem} (conta ${account.code})`);
        }
      }
      
      return {
        company_id: auth.companyId,
        type: account.type,
        code: account.code,
        name: account.name,
        description: account.name,
        parent_id: null, // Temporariamente null
        level: account.level,
        account_type: accountTypeNormalized,
        dre_line_id: dreLineId, // ✅ AGORA INCLUÍMOS O dre_line_id
        sort_order: account.sortOrder,
        is_active: true,
      };
    });

    const { data: insertedAccounts, error: insertError } = await supabase
      .from('account_categories')
      .insert(rowsToInsert)
      .select('id, code');

    if (insertError) {
      console.error('[INIT CHART] ❌ Erro ao inserir contas:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[INIT CHART] ✅ ${insertedAccounts.length} contas inseridas com dre_line_id`);

    // ==================== ETAPA 2: UPDATE parent_id mapeando código → UUID ====================
    console.log('[INIT CHART] 🔗 Etapa 2: Atualizando parent_id...');
    
    // Criar mapa código → UUID
    const codeToIdMap = new Map<string, string>();
    insertedAccounts.forEach((acc: any) => {
      codeToIdMap.set(acc.code, acc.id);
    });

    // Atualizar parent_id para contas com parentId definido
    let updateCount = 0;
    for (const account of accounts) {
      if (account.parentId) {
        const parentUuid = codeToIdMap.get(account.parentId);
        const childUuid = codeToIdMap.get(account.code);
        
        if (parentUuid && childUuid) {
          const { error: updateError } = await supabase
            .from('account_categories')
            .update({ parent_id: parentUuid })
            .eq('id', childUuid);

          if (updateError) {
            console.error(`[INIT CHART] ❌ Erro ao atualizar parent_id de ${account.code}:`, updateError);
          } else {
            updateCount++;
          }
        }
      }
    }

    console.log(`[INIT CHART] ✅ ${updateCount} relações pai-filho configuradas`);
    console.log(`[INIT CHART] 🎉 Plano de contas criado com sucesso!`);
    
    return c.json({
      success: true,
      message: `${insertedAccounts.length} contas criadas com sucesso`,
      count: insertedAccounts.length,
    });

  } catch (error) {
    console.error('[INIT CHART] ❌ Erro ao criar plano de contas:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ✅ NOVA ROTA: Criar conta analítica com auto-geração de código
app.post('/account-categories/create-analytical', async (c) => {
  console.log('[CREATE ANALYTICAL] 🎯 Rota /account-categories/create-analytical CHAMADA!');
  
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { parentId, name, description } = await c.req.json();
    
    if (!parentId || !name) {
      return c.json({ error: 'parentId e name são obrigatórios' }, 400);
    }

    console.log(`[CREATE ANALYTICAL] 🌱 Criando conta analítica "${name}" sob parent ${parentId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ==================== ETAPA 1: Buscar conta pai ====================
    const { data: parentAccount, error: parentError } = await supabase
      .from('account_categories')
      .select('*')
      .eq('id', parentId)
      .eq('company_id', auth.companyId)
      .single();
    
    if (parentError || !parentAccount) {
      console.error('[CREATE ANALYTICAL] ❌ Conta pai não encontrada:', parentError);
      return c.json({ error: 'Conta pai não encontrada' }, 404);
    }

    console.log(`[CREATE ANALYTICAL] ✅ Conta pai encontrada: ${parentAccount.code} - ${parentAccount.name}`);

    // ==================== ETAPA 2: Encontrar próximo código disponível ====================
    // Buscar todas as contas filhas do mesmo pai
    const { data: siblings, error: siblingsError } = await supabase
      .from('account_categories')
      .select('code')
      .eq('parent_id', parentId)
      .eq('company_id', auth.companyId);
    
    if (siblingsError) {
      console.error('[CREATE ANALYTICAL] ❌ Erro ao buscar irmãos:', siblingsError);
      throw new Error(siblingsError.message);
    }

    // Extrair o último dígito do código pai e gerar próximo código
    const parentCode = parentAccount.code; // Ex: "3.2.03.00"
    const parentParts = parentCode.split('.'); // ["3", "2", "03", "00"]
    
    // Encontrar maior sufixo entre os irmãos
    let maxSuffix = 0;
    siblings.forEach((sibling: any) => {
      const siblingParts = sibling.code.split('.');
      const lastPart = parseInt(siblingParts[siblingParts.length - 1], 10);
      if (lastPart > maxSuffix) {
        maxSuffix = lastPart;
      }
    });

    // Próximo código
    const nextSuffix = (maxSuffix + 1).toString().padStart(2, '0');
    parentParts[parentParts.length - 1] = nextSuffix;
    const newCode = parentParts.join('.');

    console.log(`[CREATE ANALYTICAL] 🔢 Novo código gerado: ${newCode}`);

    // ==================== ETAPA 3: Herdar atributos do pai ====================
    const newAccount = {
      company_id: auth.companyId,
      type: parentAccount.type, // Herda tipo (Receita/Despesa)
      code: newCode,
      name,
      description: description || name,
      parent_id: parentId,
      level: (parentAccount.level || 0) + 1, // Nível = nível do pai + 1
      account_type: 'analitica', // Sempre analítica
      dre_line_id: parentAccount.dre_line_id, // Herda linha DRE do pai
      sort_order: maxSuffix + 1,
      is_active: true,
    };

    // ==================== ETAPA 4: Inserir nova conta ====================
    const { data: createdAccount, error: insertError } = await supabase
      .from('account_categories')
      .insert([newAccount])
      .select()
      .single();

    if (insertError) {
      console.error('[CREATE ANALYTICAL] ❌ Erro ao inserir conta:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[CREATE ANALYTICAL] 🎉 Conta criada: ${createdAccount.code} - ${createdAccount.name}`);
    
    return c.json({
      success: true,
      message: `Conta ${newCode} - ${name} criada com sucesso`,
      data: createdAccount,
    });

  } catch (error) {
    console.error('[CREATE ANALYTICAL] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ✅ NOVA ROTA: Sincronizar plano de contas (adicionar contas faltantes)
app.post('/account-categories/sync-missing', async (c) => {
  console.log('[SYNC MISSING] 🎯 Rota /account-categories/sync-missing CHAMADA!');
  
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { defaultAccounts } = await c.req.json();
    
    if (!Array.isArray(defaultAccounts)) {
      return c.json({ error: 'defaultAccounts deve ser um array' }, 400);
    }

    console.log(`[SYNC MISSING] 🔍 Verificando ${defaultAccounts.length} contas padrão...`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ==================== ETAPA 1: Buscar contas existentes ====================
    const { data: existingAccounts, error: fetchError } = await supabase
      .from('account_categories')
      .select('code')
      .eq('company_id', auth.companyId);
    
    if (fetchError) {
      console.error('[SYNC MISSING] ❌ Erro ao buscar contas existentes:', fetchError);
      throw new Error(fetchError.message);
    }

    const existingCodes = new Set(existingAccounts.map((acc: any) => acc.code));
    console.log(`[SYNC MISSING] ✅ ${existingCodes.size} contas existentes encontradas`);

    // ==================== ETAPA 2: Identificar contas faltantes ====================
    const missingAccounts = defaultAccounts.filter(acc => !existingCodes.has(acc.code));
    
    if (missingAccounts.length === 0) {
      console.log('[SYNC MISSING] ℹ️ Nenhuma conta faltante encontrada');
      return c.json({
        success: true,
        message: 'Plano de contas já está atualizado',
        added: 0,
      });
    }

    console.log(`[SYNC MISSING] 📋 ${missingAccounts.length} contas faltantes identificadas:`, 
                missingAccounts.map(a => `${a.code} - ${a.name}`).join(', '));

    // ==================== ETAPA 3: Buscar linhas DRE ====================
    const { data: dreLines, error: dreError } = await supabase
      .from('dre_lines')
      .select('id, code');
    
    if (dreError) {
      console.error('[SYNC MISSING] ❌ Erro ao buscar linhas DRE:', dreError);
      throw new Error(dreError.message);
    }
    
    const dreLineMap = new Map<string, string>();
    dreLines.forEach((line: any) => {
      dreLineMap.set(line.code, line.id);
    });

    const dreItemToLineCode: Record<string, string> = {
      'RECEITA_BRUTA': 'RB',
      'DEDUCOES': 'DED',
      'IMPOSTOS_VENDAS': 'DED',
      'CMV': 'CMV',
      'DESPESAS_VENDAS': 'DC',
      'DESPESAS_ADMINISTRATIVAS': 'DA',
      'DESPESAS_FINANCEIRAS': 'DF',
      'RECEITAS_FINANCEIRAS': 'RF',
    };

    // ==================== ETAPA 4: Inserir contas faltantes SEM parent_id ====================
    const rowsToInsert = missingAccounts.map((account) => {
      const accountTypeNormalized = account.accountType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      let dreLineId = null;
      if (accountTypeNormalized === 'analitica' && account.dreLineItem) {
        const dreCode = dreItemToLineCode[account.dreLineItem];
        dreLineId = dreCode ? dreLineMap.get(dreCode) : null;
      }
      
      return {
        company_id: auth.companyId,
        type: account.type,
        code: account.code,
        name: account.name,
        description: account.name,
        parent_id: null,
        level: account.level,
        account_type: accountTypeNormalized,
        dre_line_id: dreLineId,
        sort_order: account.sortOrder,
        is_active: true,
      };
    });

    const { data: insertedAccounts, error: insertError } = await supabase
      .from('account_categories')
      .insert(rowsToInsert)
      .select('id, code');

    if (insertError) {
      console.error('[SYNC MISSING] ❌ Erro ao inserir contas:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SYNC MISSING] ✅ ${insertedAccounts.length} contas inseridas`);

    // ==================== ETAPA 5: Buscar TODAS as contas para mapear parent_id ====================
    const { data: allAccounts, error: allAccountsError } = await supabase
      .from('account_categories')
      .select('id, code')
      .eq('company_id', auth.companyId);

    if (allAccountsError) {
      console.error('[SYNC MISSING] ❌ Erro ao buscar todas as contas:', allAccountsError);
      throw new Error(allAccountsError.message);
    }

    const codeToIdMap = new Map<string, string>();
    allAccounts.forEach((acc: any) => {
      codeToIdMap.set(acc.code, acc.id);
    });

    // ==================== ETAPA 6: UPDATE parent_id das contas recém-inseridas ====================
    let updateCount = 0;
    for (const account of missingAccounts) {
      if (account.parentId) {
        const parentUuid = codeToIdMap.get(account.parentId);
        const childUuid = codeToIdMap.get(account.code);
        
        if (parentUuid && childUuid) {
          const { error: updateError } = await supabase
            .from('account_categories')
            .update({ parent_id: parentUuid })
            .eq('id', childUuid);

          if (updateError) {
            console.error(`[SYNC MISSING] ❌ Erro ao atualizar parent_id de ${account.code}:`, updateError);
          } else {
            updateCount++;
          }
        }
      }
    }

    console.log(`[SYNC MISSING] ✅ ${updateCount} relações pai-filho atualizadas`);
    console.log(`[SYNC MISSING] 🎉 Sincronização concluída!`);
    
    return c.json({
      success: true,
      message: `${insertedAccounts.length} conta(s) adicionada(s) com sucesso`,
      added: insertedAccounts.length,
      details: missingAccounts.map(a => `${a.code} - ${a.name}`),
    });

  } catch (error) {
    console.error('[SYNC MISSING] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/account-categories', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[ACCOUNT CATEGORIES] 📥 Carregando account categories da empresa ${auth.companyId}`);
    const accountCategories = await sqlService.getAccountCategories(auth.companyId);
    
    console.log(`[ACCOUNT CATEGORIES] ✅ ${accountCategories.length} account categories carregados`);
    return c.json({
      success: true,
      data: accountCategories
    });

  } catch (error) {
    console.error('[ACCOUNT CATEGORIES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/account-categories', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[ACCOUNT CATEGORIES] 💾 Salvando ${data.length} account categories para empresa ${auth.companyId}`);
    const result = await sqlService.saveAccountCategories(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} account categories salvos com sucesso`
    });

  } catch (error) {
    console.error('[ACCOUNT CATEGORIES] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - FINANCIAL TRANSACTIONS ====================

app.get('/financial-transactions', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[FINANCIAL TRANSACTIONS] 📥 Carregando financial transactions da empresa ${auth.companyId}`);
    const financialTransactions = await sqlService.getFinancialTransactions(auth.companyId);
    
    console.log(`[FINANCIAL TRANSACTIONS] ✅ ${financialTransactions.length} financial transactions carregados`);
    return c.json({
      success: true,
      data: financialTransactions
    });

  } catch (error) {
    console.error('[FINANCIAL TRANSACTIONS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/financial-transactions', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[FINANCIAL TRANSACTIONS] 💾 Salvando ${data.length} financial transactions para empresa ${auth.companyId}`);
    const result = await sqlService.saveFinancialTransactions(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} financial transactions salvos com sucesso`
    });

  } catch (error) {
    console.error('[FINANCIAL TRANSACTIONS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - ACCOUNTS RECEIVABLE ====================

app.get('/accounts-receivable', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[ACCOUNTS RECEIVABLE] 📥 Carregando accounts receivable da empresa ${auth.companyId}`);
    const accountsReceivable = await sqlService.getAccountsReceivable(auth.companyId);
    
    console.log(`[ACCOUNTS RECEIVABLE] ✅ ${accountsReceivable.length} accounts receivable carregados`);
    return c.json({
      success: true,
      data: accountsReceivable
    });

  } catch (error) {
    console.error('[ACCOUNTS RECEIVABLE] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/accounts-receivable', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[ACCOUNTS RECEIVABLE] 💾 Salvando ${data.length} accounts receivable para empresa ${auth.companyId}`);
    const result = await sqlService.saveAccountsReceivable(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} accounts receivable salvos com sucesso`
    });

  } catch (error) {
    console.error('[ACCOUNTS RECEIVABLE] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - ACCOUNTS PAYABLE ====================

app.get('/accounts-payable', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[ACCOUNTS PAYABLE] 📥 Carregando accounts payable da empresa ${auth.companyId}`);
    const accountsPayable = await sqlService.getAccountsPayable(auth.companyId);
    
    console.log(`[ACCOUNTS PAYABLE] ✅ ${accountsPayable.length} accounts payable carregados`);
    return c.json({
      success: true,
      data: accountsPayable
    });

  } catch (error) {
    console.error('[ACCOUNTS PAYABLE] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/accounts-payable', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[ACCOUNTS PAYABLE] 💾 Salvando ${data.length} accounts payable para empresa ${auth.companyId}`);
    const result = await sqlService.saveAccountsPayable(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} accounts payable salvos com sucesso`
    });

  } catch (error) {
    console.error('[ACCOUNTS PAYABLE] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - BANK ACCOUNTS ====================

app.get('/bank-accounts', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[BANK ACCOUNTS] 📥 Carregando bank accounts da empresa ${auth.companyId}`);
    const bankAccounts = await sqlServiceExtended.getBankAccounts(auth.companyId);
    
    console.log(`[BANK ACCOUNTS] ✅ ${bankAccounts.length} bank accounts carregados`);
    return c.json({
      success: true,
      data: bankAccounts
    });

  } catch (error) {
    console.error('[BANK ACCOUNTS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/bank-accounts', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[BANK ACCOUNTS] 💾 Salvando ${data.length} bank accounts para empresa ${auth.companyId}`);
    const result = await sqlServiceExtended.saveBankAccounts(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} bank accounts salvos com sucesso`
    });

  } catch (error) {
    console.error('[BANK ACCOUNTS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - BANK MOVEMENTS ====================

app.get('/bank-movements', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[BANK MOVEMENTS] 📥 Carregando bank movements da empresa ${auth.companyId}`);
    const bankMovements = await sqlService.getBankMovements(auth.companyId);
    
    console.log(`[BANK MOVEMENTS] ✅ ${bankMovements.length} bank movements carregados`);
    return c.json({
      success: true,
      data: bankMovements
    });

  } catch (error) {
    console.error('[BANK MOVEMENTS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/bank-movements', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[BANK MOVEMENTS] 💾 Salvando ${data.length} bank movements para empresa ${auth.companyId}`);
    const result = await sqlService.saveBankMovements(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} bank movements salvos com sucesso`
    });

  } catch (error) {
    console.error('[BANK MOVEMENTS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - CASH FLOW ENTRIES ====================

app.get('/cash-flow-entries', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[CASH FLOW ENTRIES] 📥 Carregando cash flow entries da empresa ${auth.companyId}`);
    const cashFlowEntries = await sqlService.getCashFlowEntries(auth.companyId);
    
    console.log(`[CASH FLOW ENTRIES] ✅ ${cashFlowEntries.length} cash flow entries carregados`);
    return c.json({
      success: true,
      data: cashFlowEntries
    });

  } catch (error) {
    console.error('[CASH FLOW ENTRIES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/cash-flow-entries', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[CASH FLOW ENTRIES] 💾 Salvando ${data.length} cash flow entries para empresa ${auth.companyId}`);
    const result = await sqlService.saveCashFlowEntries(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} cash flow entries salvos com sucesso`
    });

  } catch (error) {
    console.error('[CASH FLOW ENTRIES] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - AUDIT ISSUES ====================

app.get('/audit-issues', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[AUDIT ISSUES] 📥 Carregando audit issues da empresa ${auth.companyId}`);
    const auditIssues = await sqlService.getAuditIssues(auth.companyId);
    
    console.log(`[AUDIT ISSUES] ✅ ${auditIssues.length} audit issues carregados`);
    return c.json({
      success: true,
      data: auditIssues
    });

  } catch (error) {
    console.error('[AUDIT ISSUES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/audit-issues', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[AUDIT ISSUES] 💾 Salvando ${data.length} audit issues para empresa ${auth.companyId}`);
    const result = await sqlService.saveAuditIssues(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} audit issues salvos com sucesso`
    });

  } catch (error) {
    console.error('[AUDIT ISSUES] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - COMPANY HISTORY ====================

app.get('/company-history', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[COMPANY HISTORY] 📥 Carregando company history da empresa ${auth.companyId}`);
    const companyHistory = await sqlService.getCompanyHistory(auth.companyId);
    
    console.log(`[COMPANY HISTORY] ✅ ${companyHistory.length} company history carregados`);
    return c.json({
      success: true,
      data: companyHistory
    });

  } catch (error) {
    console.error('[COMPANY HISTORY] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/company-history', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[COMPANY HISTORY] 💾 Salvando ${data.length} company history para empresa ${auth.companyId}`);
    const result = await sqlService.saveCompanyHistory(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} company history salvos com sucesso`
    });

  } catch (error) {
    console.error('[COMPANY HISTORY] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - RECONCILIATION STATUS ====================

app.get('/reconciliation-status', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[RECONCILIATION STATUS] 📥 Carregando reconciliation status da empresa ${auth.companyId}`);
    const reconciliationStatus = await sqlService.getReconciliationStatus(auth.companyId);
    
    console.log(`[RECONCILIATION STATUS] ✅ ${reconciliationStatus.length} reconciliation status carregados`);
    return c.json({
      success: true,
      data: reconciliationStatus
    });

  } catch (error) {
    console.error('[RECONCILIATION STATUS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/reconciliation-status', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[RECONCILIATION STATUS] 💾 Salvando ${data.length} reconciliation status para empresa ${auth.companyId}`);
    const result = await sqlService.saveReconciliationStatus(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} reconciliation status salvos com sucesso`
    });

  } catch (error) {
    console.error('[RECONCILIATION STATUS] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - LAST ANALYSIS DATE ====================

app.get('/last-analysis-date', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[LAST ANALYSIS DATE] 📥 Carregando last analysis date da empresa ${auth.companyId}`);
    const lastAnalysisDate = await sqlService.getLastAnalysisDate(auth.companyId);
    
    console.log(`[LAST ANALYSIS DATE] ✅ ${lastAnalysisDate.length} last analysis date carregados`);
    return c.json({
      success: true,
      data: lastAnalysisDate
    });

  } catch (error) {
    console.error('[LAST ANALYSIS DATE] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/last-analysis-date', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { data } = await c.req.json();
    
    if (!Array.isArray(data)) {
      return c.json({ error: 'Dados devem ser um array' }, 400);
    }

    console.log(`[LAST ANALYSIS DATE] 💾 Salvando ${data.length} last analysis date para empresa ${auth.companyId}`);
    const result = await sqlService.saveLastAnalysisDate(auth.companyId, data);
    
    return c.json({
      success: true,
      message: `${result.count} last analysis date salvos com sucesso`
    });

  } catch (error) {
    console.error('[LAST ANALYSIS DATE] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - DRE (Demonstração do Resultado do Exercício) ====================

// Calcular DRE para um período
app.get('/dre/calculate', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!startDate || !endDate) {
      return c.json({ error: 'startDate e endDate são obrigatórios' }, 400);
    }

    console.log(`[DRE] 📊 Calculando DRE para empresa ${auth.companyId} (${startDate} até ${endDate})`);
    const dre = await dreService.calculateDRE(auth.companyId, startDate, endDate);
    
    console.log(`[DRE] ✅ DRE calculada com sucesso`);
    return c.json({
      success: true,
      data: dre
    });

  } catch (error) {
    console.error('[DRE] ❌ Erro ao calcular:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Buscar estrutura da DRE baseada no regime
app.get('/dre/structure', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[DRE STRUCTURE] 📋 Buscando estrutura DRE`);
    const structure = await dreService.getDREStructure();
    
    console.log(`[DRE STRUCTURE] ✅ ${structure.length} linhas encontradas`);
    return c.json({
      success: true,
      data: structure
    });

  } catch (error) {
    console.error('[DRE STRUCTURE] ❌ Erro ao buscar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Salvar snapshot de DRE
app.post('/dre/snapshot', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { dre } = await c.req.json();
    
    if (!dre) {
      return c.json({ error: 'dre é obrigatório' }, 400);
    }

    console.log(`[DRE SNAPSHOT] 💾 Salvando snapshot para empresa ${auth.companyId}`);
    const result = await dreService.saveDRESnapshot(auth.companyId, auth.userId, dre);
    
    if (result.success) {
      console.log(`[DRE SNAPSHOT] ✅ Snapshot salvo: ${result.id}`);
      return c.json({
        success: true,
        message: 'Snapshot salvo com sucesso',
        id: result.id
      });
    } else {
      return c.json({ error: 'Erro ao salvar snapshot' }, 500);
    }

  } catch (error) {
    console.error('[DRE SNAPSHOT] ❌ Erro ao salvar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Buscar histórico de snapshots
app.get('/dre/snapshots', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '10', 10);

    console.log(`[DRE SNAPSHOTS] 📥 Buscando snapshots da empresa ${auth.companyId}`);
    const snapshots = await dreService.getDRESnapshots(auth.companyId, limit);
    
    console.log(`[DRE SNAPSHOTS] ✅ ${snapshots.length} snapshots encontrados`);
    return c.json({
      success: true,
      data: snapshots
    });

  } catch (error) {
    console.error('[DRE SNAPSHOTS] ❌ Erro ao buscar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PLANO DE CONTAS ====================

// Reset/criar plano de contas padrão
app.post('/chart-of-accounts/reset', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[CHART OF ACCOUNTS] 🔄 Resetando plano de contas para empresa ${auth.companyId}`);
    
    // Chamar função SQL que recria o plano de contas
    const result = await sqlService.query(
      `SELECT seed_default_chart_of_accounts($1::uuid)`,
      [auth.companyId]
    );
    
    console.log(`[CHART OF ACCOUNTS] ✅ Plano de contas resetado com sucesso`);
    return c.json({
      success: true,
      message: 'Plano de contas padrão criado com sucesso'
    });

  } catch (error) {
    console.error('[CHART OF ACCOUNTS] ❌ Erro ao resetar:', error);
    return c.json({ error: error.message }, 500);
  }
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
      'accounts-receivable', 'accounts-payable', 'bank-accounts', 'bank-movements',
      'cash-flow-entries', 'audit-issues', 'company-history',
      'reconciliation-status', 'last-analysis-date', 'dre'
    ]
  });
});

// ==================== ROTAS - COST CENTERS ====================

app.get('/cost-centers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[COST CENTERS] 📥 Carregando centros de custo da empresa ${auth.companyId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('[COST CENTERS] ❌ Erro ao buscar centros:', error);
      throw error;
    }

    console.log(`[COST CENTERS] ✅ ${data.length} centros de custo carregados`);
    return c.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[COST CENTERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/cost-centers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    console.log('[COST CENTERS] 📝 Criando novo centro de custo:', body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ==================== AUTO-GERAR CÓDIGO ====================
    // Buscar o maior código existente para esta empresa
    const { data: existingCenters, error: fetchError } = await supabase
      .from('cost_centers')
      .select('code')
      .eq('company_id', auth.companyId)
      .order('code', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[COST CENTERS] ❌ Erro ao buscar códigos:', fetchError);
      throw fetchError;
    }

    let nextCode = 'CC-001';
    if (existingCenters && existingCenters.length > 0) {
      const lastCode = existingCenters[0].code;
      const numericPart = parseInt(lastCode.replace('CC-', ''));
      nextCode = `CC-${String(numericPart + 1).padStart(3, '0')}`;
    }

    console.log(`[COST CENTERS] 🔢 Código auto-gerado: ${nextCode}`);

    // ==================== INSERIR CENTRO DE CUSTO ====================
    const { data, error } = await supabase
      .from('cost_centers')
      .insert([{
        company_id: auth.companyId,
        code: nextCode,
        name: body.name,
        description: body.description || null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('[COST CENTERS] ❌ Erro ao inserir centro:', error);
      throw error;
    }

    console.log(`[COST CENTERS] ✅ Centro criado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: `Centro de custo ${data.code} - ${data.name} criado com sucesso`,
      data: data
    });
  } catch (error) {
    console.error('[COST CENTERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/cost-centers/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    console.log(`[COST CENTERS] ✏️ Atualizando centro ${id}:`, body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('cost_centers')
      .update({
        name: body.name,
        description: body.description || null,
      })
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) {
      console.error('[COST CENTERS] ❌ Erro ao atualizar centro:', error);
      throw error;
    }

    console.log(`[COST CENTERS] ✅ Centro atualizado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: 'Centro de custo atualizado com sucesso',
      data: data
    });
  } catch (error) {
    console.error('[COST CENTERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/cost-centers/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    console.log(`[COST CENTERS] 🗑️ Soft delete de centro ${id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('cost_centers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', auth.companyId);

    if (error) {
      console.error('[COST CENTERS] ❌ Erro ao deletar centro:', error);
      throw error;
    }

    console.log(`[COST CENTERS] ✅ Centro desativado com sucesso`);
    return c.json({
      success: true,
      message: 'Centro de custo removido com sucesso'
    });
  } catch (error) {
    console.error('[COST CENTERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - SALESPEOPLE ====================

app.get('/salespeople', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[SALESPEOPLE] 📥 Carregando vendedores da empresa ${auth.companyId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('salespeople')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('[SALESPEOPLE] ❌ Erro ao buscar vendedores:', error);
      throw error;
    }

    console.log(`[SALESPEOPLE] ✅ ${data.length} vendedores carregados`);
    return c.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/salespeople', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    console.log('[SALESPEOPLE] 📝 Criando novo vendedor:', body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ==================== AUTO-GERAR CÓDIGO ====================
    const { data: existing, error: fetchError } = await supabase
      .from('salespeople')
      .select('code')
      .eq('company_id', auth.companyId)
      .order('code', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[SALESPEOPLE] ❌ Erro ao buscar códigos:', fetchError);
      throw fetchError;
    }

    let nextCode = 'SP-001';
    if (existing && existing.length > 0) {
      const lastCode = existing[0].code;
      const numericPart = parseInt(lastCode.replace('SP-', ''));
      nextCode = `SP-${String(numericPart + 1).padStart(3, '0')}`;
    }

    console.log(`[SALESPEOPLE] 🔢 Código auto-gerado: ${nextCode}`);

    // ==================== INSERIR VENDEDOR ====================
    const { data, error } = await supabase
      .from('salespeople')
      .insert([{
        company_id: auth.companyId,
        code: nextCode,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        commission_rate: body.commissionRate || 0.00,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('[SALESPEOPLE] ❌ Erro ao inserir vendedor:', error);
      throw error;
    }

    console.log(`[SALESPEOPLE] ✅ Vendedor criado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: `Vendedor ${data.code} - ${data.name} criado com sucesso`,
      data: data
    });
  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/salespeople/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    console.log(`[SALESPEOPLE] ✏️ Atualizando vendedor ${id}:`, body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('salespeople')
      .update({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        commission_rate: body.commissionRate || 0.00,
      })
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) {
      console.error('[SALESPEOPLE] ❌ Erro ao atualizar vendedor:', error);
      throw error;
    }

    console.log(`[SALESPEOPLE] ✅ Vendedor atualizado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: 'Vendedor atualizado com sucesso',
      data: data
    });
  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/salespeople/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    console.log(`[SALESPEOPLE] 🗑️ Soft delete de vendedor ${id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('salespeople')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', auth.companyId);

    if (error) {
      console.error('[SALESPEOPLE] ❌ Erro ao deletar vendedor:', error);
      throw error;
    }

    console.log(`[SALESPEOPLE] ✅ Vendedor desativado com sucesso`);
    return c.json({
      success: true,
      message: 'Vendedor removido com sucesso'
    });
  } catch (error) {
    console.error('[SALESPEOPLE] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - BUYERS ====================

app.get('/buyers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    console.log(`[BUYERS] 📥 Carregando compradores da empresa ${auth.companyId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('[BUYERS] ❌ Erro ao buscar compradores:', error);
      throw error;
    }

    console.log(`[BUYERS] ✅ ${data.length} compradores carregados`);
    return c.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[BUYERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/buyers', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    console.log('[BUYERS] 📝 Criando novo comprador:', body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ==================== AUTO-GERAR CÓDIGO ====================
    const { data: existing, error: fetchError } = await supabase
      .from('buyers')
      .select('code')
      .eq('company_id', auth.companyId)
      .order('code', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[BUYERS] ❌ Erro ao buscar códigos:', fetchError);
      throw fetchError;
    }

    let nextCode = 'BY-001';
    if (existing && existing.length > 0) {
      const lastCode = existing[0].code;
      const numericPart = parseInt(lastCode.replace('BY-', ''));
      nextCode = `BY-${String(numericPart + 1).padStart(3, '0')}`;
    }

    console.log(`[BUYERS] 🔢 Código auto-gerado: ${nextCode}`);

    // ==================== INSERIR COMPRADOR ====================
    const { data, error } = await supabase
      .from('buyers')
      .insert([{
        company_id: auth.companyId,
        code: nextCode,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        department: body.department || null,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('[BUYERS] ❌ Erro ao inserir comprador:', error);
      throw error;
    }

    console.log(`[BUYERS] ✅ Comprador criado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: `Comprador ${data.code} - ${data.name} criado com sucesso`,
      data: data
    });
  } catch (error) {
    console.error('[BUYERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/buyers/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    console.log(`[BUYERS] ✏️ Atualizando comprador ${id}:`, body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('buyers')
      .update({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        department: body.department || null,
      })
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) {
      console.error('[BUYERS] ❌ Erro ao atualizar comprador:', error);
      throw error;
    }

    console.log(`[BUYERS] ✅ Comprador atualizado: ${data.code} - ${data.name}`);
    return c.json({
      success: true,
      message: 'Comprador atualizado com sucesso',
      data: data
    });
  } catch (error) {
    console.error('[BUYERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/buyers/:id', async (c) => {
  try {
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const id = c.req.param('id');
    console.log(`[BUYERS] 🗑️ Soft delete de comprador ${id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('buyers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('company_id', auth.companyId);

    if (error) {
      console.error('[BUYERS] ❌ Erro ao deletar comprador:', error);
      throw error;
    }

    console.log(`[BUYERS] ✅ Comprador desativado com sucesso`);
    return c.json({
      success: true,
      message: 'Comprador removido com sucesso'
    });
  } catch (error) {
    console.error('[BUYERS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;