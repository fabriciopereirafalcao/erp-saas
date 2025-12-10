-- =====================================================
-- MIGRATION: Adicionar coluna SKU para Financial Tables
-- =====================================================
-- Data: 2025-12-10
-- Descrição: Adiciona coluna 'sku' às tabelas financial_transactions,
--            accounts_receivable e accounts_payable para permitir IDs
--            legíveis (FT-0001, AR-0001, AP-0001)
-- =====================================================

-- Adicionar coluna SKU à tabela financial_transactions
ALTER TABLE financial_transactions
ADD COLUMN sku TEXT UNIQUE;

CREATE INDEX idx_financial_transactions_sku ON financial_transactions(sku);

-- Adicionar coluna SKU à tabela accounts_receivable
ALTER TABLE accounts_receivable
ADD COLUMN sku TEXT UNIQUE;

CREATE INDEX idx_accounts_receivable_sku ON accounts_receivable(sku);

-- Adicionar coluna SKU à tabela accounts_payable
ALTER TABLE accounts_payable
ADD COLUMN sku TEXT UNIQUE;

CREATE INDEX idx_accounts_payable_sku ON accounts_payable(sku);

-- =====================================================
-- NOVOS CAMPOS PARA financial_transactions
-- =====================================================
-- Adicionar campos que estavam faltando na tabela

ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS payment_method_id UUID,
ADD COLUMN IF NOT EXISTS payment_method_name TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS party_type TEXT,
ADD COLUMN IF NOT EXISTS party_id UUID,
ADD COLUMN IF NOT EXISTS party_name TEXT,
ADD COLUMN IF NOT EXISTS cost_center_id UUID,
ADD COLUMN IF NOT EXISTS cost_center_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pago',
ADD COLUMN IF NOT EXISTS bank_account_id UUID,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS installment_number INTEGER,
ADD COLUMN IF NOT EXISTS total_installments INTEGER,
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID,
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transfer_pair_id UUID,
ADD COLUMN IF NOT EXISTS transfer_direction TEXT;

-- Criar índices para campos novos
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_party_id ON financial_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference ON financial_transactions(reference);
