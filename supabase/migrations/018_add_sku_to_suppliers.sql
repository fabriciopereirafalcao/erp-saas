-- =====================================================
-- Migration 018: Adicionar coluna SKU para fornecedores
-- =====================================================
-- Data: 2024-12-09
-- Descrição: Adiciona coluna sku na tabela suppliers para 
--            gerar códigos sequenciais FOR-001, FOR-002, etc.

-- Adicionar coluna sku
ALTER TABLE suppliers 
ADD COLUMN sku TEXT;

-- Criar índice único composto (company_id + sku)
-- Permite SKUs duplicados entre empresas diferentes
CREATE UNIQUE INDEX suppliers_company_id_sku_key 
ON suppliers(company_id, sku);

-- Criar índice para busca rápida
CREATE INDEX idx_suppliers_sku 
ON suppliers(sku);

-- Popular SKUs existentes com base em created_at
-- Gera FOR-001, FOR-002, FOR-003... para fornecedores existentes
DO $$
DECLARE
  company RECORD;
  supplier RECORD;
  counter INTEGER;
BEGIN
  -- Para cada empresa
  FOR company IN 
    SELECT DISTINCT company_id 
    FROM suppliers 
    WHERE sku IS NULL
  LOOP
    counter := 1;
    
    -- Para cada fornecedor da empresa (ordenado por data de criação)
    FOR supplier IN 
      SELECT id 
      FROM suppliers 
      WHERE company_id = company.company_id 
        AND sku IS NULL
      ORDER BY created_at ASC
    LOOP
      -- Atualizar com SKU sequencial
      UPDATE suppliers 
      SET sku = 'FOR-' || LPAD(counter::TEXT, 3, '0')
      WHERE id = supplier.id;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Comentários
COMMENT ON COLUMN suppliers.sku IS 'Código sequencial do fornecedor (FOR-001, FOR-002, etc.)';
