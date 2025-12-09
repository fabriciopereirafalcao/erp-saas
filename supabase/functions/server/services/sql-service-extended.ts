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

// ==================== SALES ORDERS + ITEMS ====================

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
        id: order.id,
        orderNumber: order.order_number,
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

  // Deletar orders antigos (CASCADE vai deletar items automaticamente)
  const { error: deleteError } = await supabase
    .from('sales_orders')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar sales orders:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novos orders
  if (orders.length > 0) {
    for (const order of orders) {
      // Inserir order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          // ❌ REMOVIDO: id: order.id (UUID gerado automaticamente pelo banco)
          company_id: companyId,
          order_number: order.orderNumber,
          customer_id: order.customerId,
          customer_name: order.customerName || '',
          product_name: order.productName || '',
          quantity: order.quantity || 0,
          unit_price: order.unitPrice || 0,
          order_date: order.orderDate,
          due_date: order.dueDate,
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
          bank_account_id: order.bankAccountId,
          first_installment_days: order.firstInstallmentDays || 0,
          due_date_reference: order.dueDateReference || 'issue',
          stock_reduced: order.stockReduced || false,
          accounts_receivable_created: order.accountsReceivableCreated || false,
          accounts_receivable_paid: order.accountsReceivablePaid || false,
          customer_stats_updated: order.customerStatsUpdated || false,
          is_exceptional_order: order.isExceptionalOrder || false
        })
        .select()
        .single();

      if (orderError) {
        console.error('[SQL_SERVICE] ❌ Erro ao inserir sales order:', orderError);
        throw new Error(orderError.message);
      }

      // Inserir items (se houver)
      if (order.items && order.items.length > 0) {
        const itemsToInsert = order.items.map((item: any) => ({
          // ❌ REMOVIDO: id: item.id (UUID gerado automaticamente pelo banco)
          company_id: companyId,
          order_id: insertedOrder.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          total: item.total
        }));

        const { error: itemsError } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
          throw new Error(itemsError.message);
        }
      }
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${orders.length} sales orders salvos`);
  return { success: true, count: orders.length };
}

// ==================== PURCHASE ORDERS + ITEMS ====================

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
        id: order.id,
        orderNumber: order.order_number,
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

  // Deletar orders antigos (CASCADE vai deletar items automaticamente)
  const { error: deleteError } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar purchase orders:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novos orders
  if (orders.length > 0) {
    for (const order of orders) {
      // Inserir order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          // ❌ REMOVIDO: id: order.id (UUID gerado automaticamente pelo banco)
          company_id: companyId,
          order_number: order.orderNumber,
          supplier_id: order.supplierId,
          supplier_name: order.supplierName || '',
          product_name: order.productName || '',
          quantity: order.quantity || 0,
          unit_price: order.unitPrice || 0,
          order_date: order.orderDate,
          due_date: order.dueDate,
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
          bank_account_id: order.bankAccountId,
          first_installment_days: order.firstInstallmentDays || 0,
          due_date_reference: order.dueDateReference || 'issue',
          stock_increased: order.stockIncreased || false,
          accounts_payable_created: order.accountsPayableCreated || false,
          accounts_payable_paid: order.accountsPayablePaid || false,
          supplier_stats_updated: order.supplierStatsUpdated || false,
          is_exceptional_order: order.isExceptionalOrder || false
        })
        .select()
        .single();

      if (orderError) {
        console.error('[SQL_SERVICE] ❌ Erro ao inserir purchase order:', orderError);
        throw new Error(orderError.message);
      }

      // Inserir items (se houver)
      if (order.items && order.items.length > 0) {
        const itemsToInsert = order.items.map((item: any) => ({
          // ❌ REMOVIDO: id: item.id (UUID gerado automaticamente pelo banco)
          company_id: companyId,
          order_id: insertedOrder.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          total: item.total
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('[SQL_SERVICE] ❌ Erro ao inserir items:', itemsError);
          throw new Error(itemsError.message);
        }
      }
    }
  }

  console.log(`[SQL_SERVICE] ✅ ${orders.length} purchase orders salvos`);
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
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    
    return {
      id: row.id,
      productId: row.product_id,
      productName: '', // Não temos esse campo na tabela SQL
      type: row.type,
      quantity: parseFloat(row.quantity),
      date: createdAt ? createdAt.toISOString().split('T')[0] : null,
      time: createdAt ? createdAt.toTimeString().split(' ')[0] : '',
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
    const rows = movements.map((movement: any) => ({
      // ❌ REMOVIDO: id: movement.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      product_id: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      reference_id: movement.referenceId,
      reference_type: movement.referenceType,
      notes: movement.notes || ''
    }));

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

// ==================== FINANCIAL TRANSACTIONS ====================

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
    id: row.id,
    type: row.type, // 'income' ou 'expense'
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
    bankAccountId: row.bank_account_id,
    bankAccountName: row.bank_account_name,
    installmentNumber: row.installment_number,
    totalInstallments: row.total_installments,
    parentTransactionId: row.parent_transaction_id,
    isTransfer: row.is_transfer || false,
    transferPairId: row.transfer_pair_id,
    transferDirection: row.transfer_direction
  })) || [];
}

export async function saveFinancialTransactions(companyId: string, transactions: any[]) {
  const supabase = getSupabaseClient();

  // Deletar transações antigas
  const { error: deleteError } = await supabase
    .from('financial_transactions')
    .delete()
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('[SQL_SERVICE] ❌ Erro ao deletar financial transactions:', deleteError);
    throw new Error(deleteError.message);
  }

  // Inserir novas transações
  if (transactions.length > 0) {
    const rows = transactions.map((transaction: any) => ({
      // ❌ REMOVIDO: id: transaction.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      type: transaction.type,
      category: transaction.category,
      category_id: transaction.categoryId,
      category_name: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      transaction_date: transaction.date || transaction.transactionDate,
      due_date: transaction.dueDate,
      effective_date: transaction.effectiveDate,
      account: transaction.account || '',
      payment_method: transaction.paymentMethod || '',
      payment_method_id: transaction.paymentMethodId,
      payment_method_name: transaction.paymentMethod,
      reference: transaction.reference || '',
      notes: transaction.notes || '',
      origin: transaction.origin || 'Manual',
      party_type: transaction.partyType,
      party_id: transaction.partyId,
      party_name: transaction.partyName,
      cost_center_id: transaction.costCenterId,
      cost_center_name: transaction.costCenterName,
      status: transaction.status || 'Pago',
      bank_account_id: transaction.bankAccountId,
      bank_account_name: transaction.bankAccountName,
      installment_number: transaction.installmentNumber,
      total_installments: transaction.totalInstallments,
      parent_transaction_id: transaction.parentTransactionId,
      is_transfer: transaction.isTransfer || false,
      transfer_pair_id: transaction.transferPairId,
      transfer_direction: transaction.transferDirection
    }));

    const { error: insertError } = await supabase
      .from('financial_transactions')
      .insert(rows);

    if (insertError) {
      console.error('[SQL_SERVICE] ❌ Erro ao inserir financial transactions:', insertError);
      throw new Error(insertError.message);
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
    status: row.status,
    paymentDate: row.payment_date,
    paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : null,
    paymentMethod: row.payment_method || '',
    notes: row.notes || ''
  })) || [];
}

export async function saveAccountsReceivable(companyId: string, accounts: any[]) {
  const supabase = getSupabaseClient();

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
    const rows = accounts.map((account: any) => ({
      // ❌ REMOVIDO: id: account.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      customer_id: account.customerId,
      order_id: account.orderId,
      installment_number: account.installmentNumber,
      total_installments: account.totalInstallments,
      description: account.description,
      amount: account.amount,
      due_date: account.dueDate,
      status: account.status,
      payment_date: account.paymentDate,
      payment_amount: account.paymentAmount,
      payment_method: account.paymentMethod || '',
      notes: account.notes || ''
    }));

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
    status: row.status,
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
    const rows = accounts.map((account: any) => ({
      // ❌ REMOVIDO: id: account.id (UUID gerado automaticamente pelo banco)
      company_id: companyId,
      supplier_id: account.supplierId,
      order_id: account.orderId,
      installment_number: account.installmentNumber,
      total_installments: account.totalInstallments,
      description: account.description,
      amount: account.amount,
      due_date: account.dueDate,
      status: account.status,
      payment_date: account.paymentDate,
      payment_amount: account.paymentAmount,
      payment_method: account.paymentMethod || '',
      notes: account.notes || ''
    }));

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

// ==================== EXPORT ====================

export const sqlServiceExtended = {
  getSalesOrders,
  saveSalesOrders,
  getPurchaseOrders,
  savePurchaseOrders,
  getStockMovements,
  saveStockMovements,
  getFinancialTransactions,
  saveFinancialTransactions,
  getAccountsReceivable,
  saveAccountsReceivable,
  getAccountsPayable,
  saveAccountsPayable
};