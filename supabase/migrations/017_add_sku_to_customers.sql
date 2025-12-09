-- =====================================================
-- Migration 017: Adicionar coluna SKU para clientes
-- =====================================================
-- Data: 2024-12-09
-- Descrição: Adiciona coluna sku na tabela customers para 
--            gerar códigos sequenciais CLI-001, CLI-002, etc.

-- Adicionar coluna sku
ALTER TABLE customers 
ADD COLUMN sku TEXT;

-- Criar índice único composto (company_id + sku)
-- Permite SKUs duplicados entre empresas diferentes
CREATE UNIQUE INDEX customers_company_id_sku_key 
ON customers(company_id, sku);

-- Criar índice para busca rápida
CREATE INDEX idx_customers_sku 
ON customers(sku);

-- Popular SKUs existentes com base em created_at
-- Gera CLI-001, CLI-002, CLI-003... para clientes existentes
DO $$
DECLARE
  company RECORD;
  customer RECORD;
  counter INTEGER;
BEGIN
  -- Para cada empresa
  FOR company IN 
    SELECT DISTINCT company_id 
    FROM customers 
    WHERE sku IS NULL
  LOOP
    counter := 1;
    
    -- Para cada cliente da empresa (ordenado por data de criação)
    FOR customer IN 
      SELECT id 
      FROM customers 
      WHERE company_id = company.company_id 
        AND sku IS NULL
      ORDER BY created_at ASC
    LOOP
      -- Atualizar com SKU sequencial
      UPDATE customers 
      SET sku = 'CLI-' || LPAD(counter::TEXT, 3, '0')
      WHERE id = customer.id;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Comentários
COMMENT ON COLUMN customers.sku IS 'Código sequencial do cliente (CLI-001, CLI-002, etc.)';
