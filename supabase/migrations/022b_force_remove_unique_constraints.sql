-- =====================================================
-- MIGRATION 022B: Forçar remoção de UNIQUE constraints globais
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Remove TODOS os UNIQUE constraints em SKU que não incluam company_id
-- =====================================================

-- ==================== FINANCIAL TRANSACTIONS ====================

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Buscar TODOS os constraints UNIQUE na coluna sku
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'financial_transactions'::regclass
      AND contype = 'u'
      AND conname LIKE '%sku%'
  LOOP
    EXECUTE format('ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
    RAISE NOTICE 'Removido constraint: %', constraint_record.conname;
  END LOOP;
  
  -- Remover índices UNIQUE que contenham apenas 'sku'
  FOR constraint_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'financial_transactions'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%sku%'
      AND indexdef NOT LIKE '%company_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I CASCADE', constraint_record.indexname);
    RAISE NOTICE 'Removido índice UNIQUE: %', constraint_record.indexname;
  END LOOP;
END $$;

-- Criar índice UNIQUE composto (company_id + sku) se não existir
DROP INDEX IF EXISTS financial_transactions_company_id_sku_key CASCADE;
CREATE UNIQUE INDEX financial_transactions_company_id_sku_key 
ON financial_transactions(company_id, sku) 
WHERE sku IS NOT NULL;

-- Criar índice simples para busca rápida
DROP INDEX IF EXISTS idx_financial_transactions_sku CASCADE;
CREATE INDEX idx_financial_transactions_sku 
ON financial_transactions(sku) 
WHERE sku IS NOT NULL;

-- ==================== ACCOUNTS RECEIVABLE ====================

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'accounts_receivable'::regclass
      AND contype = 'u'
      AND conname LIKE '%sku%'
  LOOP
    EXECUTE format('ALTER TABLE accounts_receivable DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
    RAISE NOTICE 'Removido constraint: %', constraint_record.conname;
  END LOOP;
  
  FOR constraint_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'accounts_receivable'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%sku%'
      AND indexdef NOT LIKE '%company_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I CASCADE', constraint_record.indexname);
    RAISE NOTICE 'Removido índice UNIQUE: %', constraint_record.indexname;
  END LOOP;
END $$;

DROP INDEX IF EXISTS accounts_receivable_company_id_sku_key CASCADE;
CREATE UNIQUE INDEX accounts_receivable_company_id_sku_key 
ON accounts_receivable(company_id, sku) 
WHERE sku IS NOT NULL;

DROP INDEX IF EXISTS idx_accounts_receivable_sku CASCADE;
CREATE INDEX idx_accounts_receivable_sku 
ON accounts_receivable(sku) 
WHERE sku IS NOT NULL;

-- ==================== ACCOUNTS PAYABLE ====================

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'accounts_payable'::regclass
      AND contype = 'u'
      AND conname LIKE '%sku%'
  LOOP
    EXECUTE format('ALTER TABLE accounts_payable DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
    RAISE NOTICE 'Removido constraint: %', constraint_record.conname;
  END LOOP;
  
  FOR constraint_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'accounts_payable'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%sku%'
      AND indexdef NOT LIKE '%company_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I CASCADE', constraint_record.indexname);
    RAISE NOTICE 'Removido índice UNIQUE: %', constraint_record.indexname;
  END LOOP;
END $$;

DROP INDEX IF EXISTS accounts_payable_company_id_sku_key CASCADE;
CREATE UNIQUE INDEX accounts_payable_company_id_sku_key 
ON accounts_payable(company_id, sku) 
WHERE sku IS NOT NULL;

DROP INDEX IF EXISTS idx_accounts_payable_sku CASCADE;
CREATE INDEX idx_accounts_payable_sku 
ON accounts_payable(sku) 
WHERE sku IS NOT NULL;

-- =====================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICAÇÃO DE CONSTRAINTS APÓS MIGRATION:';
  RAISE NOTICE '==============================================';
  
  -- Listar constraints restantes
  RAISE NOTICE 'Financial Transactions - Constraints UNIQUE:';
  FOR constraint_record IN
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'financial_transactions'::regclass
      AND contype = 'u'
  LOOP
    RAISE NOTICE '  - %: %', constraint_record.conname, constraint_record.definition;
  END LOOP;
  
  RAISE NOTICE 'Financial Transactions - Índices UNIQUE:';
  FOR constraint_record IN
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'financial_transactions'
      AND indexdef LIKE '%UNIQUE%'
  LOOP
    RAISE NOTICE '  - %: %', constraint_record.indexname, constraint_record.indexdef;
  END LOOP;
END $$;

-- =====================================================
-- FIM DA MIGRATION 022B
-- =====================================================
