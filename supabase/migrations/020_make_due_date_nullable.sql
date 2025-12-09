-- =====================================================
-- Migration 020: Tornar due_date nullable em sales_orders e purchase_orders
-- =====================================================
-- Motivo: Nem todos os pedidos precisam de uma data de vencimento específica
-- Alguns pedidos podem ser pagos à vista ou ter condições flexíveis
-- Data: 2024
-- =====================================================

-- Remover constraint NOT NULL de due_date em sales_orders
ALTER TABLE sales_orders 
  ALTER COLUMN due_date DROP NOT NULL;

-- Remover constraint NOT NULL de due_date em purchase_orders
ALTER TABLE purchase_orders 
  ALTER COLUMN due_date DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN sales_orders.due_date IS 'Data de vencimento do pagamento (opcional - pode ser NULL para pedidos à vista ou sem prazo definido)';
COMMENT ON COLUMN purchase_orders.due_date IS 'Data de vencimento do pagamento (opcional - pode ser NULL para pedidos à vista ou sem prazo definido)';
