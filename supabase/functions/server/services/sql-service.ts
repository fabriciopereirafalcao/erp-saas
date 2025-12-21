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
    id: row.sku || row.id, // ✅ Usar SKU como ID (CLI-001), fallback para UUID
    sku: row.sku, // ✅ Incluir SKU
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

  // ==================== ARQUITETURA UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todos os clientes (protege contra perda de dados)
  // ✅ UPDATE clientes com document existente (preserva UUID, histórico, referências)
  // ✅ INSERT apenas clientes novos (document não encontrado)
  // ✅ DELETE apenas clientes que foram removidos pelo usuário
  
  console.log(`[SQL_SERVICE] 🔄 Iniciando UPSERT de ${customers.length} clientes`);

  // ETAPA 1: Buscar todos os clientes existentes no banco
  const { data: existingCustomers, error: fetchError } = await supabase
    .from('customers')
    .select('id, document')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar clientes existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingDocMap = new Map<string, string>(); // document → uuid
  existingCustomers?.forEach((c: any) => {
    if (c.document) existingDocMap.set(c.document, c.id);
  });

  console.log(`[SQL_SERVICE] 📊 Clientes no banco: ${existingDocMap.size}`);

  // ETAPA 2: Classificar clientes do frontend
  const customersToUpdate: any[] = []; // Clientes com document existente → UPDATE
  const customersToInsert: any[] = []; // Clientes novos → INSERT
  const incomingDocs = new Set<string>(); // Documents enviados pelo frontend

  for (const customer of customers) {
    // Se tem document e existe no banco → UPDATE
    if (customer.document && existingDocMap.has(customer.document)) {
      customersToUpdate.push(customer);
      incomingDocs.add(customer.document);
    } 
    // Se não tem document ou document não existe → INSERT
    else {
      customersToInsert.push(customer);
      if (customer.document) incomingDocs.add(customer.document);
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${customersToUpdate.length} | INSERT: ${customersToInsert.length}`);

  // ETAPA 3: UPDATE clientes existentes (preserva UUID)
  for (const customer of customersToUpdate) {
    const uuid = existingDocMap.get(customer.document);
    
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        type: customer.documentType === 'PF' ? 'individual' : 'company',
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
      })
      .eq('id', uuid);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar cliente ${customer.document}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${customersToUpdate.length} clientes atualizados`);

  // ETAPA 4: Gerar SKUs para clientes novos
  const customersToInsertWithSku = await Promise.all(customersToInsert.map(async (customer: any) => {
    if (customer.sku) {
      // SKU customizado já definido
      return { ...customer, sku: customer.sku };
    }
    // Gerar novo SKU sequencial
    const newSku = await generateNextCustomerSku(companyId);
    return { ...customer, sku: newSku };
  }));

  // ETAPA 5: INSERT clientes novos (com SKUs gerados)
  if (customersToInsertWithSku.length > 0) {
    const rows = customersToInsertWithSku.map((customer: any) => ({
      company_id: companyId,
      sku: customer.sku, // ✅ SKU gerado automaticamente
      type: customer.documentType === 'PF' ? 'individual' : 'company',
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
      console.error('[SQL_SERVICE] ❌ Erro ao inserir clientes:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${customersToInsertWithSku.length} clientes inseridos`);
  }

  // ETAPA 6: DELETE clientes removidos (que estão no banco mas não foram enviados)
  const docsToDelete: string[] = [];
  existingDocMap.forEach((uuid, doc) => {
    if (!incomingDocs.has(doc)) {
      docsToDelete.push(doc);
    }
  });

  if (docsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('company_id', companyId)
      .in('document', docsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar clientes removidos:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${docsToDelete.length} clientes removidos: ${docsToDelete.join(', ')}`);
  }

  const totalOperations = customersToUpdate.length + customersToInsertWithSku.length + docsToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: customersToUpdate.length,
    inserted: customersToInsertWithSku.length,
    deleted: docsToDelete.length
  };
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
    id: row.sku || row.id, // ✅ Usar SKU como ID (FOR-001), fallback para UUID
    sku: row.sku, // ✅ Incluir SKU
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

  // ==================== ARQUITETURA UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todos os fornecedores (protege contra perda de dados)
  // ✅ UPDATE fornecedores com document existente (preserva UUID, histórico, referências)
  // ✅ INSERT apenas fornecedores novos (document não encontrado)
  // ✅ DELETE apenas fornecedores que foram removidos pelo usuário
  
  console.log(`[SQL_SERVICE] 🔄 Iniciando UPSERT de ${suppliers.length} fornecedores`);

  // ETAPA 1: Buscar todos os fornecedores existentes no banco
  const { data: existingSuppliers, error: fetchError } = await supabase
    .from('suppliers')
    .select('id, document')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar fornecedores existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingDocMap = new Map<string, string>(); // document → uuid
  existingSuppliers?.forEach((s: any) => {
    if (s.document) existingDocMap.set(s.document, s.id);
  });

  console.log(`[SQL_SERVICE] 📊 Fornecedores no banco: ${existingDocMap.size}`);

  // ETAPA 2: Classificar fornecedores do frontend
  const suppliersToUpdate: any[] = []; // Fornecedores com document existente → UPDATE
  const suppliersToInsert: any[] = []; // Fornecedores novos → INSERT
  const incomingDocs = new Set<string>(); // Documents enviados pelo frontend

  for (const supplier of suppliers) {
    // Se tem document e existe no banco → UPDATE
    if (supplier.document && existingDocMap.has(supplier.document)) {
      suppliersToUpdate.push(supplier);
      incomingDocs.add(supplier.document);
    } 
    // Se não tem document ou document não existe → INSERT
    else {
      suppliersToInsert.push(supplier);
      if (supplier.document) incomingDocs.add(supplier.document);
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${suppliersToUpdate.length} | INSERT: ${suppliersToInsert.length}`);

  // ETAPA 3: UPDATE fornecedores existentes (preserva UUID)
  for (const supplier of suppliersToUpdate) {
    const uuid = existingDocMap.get(supplier.document);
    
    const { error: updateError } = await supabase
      .from('suppliers')
      .update({
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
      })
      .eq('id', uuid);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar fornecedor ${supplier.document}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${suppliersToUpdate.length} fornecedores atualizados`);

  // ETAPA 4: Gerar SKUs para fornecedores novos
  const suppliersToInsertWithSku = await Promise.all(suppliersToInsert.map(async (supplier: any) => {
    if (supplier.sku) {
      // SKU customizado já definido
      return { ...supplier, sku: supplier.sku };
    }
    // Gerar novo SKU sequencial
    const newSku = await generateNextSupplierSku(companyId);
    return { ...supplier, sku: newSku };
  }));

  // ETAPA 5: INSERT fornecedores novos (com SKUs gerados)
  if (suppliersToInsertWithSku.length > 0) {
    const rows = suppliersToInsertWithSku.map((supplier: any) => ({
      company_id: companyId,
      sku: supplier.sku, // ✅ SKU gerado automaticamente
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
      console.error('[SQL_SERVICE] ❌ Erro ao inserir fornecedores:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${suppliersToInsertWithSku.length} fornecedores inseridos`);
  }

  // ETAPA 6: DELETE fornecedores removidos (que estão no banco mas não foram enviados)
  const docsToDelete: string[] = [];
  existingDocMap.forEach((uuid, doc) => {
    if (!incomingDocs.has(doc)) {
      docsToDelete.push(doc);
    }
  });

  if (docsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('company_id', companyId)
      .in('document', docsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar fornecedores removidos:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${docsToDelete.length} fornecedores removidos: ${docsToDelete.join(', ')}`);
  }

  const totalOperations = suppliersToUpdate.length + suppliersToInsertWithSku.length + docsToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: suppliersToUpdate.length,
    inserted: suppliersToInsertWithSku.length,
    deleted: docsToDelete.length
  };
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

/**
 * Gera o próximo SKU sequencial para clientes
 * Formato: CLI-001, CLI-002, ..., CLI-999
 */
async function generateNextCustomerSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'CLI-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de clientes, gerando SKU padrão:', error);
    return 'CLI-001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku.match(/^CLI-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  return `CLI-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Gera o próximo SKU sequencial para fornecedores
 * Formato: FOR-001, FOR-002, ..., FOR-999
 */
async function generateNextSupplierSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'FOR-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de fornecedores, gerando SKU padrão:', error);
    return 'FOR-001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku.match(/^FOR-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  return `FOR-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Gera o próximo código sequencial para categorias de contas
 * Formato numérico contábil:
 * - Receitas: 3.X.YY (ex: 3.1.01, 3.1.02, 3.2.01)
 * - Despesas: 4.X.YY (ex: 4.1.01, 4.1.02, 4.2.01)
 */
async function generateNextAccountCategoryCode(companyId: string, type: 'Receita' | 'Despesa'): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Prefixo baseado no tipo: 3 para Receita, 4 para Despesa
  const prefix = type === 'Receita' ? '3' : '4';
  
  const { data, error } = await supabase
    .from('account_categories')
    .select('code')
    .eq('company_id', companyId)
    .eq('type', type)
    .like('code', `${prefix}.%`)
    .order('code', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar códigos de categorias, gerando código padrão:', error);
    return `${prefix}.1.01`;
  }

  // Encontrar o maior código existente
  let maxCode = `${prefix}.1.00`; // Default: primeira subcategoria, item 00
  
  if (data && data.length > 0) {
    // Pegar o primeiro resultado (já ordenado DESC)
    const latestCode = data[0].code;
    
    // Parse do código (ex: "3.1.05" -> ["3", "1", "05"])
    const match = latestCode.match(/^(\d+)\.(\d+)\.(\d+)$/);
    
    if (match) {
      const [, major, minor, patch] = match;
      const patchNum = parseInt(patch, 10);
      
      // Incrementar o último número
      const nextPatch = String(patchNum + 1).padStart(2, '0');
      maxCode = `${major}.${minor}.${nextPatch}`;
    }
  }

  // Se não encontrou nenhum código existente, retornar padrão
  if (maxCode === `${prefix}.1.00`) {
    return `${prefix}.1.01`;
  }

  return maxCode;
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
    // Controle de lotes (FASE 2: Unificação de campos)
    // Prioriza track_batches, usa requires_batch_control como fallback
    trackBatches: row.track_batches || row.requires_batch_control || false,
    batchFifoAuto: row.batch_fifo_auto !== false, // true por padrão
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
    // Rastreabilidade (⚠️ DEPRECADO: usar trackBatches)
    requiresBatchControl: row.track_batches || row.requires_batch_control || false,
    requiresExpiryDate: row.track_batches || row.requires_expiry_date || false,
    defaultLocation: row.default_location || '',
    shelfLife: row.shelf_life || null
  })) || [];
}

export async function saveProducts(companyId: string, products: any[]) {
  const supabase = getSupabaseClient();

  // ==================== NOVA ARQUITETURA: UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todos os produtos (protege contra perda de dados)
  // ✅ UPDATE produtos com SKU existente (preserva UUID, histórico, referências)
  // ✅ INSERT apenas produtos novos (sem SKU ou SKU não encontrado)
  // ✅ DELETE apenas produtos que foram removidos pelo usuário
  
  console.log(`[SQL_SERVICE] 🔄 Iniciando UPSERT de ${products.length} produtos`);

  // ETAPA 1: Buscar todos os produtos existentes no banco
  const { data: existingProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, sku')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar produtos existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingSkuMap = new Map<string, string>(); // sku → uuid
  existingProducts?.forEach((p: any) => {
    if (p.sku) existingSkuMap.set(p.sku, p.id);
  });

  console.log(`[SQL_SERVICE] 📊 Produtos no banco: ${existingSkuMap.size}`);

  // ETAPA 2: Classificar produtos do frontend
  const productsToUpdate: any[] = []; // Produtos com SKU existente → UPDATE
  const productsToInsert: any[] = []; // Produtos novos → INSERT
  const incomingSkus = new Set<string>(); // SKUs enviados pelo frontend

  for (const product of products) {
    // Se tem SKU e existe no banco → UPDATE
    if (product.sku && existingSkuMap.has(product.sku)) {
      productsToUpdate.push(product);
      incomingSkus.add(product.sku);
    } 
    // Se não tem SKU ou SKU não existe → INSERT (gerar novo SKU)
    else {
      productsToInsert.push(product);
      if (product.sku) incomingSkus.add(product.sku); // SKU customizado
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${productsToUpdate.length} | INSERT: ${productsToInsert.length}`);

  // ETAPA 3: Gerar SKUs para produtos novos
  const productsToInsertWithSku = await Promise.all(productsToInsert.map(async (product: any) => {
    if (product.sku) {
      // SKU customizado já definido
      return { ...product, sku: product.sku };
    }
    // Gerar novo SKU sequencial
    const newSku = await generateNextSku(companyId);
    return { ...product, sku: newSku };
  }));

  // ETAPA 4: UPDATE produtos existentes (preserva UUID)
  for (const product of productsToUpdate) {
    const uuid = existingSkuMap.get(product.sku);
    
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: product.productName || product.name,
        category: product.category || 'Geral',
        unit: product.unit || 'un',
        purchase_price: product.purchasePrice || 0,
        cost_price: product.costPrice || 0,
        sale_price: product.sellPrice || product.salePrice || product.pricePerUnit || 0,
        markup: product.markup || 0,
        stock_quantity: product.currentStock || product.stockQuantity || 0,
        min_stock: product.minStock || 0,
        max_stock: product.maxStock || 0,
        reorder_level: product.reorderLevel || 0,
        status: product.status || 'Em Estoque',
        last_restocked: product.lastRestocked || null,
        active: product.active !== undefined ? product.active : true,
        // Controle de lotes
        track_batches: product.trackBatches || false,
        batch_fifo_auto: product.batchFifoAuto !== undefined ? product.batchFifoAuto : true,
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
        // Rastreabilidade (FASE 2: Sincronizar campos antigos e novos)
        requires_batch_control: product.trackBatches || product.requiresBatchControl || false,
        requires_expiry_date: product.trackBatches || product.requiresExpiryDate || false,
        default_location: product.defaultLocation || null,
        shelf_life: product.shelfLife || null
      })
      .eq('id', uuid);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar produto ${product.sku}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${productsToUpdate.length} produtos atualizados`);

  // ETAPA 5: INSERT produtos novos
  if (productsToInsertWithSku.length > 0) {
    const rows = productsToInsertWithSku.map((product: any) => ({
      company_id: companyId,
      name: product.productName || product.name,
      sku: product.sku,
      category: product.category || 'Geral',
      unit: product.unit || 'un',
      purchase_price: product.purchasePrice || 0,
      cost_price: product.costPrice || 0,
      sale_price: product.sellPrice || product.salePrice || product.pricePerUnit || 0,
      markup: product.markup || 0,
      stock_quantity: product.currentStock || product.stockQuantity || 0,
      min_stock: product.minStock || 0,
      max_stock: product.maxStock || 0,
      reorder_level: product.reorderLevel || 0,
      status: product.status || 'Em Estoque',
      last_restocked: product.lastRestocked || null,
      active: product.active !== undefined ? product.active : true,
      // Controle de lotes
      track_batches: product.trackBatches || false,
      batch_fifo_auto: product.batchFifoAuto !== undefined ? product.batchFifoAuto : true,
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
      // Rastreabilidade (FASE 2: Sincronizar campos antigos e novos)
      requires_batch_control: product.trackBatches || product.requiresBatchControl || false,
      requires_expiry_date: product.trackBatches || product.requiresExpiryDate || false,
      default_location: product.defaultLocation || null,
      shelf_life: product.shelfLife || null
    }));

    const { error: insertError } = await supabase
      .from('products')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir produtos:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${productsToInsertWithSku.length} produtos inseridos`);
  }

  // ETAPA 6: DELETE produtos removidos (que estão no banco mas não foram enviados)
  const skusToDelete: string[] = [];
  existingSkuMap.forEach((uuid, sku) => {
    if (!incomingSkus.has(sku)) {
      skusToDelete.push(sku);
    }
  });

  if (skusToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('company_id', companyId)
      .in('sku', skusToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar produtos removidos:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${skusToDelete.length} produtos removidos: ${skusToDelete.join(', ')}`);
  }

  const totalOperations = productsToUpdate.length + productsToInsertWithSku.length + skusToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: productsToUpdate.length,
    inserted: productsToInsertWithSku.length,
    deleted: skusToDelete.length
  };
}

// ==================== EXPORT ====================

// Import extended functions
import * as extendedService from './sql-service-extended.ts';

export const sqlService = {
  authenticate,
  getCustomers,
  saveCustomers,
  getSuppliers,
  saveSuppliers,
  getProducts,
  saveProducts,
  // Entidades SQL (extended)
  createSalesOrder: extendedService.createSalesOrder,
  getSalesOrders: extendedService.getSalesOrders,
  saveSalesOrders: extendedService.saveSalesOrders,
  createPurchaseOrder: extendedService.createPurchaseOrder,
  getPurchaseOrders: extendedService.getPurchaseOrders,
  savePurchaseOrders: extendedService.savePurchaseOrders,
  getStockMovements: extendedService.getStockMovements,
  getStockMovementsWithCalculatedStocks: extendedService.getStockMovementsWithCalculatedStocks, // ✅ NOVO - Calcula estoques
  saveStockMovements: extendedService.saveStockMovements,
  createStockMovement: extendedService.createStockMovement, // ✅ NOVO
  getFinancialTransactions: extendedService.getFinancialTransactions,
  saveFinancialTransactions: extendedService.saveFinancialTransactions,
  getAccountsReceivable: extendedService.getAccountsReceivable,
  saveAccountsReceivable: extendedService.saveAccountsReceivable,
  getAccountsPayable: extendedService.getAccountsPayable,
  saveAccountsPayable: extendedService.saveAccountsPayable,
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
  
  console.log(`[SQL_SERVICE] 🔍 getCompanySettings - companyId: ${companyId}`);
  
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single();

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar company settings:', error);
    return {};
  }

  console.log(`[SQL_SERVICE] 📊 Raw settings from DB:`, data?.settings);
  console.log(`[SQL_SERVICE] 📊 Has accountCategories?`, !!data?.settings?.accountCategories);
  console.log(`[SQL_SERVICE] 📊 Has paymentMethods?`, !!data?.settings?.paymentMethods);

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
  console.log(`[SQL_SERVICE] 📥 getSalespeople - companyId: ${companyId}`);
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('salespeople')
    .select('*')
    .eq('company_id', companyId)
    .order('code', { ascending: true });
  
  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar salespeople:', error);
    throw new Error(error.message);
  }
  
  console.log(`[SQL_SERVICE] ✅ ${data?.length || 0} salespeople encontrados`);
  return data || [];
}

async function saveSalespeople(companyId: string, salespeople: any[]) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 💾 saveSalespeople - companyId: ${companyId}, count: ${salespeople.length}`);
  
  // ==================== ARQUITETURA UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todos os salespeople (protege contra perda de dados)
  // ✅ UPDATE salespeople existentes (preserva UUID e código)
  // ✅ INSERT apenas salespeople novos
  // ✅ DELETE apenas salespeople removidos pelo usuário
  
  // ETAPA 1: Buscar todos os salespeople existentes no banco
  const { data: existingSalespeople, error: fetchError } = await supabase
    .from('salespeople')
    .select('id, code')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar salespeople existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingIdMap = new Map<string, any>(); // id (UUID) → registro
  existingSalespeople?.forEach((sp: any) => {
    existingIdMap.set(sp.id, sp);
  });

  console.log(`[SQL_SERVICE] 📊 Salespeople no banco: ${existingIdMap.size}`);

  // ETAPA 2: Classificar salespeople do frontend
  const salespeopleToUpdate: any[] = []; // Salespeople com ID existente → UPDATE
  const salespeopleToInsert: any[] = []; // Salespeople novos → INSERT
  const incomingIds = new Set<string>(); // IDs enviados pelo frontend

  for (const salesperson of salespeople) {
    // Se tem ID e existe no banco → UPDATE
    if (salesperson.id && existingIdMap.has(salesperson.id)) {
      salespeopleToUpdate.push(salesperson);
      incomingIds.add(salesperson.id);
    } 
    // Se não tem ID ou ID não existe → INSERT
    else {
      salespeopleToInsert.push(salesperson);
      if (salesperson.id) incomingIds.add(salesperson.id);
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${salespeopleToUpdate.length} | INSERT: ${salespeopleToInsert.length}`);

  // ETAPA 3: UPDATE salespeople existentes (preserva UUID e código)
  for (const salesperson of salespeopleToUpdate) {
    const { error: updateError } = await supabase
      .from('salespeople')
      .update({
        code: salesperson.code, // Preservar código customizado
        name: salesperson.name,
        email: salesperson.email || '',
        phone: salesperson.phone || '',
        address: salesperson.address || '',
        street: salesperson.street || '',
        number: salesperson.number || '',
        complement: salesperson.complement || '',
        neighborhood: salesperson.neighborhood || '',
        city: salesperson.city || '',
        state: salesperson.state || '',
        zip_code: salesperson.zipCode || '',
        is_active: salesperson.isActive ?? true
      })
      .eq('id', salesperson.id);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar salesperson ${salesperson.id}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${salespeopleToUpdate.length} salespeople atualizados`);

  // ETAPA 4: Gerar códigos para salespeople novos (sequencial)
  let codeCounter = 1;

  // Encontrar o maior código existente
  existingSalespeople?.forEach((sp: any) => {
    if (sp.code) {
      const match = sp.code.match(/^(\d+)$/);
      if (match) {
        const [, code] = match;
        const codeNum = parseInt(code, 10);
        
        if (codeNum >= codeCounter) {
          codeCounter = codeNum + 1;
        }
      }
    }
  });

  // Gerar códigos para novos salespeople
  const salespeopleToInsertWithCode = salespeopleToInsert.map((salesperson: any) => {
    if (salesperson.code) {
      // Código customizado já definido
      return { ...salesperson, code: salesperson.code };
    }
    
    // Gerar código sequencial
    const newCode = String(codeCounter).padStart(3, '0');
    codeCounter++;
    
    console.log(`[SQL_SERVICE] 🔢 Código gerado: ${newCode} para "${salesperson.name}"`);
    return { ...salesperson, code: newCode };
  });

  // ETAPA 5: INSERT salespeople novos (com códigos gerados)
  if (salespeopleToInsertWithCode.length > 0) {
    const rows = salespeopleToInsertWithCode.map((salesperson: any) => ({
      company_id: companyId,
      code: salesperson.code,
      name: salesperson.name,
      email: salesperson.email || '',
      phone: salesperson.phone || '',
      address: salesperson.address || '',
      street: salesperson.street || '',
      number: salesperson.number || '',
      complement: salesperson.complement || '',
      neighborhood: salesperson.neighborhood || '',
      city: salesperson.city || '',
      state: salesperson.state || '',
      zip_code: salesperson.zipCode || '',
      is_active: salesperson.isActive ?? true
    }));

    const { error: insertError } = await supabase
      .from('salespeople')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir salespeople:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${salespeopleToInsertWithCode.length} salespeople inseridos`);
  }

  // ETAPA 6: DELETE salespeople removidos
  const idsToDelete: string[] = [];
  existingIdMap.forEach((sp, id) => {
    if (!incomingIds.has(id)) {
      idsToDelete.push(id);
    }
  });

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('salespeople')
      .delete()
      .eq('company_id', companyId)
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar salespeople removidos:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${idsToDelete.length} salespeople removidos`);
  }

  const totalOperations = salespeopleToUpdate.length + salespeopleToInsertWithCode.length + idsToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: salespeopleToUpdate.length,
    inserted: salespeopleToInsertWithCode.length,
    deleted: idsToDelete.length
  };
}

// BUYERS
async function getBuyers(companyId: string) {
  console.log(`[SQL_SERVICE] 📥 getBuyers - companyId: ${companyId}`);
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('company_id', companyId)
    .order('code', { ascending: true });
  
  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar buyers:', error);
    throw new Error(error.message);
  }
  
  console.log(`[SQL_SERVICE] ✅ ${data?.length || 0} buyers encontrados`);
  return data || [];
}

async function saveBuyers(companyId: string, buyers: any[]) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 💾 saveBuyers - companyId: ${companyId}, count: ${buyers.length}`);
  
  // ==================== ARQUITETURA UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todos os buyers (protege contra perda de dados)
  // ✅ UPDATE buyers existentes (preserva UUID e código)
  // ✅ INSERT apenas buyers novos
  // ✅ DELETE apenas buyers removidos pelo usuário
  
  // ETAPA 1: Buscar todos os buyers existentes no banco
  const { data: existingBuyers, error: fetchError } = await supabase
    .from('buyers')
    .select('id, code')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar buyers existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingIdMap = new Map<string, any>(); // id (UUID) → registro
  existingBuyers?.forEach((buyer: any) => {
    existingIdMap.set(buyer.id, buyer);
  });

  console.log(`[SQL_SERVICE] 📊 Buyers no banco: ${existingIdMap.size}`);

  // ETAPA 2: Classificar buyers do frontend
  const buyersToUpdate: any[] = []; // Buyers com ID existente → UPDATE
  const buyersToInsert: any[] = []; // Buyers novos → INSERT
  const incomingIds = new Set<string>(); // IDs enviados pelo frontend

  for (const buyer of buyers) {
    // Se tem ID e existe no banco → UPDATE
    if (buyer.id && existingIdMap.has(buyer.id)) {
      buyersToUpdate.push(buyer);
      incomingIds.add(buyer.id);
    } 
    // Se não tem ID ou ID não existe → INSERT
    else {
      buyersToInsert.push(buyer);
      if (buyer.id) incomingIds.add(buyer.id);
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${buyersToUpdate.length} | INSERT: ${buyersToInsert.length}`);

  // ETAPA 3: UPDATE buyers existentes (preserva UUID e código)
  for (const buyer of buyersToUpdate) {
    const { error: updateError } = await supabase
      .from('buyers')
      .update({
        code: buyer.code, // Preservar código customizado
        name: buyer.name,
        email: buyer.email || '',
        phone: buyer.phone || '',
        is_active: buyer.isActive ?? buyer.is_active ?? true
      })
      .eq('id', buyer.id);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar buyer ${buyer.id}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${buyersToUpdate.length} buyers atualizados`);

  // ETAPA 4: Gerar códigos para buyers novos (sequencial)
  let codeCounter = 1;

  // Encontrar o maior código existente (formato BY-XXX)
  existingBuyers?.forEach((buyer: any) => {
    if (buyer.code) {
      const match = buyer.code.match(/^BY-(\d+)$/);
      if (match) {
        const codeNum = parseInt(match[1], 10);
        
        if (codeNum >= codeCounter) {
          codeCounter = codeNum + 1;
        }
      }
    }
  });

  // Gerar códigos para novos buyers
  const buyersToInsertWithCode = buyersToInsert.map((buyer: any) => {
    if (buyer.code) {
      // Código customizado já definido
      return { ...buyer, code: buyer.code };
    }
    
    // Gerar código sequencial
    const newCode = `BY-${String(codeCounter).padStart(3, '0')}`;
    codeCounter++;
    
    console.log(`[SQL_SERVICE] 🔢 Código gerado: ${newCode} para "${buyer.name}"`);
    return { ...buyer, code: newCode };
  });

  // ETAPA 5: INSERT buyers novos (com códigos gerados)
  if (buyersToInsertWithCode.length > 0) {
    const rows = buyersToInsertWithCode.map((buyer: any) => ({
      company_id: companyId,
      code: buyer.code,
      name: buyer.name,
      email: buyer.email || '',
      phone: buyer.phone || '',
      is_active: buyer.isActive ?? buyer.is_active ?? true
    }));

    const { error: insertError } = await supabase
      .from('buyers')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir buyers:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${buyersToInsertWithCode.length} buyers inseridos`);
  }

  // ETAPA 6: DELETE buyers removidos
  const idsToDelete: string[] = [];
  existingIdMap.forEach((buyer, id) => {
    if (!incomingIds.has(id)) {
      idsToDelete.push(id);
    }
  });

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('buyers')
      .delete()
      .eq('company_id', companyId)
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar buyers removidos:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${idsToDelete.length} buyers removidos`);
  }

  const totalOperations = buyersToUpdate.length + buyersToInsertWithCode.length + idsToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: buyersToUpdate.length,
    inserted: buyersToInsertWithCode.length,
    deleted: idsToDelete.length
  };
}

// PAYMENT METHODS (temporário - depois migrar para tabela)
async function getPaymentMethods(companyId: string) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 📥 getPaymentMethods - companyId: ${companyId}`);
  
  // ✅ MIGRADO: Buscar da tabela SQL payment_methods
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar payment methods:', error);
    throw new Error(`Erro ao buscar payment methods: ${error.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ ${data?.length || 0} payment methods carregados da tabela SQL`);
  
  // Mapear para o formato esperado pelo frontend
  return (data || []).map(pm => ({
    id: pm.id,
    name: pm.name,
    type: pm.type,
    installmentsAllowed: pm.installments_allowed,
    isActive: pm.is_active
  }));
}

async function savePaymentMethods(companyId: string, paymentMethods: any[]) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 💾 savePaymentMethods - companyId: ${companyId}, count: ${paymentMethods.length}`);
  
  // ✅ MIGRADO: Salvar na tabela SQL payment_methods
  
  // 1️⃣ Deletar todos os registros existentes da empresa
  const { error: deleteError } = await supabase
    .from('payment_methods')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar payment methods:', deleteError);
    throw new Error(`Erro ao deletar payment methods: ${deleteError.message}`);
  }

  // 2️⃣ Inserir novos registros (sem id - deixar PostgreSQL gerar UUID)
  const recordsToInsert = paymentMethods.map(pm => ({
    // ❌ NÃO incluir id - deixar PostgreSQL gerar UUID automaticamente
    company_id: companyId,
    name: pm.name,
    type: pm.type,
    installments_allowed: pm.installmentsAllowed,
    is_active: pm.isActive ?? true
  }));

  const { error: insertError } = await supabase
    .from('payment_methods')
    .insert(recordsToInsert);

  if (insertError) {
    console.error('[SQL_SERVICE] ❌ Erro ao inserir payment methods:', insertError);
    throw new Error(`Erro ao inserir payment methods: ${insertError.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ ${paymentMethods.length} payment methods salvos na tabela SQL`);
  return { success: true, count: paymentMethods.length };
}

// ACCOUNT CATEGORIES (temporário - depois migrar para tabela)
async function getAccountCategories(companyId: string) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 📥 getAccountCategories - companyId: ${companyId}`);
  
  // ✅ MIGRADO: Buscar da tabela SQL account_categories COM JOIN em dre_lines
  const { data, error } = await supabase
    .from('account_categories')
    .select(`
      *,
      dre_lines:dre_line_id (
        id,
        code,
        name
      )
    `)
    .eq('company_id', companyId)
    .order('code', { ascending: true });

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar account categories:', error);
    throw new Error(`Erro ao buscar account categories: ${error.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ ${data?.length || 0} account categories carregados da tabela SQL`);
  
  // Mapear para o formato esperado pelo frontend
  return (data || []).map(ac => ({
    id: ac.id,
    type: ac.type,
    code: ac.code,
    name: ac.name,
    description: ac.description,
    parentId: ac.parent_id,
    level: ac.level,
    accountType: ac.account_type,
    dreLineItem: ac.dre_line_item, // ⚠️ DEPRECATED
    dreLineId: ac.dre_line_id, // ✅ NOVO: UUID da linha DRE
    dreLineName: ac.dre_lines?.name || null, // ✅ NOVO: Nome da linha DRE
    dreLineCode: ac.dre_lines?.code || null, // ✅ NOVO: Código da linha DRE
    sortOrder: ac.sort_order,
    isActive: ac.is_active
  }));
}

async function saveAccountCategories(companyId: string, categories: any[]) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 💾 saveAccountCategories - companyId: ${companyId}, count: ${categories.length}`);
  
  // ==================== ARQUITETURA UPSERT INTELIGENTE ====================
  // ✅ NUNCA deleta todas as categorias (protege contra perda de dados)
  // ✅ UPDATE categorias existentes (preserva UUID e código)
  // ✅ INSERT apenas categorias novas
  // ✅ DELETE apenas categorias removidas pelo usuário
  
  // ETAPA 1: Buscar todas as categorias existentes no banco
  const { data: existingCategories, error: fetchError } = await supabase
    .from('account_categories')
    .select('id, code, type')
    .eq('company_id', companyId);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar categorias existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingIdMap = new Map<string, any>(); // id (UUID) → registro
  existingCategories?.forEach((cat: any) => {
    existingIdMap.set(cat.id, cat);
  });

  console.log(`[SQL_SERVICE] 📊 Categorias no banco: ${existingIdMap.size}`);

  // ETAPA 2: Classificar categorias do frontend
  const categoriesToUpdate: any[] = []; // Categorias com ID existente → UPDATE
  const categoriesToInsert: any[] = []; // Categorias novas → INSERT
  const incomingIds = new Set<string>(); // IDs enviados pelo frontend

  for (const category of categories) {
    // Se tem ID e existe no banco → UPDATE
    if (category.id && existingIdMap.has(category.id)) {
      categoriesToUpdate.push(category);
      incomingIds.add(category.id);
    } 
    // Se não tem ID ou ID não existe → INSERT
    else {
      categoriesToInsert.push(category);
      if (category.id) incomingIds.add(category.id);
    }
  }

  console.log(`[SQL_SERVICE] 📝 UPDATE: ${categoriesToUpdate.length} | INSERT: ${categoriesToInsert.length}`);

  // ETAPA 3: UPDATE categorias existentes (preserva UUID e código)
  for (const category of categoriesToUpdate) {
    const { error: updateError } = await supabase
      .from('account_categories')
      .update({
        type: category.type,
        code: category.code, // Preservar código customizado
        name: category.name,
        description: category.description || '',
        parent_id: category.parentId || null,
        level: category.level || 1,
        account_type: category.accountType || 'analitica',
        dre_line_id: category.dreLineId || null, // ✅ CORRIGIDO: Usar dre_line_id
        sort_order: category.sortOrder || 0,
        is_active: category.isActive ?? true
      })
      .eq('id', category.id);

    if (updateError) {
      console.error(`[SQL_SERVICE] ❌ Erro ao atualizar categoria ${category.id}:`, updateError);
      throw new Error(updateError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${categoriesToUpdate.length} categorias atualizadas`);

  // ETAPA 4: Gerar códigos para categorias novas (sequencial por tipo)
  let receiptCodeCounter = 1;
  let expenseCodeCounter = 1;

  // Encontrar o maior código existente para cada tipo
  existingCategories?.forEach((cat: any) => {
    if (cat.code) {
      const match = cat.code.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (match) {
        const [, major, minor, patch] = match;
        const patchNum = parseInt(patch, 10);
        
        if (cat.type === 'Receita' && major === '3') {
          if (patchNum >= receiptCodeCounter) {
            receiptCodeCounter = patchNum + 1;
          }
        } else if (cat.type === 'Despesa' && major === '4') {
          if (patchNum >= expenseCodeCounter) {
            expenseCodeCounter = patchNum + 1;
          }
        }
      }
    }
  });

  // Gerar códigos para novas categorias
  const categoriesToInsertWithCode = categoriesToInsert.map((category: any) => {
    if (category.code) {
      // Código customizado já definido
      return { ...category, code: category.code };
    }
    
    // Gerar código sequencial baseado no tipo
    let newCode: string;
    if (category.type === 'Receita') {
      newCode = `3.1.${String(receiptCodeCounter).padStart(2, '0')}`;
      receiptCodeCounter++;
    } else {
      newCode = `4.1.${String(expenseCodeCounter).padStart(2, '0')}`;
      expenseCodeCounter++;
    }
    
    console.log(`[SQL_SERVICE] 🔢 Código gerado: ${newCode} para "${category.name}"`);
    return { ...category, code: newCode };
  });

  // ETAPA 5: INSERT categorias novas (com códigos gerados)
  if (categoriesToInsertWithCode.length > 0) {
    const rows = categoriesToInsertWithCode.map((category: any) => ({
      company_id: companyId,
      type: category.type,
      code: category.code,
      name: category.name,
      description: category.description || '',
      parent_id: category.parentId || null,
      level: category.level || 1,
      account_type: category.accountType || 'analitica',
      dre_line_id: category.dreLineId || null, // ✅ CORRIGIDO: Usar dre_line_id
      sort_order: category.sortOrder || 0,
      is_active: category.isActive ?? true
    }));

    const { error: insertError } = await supabase
      .from('account_categories')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir categorias:', insertError);
      throw new Error(insertError.message);
    }

    console.log(`[SQL_SERVICE] ✅ ${categoriesToInsertWithCode.length} categorias inseridas`);
  }

  // ETAPA 6: DELETE categorias removidas
  const idsToDelete: string[] = [];
  existingIdMap.forEach((cat, id) => {
    if (!incomingIds.has(id)) {
      idsToDelete.push(id);
    }
  });

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('account_categories')
      .delete()
      .eq('company_id', companyId)
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao deletar categorias removidas:', deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`[SQL_SERVICE] 🗑️  ${idsToDelete.length} categorias removidas`);
  }

  const totalOperations = categoriesToUpdate.length + categoriesToInsertWithCode.length + idsToDelete.length;
  console.log(`[SQL_SERVICE] ✅ UPSERT completo: ${totalOperations} operações`);
  
  return { 
    success: true, 
    updated: categoriesToUpdate.length,
    inserted: categoriesToInsertWithCode.length,
    deleted: idsToDelete.length
  };
}

// PRODUCT CATEGORIES - ✅ MIGRADO PARA TABELA SQL
async function getProductCategories(companyId: string) {
  console.log(`[SQL_SERVICE] 📥 getProductCategories - companyId: ${companyId}`);
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[SQL_SERVICE] ❌ getProductCategories - Erro:', error);
    throw new Error(error.message);
  }

  console.log(`[SQL_SERVICE] ✅ getProductCategories - ${data?.length || 0} categorias carregadas`);
  
  // Mapear para o formato esperado pelo frontend
  return (data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    parentId: cat.parent_id,
    defaultNcm: cat.default_ncm,
    defaultCest: cat.default_cest,
    defaultOrigin: cat.default_origin,
    defaultCfop: cat.default_cfop,
    defaultIcmsRate: cat.default_icms_rate,
    defaultPisRate: cat.default_pis_rate,
    defaultCofinsRate: cat.default_cofins_rate,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at
  }));
}

async function saveProductCategories(companyId: string, categories: any[]) {
  const supabase = getSupabaseClient();
  console.log(`[SQL_SERVICE] 💾 saveProductCategories - companyId: ${companyId}, count: ${categories.length}`);
  
  // ✅ MIGRADO: Salvar na tabela SQL product_categories
  
  // 1. Buscar categorias existentes
  const { data: existing, error: fetchError } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (fetchError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar categorias existentes:', fetchError);
    throw new Error(fetchError.message);
  }

  const existingMap = new Map(existing?.map(cat => [cat.name, cat.id]) || []);
  
  // 2. Identificar categorias para inserir (novas) e atualizar (existentes)
  const categoriesToInsert: any[] = [];
  const categoriesToUpdate: any[] = [];
  
  for (const category of categories) {
    const categoryName = typeof category === 'string' ? category : category.name;
    const existingId = existingMap.get(categoryName);
    
    if (existingId) {
      // Categoria já existe - atualizar
      categoriesToUpdate.push({
        id: existingId,
        ...( typeof category === 'object' ? {
          description: category.description,
          parent_id: category.parentId,
          default_ncm: category.defaultNcm,
          default_cest: category.defaultCest,
          default_origin: category.defaultOrigin,
          default_cfop: category.defaultCfop,
          default_icms_rate: category.defaultIcmsRate,
          default_pis_rate: category.defaultPisRate,
          default_cofins_rate: category.defaultCofinsRate
        } : {})
      });
    } else {
      // Categoria nova - inserir
      categoriesToInsert.push({
        company_id: companyId,
        name: categoryName,
        description: typeof category === 'object' ? category.description : null,
        parent_id: typeof category === 'object' ? category.parentId : null,
        default_ncm: typeof category === 'object' ? category.defaultNcm : null,
        default_cest: typeof category === 'object' ? category.defaultCest : null,
        default_origin: typeof category === 'object' ? category.defaultOrigin : null,
        default_cfop: typeof category === 'object' ? category.defaultCfop : null,
        default_icms_rate: typeof category === 'object' ? category.defaultIcmsRate : null,
        default_pis_rate: typeof category === 'object' ? category.defaultPisRate : null,
        default_cofins_rate: typeof category === 'object' ? category.defaultCofinsRate : null,
        is_active: true
      });
    }
  }

  // 3. Identificar categorias removidas (soft delete)
  const categoryNames = categories.map(cat => typeof cat === 'string' ? cat : cat.name);
  const idsToDelete = existing
    ?.filter(cat => !categoryNames.includes(cat.name))
    .map(cat => cat.id) || [];

  // 4. Executar operações
  let insertedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  if (categoriesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('product_categories')
      .insert(categoriesToInsert);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir categorias:', insertError);
      throw new Error(insertError.message);
    }
    insertedCount = categoriesToInsert.length;
    console.log(`[SQL_SERVICE] ✅ ${insertedCount} categorias inseridas`);
  }

  if (categoriesToUpdate.length > 0) {
    for (const category of categoriesToUpdate) {
      const { id, ...updates } = category;
      const { error: updateError } = await supabase
        .from('product_categories')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('[SQL_SERVICE] ❌ Erro ao atualizar categoria:', updateError);
        throw new Error(updateError.message);
      }
    }
    updatedCount = categoriesToUpdate.length;
    console.log(`[SQL_SERVICE] ✅ ${updatedCount} categorias atualizadas`);
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_categories')
      .update({ is_active: false })
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[SQL_SERVICE] ❌ Erro ao desativar categorias:', deleteError);
      throw new Error(deleteError.message);
    }
    deletedCount = idsToDelete.length;
    console.log(`[SQL_SERVICE] ✅ ${deletedCount} categorias desativadas`);
  }

  return { 
    success: true, 
    count: categories.length,
    inserted: insertedCount,
    updated: updatedCount,
    deleted: deletedCount
  };
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
  return settings.reconciliationStatus || [];
}

async function saveReconciliationStatus(companyId: string, reconciliationStatus: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.reconciliationStatus = reconciliationStatus;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: reconciliationStatus.length };
}

// LAST ANALYSIS DATE
async function getLastAnalysisDate(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return settings.lastAnalysisDate || [];
}

async function saveLastAnalysisDate(companyId: string, lastAnalysisDate: any[]) {
  const settings = await getCompanySettings(companyId);
  settings.lastAnalysisDate = lastAnalysisDate;
  await saveCompanySettings(companyId, settings);
  return { success: true, count: lastAnalysisDate.length };
}