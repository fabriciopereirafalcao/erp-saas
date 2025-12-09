-- =================================================================
-- Migration 019: Corrigir tipos de category_id e payment_method_id
-- =================================================================
-- 
-- PROBLEMA: 
-- - Account categories são armazenadas em company_settings com IDs TEXT (ex: "AC-001", "AC-002")
-- - Payment methods são armazenados em company_settings com IDs TEXT (ex: "PM-001", "PM-002")
-- - Mas as colunas nas tabelas eram UUID, causando erro de validação
-- 
-- SOLUÇÃO: Converter colunas de UUID para TEXT para aceitar IDs dessas entidades
-- =================================================================

-- 1. Sales Orders - Converter revenue_category_id de UUID para TEXT
ALTER TABLE sales_orders 
  ALTER COLUMN revenue_category_id TYPE TEXT;

-- 2. Purchase Orders - Converter expense_category_id de UUID para TEXT  
ALTER TABLE purchase_orders 
  ALTER COLUMN expense_category_id TYPE TEXT;

-- 3. Financial Transactions - Converter category_id e payment_method_id de UUID para TEXT
ALTER TABLE financial_transactions 
  ALTER COLUMN category_id TYPE TEXT;

ALTER TABLE financial_transactions 
  ALTER COLUMN payment_method_id TYPE TEXT;

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN sales_orders.revenue_category_id IS 
  'ID da categoria de receita (formato: AC-XXX). Referência a accountCategories em company_settings.';

COMMENT ON COLUMN purchase_orders.expense_category_id IS 
  'ID da categoria de despesa (formato: AC-XXX). Referência a accountCategories em company_settings.';

COMMENT ON COLUMN financial_transactions.category_id IS 
  'ID da categoria (formato: AC-XXX). Referência a accountCategories em company_settings.';

COMMENT ON COLUMN financial_transactions.payment_method_id IS 
  'ID do método de pagamento (formato: PM-XXX). Referência a paymentMethods em company_settings.';
