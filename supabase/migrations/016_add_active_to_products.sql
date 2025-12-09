-- =====================================================
-- Migration 016: Adicionar campo 'active' em products
-- Data: 2025-01-09
-- Descrição: Campo booleano para soft delete de produtos
--            Diferente do campo 'status' que controla estoque
-- =====================================================

-- Adicionar campo active (default true)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Criar índice para otimizar queries
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Atualizar produtos existentes para ativo
UPDATE products 
SET active = true 
WHERE active IS NULL;

-- Adicionar constraint NOT NULL após atualizar dados existentes
ALTER TABLE products
  ALTER COLUMN active SET DEFAULT true,
  ALTER COLUMN active SET NOT NULL;

-- Comentário
COMMENT ON COLUMN products.active IS 'Indica se o produto está ativo (true) ou inativo/descontinuado (false). Diferente do campo status que controla estoque.';
