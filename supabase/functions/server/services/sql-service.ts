/**
 * ===================================================================
 * SQL SERVICE - Camada de Serviços para PostgreSQL
 * ===================================================================
 * 
 * Substitui o KV Store por queries SQL diretas no PostgreSQL
 * Mantém a mesma interface do KV Store para facilitar a migração
 */

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ==================== TIPOS ====================

export interface AuthContext {
  userId: string;
  companyId: string;
}

// ==================== SUPABASE CLIENT ====================

function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

// ==================== AUTENTICAÇÃO ====================

/**
 * Autentica usuário via token e retorna userId + companyId
 */
export async function authenticate(authHeader: string | undefined): Promise<AuthContext | null> {
  const accessToken = authHeader?.split(' ')[1];
  
  if (!accessToken) {
    console.error('[SQL_SERVICE] ❌ Token ausente');
    return null;
  }

  const supabase = getSupabaseClient();

  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    console.error('[SQL_SERVICE] ❌ Autenticação falhou:', authError?.message);
    return null;
  }

  // Buscar company_id
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[SQL_SERVICE] ❌ Company ID não encontrado:', profileError?.message);
    return null;
  }

  return {
    userId: user.id,
    companyId: profile.company_id
  };
}

// ==================== CUSTOMERS ====================

export async function getCustomers(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar customers:', error);
    throw new Error(error.message);
  }

  // Mapear do schema SQL para o formato do código
  return data?.map((row: any) => ({
    id: row.id,
    documentType: row.document_type || 'PJ',
    document: row.document,
    name: row.name,
    company: row.company_name || row.name,
    tradeName: row.trade_name || '',
    segment: row.segment || '',
    contactPerson: row.contact_person || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
    stateRegistration: row.state_registration || '',
    cityRegistration: row.city_registration || '',
    icmsContributor: row.icms_contributor || false,
    totalOrders: row.total_orders || 0,
    totalSpent: parseFloat(row.total_spent || 0),
    status: row.status || 'Ativo',
    priceTableId: row.price_table_id || undefined
  })) || [];
}

export async function saveCustomers(companyId: string, customers: any[]) {
  const supabase = getSupabaseClient();

  // Deletar todos os customers antigos da empresa
  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar customers:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novos customers
  if (customers.length > 0) {
    const rows = customers.map((customer: any) => ({
      // ❌ REMOVIDO: id: customer.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      type: customer.documentType === 'PF' ? 'individual' : 'company', // ✅ Campo obrigatório
      document_type: customer.documentType || 'PJ',
      document: customer.document,
      name: customer.name,
      company_name: customer.company || customer.name,
      trade_name: customer.tradeName || '',
      segment: customer.segment || '',
      contact_person: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      street: customer.street || '',
      number: customer.number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zipCode || '',
      state_registration: customer.stateRegistration || '',
      city_registration: customer.cityRegistration || '',
      icms_contributor: customer.icmsContributor || false,
      total_orders: customer.totalOrders || 0,
      total_spent: customer.totalSpent || 0,
      status: customer.status || 'Ativo',
      price_table_id: customer.priceTableId || null
    }));

    const { error: insertError } = await supabase
      .from('customers')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir customers:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${customers.length} customers salvos`);
  return { success: true, count: customers.length };
}

// ==================== SUPPLIERS ====================

export async function getSuppliers(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar suppliers:', error);
    throw new Error(error.message);
  }

  // Mapear do schema SQL para o formato do código
  return data?.map((row: any) => ({
    id: row.id,
    documentType: row.document_type || 'PJ',
    document: row.document,
    name: row.name,
    company: row.company_name || row.name,
    tradeName: row.trade_name || '',
    segment: row.segment || '',
    contactPerson: row.contact_person || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
    stateRegistration: row.state_registration || '',
    cityRegistration: row.city_registration || '',
    icmsContributor: row.icms_contributor || false,
    totalPurchases: row.total_purchases || 0,
    totalSpent: parseFloat(row.total_spent || 0),
    status: row.status || 'Ativo'
  })) || [];
}

export async function saveSuppliers(companyId: string, suppliers: any[]) {
  const supabase = getSupabaseClient();

  // Deletar todos os suppliers antigos da empresa
  const { error: deleteError } = await supabase
    .from('suppliers')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar suppliers:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novos suppliers
  if (suppliers.length > 0) {
    const rows = suppliers.map((supplier: any) => ({
      // ❌ REMOVIDO: id: supplier.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      document_type: supplier.documentType || 'PJ',
      document: supplier.document,
      name: supplier.name,
      company_name: supplier.company || supplier.name,
      trade_name: supplier.tradeName || '',
      segment: supplier.segment || '',
      contact_person: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      street: supplier.street || '',
      number: supplier.number || '',
      complement: supplier.complement || '',
      neighborhood: supplier.neighborhood || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: supplier.zipCode || '',
      state_registration: supplier.stateRegistration || '',
      city_registration: supplier.cityRegistration || '',
      icms_contributor: supplier.icmsContributor || false,
      total_purchases: supplier.totalPurchases || 0,
      total_spent: supplier.totalSpent || 0,
      status: supplier.status || 'Ativo'
    }));

    const { error: insertError } = await supabase
      .from('suppliers')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir suppliers:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${suppliers.length} suppliers salvos`);
  return { success: true, count: suppliers.length };
}

// ==================== PRODUCTS (INVENTORY) ====================

/**
 * Gera o próximo SKU sequencial para a empresa
 * Formato: PROD-001, PROD-002, ..., PROD-999
 */
async function generateNextSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Buscar todos os SKUs que seguem o padrão PROD-###
  const { data, error } = await supabase
    .from('products')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'PROD-%')
    .order('sku', { ascending: false })
    .limit(100); // Buscar últimos 100 para performance

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs, gerando SKU padrão:', error);
    return 'PROD-001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    // Extrair o maior número dos SKUs existentes
    data.forEach((row: any) => {
      const match = row.sku.match(/^PROD-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  
  // Formatar com zero padding (3 dígitos: 001, 002, ... 999)
  return `PROD-${String(nextNumber).padStart(3, '0')}`;
}

export async function getProducts(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar products:', error);
    throw new Error(error.message);
  }

  // Mapear do schema SQL para o formato do código (InventoryItem)
  return data?.map((row: any) => ({
    id: row.id,
    productName: row.name, // Frontend usa productName
    name: row.name, // Manter compatibilidade
    sku: row.sku,
    category: row.category,
    unit: row.unit,
    purchasePrice: parseFloat(row.purchase_price || 0),
    costPrice: parseFloat(row.cost_price || 0),
    pricePerUnit: parseFloat(row.sale_price || 0), // Frontend usa pricePerUnit
    sellPrice: parseFloat(row.sale_price || 0), // Frontend usa sellPrice também
    salePrice: parseFloat(row.sale_price || 0), // Manter compatibilidade
    markup: parseFloat(row.markup || 0),
    currentStock: parseFloat(row.stock_quantity || 0), // Frontend usa currentStock
    stockQuantity: parseFloat(row.stock_quantity || 0), // Manter compatibilidade
    minStock: parseFloat(row.min_stock || 0),
    maxStock: parseFloat(row.max_stock || 0),
    reorderLevel: parseFloat(row.reorder_level || 0),
    status: row.status || 'Em Estoque',
    lastRestocked: row.last_restocked || null,
    active: row.active !== false, // Soft delete - true se NULL ou true
    // Dados fiscais
    ncm: row.ncm || '',
    cest: row.cest || '',
    origin: row.origin || '',
    serviceCode: row.service_code || '',
    csosn: row.csosn || '',
    cst: row.cst || '',
    icmsRate: parseFloat(row.icms_rate || 0),
    pisRate: parseFloat(row.pis_rate || 0),
    cofinsRate: parseFloat(row.cofins_rate || 0),
    ipiRate: parseFloat(row.ipi_rate || 0),
    cfop: row.cfop || '',
    taxCustomized: row.tax_customized || false,
    // Rastreabilidade
    requiresBatchControl: row.requires_batch_control || false,
    requiresExpiryDate: row.requires_expiry_date || false,
    defaultLocation: row.default_location || '',
    shelfLife: row.shelf_life || null
  })) || [];
}

export async function saveProducts(companyId: string, products: any[]) {
  const supabase = getSupabaseClient();

  // ✅ ETAPA 1: Gerar SKUs para produtos novos ANTES do DELETE
  // Isso garante que generateNextSku() vê o banco populado
  const productsWithSku = await Promise.all(products.map(async (product: any) => {
    // Se o produto JÁ TEM SKU, preservar o SKU original
    if (product.sku) {
      return { ...product, sku: product.sku };
    }
    
    // Se não tem SKU, gerar novo sequencial
    const newSku = await generateNextSku(companyId);
    return { ...product, sku: newSku };
  }));

  // ✅ ETAPA 2: Deletar todos os products antigos da empresa
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar products:', deleteError);
    throw new Error(deleteError.message);
  }

  // ✅ ETAPA 3: Inserir novos products (com SKUs já gerados)
  if (productsWithSku.length > 0) {
    const rows = productsWithSku.map((product: any) => {
      return {
        // ❌ REMOVIDO: id: product.id (UUID gerado automaticamente pelo banco)
        company_id: companyId,
        name: product.productName || product.name, // Frontend usa productName
        sku: product.sku, // ✅ Já foi gerado ou preservado na ETAPA 1
        category: product.category || 'Geral', // Default se vazio
        unit: product.unit || 'un',
        purchase_price: product.purchasePrice || 0,
        cost_price: product.costPrice || 0,
        sale_price: product.sellPrice || product.salePrice || product.pricePerUnit || 0, // Frontend usa sellPrice e pricePerUnit
        markup: product.markup || 0,
        stock_quantity: product.currentStock || product.stockQuantity || 0, // Frontend usa currentStock
        min_stock: product.minStock || 0,
        max_stock: product.maxStock || 0,
        reorder_level: product.reorderLevel || 0,
        status: product.status || 'Em Estoque',
        last_restocked: product.lastRestocked || null,
        active: product.active !== undefined ? product.active : true, // Soft delete (default true)
        // Dados fiscais
        ncm: product.ncm || null,
        cest: product.cest || null,
        origin: product.origin || null,
        service_code: product.serviceCode || null,
        csosn: product.csosn || null,
        cst: product.cst || null,
        icms_rate: product.icmsRate || null,
        pis_rate: product.pisRate || null,
        cofins_rate: product.cofinsRate || null,
        ipi_rate: product.ipiRate || null,
        cfop: product.cfop || null,
        tax_customized: product.taxCustomized || false,
        // Rastreabilidade
        requires_batch_control: product.requiresBatchControl || false,
        requires_expiry_date: product.requiresExpiryDate || false,
        default_location: product.defaultLocation || null,
        shelf_life: product.shelfLife || null
      };
    });

    const { error: insertError } = await supabase
      .from('products')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir products:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${productsWithSku.length} products salvos`);
  return { success: true, count: productsWithSku.length };
}

// ==================== EXPORT ====================

// Importar funções estendidas
import { sqlServiceExtended } from './sql-service-extended.ts';

export const sqlService = {
  authenticate,
  getCustomers,
  saveCustomers,
  getSuppliers,
  saveSuppliers,
  getProducts,
  saveProducts,
  // Entidades estendidas
  ...sqlServiceExtended,
  // Entidades JSONB (via companies.settings)
  getSalespeople,
  saveSalespeople,
  getBuyers,
  saveBuyers,
  getPaymentMethods,
  savePaymentMethods,
  getAccountCategories,
  saveAccountCategories,
  getProductCategories,
  saveProductCategories,
  getPriceTables,
  savePriceTables,
  getCashFlowEntries,
  saveCashFlowEntries,
  getBankMovements,
  saveBankMovements,
  getAuditIssues,
  saveAuditIssues,
  getCompanyHistory,
  saveCompanyHistory,
  getReconciliationStatus,
  saveReconciliationStatus,
  getLastAnalysisDate,
  saveLastAnalysisDate
};

// ==================== ENTIDADES JSONB ====================
// Estas entidades são armazenadas em companies.settings como JSONB

async function getCompanySettings(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single();

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar company settings:', error);
    return {};
  }

  return data?.settings || {};
}

async function saveCompanySettings(companyId: string, settings: any) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('companies')
    .update({ settings })
    .eq('id', companyId);

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao salvar company settings:', error);
    throw new Error(error.message);
  }
}

// SALESPEOPLE
async function getSalespeople(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.salespeople || [];
}

async function saveSalespeople(companyId: string, salespeople: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.salespeople = salespeople;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: salespeople.length };
}

// BUYERS
async function getBuyers(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.buyers || [];
}

async function saveBuyers(companyId: string, buyers: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.buyers = buyers;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: buyers.length };
}

// PAYMENT METHODS (temporário - depois migrar para tabela)
async function getPaymentMethods(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.paymentMethods || [];
}

async function savePaymentMethods(companyId: string, paymentMethods: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.paymentMethods = paymentMethods;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: paymentMethods.length };
}

// ACCOUNT CATEGORIES (temporário - depois migrar para tabela)
async function getAccountCategories(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.accountCategories || [];
}

async function saveAccountCategories(companyId: string, categories: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.accountCategories = categories;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: categories.length };
}

// PRODUCT CATEGORIES (temporário - depois migrar para tabela)
async function getProductCategories(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.productCategories || [];
}

async function saveProductCategories(companyId: string, categories: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.productCategories = categories;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: categories.length };
}

// PRICE TABLES (temporário - depois migrar para tabela)
async function getPriceTables(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.priceTables || [];
}

async function savePriceTables(companyId: string, priceTables: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.priceTables = priceTables;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: priceTables.length };
}

// CASH FLOW ENTRIES (temporário - depois migrar para tabela)
async function getCashFlowEntries(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.cashFlowEntries || [];
}

async function saveCashFlowEntries(companyId: string, entries: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.cashFlowEntries = entries;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: entries.length };
}

// BANK MOVEMENTS (temporário - mapear para financial_transactions depois)
async function getBankMovements(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.bankMovements || [];
}

async function saveBankMovements(companyId: string, movements: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.bankMovements = movements;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: movements.length };
}

// AUDIT ISSUES
async function getAuditIssues(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.auditIssues || [];
}

async function saveAuditIssues(companyId: string, issues: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.auditIssues = issues;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: issues.length };
}

// COMPANY HISTORY
async function getCompanyHistory(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.history || [];
}

async function saveCompanyHistory(companyId: string, history: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.history = history;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: history.length };
}

// RECONCILIATION STATUS
async function getReconciliationStatus(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.reconciliation || [];
}

async function saveReconciliationStatus(companyId: string, status: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.reconciliation = status;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: status.length };
}

// LAST ANALYSIS DATE
async function getLastAnalysisDate(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.lastAnalysisDate || [];
}

async function saveLastAnalysisDate(companyId: string, date: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.lastAnalysisDate = date;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: date.length };
}