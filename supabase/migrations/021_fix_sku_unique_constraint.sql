-- =====================================================
-- MIGRATION: Corrigir constraints UNIQUE de SKU
-- =====================================================
-- 
-- PROBLEMA CRÍTICO: As constraints UNIQUE de SKU são globais,
-- permitindo apenas um FT-0001 em TODAS as empresas.
-- 
-- SOLUÇÃO: Substituir por UNIQUE (company_id, sku) para
-- permitir FT-0001 em cada empresa separadamente.
--
-- =====================================================

-- ==================== FINANCIAL TRANSACTIONS ====================

-- 1. Dropar constraint UNIQUE antiga (global)
ALTER TABLE financial_transactions 
  DROP CONSTRAINT IF EXISTS financial_transactions_sku_key;

-- 2. Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE financial_transactions 
  ADD CONSTRAINT financial_transactions_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== ACCOUNTS RECEIVABLE ====================

-- 1. Dropar constraint UNIQUE antiga (global)
ALTER TABLE accounts_receivable 
  DROP CONSTRAINT IF EXISTS accounts_receivable_sku_key;

-- 2. Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE accounts_receivable 
  ADD CONSTRAINT accounts_receivable_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== ACCOUNTS PAYABLE ====================

-- 1. Dropar constraint UNIQUE antiga (global)
ALTER TABLE accounts_payable 
  DROP CONSTRAINT IF EXISTS accounts_payable_sku_key;

-- 2. Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE accounts_payable 
  ADD CONSTRAINT accounts_payable_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== SALES ORDERS ====================

-- Verificar se existe constraint UNIQUE global
ALTER TABLE sales_orders 
  DROP CONSTRAINT IF EXISTS sales_orders_order_number_key;

-- Criar constraint UNIQUE composta (company_id + order_number)
ALTER TABLE sales_orders 
  ADD CONSTRAINT sales_orders_company_order_number_unique 
  UNIQUE (company_id, order_number);

-- ==================== PURCHASE ORDERS ====================

-- Verificar se existe constraint UNIQUE global
ALTER TABLE purchase_orders 
  DROP CONSTRAINT IF EXISTS purchase_orders_order_number_key;

-- Criar constraint UNIQUE composta (company_id + order_number)
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_company_order_number_unique 
  UNIQUE (company_id, order_number);

-- ==================== CUSTOMERS ====================

-- Verificar se existe constraint UNIQUE global de SKU
ALTER TABLE customers 
  DROP CONSTRAINT IF EXISTS customers_sku_key;

-- Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE customers 
  ADD CONSTRAINT customers_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== SUPPLIERS ====================

-- Verificar se existe constraint UNIQUE global de SKU
ALTER TABLE suppliers 
  DROP CONSTRAINT IF EXISTS suppliers_sku_key;

-- Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE suppliers 
  ADD CONSTRAINT suppliers_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== PRODUCTS ====================

-- Verificar se existe constraint UNIQUE global de SKU
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_sku_key;

-- Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE products 
  ADD CONSTRAINT products_company_sku_unique 
  UNIQUE (company_id, sku);

-- ==================== BANK ACCOUNTS ====================

-- Verificar se existe constraint UNIQUE global de SKU
ALTER TABLE bank_accounts 
  DROP CONSTRAINT IF EXISTS bank_accounts_sku_key;

-- Criar constraint UNIQUE composta (company_id + sku)
ALTER TABLE bank_accounts 
  ADD CONSTRAINT bank_accounts_company_sku_unique 
  UNIQUE (company_id, sku);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Comentários para cada tabela
COMMENT ON CONSTRAINT financial_transactions_company_sku_unique ON financial_transactions IS 
  'SKU único por empresa (não global) - permite FT-0001 em cada empresa';

COMMENT ON CONSTRAINT accounts_receivable_company_sku_unique ON accounts_receivable IS 
  'SKU único por empresa (não global) - permite AR-0001 em cada empresa';

COMMENT ON CONSTRAINT accounts_payable_company_sku_unique ON accounts_payable IS 
  'SKU único por empresa (não global) - permite AP-0001 em cada empresa';

COMMENT ON CONSTRAINT sales_orders_company_order_number_unique ON sales_orders IS 
  'Número de pedido único por empresa (não global) - permite PV-0001 em cada empresa';

COMMENT ON CONSTRAINT purchase_orders_company_order_number_unique ON purchase_orders IS 
  'Número de pedido único por empresa (não global) - permite PC-0001 em cada empresa';

COMMENT ON CONSTRAINT customers_company_sku_unique ON customers IS 
  'SKU único por empresa (não global) - permite CLI-001 em cada empresa';

COMMENT ON CONSTRAINT suppliers_company_sku_unique ON suppliers IS 
  'SKU único por empresa (não global) - permite FOR-001 em cada empresa';

COMMENT ON CONSTRAINT products_company_sku_unique ON products IS 
  'SKU único por empresa (não global) - permite PROD-001 em cada empresa';

COMMENT ON CONSTRAINT bank_accounts_company_sku_unique ON bank_accounts IS 
  'SKU único por empresa (não global) - permite BANK-001 em cada empresa';
