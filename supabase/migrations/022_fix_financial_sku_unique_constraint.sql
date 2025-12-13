-- =====================================================
-- MIGRATION 022: Corrigir UNIQUE constraint de SKUs em Financial Tables
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Remove UNIQUE global de SKUs em financial_transactions,
--            accounts_receivable e accounts_payable, e cria
--            UNIQUE compostos com company_id para isolamento multi-tenant
-- =====================================================

-- ==================== FINANCIAL TRANSACTIONS ====================

-- Remover constraint UNIQUE global
ALTER TABLE financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_sku_key;

-- Remover índice UNIQUE se existir
DROP INDEX IF EXISTS financial_transactions_sku_key;

-- Criar índice UNIQUE composto (company_id + sku)
-- Permite SKUs duplicados entre empresas diferentes
CREATE UNIQUE INDEX financial_transactions_company_id_sku_key 
ON financial_transactions(company_id, sku);

-- Manter índice simples para busca rápida
CREATE INDEX IF NOT EXISTS idx_financial_transactions_sku 
ON financial_transactions(sku);

-- ==================== ACCOUNTS RECEIVABLE ====================

-- Remover constraint UNIQUE global
ALTER TABLE accounts_receivable 
DROP CONSTRAINT IF EXISTS accounts_receivable_sku_key;

-- Remover índice UNIQUE se existir
DROP INDEX IF EXISTS accounts_receivable_sku_key;

-- Criar índice UNIQUE composto (company_id + sku)
CREATE UNIQUE INDEX accounts_receivable_company_id_sku_key 
ON accounts_receivable(company_id, sku);

-- Manter índice simples para busca rápida
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_sku 
ON accounts_receivable(sku);

-- ==================== ACCOUNTS PAYABLE ====================

-- Remover constraint UNIQUE global
ALTER TABLE accounts_payable 
DROP CONSTRAINT IF EXISTS accounts_payable_sku_key;

-- Remover índice UNIQUE se existir
DROP INDEX IF EXISTS accounts_payable_sku_key;

-- Criar índice UNIQUE composto (company_id + sku)
CREATE UNIQUE INDEX accounts_payable_company_id_sku_key 
ON accounts_payable(company_id, sku);

-- Manter índice simples para busca rápida
CREATE INDEX IF NOT EXISTS idx_accounts_payable_sku 
ON accounts_payable(sku);

-- =====================================================
-- FIM DA MIGRATION 022
-- =====================================================
