-- =====================================================
-- MIGRAÇÃO 002 - Adicionar campo settings em companies
-- =====================================================

-- Adicionar coluna settings para armazenar configurações da empresa
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Comentário descrevendo o campo
COMMENT ON COLUMN companies.settings IS 'Configurações completas da empresa em formato JSON (CNPJ, endereço, contas bancárias, etc)';

-- Criar índice GIN para queries eficientes em JSONB
CREATE INDEX IF NOT EXISTS idx_companies_settings ON companies USING GIN (settings);
