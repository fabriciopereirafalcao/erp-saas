-- =====================================================
-- Migration: Adicionar has_start_date_override
-- Descrição: Adiciona flag de auditoria para transações 
--            liquidadas com data anterior ao início da conta bancária
-- Data: 2025-12-29
-- =====================================================

-- Adicionar coluna has_start_date_override à tabela financial_transactions
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS has_start_date_override BOOLEAN DEFAULT false;

-- Criar índice para otimizar consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_financial_transactions_override 
ON financial_transactions(has_start_date_override) 
WHERE has_start_date_override = true;

-- Comentário explicativo
COMMENT ON COLUMN financial_transactions.has_start_date_override IS 
'Flag de auditoria: TRUE quando a transação foi liquidada com data anterior à data de início da conta bancária. Usado para rastreabilidade e conciliação.';
