-- =====================================================
-- Migration 020: Converter price_table_id de UUID para TEXT
-- =====================================================
-- Motivo: O sistema usa IDs customizados como 'TAB-DEFAULT' para tabelas de preço
-- Similar às migrations 019 (payment_method) e 018 (revenue_category_id)
-- Data: 2024-12-09
-- =====================================================

-- Converter price_table_id em sales_orders de UUID para TEXT
ALTER TABLE sales_orders 
  ALTER COLUMN price_table_id TYPE TEXT USING price_table_id::TEXT;

-- Converter price_table_id em purchase_orders de UUID para TEXT
ALTER TABLE purchase_orders 
  ALTER COLUMN price_table_id TYPE TEXT USING price_table_id::TEXT;

-- Converter price_table_id em customers de UUID para TEXT
ALTER TABLE customers 
  ALTER COLUMN price_table_id TYPE TEXT USING price_table_id::TEXT;

-- Comentários explicativos
COMMENT ON COLUMN sales_orders.price_table_id IS 'ID da tabela de preços (TEXT para suportar IDs customizados como TAB-DEFAULT)';
COMMENT ON COLUMN purchase_orders.price_table_id IS 'ID da tabela de preços (TEXT para suportar IDs customizados como TAB-DEFAULT)';
COMMENT ON COLUMN customers.price_table_id IS 'ID da tabela de preços (TEXT para suportar IDs customizados como TAB-DEFAULT)';
