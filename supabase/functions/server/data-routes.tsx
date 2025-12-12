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

const app = new Hono();

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
      'reconciliation-status', 'last-analysis-date'
    ]
  });
});

export default app;