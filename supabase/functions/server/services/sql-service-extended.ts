/**
 * ===================================================================
 * SQL SERVICE EXTENDED - Entidades Adicionais
 * ===================================================================
 * 
 * Funções para entidades que possuem relações ou estruturas mais complexas
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * ✅ HELPER: Converter tipo de transação de PT para EN
 * Frontend envia: "Receita" | "Despesa"
 * Backend precisa: "income" | "expense"
 */
function normalizeTransactionType(type: string): 'income' | 'expense' {
  if (type === 'Receita' || type === 'income') return 'income';
  if (type === 'Despesa' || type === 'expense') return 'expense';
  
  // Fallback: tentar detectar pelo contexto
  console.warn(`[SQL_SERVICE] ⚠️ Tipo de transação desconhecido: "${type}", usando "income" como fallback`);
  return 'income';
}

/**
 * ✅ HELPER: Normalizar status de Accounts Receivable/Payable (PT → EN)
 * Frontend envia: "A Vencer" | "A Receber" | "Vencido" | "Recebido" | "Parcial" | "Cancelado"
 * Backend precisa: "pending" | "paid" | "overdue" | "cancelled"
 */
function normalizeAccountStatus(status: string): 'pending' | 'paid' | 'overdue' | 'cancelled' {
  // Normalizar para minúsculas e remover acentos para comparação
  const normalized = status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Mapeamento PT → EN
  if (normalized === 'a vencer' || normalized === 'a receber' || normalized === 'pending') return 'pending';
  if (normalized === 'recebido' || normalized === 'pago' || normalized === 'paid') return 'paid';
  if (normalized === 'vencido' || normalized === 'overdue') return 'overdue';
  if (normalized === 'cancelado' || normalized === 'cancelled') return 'cancelled';
  if (normalized === 'parcial') return 'pending'; // Parcial = pendente parcialmente
  
  // Fallback
  console.warn(`[SQL_SERVICE] ⚠️ Status de conta desconhecido: "${status}", usando "pending" como fallback`);
  return 'pending';
}

/**
 * ✅ HELPER: Desnormalizar status de Accounts Receivable (EN → PT)
 * Backend retorna: "pending" | "paid" | "overdue" | "cancelled"
 * Frontend precisa: "A Vencer" | "Vencido" | "Recebido" | "Cancelado"
 */
function denormalizeAccountReceivableStatus(status: string): string {
  if (status === 'pending') return 'A Vencer';
  if (status === 'paid') return 'Recebido';
  if (status === 'overdue') return 'Vencido';
  if (status === 'cancelled') return 'Cancelado';
  
  // Fallback: retornar o status original
  console.warn(`[SQL_SERVICE] ⚠️ Status de conta a receber desconhecido: "${status}", retornando original`);
  return status;
}

/**
 * ✅ HELPER: Desnormalizar status de Accounts Payable (EN → PT)
 * Backend retorna: "pending" | "paid" | "overdue" | "cancelled"
 * Frontend precisa: "A Pagar" | "Vencido" | "Pago" | "Cancelado"
 */
function denormalizeAccountPayableStatus(status: string): string {
  if (status === 'pending') return 'A Pagar';
  if (status === 'paid') return 'Pago';
  if (status === 'overdue') return 'Vencido';
  if (status === 'cancelled') return 'Cancelado';
  
  // Fallback: retornar o status original
  console.warn(`[SQL_SERVICE] ⚠️ Status de conta a pagar desconhecido: "${status}", retornando original`);
  return status;
}

/**
 * ✅ HELPER: Normalizar status de Financial Transactions
 * CHECK CONSTRAINT: status IN ('A Receber', 'Recebido', 'A Pagar', 'Pago', 'Cancelado')
 */
function normalizeFinancialTransactionStatus(
  status: string | undefined,
  transactionType: 'income' | 'expense'
): 'A Receber' | 'Recebido' | 'A Pagar' | 'Pago' | 'Cancelado' {
  const allowedStatuses = ['A Receber', 'Recebido', 'A Pagar', 'Pago', 'Cancelado'];
  if (status && allowedStatuses.includes(status)) return status as any;
  
  if (status === 'pending') return transactionType === 'income' ? 'A Receber' : 'A Pagar';
  if (status === 'paid') return transactionType === 'income' ? 'Recebido' : 'Pago';
  if (status === 'overdue') return transactionType === 'income' ? 'A Receber' : 'A Pagar';
  if (status === 'cancelled') return 'Cancelado';
  
  return 'Pago';
}

/**
 * ✅ HELPER: Normalizar origin - CHECK: origin IN ('Manual', 'Pedido')
 */
function normalizeFinancialTransactionOrigin(origin: string | undefined): 'Manual' | 'Pedido' {
  return (origin === 'Manual' || origin === 'Pedido') ? origin : 'Manual';
}

/**
 * ✅ HELPER: Normalizar party_type - CHECK: ('Cliente', 'Fornecedor', 'Outro')
 */
function normalizeFinancialTransactionPartyType(
  partyType: string | undefined
): 'Cliente' | 'Fornecedor' | 'Outro' | null {
  if (!partyType) return null;
  
  const allowedTypes = ['Cliente', 'Fornecedor', 'Outro'];
  if (allowedTypes.includes(partyType)) return partyType as any;
  
  if (partyType === 'customer' || partyType === 'client') return 'Cliente';
  if (partyType === 'supplier' || partyType === 'vendor') return 'Fornecedor';
  
  return 'Outro';
}

/**
 * ✅ HELPER: Normalizar transfer_direction - CHECK: ('origem', 'destino')
 */
function normalizeFinancialTransactionTransferDirection(
  direction: string | undefined
): 'origem' | 'destino' | null {
  return (direction === 'origem' || direction === 'destino') ? direction : null;
}

/**
 * Converte SKU de cliente para UUID
 * Se já for UUID, retorna o mesmo valor
 */
async function resolveCustomerId(companyId: string, customerIdOrSku: string): Promise<string> {
  // Se parece com UUID, retornar diretamente
  if (customerIdOrSku && customerIdOrSku.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return customerIdOrSku;
  }

  // Se parece com SKU (CLI-XXX), buscar UUID
  if (customerIdOrSku && customerIdOrSku.startsWith('CLI-')) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('sku', customerIdOrSku)
      .single();

    if (error || !data) {
      console.error(`[SQL_SERVICE] ⚠️ Cliente não encontrado para SKU ${customerIdOrSku}`);
      return customerIdOrSku; // Retornar original e deixar banco rejeitar
    }

    console.log(`[SQL_SERVICE] 🔄 SKU ${customerIdOrSku} → UUID ${data.id}`);
    return data.id;
  }

  // Retornar original
  return customerIdOrSku;
}

/**
 * Converte SKU de fornecedor para UUID
 * Se já for UUID, retorna o mesmo valor
 */
async function resolveSupplierId(companyId: string, supplierIdOrSku: string): Promise<string> {
  // Se parece com UUID, retornar diretamente
  if (supplierIdOrSku && supplierIdOrSku.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return supplierIdOrSku;
  }

  // Se parece com SKU (FOR-XXX), buscar UUID
  if (supplierIdOrSku && supplierIdOrSku.startsWith('FOR-')) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .eq('sku', supplierIdOrSku)
      .single();

    if (error || !data) {
      console.error(`[SQL_SERVICE] ⚠️ Fornecedor não encontrado para SKU ${supplierIdOrSku}`);
      return supplierIdOrSku; // Retornar original e deixar banco rejeitar
    }

    console.log(`[SQL_SERVICE] 🔄 SKU ${supplierIdOrSku} → UUID ${data.id}`);
    return data.id;
  }

  // Retornar original
  return supplierIdOrSku;
}

/**
 * Converte SKU de produto para UUID
 * Se já for UUID, retorna o mesmo valor
 */
async function resolveProductId(companyId: string, productIdOrSku: string): Promise<string> {
  // Se parece com UUID, retornar diretamente
  if (productIdOrSku && productIdOrSku.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return productIdOrSku;
  }

  // Se parece com SKU (PROD-XXX), buscar UUID
  if (productIdOrSku && productIdOrSku.startsWith('PROD-')) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('company_id', companyId)
      .eq('sku', productIdOrSku)
      .is('deleted_at', null) // ✅ Filtrar apenas produtos ativos
      .maybeSingle(); // ✅ Usar maybeSingle() para evitar erro se não encontrar

    if (error || !data) {
      console.error(`[SQL_SERVICE] ⚠️ Produto não encontrado para SKU ${productIdOrSku}`, error);
      return productIdOrSku; // Retornar original e deixar banco rejeitar
    }

    console.log(`[SQL_SERVICE] 🔄 SKU ${productIdOrSku} → UUID ${data.id}`);
    return data.id;
  }

  // Retornar original
  return productIdOrSku;
}

/**
 * Gera o próximo número de pedido de venda
 * Formato: PV-0001, PV-0002, ..., PV-9999, PV-10000...
 */
async function generateNextSalesOrderNumber(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Buscar todos os order_numbers que seguem o padrão PV-####
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_number')
    .eq('company_id', companyId)
    .like('order_number', 'PV-%')
    .order('order_number', { ascending: false })
    .limit(100); // Buscar últimos 100 para performance

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar order numbers de vendas, gerando padrão:', error);
    return 'PV-0001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    // Extrair o maior número dos order_numbers existentes
    data.forEach((row: any) => {
      const match = row.order_number.match(/^PV-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const orderNumber = `PV-${String(nextNumber).padStart(4, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado order_number: ${orderNumber} (maxNumber: ${maxNumber})`);
  return orderNumber;
}

/**
 * Gera o próximo número de pedido de compra
 * Formato: PC-0001, PC-0002, ..., PC-9999, PC-10000...
 */
async function generateNextPurchaseOrderNumber(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Buscar todos os order_numbers que seguem o padrão PC-####
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('order_number')
    .eq('company_id', companyId)
    .like('order_number', 'PC-%')
    .order('order_number', { ascending: false })
    .limit(100); // Buscar últimos 100 para performance

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar order numbers de compras, gerando padrão:', error);
    return 'PC-0001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    // Extrair o maior número dos order_numbers existentes
    data.forEach((row: any) => {
      const match = row.order_number.match(/^PC-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const orderNumber = `PC-${String(nextNumber).padStart(4, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado order_number: ${orderNumber} (maxNumber: ${maxNumber})`);
  return orderNumber;
}

/**
 * Gera o próximo SKU de Financial Transaction
 * Formato: FT-0001, FT-0002, ..., FT-9999, FT-10000...
 */
export async function generateNextFinancialTransactionSKU(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  console.log(`[SQL_SERVICE] 🔢 Iniciando geração de SKU para empresa: ${companyId}`);
  
  // Buscar todos os SKUs que seguem o padrão FT-####
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'FT-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de financial transactions, gerando padrão:', error);
    console.error('[SQL_SERVICE] 🔍 Company ID usado na query:', companyId);
    return 'FT-0001';
  }

  console.log(`[SQL_SERVICE] 🔍 Encontrados ${data?.length || 0} SKUs existentes para empresa ${companyId}`);
  if (data && data.length > 0) {
    console.log(`[SQL_SERVICE] 📋 Primeiros SKUs encontrados:`, data.slice(0, 5).map(r => r.sku));
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku?.match(/^FT-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const sku = `FT-${String(nextNumber).padStart(4, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado SKU financial transaction: ${sku} (maxNumber: ${maxNumber}, empresa: ${companyId})`);
  return sku;
}

/**
 * Gera o próximo SKU de Accounts Receivable
 * Formato: AR-0001, AR-0002, ..., AR-9999, AR-10000...
 */
async function generateNextAccountsReceivableSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'AR-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de accounts receivable, gerando padrão:', error);
    return 'AR-0001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku?.match(/^AR-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const sku = `AR-${String(nextNumber).padStart(4, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado SKU accounts receivable: ${sku} (maxNumber: ${maxNumber})`);
  return sku;
}

/**
 * Gera o próximo SKU de Accounts Payable
 * Formato: AP-0001, AP-0002, ..., AP-9999, AP-10000...
 */
async function generateNextAccountsPayableSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'AP-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de accounts payable, gerando padrão:', error);
    return 'AP-0001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku?.match(/^AP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const sku = `AP-${String(nextNumber).padStart(4, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado SKU accounts payable: ${sku} (maxNumber: ${maxNumber})`);
  return sku;
}

/**
 * ✅ NOVA FUNÇÃO: Cria um único pedido de venda e retorna imediatamente com SKU gerado
 * Evita duplicações e problemas de sincronização
 */
export async function createSalesOrder(companyId: string, orderData: any) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] ➕ Criando novo sales order para empresa ${companyId}`);

  // Gerar order_number sequencial
  const orderNumber = await generateNextSalesOrderNumber(companyId);
  console.log(`[SQL_SERVICE] 🔢 Order number gerado: ${orderNumber}`);

  // Preparar dados do pedido
  const order = {
    company_id: companyId,
    order_number: orderNumber,
    customer_id: await resolveCustomerId(companyId, orderData.customerId),
    customer_name: orderData.customer || orderData.customerName || '',
    product_name: orderData.productName || '',
    quantity: orderData.quantity || 0,
    unit_price: orderData.unitPrice || 0,
    order_date: orderData.orderDate || new Date().toISOString().split('T')[0],
    due_date: orderData.dueDate || orderData.deliveryDate,
    issue_date: orderData.issueDate,
    billing_date: orderData.billingDate,
    delivery_date: orderData.deliveryDate,
    payment_method: orderData.paymentMethod || '',
    payment_condition: orderData.paymentCondition || '',
    status: orderData.status || 'Processando',
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    total: orderData.totalAmount || 0,
    notes: orderData.notes || '',
    price_table_id: orderData.priceTableId,
    revenue_category_id: orderData.revenueCategoryId,
    sales_person: orderData.salesPerson,
    bank_account_id: isValidUUID(orderData.bankAccountId) ? orderData.bankAccountId : null,
    first_installment_days: orderData.firstInstallmentDays || 0,
    due_date_reference: orderData.dueDateReference || 'issue',
    stock_reduced: orderData.actionFlags?.stockReduced || orderData.stockReduced || false,
    accounts_receivable_created: orderData.actionFlags?.accountsReceivableCreated || orderData.accountsReceivableCreated || false,
    accounts_receivable_paid: orderData.actionFlags?.accountsReceivablePaid || orderData.accountsReceivablePaid || false,
    customer_stats_updated: orderData.actionFlags?.customerStatsUpdated || orderData.customerStatsUpdated || false,
    is_exceptional_order: orderData.isExceptionalOrder || false
  };

  // Inserir pedido
  const { data: insertedOrder, error: insertError } = await supabase
    .from('sales_orders')
    .insert(order)
    .select('id, order_number')
    .single();

  if (insertError) {
    console.error('[SQL_SERVICE] ❌ Erro ao criar sales order:', insertError);
    throw new Error(`Erro ao criar pedido: ${insertError.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ Sales order criado: ${insertedOrder.order_number} (UUID: ${insertedOrder.id})`);

  // Se houver items, inserir também
  if (orderData.items && orderData.items.length > 0) {
    console.log(`[SQL_SERVICE] 📦 Inserindo ${orderData.items.length} items`);

    const itemsWithResolvedIds = await Promise.all(
      orderData.items.map(async (item: any) => ({
        company_id: companyId,
        order_id: insertedOrder.id,
        product_id: await resolveProductId(companyId, item.productId),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount || 0,
        total: item.total || (item.quantity * item.unitPrice - (item.discount || 0))
      }))
    );

    const { data: insertedItems, error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsWithResolvedIds)
      .select('id, product_id');

    if (itemsError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
      // Não falhar a operação toda se items falharem
      console.warn('[SQL_SERVICE] ⚠️ Pedido criado mas items falharam');
    } else {
      console.log(`[SQL_SERVICE] ✅ ${orderData.items.length} items inseridos`);
      
      // ✅ SPRINT 2: Processar alocações de lotes
      console.log(`[SQL_SERVICE] 🔄 Processando alocações de lotes...`);
      
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const insertedItem = insertedItems?.[i];
        
        if (item.batchAllocations && item.batchAllocations.length > 0 && insertedItem) {
          console.log(`[SQL_SERVICE] 📦 Item ${i + 1} possui ${item.batchAllocations.length} alocações de lotes`);
          
          try {
            // Inserir registros em order_items_batches
            const batchAllocations = item.batchAllocations.map((alloc: any) => ({
              company_id: companyId,
              order_id: insertedOrder.id,
              order_item_id: insertedItem.id,
              product_id: insertedItem.product_id,
              batch_id: alloc.batchId,
              quantity_allocated: alloc.quantityAllocated
            }));

            const { error: allocError } = await supabase
              .from('order_items_batches')
              .insert(batchAllocations);

            if (allocError) {
              console.error(`[SQL_SERVICE] ❌ Erro ao inserir alocações de lotes:`, allocError);
            } else {
              console.log(`[SQL_SERVICE] ✅ ${batchAllocations.length} alocações salvas`);
              
              // Criar movimentações de lote (saída) e atualizar quantidades
              for (const alloc of item.batchAllocations) {
                try {
                  // Chamar função SQL para atualizar quantidade do lote
                  const { error: updateError } = await supabase.rpc('update_batch_quantity', {
                    p_batch_id: alloc.batchId,
                    p_quantity_change: -alloc.quantityAllocated,
                    p_company_id: companyId
                  });

                  if (updateError) {
                    console.error(`[SQL_SERVICE] ❌ Erro ao atualizar lote ${alloc.batchNumber}:`, updateError);
                  }

                  // Criar registro de movimentação
                  const { error: movementError } = await supabase
                    .from('batch_movements')
                    .insert({
                      company_id: companyId,
                      batch_id: alloc.batchId,
                      product_id: insertedItem.product_id,
                      order_id: insertedOrder.id,
                      movement_type: 'sale',
                      quantity: alloc.quantityAllocated,
                      trace_code: insertedOrder.order_number,
                      notes: `Venda - Pedido ${insertedOrder.order_number}`
                    });

                  if (movementError) {
                    console.error(`[SQL_SERVICE] ❌ Erro ao criar movimentação:`, movementError);
                  } else {
                    console.log(`[SQL_SERVICE] ✅ Movimentação criada para lote ${alloc.batchNumber}: -${alloc.quantityAllocated}`);
                  }
                } catch (batchError) {
                  console.error(`[SQL_SERVICE] ❌ Erro ao processar lote ${alloc.batchNumber}:`, batchError);
                }
              }
            }
          } catch (error) {
            console.error(`[SQL_SERVICE] ❌ Erro ao processar alocações do item ${i + 1}:`, error);
          }
        }
      }
      
      console.log(`[SQL_SERVICE] ✅ Processamento de lotes concluído`);
    }
  }

  // Retornar o pedido completo para o frontend
  return {
    id: insertedOrder.order_number, // Usar order_number como ID (PV-0001)
    orderNumber: insertedOrder.order_number,
    customer: order.customer_name,
    customerName: order.customer_name,
    customerId: order.customer_id,
    productName: order.product_name,
    quantity: order.quantity,
    unitPrice: order.unit_price,
    orderDate: order.order_date,
    dueDate: order.due_date,
    issueDate: order.issue_date,
    billingDate: order.billing_date,
    deliveryDate: order.delivery_date,
    paymentMethod: order.payment_method,
    paymentCondition: order.payment_condition,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    totalAmount: order.total,
    notes: order.notes,
    priceTableId: order.price_table_id,
    revenueCategoryId: order.revenue_category_id,
    salesPerson: order.sales_person,
    bankAccountId: order.bank_account_id,
    firstInstallmentDays: order.first_installment_days,
    dueDateReference: order.due_date_reference,
    actionFlags: {
      stockReduced: order.stock_reduced,
      accountsReceivableCreated: order.accounts_receivable_created,
      accountsReceivablePaid: order.accounts_receivable_paid,
      customerStatsUpdated: order.customer_stats_updated
    },
    isExceptionalOrder: order.is_exceptional_order,
    items: orderData.items || []
  };
}

export async function getSalesOrders(companyId: string) {
  const supabase = getSupabaseClient();
  
  // Buscar orders
  const { data: orders, error: ordersError } = await supabase
    .from('sales_orders')
    .select('*')
    .eq('company_id', companyId)
    .order('order_date', { ascending: false });

  if (ordersError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar sales orders:', ordersError);
    throw new Error(ordersError.message);
  }

  // Para cada order, buscar os items
  const ordersWithItems = await Promise.all(
    (orders || []).map(async (order: any) => {
      const { data: items } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('order_id', order.id);

      return {
        id: order.order_number, // ✅ CORRIGIDO: id deve ser o código legível (PV-0001)
        customer: order.customer_name || '',
        customerName: order.customer_name || '',
        productName: order.product_name || '',
        quantity: parseFloat(order.quantity || 0),
        unitPrice: parseFloat(order.unit_price || 0),
        totalAmount: parseFloat(order.total || 0),
        orderDate: order.order_date || null,
        dueDate: order.due_date || null,
        issueDate: order.issue_date || null,
        billingDate: order.billing_date || null,
        deliveryDate: order.delivery_date || null,
        paymentMethod: order.payment_method || '',
        paymentCondition: order.payment_condition || '',
        status: order.status || 'Processando',
        subtotal: parseFloat(order.subtotal || 0),
        discount: parseFloat(order.discount || 0),
        notes: order.notes || '',
        // Novos campos
        customerId: order.customer_id,
        priceTableId: order.price_table_id,
        revenueCategoryId: order.revenue_category_id,
        salesPerson: order.sales_person || '',
        bankAccountId: order.bank_account_id,
        firstInstallmentDays: order.first_installment_days || 0,
        dueDateReference: order.due_date_reference || 'issue',
        // Flags
        stockReduced: order.stock_reduced || false,
        accountsReceivableCreated: order.accounts_receivable_created || false,
        accountsReceivablePaid: order.accounts_receivable_paid || false,
        customerStatsUpdated: order.customer_stats_updated || false,
        isExceptionalOrder: order.is_exceptional_order || false,
        // Items (se houver)
        items: (items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          discount: parseFloat(item.discount || 0),
          total: parseFloat(item.total)
        }))
      };
    })
  );

  return ordersWithItems;
}

export async function saveSalesOrders(companyId: string, orders: any[]) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] 💾 Iniciando UPSERT de ${orders.length} sales orders para empresa ${companyId}`);

  // ✅ UPSERT inteligente - Processar cada order individualmente
  if (orders.length > 0) {
    for (const order of orders) {
      console.log(`[SQL_SERVICE] 🔄 Processando order ${order.id}...`);

      // Verificar se o order já existe (por order_number ou UUID)
      let existingOrder = null;
      
      if (order.id && order.id.startsWith('PV-')) {
        // Buscar por order_number se já tem formato PV-####
        const { data } = await supabase
          .from('sales_orders')
          .select('id, order_number')
          .eq('company_id', companyId)
          .eq('order_number', order.id)
          .single();
        existingOrder = data;
      }

      // ✅ Gerar order_number automaticamente se for INSERT novo
      let orderNumber = order.id;
      if (!existingOrder && (!orderNumber || !orderNumber.startsWith('PV-'))) {
        orderNumber = await generateNextSalesOrderNumber(companyId);
        console.log(`[SQL_SERVICE] 🔢 Gerado novo order_number: ${orderNumber}`);
      }

      const orderData = {
        company_id: companyId,
        order_number: orderNumber, // PV-0001, PV-0002, etc (gerado automaticamente ou preservado)
        customer_id: await resolveCustomerId(companyId, order.customerId),
        customer_name: order.customer || order.customerName || '',
        product_name: order.productName || '',
        quantity: order.quantity || 0,
        unit_price: order.unitPrice || 0,
        order_date: order.orderDate,
        due_date: order.dueDate || order.deliveryDate,
        issue_date: order.issueDate,
        billing_date: order.billingDate,
        delivery_date: order.deliveryDate,
        payment_method: order.paymentMethod || '',
        payment_condition: order.paymentCondition || '',
        status: order.status || 'Processando',
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        total: order.totalAmount || 0,
        notes: order.notes || '',
        price_table_id: order.priceTableId,
        revenue_category_id: order.revenueCategoryId,
        sales_person: order.salesPerson,
        bank_account_id: isValidUUID(order.bankAccountId) ? order.bankAccountId : null,
        first_installment_days: order.firstInstallmentDays || 0,
        due_date_reference: order.dueDateReference || 'issue',
        stock_reduced: order.actionFlags?.stockReduced || order.stockReduced || false,
        accounts_receivable_created: order.actionFlags?.accountsReceivableCreated || order.accountsReceivableCreated || false,
        accounts_receivable_paid: order.actionFlags?.accountsReceivablePaid || order.accountsReceivablePaid || false,
        customer_stats_updated: order.actionFlags?.customerStatsUpdated || order.customerStatsUpdated || false,
        is_exceptional_order: order.isExceptionalOrder || false
      };

      let savedOrderId: string;

      if (existingOrder) {
        // ✅ UPDATE - Pedido já existe
        console.log(`[SQL_SERVICE] 🔄 Atualizando order existente ${orderNumber} (UUID: ${existingOrder.id})`);
        const { error: updateError } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', existingOrder.id);

        if (updateError) {
          console.error('[SQL_SERVICE] ❌ Erro ao atualizar sales order:', updateError);
          throw new Error(`Erro ao atualizar order ${orderNumber}: ${updateError.message}`);
        }

        savedOrderId = existingOrder.id;
      } else {
        // ✅ INSERT - Pedido novo com order_number gerado automaticamente
        console.log(`[SQL_SERVICE] ➕ Criando novo order ${orderNumber}`);
        const { data: insertedOrder, error: insertError } = await supabase
          .from('sales_orders')
          .insert(orderData)
          .select('id, order_number')
          .single();

        if (insertError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir sales order:', insertError);
          throw new Error(`Erro ao inserir order ${orderNumber}: ${insertError.message}`);
        }

        savedOrderId = insertedOrder.id;
        orderNumber = insertedOrder.order_number; // Usar o order_number confirmado pelo banco
      }

      // ✅ Gerenciar items (deletar antigos e inserir novos)
      if (order.items && order.items.length > 0) {
        console.log(`[SQL_SERVICE] 📦 Gerenciando ${order.items.length} items do order ${orderNumber}`);

        // Deletar items antigos
        await supabase
          .from('sales_order_items')
          .delete()
          .eq('order_id', savedOrderId);

        // Inserir novos items
        const itemsWithResolvedIds = await Promise.all(
          order.items.map(async (item: any) => ({
            company_id: companyId,
            order_id: savedOrderId,
            product_id: await resolveProductId(companyId, item.productId),
            quantity: item.quantity,
            unit_price: item.unitPrice,
            discount: item.discount || 0,
            total: item.total || (item.quantity * item.unitPrice - (item.discount || 0))
          }))
        );

        const { error: itemsError } = await supabase
          .from('sales_order_items')
          .insert(itemsWithResolvedIds);

        if (itemsError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
          throw new Error(`Erro ao inserir items do order ${orderNumber}: ${itemsError.message}`);
        }

        console.log(`[SQL_SERVICE] ✅ ${order.items.length} items salvos para order ${orderNumber}`);
      }

      console.log(`[SQL_SERVICE] ✅ Order ${orderNumber} processado com sucesso`);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${orders.length} sales orders processados com sucesso`);
  return { success: true, count: orders.length };
}

/**
 * ✅ NOVA FUNÇÃO: Cria um único pedido de compra e retorna imediatamente com SKU gerado
 * Evita duplicações e problemas de sincronização
 */
export async function createPurchaseOrder(companyId: string, orderData: any) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] ➕ Criando novo purchase order para empresa ${companyId}`);

  // Gerar order_number sequencial
  const orderNumber = await generateNextPurchaseOrderNumber(companyId);
  console.log(`[SQL_SERVICE] 🔢 Order number gerado: ${orderNumber}`);

  // Preparar dados do pedido
  const order = {
    company_id: companyId,
    order_number: orderNumber,
    supplier_id: await resolveSupplierId(companyId, orderData.supplierId),
    supplier_name: orderData.supplier || orderData.supplierName || '',
    product_name: orderData.productName || '',
    quantity: orderData.quantity || 0,
    unit_price: orderData.unitPrice || 0,
    order_date: orderData.orderDate || new Date().toISOString().split('T')[0],
    due_date: orderData.dueDate || orderData.deliveryDate,
    issue_date: orderData.issueDate,
    billing_date: orderData.billingDate,
    delivery_date: orderData.deliveryDate,
    payment_method: orderData.paymentMethod || '',
    payment_condition: orderData.paymentCondition || '',
    status: orderData.status || 'Processando',
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    total: orderData.totalAmount || 0,
    notes: orderData.notes || '',
    price_table_id: orderData.priceTableId,
    expense_category_id: orderData.expenseCategoryId,
    buyer: orderData.buyer,
    bank_account_id: isValidUUID(orderData.bankAccountId) ? orderData.bankAccountId : null,
    first_installment_days: orderData.firstInstallmentDays || 0,
    due_date_reference: orderData.dueDateReference || 'issue',
    stock_increased: orderData.actionFlags?.stockIncreased || orderData.stockIncreased || false,
    accounts_payable_created: orderData.actionFlags?.accountsPayableCreated || orderData.accountsPayableCreated || false,
    accounts_payable_paid: orderData.actionFlags?.accountsPayablePaid || orderData.accountsPayablePaid || false,
    supplier_stats_updated: orderData.actionFlags?.supplierStatsUpdated || orderData.supplierStatsUpdated || false,
    is_exceptional_order: orderData.isExceptionalOrder || false
  };

  // Inserir pedido
  const { data: insertedOrder, error: insertError } = await supabase
    .from('purchase_orders')
    .insert(order)
    .select('id, order_number')
    .single();

  if (insertError) {
    console.error('[SQL_SERVICE] ❌ Erro ao criar purchase order:', insertError);
    throw new Error(`Erro ao criar pedido: ${insertError.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ Purchase order criado: ${insertedOrder.order_number} (UUID: ${insertedOrder.id})`);

  // Se houver items, inserir também
  if (orderData.items && orderData.items.length > 0) {
    console.log(`[SQL_SERVICE] 📦 Inserindo ${orderData.items.length} items`);

    const itemsWithResolvedIds = await Promise.all(
      orderData.items.map(async (item: any) => ({
        company_id: companyId,
        order_id: insertedOrder.id,
        product_id: await resolveProductId(companyId, item.productId),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount || 0,
        total: item.total || (item.quantity * item.unitPrice - (item.discount || 0))
      }))
    );

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsWithResolvedIds);

    if (itemsError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
      // Não falhar a operação toda se items falharem
      console.warn('[SQL_SERVICE] ⚠️ Pedido criado mas items falharam');
    } else {
      console.log(`[SQL_SERVICE] ✅ ${orderData.items.length} items inseridos`);
    }
  }

  // Retornar o pedido completo para o frontend
  return {
    id: insertedOrder.order_number, // Usar order_number como ID (PC-0001)
    orderNumber: insertedOrder.order_number,
    supplier: order.supplier_name,
    supplierName: order.supplier_name,
    supplierId: order.supplier_id,
    productName: order.product_name,
    quantity: order.quantity,
    unitPrice: order.unit_price,
    orderDate: order.order_date,
    dueDate: order.due_date,
    issueDate: order.issue_date,
    billingDate: order.billing_date,
    deliveryDate: order.delivery_date,
    paymentMethod: order.payment_method,
    paymentCondition: order.payment_condition,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    totalAmount: order.total,
    notes: order.notes,
    priceTableId: order.price_table_id,
    expenseCategoryId: order.expense_category_id,
    buyer: order.buyer,
    bankAccountId: order.bank_account_id,
    firstInstallmentDays: order.first_installment_days,
    dueDateReference: order.due_date_reference,
    actionFlags: {
      stockIncreased: order.stock_increased,
      accountsPayableCreated: order.accounts_payable_created,
      accountsPayablePaid: order.accounts_payable_paid,
      supplierStatsUpdated: order.supplier_stats_updated
    },
    isExceptionalOrder: order.is_exceptional_order,
    items: orderData.items || []
  };
}

/**
 * ✅ NOVA FUNÇÃO: Cria uma única transação financeira e retorna imediatamente com SKU gerado
 * Evita duplicações e problemas de sincronização
 */
export async function createFinancialTransaction(companyId: string, transactionData: any) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] ➕ Criando nova transação financeira para empresa ${companyId}`);

  // Gerar SKU sequencial
  const sku = await generateNextFinancialTransactionSKU(companyId);
  console.log(`[SQL_SERVICE] 🔢 SKU gerado: ${sku}`);

  // =====================================================
  // NORMALIZAÇÃO COMPLETA - ADERENTE AOS CHECK CONSTRAINTS
  // =====================================================
  
  // 1. Normalizar TYPE: CHECK (type IN ('income', 'expense'))
  const transactionType = normalizeTransactionType(transactionData.type || 'Receita');
  
  // 2. Normalizar STATUS usando função helper
  const status = normalizeFinancialTransactionStatus(transactionData.status, transactionType);
  
  // 3. Normalizar ORIGIN usando função helper
  const origin = normalizeFinancialTransactionOrigin(transactionData.origin);
  
  // 4. Normalizar PARTY_TYPE usando função helper
  const partyType = normalizeFinancialTransactionPartyType(transactionData.partyType);
  
  // 5. Normalizar TRANSFER_DIRECTION usando função helper
  const transferDirection = normalizeFinancialTransactionTransferDirection(transactionData.transferDirection);

  // Preparar dados da transação com TODOS os campos validados
  const transaction = {
    company_id: companyId,
    sku,
    type: transactionType, // ✅ CHECK: 'income' | 'expense'
    transaction_date: transactionData.date || new Date().toISOString().split('T')[0], // ✅ NOT NULL
    category: transactionData.categoryName || transactionData.category || 'Geral', // ✅ NOT NULL
    description: transactionData.description || `Transação ${transactionType === 'income' ? 'de receita' : 'de despesa'}`, // ✅ NOT NULL
    amount: transactionData.amount || 0, // ✅ NOT NULL
    account: transactionData.account || 'Geral', // ✅ NOT NULL
    payment_method: transactionData.paymentMethodName || transactionData.paymentMethod,
    reference: transactionData.reference,
    notes: transactionData.notes || '',
    // Campos adicionais expandidos
    due_date: transactionData.dueDate,
    effective_date: transactionData.effectiveDate,
    party_type: partyType, // ✅ CHECK: 'Cliente' | 'Fornecedor' | 'Outro' | null
    party_id: transactionData.partyId,
    party_name: transactionData.partyName,
    category_id: transactionData.categoryId,
    category_name: transactionData.categoryName,
    cost_center_id: transactionData.costCenterId,
    cost_center_name: transactionData.costCenterName,
    bank_account_id: isValidUUID(transactionData.bankAccountId) ? transactionData.bankAccountId : null,
    bank_account_name: transactionData.bankAccountName,
    payment_method_id: transactionData.paymentMethodId,
    payment_method_name: transactionData.paymentMethodName,
    status, // ✅ CHECK: 'A Receber' | 'Recebido' | 'A Pagar' | 'Pago' | 'Cancelado'
    origin, // ✅ CHECK: 'Manual' | 'Pedido'
    installment_number: transactionData.installmentNumber,
    total_installments: transactionData.totalInstallments,
    payment_date: transactionData.paymentDate,
    parent_transaction_id: transactionData.parentTransactionId,
    is_transfer: transactionData.isTransfer || false,
    transfer_pair_id: transactionData.transferPairId,
    transfer_direction: transferDirection // ✅ CHECK: 'origem' | 'destino' | null
  };

  // ✅ LOG DETALHADO: Dados que serão inseridos (para debug)
  console.log('[SQL_SERVICE] 📋 Dados da transação a ser inserida:', {
    sku: transaction.sku,
    type: transaction.type,
    status: transaction.status,
    origin: transaction.origin,
    party_type: transaction.party_type,
    category: transaction.category,
    description: transaction.description,
    amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    account: transaction.account
  });

  // Inserir transação
  const { data: insertedTransaction, error: insertError } = await supabase
    .from('financial_transactions')
    .insert(transaction)
    .select('id, sku')
    .single();

  if (insertError) {
    console.error('[SQL_SERVICE] ❌ Erro ao criar transação financeira:', insertError);
    console.error('[SQL_SERVICE] 🔍 Constraint violation details:', {
      code: insertError.code,
      message: insertError.message,
      hint: insertError.hint,
      details: insertError.details
    });
    throw new Error(`Erro ao criar transação: ${insertError.message}`);
  }

  console.log(`[SQL_SERVICE] ✅ Transação criada: ${insertedTransaction.sku} (UUID: ${insertedTransaction.id})`);

  // Retornar a transação completa para o frontend (com nomes em português)
  return {
    id: insertedTransaction.sku, // Usar SKU como ID (FT-0001)
    type: transactionData.type, // Manter português para frontend
    date: transaction.transaction_date, // ✅ CORRIGIDO
    transactionDate: transaction.transaction_date,
    dueDate: transaction.due_date,
    paymentDate: transaction.payment_date,
    effectiveDate: transaction.effective_date,
    partyType: transaction.party_type,
    partyId: transaction.party_id,
    partyName: transaction.party_name,
    category: transaction.category,
    categoryId: transaction.category_id,
    categoryName: transaction.category_name,
    account: transaction.account,
    bankAccountId: transaction.bank_account_id,
    bankAccountName: transaction.bank_account_name,
    paymentMethod: transaction.payment_method,
    paymentMethodId: transaction.payment_method_id,
    paymentMethodName: transaction.payment_method_name,
    amount: transaction.amount,
    status: transactionData.status, // Manter português para frontend
    description: transaction.description,
    origin: transaction.origin,
    reference: transaction.reference,
    notes: transaction.notes,
    installmentNumber: transaction.installment_number,
    totalInstallments: transaction.total_installments
  };
}

export async function getPurchaseOrders(companyId: string) {
  const supabase = getSupabaseClient();
  
  // Buscar orders
  const { data: orders, error: ordersError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('company_id', companyId)
    .order('order_date', { ascending: false });

  if (ordersError) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar purchase orders:', ordersError);
    throw new Error(ordersError.message);
  }

  // Para cada order, buscar os items
  const ordersWithItems = await Promise.all(
    (orders || []).map(async (order: any) => {
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('order_id', order.id);

      return {
        id: order.order_number, // ✅ CORRIGIDO: id deve ser o código legível (PC-0001)
        supplier: order.supplier_name || '',
        supplierName: order.supplier_name || '',
        productName: order.product_name || '',
        quantity: parseFloat(order.quantity || 0),
        unitPrice: parseFloat(order.unit_price || 0),
        totalAmount: parseFloat(order.total || 0),
        orderDate: order.order_date || null,
        dueDate: order.due_date || null,
        issueDate: order.issue_date || null,
        billingDate: order.billing_date || null,
        deliveryDate: order.delivery_date || null,
        paymentMethod: order.payment_method || '',
        paymentCondition: order.payment_condition || '',
        status: order.status || 'Processando',
        subtotal: parseFloat(order.subtotal || 0),
        discount: parseFloat(order.discount || 0),
        notes: order.notes || '',
        // Novos campos
        supplierId: order.supplier_id,
        priceTableId: order.price_table_id,
        expenseCategoryId: order.expense_category_id,
        buyer: order.buyer || '',
        bankAccountId: order.bank_account_id,
        firstInstallmentDays: order.first_installment_days || 0,
        dueDateReference: order.due_date_reference || 'issue',
        // Flags
        stockIncreased: order.stock_increased || false,
        accountsPayableCreated: order.accounts_payable_created || false,
        accountsPayablePaid: order.accounts_payable_paid || false,
        supplierStatsUpdated: order.supplier_stats_updated || false,
        isExceptionalOrder: order.is_exceptional_order || false,
        // Items (se houver)
        items: (items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          discount: parseFloat(item.discount || 0),
          total: parseFloat(item.total)
        }))
      };
    })
  );

  return ordersWithItems;
}

export async function savePurchaseOrders(companyId: string, orders: any[]) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] 💾 Iniciando UPSERT de ${orders.length} purchase orders para empresa ${companyId}`);

  // ✅ UPSERT inteligente - Processar cada order individualmente
  if (orders.length > 0) {
    for (const order of orders) {
      console.log(`[SQL_SERVICE] 🔄 Processando order ${order.id}...`);

      // Verificar se o order já existe (por order_number ou UUID)
      let existingOrder = null;
      
      if (order.id && order.id.startsWith('PC-')) {
        // Buscar por order_number se já tem formato PC-####
        const { data } = await supabase
          .from('purchase_orders')
          .select('id, order_number')
          .eq('company_id', companyId)
          .eq('order_number', order.id)
          .single();
        existingOrder = data;
      }

      // ✅ Gerar order_number automaticamente se for INSERT novo
      let orderNumber = order.id;
      if (!existingOrder && (!orderNumber || !orderNumber.startsWith('PC-'))) {
        orderNumber = await generateNextPurchaseOrderNumber(companyId);
        console.log(`[SQL_SERVICE] 🔢 Gerado novo order_number: ${orderNumber}`);
      }

      const orderData = {
        company_id: companyId,
        order_number: orderNumber, // PC-0001, PC-0002, etc (gerado automaticamente ou preservado)
        supplier_id: await resolveSupplierId(companyId, order.supplierId),
        supplier_name: order.supplier || order.supplierName || '',
        product_name: order.productName || '',
        quantity: order.quantity || 0,
        unit_price: order.unitPrice || 0,
        order_date: order.orderDate,
        due_date: order.dueDate || order.deliveryDate,
        issue_date: order.issueDate,
        billing_date: order.billingDate,
        delivery_date: order.deliveryDate,
        payment_method: order.paymentMethod || '',
        payment_condition: order.paymentCondition || '',
        status: order.status || 'Processando',
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        total: order.totalAmount || 0,
        notes: order.notes || '',
        price_table_id: order.priceTableId,
        expense_category_id: order.expenseCategoryId,
        buyer: order.buyer,
        bank_account_id: isValidUUID(order.bankAccountId) ? order.bankAccountId : null,
        first_installment_days: order.firstInstallmentDays || 0,
        due_date_reference: order.dueDateReference || 'issue',
        stock_increased: order.actionFlags?.stockIncreased || order.stockIncreased || false,
        accounts_payable_created: order.actionFlags?.accountsPayableCreated || order.accountsPayableCreated || false,
        accounts_payable_paid: order.actionFlags?.accountsPayablePaid || order.accountsPayablePaid || false,
        supplier_stats_updated: order.actionFlags?.supplierStatsUpdated || order.supplierStatsUpdated || false,
        is_exceptional_order: order.isExceptionalOrder || false
      };

      let savedOrderId: string;

      if (existingOrder) {
        // ✅ UPDATE
        console.log(`[SQL_SERVICE] 🔄 Atualizando order existente ${orderNumber} (UUID: ${existingOrder.id})`);
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update(orderData)
          .eq('id', existingOrder.id);

        if (updateError) {
          console.error('[SQL_SERVICE] ❌ Erro ao atualizar purchase order:', updateError);
          throw new Error(`Erro ao atualizar order ${orderNumber}: ${updateError.message}`);
        }

        savedOrderId = existingOrder.id;
      } else {
        // ✅ INSERT
        console.log(`[SQL_SERVICE] ➕ Criando novo order ${orderNumber}`);
        const { data: insertedOrder, error: insertError } = await supabase
          .from('purchase_orders')
          .insert(orderData)
          .select('id, order_number')
          .single();

        if (insertError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir purchase order:', insertError);
          throw new Error(`Erro ao inserir order ${orderNumber}: ${insertError.message}`);
        }

        savedOrderId = insertedOrder.id;
        orderNumber = insertedOrder.order_number; // Usar o order_number confirmado pelo banco
      }

      // ✅ Gerenciar items (deletar antigos e inserir novos)
      if (order.items && order.items.length > 0) {
        console.log(`[SQL_SERVICE] 📦 Gerenciando ${order.items.length} items do order ${orderNumber}`);

        // Deletar items antigos
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('order_id', savedOrderId);

        // Inserir novos items
        const itemsWithResolvedIds = await Promise.all(
          order.items.map(async (item: any) => ({
            company_id: companyId,
            order_id: savedOrderId,
            product_id: await resolveProductId(companyId, item.productId),
            quantity: item.quantity,
            unit_price: item.unitPrice,
            discount: item.discount || 0,
            total: item.total || (item.quantity * item.unitPrice - (item.discount || 0))
          }))
        );

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsWithResolvedIds);

        if (itemsError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
          throw new Error(`Erro ao inserir items do order ${orderNumber}: ${itemsError.message}`);
        }

        console.log(`[SQL_SERVICE] ✅ ${order.items.length} items salvos para order ${orderNumber}`);
      }

      console.log(`[SQL_SERVICE] ✅ Order ${orderNumber} processado com sucesso`);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${orders.length} purchase orders processados com sucesso`);
  return { success: true, count: orders.length };
}

// ==================== STOCK MOVEMENTS ====================

export async function getStockMovements(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar stock movements:', error);
    throw new Error(error.message);
  }

  return data?.map((row: any) => {
    // Converter created_at para date e time
    // ✅ Ajustar para timezone GMT-3 (São Paulo)
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    let dateStr = null;
    let timeStr = '';
    
    if (createdAt) {
      // Converter para GMT-3 (São Paulo)
      const offsetMs = -3 * 60 * 60 * 1000; // -3 horas em ms
      const localDate = new Date(createdAt.getTime() + offsetMs);
      dateStr = localDate.toISOString().split('T')[0];
      timeStr = localDate.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    }
    
    return {
      id: row.id,
      productId: row.product_id,
      productName: '', // Não temos esse campo na tabela SQL
      type: row.type,
      quantity: parseFloat(row.quantity),
      date: dateStr,
      time: timeStr,
      previousStock: parseFloat(row.previous_stock || 0),
      newStock: parseFloat(row.new_stock || 0),
      reason: row.reason || '',
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      notes: row.notes || ''
    };
  }) || [];
}

export async function saveStockMovements(companyId: string, movements: any[]) {
  const supabase = getSupabaseClient();

  // Deletar movimentos antigos
  const { error: deleteError } = await supabase
    .from('stock_movements')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar stock movements:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novos movimentos
  if (movements.length > 0) {
    const rows = await Promise.all(
      movements.map(async (movement: any) => ({
        company_id: companyId,
        product_id: await resolveProductId(companyId, movement.productId),
        type: movement.type,
        quantity: movement.quantity,
        reference_id: movement.referenceId,
        reference_type: movement.referenceType,
        notes: movement.notes || ''
      }))
    );

    const { error: insertError } = await supabase
      .from('stock_movements')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir stock movements:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${movements.length} stock movements salvos`);
  return { success: true, count: movements.length };
}

/**
 * ✅ NOVA FUNÇÃO: Criar movimento individual de estoque
 * Usado para cadastro inicial e movimentações manuais
 */
export async function createStockMovement(companyId: string, movement: {
  productId: string;  // UUID do produto
  type: string;
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  batchId?: string;  // ✅ NOVO: Para integrar com batch_movements
}) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] 📝 Criando stock movement para produto ${movement.productId}`);

  const row = {
    company_id: companyId,
    product_id: movement.productId,  // Já deve ser UUID
    type: movement.type,
    quantity: movement.quantity,
    reference_id: movement.referenceId || null,
    reference_type: movement.referenceType || null,
    notes: movement.notes || null
  };

  console.log('[SQL_SERVICE] 📊 Dados do movimento:', row);

  const { data, error } = await supabase
    .from('stock_movements')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao criar stock movement:', error);
    throw new Error(error.message);
  }

  console.log('[SQL_SERVICE] ✅ Stock movement criado:', data.id);
  return data;
}

// ==================== FINANCIAL TRANSACTIONS ====================

// Helper: Validar se é UUID válido
function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export async function getFinancialTransactions(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('company_id', companyId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar financial transactions:', error);
    throw new Error(error.message);
  }

  return data?.map((row: any) => ({
    id: row.sku || row.id, // ✅ PRIORIZAR SKU (FT-0001) sobre UUID
    type: row.type === 'income' ? 'Receita' : 'Despesa', // ✅ CONVERTER PARA PT-BR
    category: row.category_name || row.category,
    categoryId: row.category_id,
    description: row.description,
    amount: parseFloat(row.amount),
    date: row.transaction_date,
    transactionDate: row.transaction_date,
    dueDate: row.due_date,
    effectiveDate: row.effective_date,
    account: row.account,
    paymentMethod: row.payment_method_name || row.payment_method,
    paymentMethodId: row.payment_method_id,
    reference: row.reference,
    notes: row.notes || '',
    // Campos adicionais
    origin: row.origin || 'Manual',
    partyType: row.party_type,
    partyId: row.party_id,
    partyName: row.party_name,
    costCenterId: row.cost_center_id,
    costCenterName: row.cost_center_name,
    status: row.status || 'Pago',
    bankAccountId: row.bank_account_id || null,
    bankAccountName: row.bank_account_name,
    installmentNumber: row.installment_number,
    totalInstallments: row.total_installments
  })) || [];
}

export async function saveFinancialTransactions(companyId: string, transactions: any[]) {
  const supabase = getSupabaseClient();

  // ✅ UPSERT INTELIGENTE: Não deletar tudo, usar upsert por SKU
  console.log(`[SQL_SERVICE] 💾 Iniciando UPSERT de ${transactions.length} financial transactions para empresa ${companyId}`);

  // Processar cada transação individualmente
  if (transactions.length > 0) {
    for (const transaction of transactions) {
      let sku = transaction.id;
      
      // Verificar se já existe (por SKU se começar com FT-)
      let existingTransaction = null;
      
      if (sku && sku.startsWith('FT-')) {
        const { data, error: checkError } = await supabase
          .from('financial_transactions')
          .select('id, sku')
          .eq('company_id', companyId)
          .eq('sku', sku)
          .maybeSingle();
        
        if (!checkError) {
          existingTransaction = data;
        }
      }
      
      // Gerar SKU automaticamente APENAS se não veio com SKU válido
      if (!sku || !sku.startsWith('FT-')) {
        sku = await generateNextFinancialTransactionSKU(companyId);
        console.log(`[SQL_SERVICE] 🔢 Gerado novo SKU: ${sku}`);
      }

      // ✅ LOG: Depuração de tipo de transação
      console.log(`[SQL_SERVICE] 🔍 Processando transação ${sku}:`, {
        originalType: transaction.type,
        normalizedType: normalizeTransactionType(transaction.type),
        category: transaction.categoryName || transaction.category
      });

      // Normalizar com funções helper (garantir aderência aos CHECK CONSTRAINTS)
      const normalizedType = normalizeTransactionType(transaction.type);
      const normalizedStatus = normalizeFinancialTransactionStatus(transaction.status, normalizedType);
      const normalizedOrigin = normalizeFinancialTransactionOrigin(transaction.origin);
      const normalizedPartyType = normalizeFinancialTransactionPartyType(transaction.partyType);
      const normalizedTransferDirection = normalizeFinancialTransactionTransferDirection(transaction.transferDirection);

      const transactionData = {
        company_id: companyId,
        sku: sku, // ✅ SKU legível (FT-0001)
        type: normalizedType, // ✅ 'income' | 'expense'
        category: transaction.category || transaction.categoryName || 'Geral',
        category_id: transaction.categoryId,
        category_name: transaction.categoryName || transaction.category || 'Geral',
        description: transaction.description || `Transação de ${normalizedType === 'income' ? 'receita' : 'despesa'}`,
        amount: transaction.amount,
        transaction_date: transaction.date || transaction.transactionDate,
        due_date: transaction.dueDate,
        effective_date: transaction.effectiveDate,
        account: transaction.account || 'Geral',
        payment_method: transaction.paymentMethod || '',
        payment_method_id: transaction.paymentMethodId,
        payment_method_name: transaction.paymentMethod || transaction.paymentMethodName || '',
        reference: transaction.reference || '',
        notes: transaction.notes || '',
        origin: normalizedOrigin, // ✅ 'Manual' | 'Pedido'
        party_type: normalizedPartyType, // ✅ 'Cliente' | 'Fornecedor' | 'Outro' | null
        party_id: transaction.partyId,
        party_name: transaction.partyName,
        cost_center_id: transaction.costCenterId,
        cost_center_name: transaction.costCenterName,
        status: normalizedStatus, // ✅ 'A Receber' | 'Recebido' | 'A Pagar' | 'Pago' | 'Cancelado'
        bank_account_id: isValidUUID(transaction.bankAccountId) ? transaction.bankAccountId : null,
        bank_account_name: transaction.bankAccountName,
        installment_number: transaction.installmentNumber,
        total_installments: transaction.totalInstallments,
        parent_transaction_id: transaction.parentTransactionId,
        is_transfer: transaction.isTransfer || false,
        transfer_pair_id: transaction.transferPairId,
        transfer_direction: normalizedTransferDirection // ✅ 'origem' | 'destino' | null
      };

      if (existingTransaction) {
        // ✅ UPDATE
        console.log(`[SQL_SERVICE] 🔄 Atualizando transação existente ${sku} (UUID: ${existingTransaction.id})`);
        const { error: updateError } = await supabase
          .from('financial_transactions')
          .update(transactionData)
          .eq('id', existingTransaction.id);

        if (updateError) {
          console.error('[SQL_SERVICE] ❌ Erro ao atualizar financial transaction:', updateError);
          throw new Error(`Erro ao atualizar transação ${sku}: ${updateError.message}`);
        }
      } else {
        // ✅ INSERT
        console.log(`[SQL_SERVICE] ➕ Criando nova transação ${sku} para empresa ${companyId}`);
        const { error: insertError } = await supabase
          .from('financial_transactions')
          .insert(transactionData);

        if (insertError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir financial transaction:', insertError);
          console.error('[SQL_SERVICE] 🔍 Detalhes do erro:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            sku: sku,
            companyId: companyId
          });
          
          // Se for erro de UNIQUE constraint, pode ser constraint global ainda ativo
          if (insertError.code === '23505') {
            console.error('[SQL_SERVICE] 🚨 ERRO DE UNIQUE CONSTRAINT - Migration 022 pode não ter sido aplicada!');
            console.error('[SQL_SERVICE] 🚨 Tentando gerar novo SKU como fallback...');
            
            // Gerar novo SKU como fallback
            sku = await generateNextFinancialTransactionSKU(companyId);
            console.log(`[SQL_SERVICE] 🔢 SKU fallback gerado: ${sku}`);
            
            // Atualizar transactionData com novo SKU
            transactionData.sku = sku;
            
            // Tentar inserir novamente
            const { error: retryError } = await supabase
              .from('financial_transactions')
              .insert(transactionData);
            
            if (retryError) {
              console.error('[SQL_SERVICE] ❌ Erro ao inserir com SKU fallback:', retryError);
              throw new Error(`Erro ao inserir transação ${sku}: ${retryError.message}`);
            }
            
            console.log(`[SQL_SERVICE] ✅ Transação inserida com SKU fallback ${sku}`);
          } else {
            throw new Error(`Erro ao inserir transação ${sku}: ${insertError.message}`);
          }
        } else {
          console.log(`[SQL_SERVICE] ✅ Transação ${sku} criada com sucesso para empresa ${companyId}`);
        }
      }

      console.log(`[SQL_SERVICE] ✅ Transação ${sku} processada com sucesso`);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${transactions.length} financial transactions salvos`);
  return { success: true, count: transactions.length };
}

// ==================== ACCOUNTS RECEIVABLE ====================

export async function getAccountsReceivable(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date');

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar accounts receivable:', error);
    throw new Error(error.message);
  }

  return data?.map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    installmentNumber: row.installment_number,
    totalInstallments: row.total_installments,
    description: row.description,
    amount: parseFloat(row.amount),
    dueDate: row.due_date,
    status: denormalizeAccountReceivableStatus(row.status),
    paymentDate: row.payment_date,
    paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : null,
    paymentMethod: row.payment_method || '',
    notes: row.notes || ''
  })) || [];
}

export async function saveAccountsReceivable(companyId: string, accounts: any[]) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] 💾 Salvando ${accounts.length} accounts receivable para empresa ${companyId}`);

  // Deletar contas antigas
  const { error: deleteError } = await supabase
    .from('accounts_receivable')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar accounts receivable:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novas contas
  if (accounts.length > 0) {
    // ✅ CORREÇÃO: Resolver customer_id de SKU → UUID antes de inserir
    console.log(`[SQL_SERVICE] 🔄 Processando ${accounts.length} contas a receber...`);
    
    const rowsPromises = accounts.map(async (account: any) => {
      const resolvedCustomerId = await resolveCustomerId(companyId, account.customerId);
      const normalizedStatus = normalizeAccountStatus(account.status);
      
      console.log(`[SQL_SERVICE] 📝 Conta a receber: Status "${account.status}" → "${normalizedStatus}", Customer ID: ${account.customerId} → ${resolvedCustomerId}`);
      
      return {
        // ❌ REMOVIDO: id: account.id (UUID gerado automaticamente pelo banco)
        company_id: companyId,
        customer_id: resolvedCustomerId, // ✅ CORRIGIDO: Usar variável já resolvida
        order_id: account.orderId,
        installment_number: account.installmentNumber,
        total_installments: account.totalInstallments,
        description: account.description,
        amount: account.amount,
        due_date: account.dueDate,
        status: normalizedStatus, // ✅ CORRIGIDO: Usar variável já normalizada
        payment_date: account.paymentDate,
        payment_amount: account.paymentAmount,
        payment_method: account.paymentMethod || '',
        notes: account.notes || ''
      };
    });

    const rows = await Promise.all(rowsPromises);

    const { error: insertError } = await supabase
      .from('accounts_receivable')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir accounts receivable:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${accounts.length} accounts receivable salvos`);
  return { success: true, count: accounts.length };
}

// ==================== ACCOUNTS PAYABLE ====================

export async function getAccountsPayable(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date');

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar accounts payable:', error);
    throw new Error(error.message);
  }

  return data?.map((row: any) => ({
    id: row.id,
    supplierId: row.supplier_id,
    orderId: row.order_id,
    installmentNumber: row.installment_number,
    totalInstallments: row.total_installments,
    description: row.description,
    amount: parseFloat(row.amount),
    dueDate: row.due_date,
    status: denormalizeAccountPayableStatus(row.status),
    paymentDate: row.payment_date,
    paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : null,
    paymentMethod: row.payment_method || '',
    notes: row.notes || ''
  })) || [];
}

export async function saveAccountsPayable(companyId: string, accounts: any[]) {
  const supabase = getSupabaseClient();

  // Deletar contas antigas
  const { error: deleteError } = await supabase
    .from('accounts_payable')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar accounts payable:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novas contas
  if (accounts.length > 0) {
    // ✅ CORREÇÃO: Resolver supplier_id de SKU → UUID antes de inserir
    console.log(`[SQL_SERVICE] 🔄 Processando ${accounts.length} contas a pagar...`);
    
    const rowsPromises = accounts.map(async (account: any) => {
      const resolvedSupplierId = await resolveSupplierId(companyId, account.supplierId);
      const normalizedStatus = normalizeAccountStatus(account.status);
      
      console.log(`[SQL_SERVICE] 📝 Conta a pagar: Status "${account.status}" → "${normalizedStatus}", Supplier ID: ${account.supplierId} → ${resolvedSupplierId}`);
      
      return {
      // ❌ REMOVIDO: id: account.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      supplier_id: resolvedSupplierId, // ✅ CORRIGIDO: Resolver SKU → UUID
      order_id: account.orderId,
      installment_number: account.installmentNumber,
      total_installments: account.totalInstallments,
      description: account.description,
      amount: account.amount,
      due_date: account.dueDate,
      status: normalizedStatus, // ✅ CORRIGIDO: Normalizar PT → EN
      payment_date: account.paymentDate,
      payment_amount: account.paymentAmount,
      payment_method: account.paymentMethod || '',
      notes: account.notes || ''
      };
    });

    const rows = await Promise.all(rowsPromises);

    const { error: insertError } = await supabase
      .from('accounts_payable')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir accounts payable:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${accounts.length} accounts payable salvos`);
  return { success: true, count: accounts.length };
}

// ==================== BANK ACCOUNTS ====================

/**
 * Gera o próximo SKU de Bank Account
 * Formato: BANK-001, BANK-002, ..., BANK-999, BANK-1000...
 */
async function generateNextBankAccountSku(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('sku')
    .eq('company_id', companyId)
    .like('sku', 'BANK-%')
    .order('sku', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[SQL_SERVICE] ⚠️ Erro ao buscar SKUs de bank accounts, gerando padrão:', error);
    return 'BANK-001';
  }

  let maxNumber = 0;
  
  if (data && data.length > 0) {
    data.forEach((row: any) => {
      const match = row.sku?.match(/^BANK-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  }
  
  const nextNumber = maxNumber + 1;
  const sku = `BANK-${String(nextNumber).padStart(3, '0')}`;
  
  console.log(`[SQL_SERVICE] 🔢 Gerado SKU bank account: ${sku} (maxNumber: ${maxNumber})`);
  return sku;
}

/**
 * Resolver Bank Account ID (SKU → UUID)
 * Se receber "BANK-001", busca o UUID correspondente
 * Se receber UUID, retorna direto
 */
async function resolveBankAccountId(companyId: string, bankAccountId: string): Promise<string | null> {
  if (!bankAccountId) return null;
  
  // Se já for UUID, retornar direto
  if (isValidUUID(bankAccountId)) return bankAccountId;
  
  // Se for SKU (BANK-001), buscar UUID
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('company_id', companyId)
    .eq('sku', bankAccountId)
    .is('deleted_at', null)
    .single();
  
  if (!data) {
    console.warn(`[SQL_SERVICE] ⚠️ Bank account não encontrado: ${bankAccountId}`);
    return null;
  }
  
  return data.id;
}

export async function getBankAccounts(companyId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null) // ✅ Filtrar apenas ativos (soft delete)
    .order('sku', { ascending: true });

  if (error) {
    console.error('[SQL_SERVICE] ❌ Erro ao buscar bank accounts:', error);
    throw new Error(error.message);
  }

  return data?.map((row: any) => ({
    id: row.sku || row.id, // ✅ PRIORIZAR SKU (BANK-001) sobre UUID
    bankName: row.bank_name,
    bankCode: row.bank_code,
    agency: row.agency,
    accountNumber: row.account_number,
    accountType: row.account_type,
    initialBalance: row.initial_balance ? parseFloat(row.initial_balance) : 0,
    currentBalance: row.current_balance ? parseFloat(row.current_balance) : 0,
    isActive: row.is_active
  })) || [];
}

export async function saveBankAccounts(companyId: string, accounts: any[]) {
  const supabase = getSupabaseClient();

  console.log(`[SQL_SERVICE] 💾 Iniciando UPSERT de ${accounts.length} bank accounts para empresa ${companyId}`);

  // Processar cada conta individualmente
  if (accounts.length > 0) {
    for (const account of accounts) {
      let sku = account.id;
      
      // Verificar se já existe (por SKU se começar com BANK-)
      let existingAccount = null;
      
      if (sku && sku.startsWith('BANK-')) {
        const { data } = await supabase
          .from('bank_accounts')
          .select('id, sku')
          .eq('company_id', companyId)
          .eq('sku', sku)
          .is('deleted_at', null)
          .single();
        existingAccount = data;
      }
      
      // Gerar SKU automaticamente se for INSERT novo
      if (!existingAccount && (!sku || !sku.startsWith('BANK-'))) {
        sku = await generateNextBankAccountSku(companyId);
        console.log(`[SQL_SERVICE] 🔢 Gerado novo SKU: ${sku}`);
      }

      const accountData = {
        company_id: companyId,
        sku: sku, // ✅ SKU legível (BANK-001)
        bank_name: account.bankName,
        bank_code: account.bankCode || null,
        agency: account.agency || null,
        account_number: account.accountNumber || null,
        account_type: account.accountType || 'Corrente',
        initial_balance: account.initialBalance || 0,
        current_balance: account.currentBalance || 0,
        is_active: account.isActive !== undefined ? account.isActive : true
      };

      if (existingAccount) {
        // ✅ UPDATE
        console.log(`[SQL_SERVICE] 🔄 Atualizando bank account existente ${sku} (UUID: ${existingAccount.id})`);
        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', existingAccount.id);

        if (updateError) {
          console.error('[SQL_SERVICE] ❌ Erro ao atualizar bank account:', updateError);
          throw new Error(`Erro ao atualizar conta ${sku}: ${updateError.message}`);
        }
      } else {
        // ✅ INSERT
        console.log(`[SQL_SERVICE] ➕ Criando nova bank account ${sku}`);
        const { error: insertError } = await supabase
          .from('bank_accounts')
          .insert(accountData);

        if (insertError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir bank account:', insertError);
          throw new Error(`Erro ao inserir conta ${sku}: ${insertError.message}`);
        }
      }

      console.log(`[SQL_SERVICE] ✅ Bank account ${sku} processada com sucesso`);
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${accounts.length} bank accounts salvos`);
  return { success: true, count: accounts.length };
}

// ==================== EXPORT ====================

export const sqlServiceExtended = {
  createSalesOrder, // ✅ Nova função para criar pedido único
  getSalesOrders,
  saveSalesOrders,
  createPurchaseOrder, // ✅ Nova função para criar pedido único
  getPurchaseOrders,
  savePurchaseOrders,
  createFinancialTransaction, // ✅ Nova função para criar transação única
  getStockMovements,
  saveStockMovements,
  createStockMovement, // ✅ NOVO: Criar movimento individual
  getFinancialTransactions,
  saveFinancialTransactions,
  getAccountsReceivable,
  saveAccountsReceivable,
  getAccountsPayable,
  saveAccountsPayable,
  getBankAccounts,
  saveBankAccounts,
  resolveBankAccountId
};