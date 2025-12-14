-- =====================================================
-- MIGRATION 023: Plano de Contas Hierárquico + DRE
-- =====================================================
-- Descrição: 
--   Refatora account_categories para suportar hierarquia
--   Adiciona seed de plano de contas padrão
--   Cria estrutura para DRE Gerencial parametrizável
-- =====================================================

-- 1️⃣ ALTERAR TABELA ACCOUNT_CATEGORIES
-- Adicionar campos para hierarquia e vínculo com DRE

ALTER TABLE account_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES account_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'analitica',
  ADD COLUMN IF NOT EXISTS dre_line_item VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Adicionar check constraint para account_type
ALTER TABLE account_categories
  DROP CONSTRAINT IF EXISTS chk_account_type;

ALTER TABLE account_categories
  ADD CONSTRAINT chk_account_type 
  CHECK (account_type IN ('sintetica', 'analitica'));

COMMENT ON COLUMN account_categories.parent_id IS 'ID da conta pai (para hierarquia)';
COMMENT ON COLUMN account_categories.level IS 'Nível hierárquico: 1=raiz, 2=grupo, 3=subgrupo, 4=analítica';
COMMENT ON COLUMN account_categories.account_type IS 'Tipo: sintetica (grupo) ou analitica (conta detalhada)';
COMMENT ON COLUMN account_categories.dre_line_item IS 'Vínculo com linha da DRE (ex: receita_bruta, custos, despesas_operacionais)';
COMMENT ON COLUMN account_categories.sort_order IS 'Ordem de exibição na interface';

-- Criar índice para performance em queries hierárquicas
CREATE INDEX IF NOT EXISTS idx_account_categories_parent ON account_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_account_categories_level ON account_categories(level);
CREATE INDEX IF NOT EXISTS idx_account_categories_dre_line ON account_categories(dre_line_item);

-- 2️⃣ CRIAR TABELA DE REGIMES TRIBUTÁRIOS
CREATE TABLE IF NOT EXISTS tax_regimes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de regimes tributários
INSERT INTO tax_regimes (id, name, description) VALUES
  ('SIMPLES', 'Simples Nacional', 'Regime unificado de tributação para pequenas empresas'),
  ('PRESUMIDO', 'Lucro Presumido', 'Regime onde IRPJ/CSLL são calculados sobre base presumida'),
  ('REAL', 'Lucro Real', 'Regime onde IRPJ/CSLL são calculados sobre lucro contábil')
ON CONFLICT (id) DO NOTHING;

-- 3️⃣ ADICIONAR REGIME TRIBUTÁRIO ÀS EMPRESAS
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'SIMPLES' REFERENCES tax_regimes(id);

COMMENT ON COLUMN companies.tax_regime IS 'Regime tributário da empresa (SIMPLES, PRESUMIDO, REAL)';

-- 4️⃣ CRIAR TABELA DE CONFIGURAÇÃO DE DRE POR REGIME
CREATE TABLE IF NOT EXISTS dre_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_regime TEXT NOT NULL REFERENCES tax_regimes(id),
  line_code TEXT NOT NULL,
  line_name TEXT NOT NULL,
  parent_line_code TEXT,
  calculation_type VARCHAR(20) NOT NULL DEFAULT 'sum',
  formula TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  show_in_dre BOOLEAN DEFAULT TRUE,
  is_subtotal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tax_regime, line_code)
);

COMMENT ON TABLE dre_line_items IS 'Estrutura parametrizável da DRE por regime tributário';
COMMENT ON COLUMN dre_line_items.line_code IS 'Código único da linha (ex: receita_bruta, custos, lucro_liquido)';
COMMENT ON COLUMN dre_line_items.calculation_type IS 'Tipo de cálculo: sum (soma de contas), formula (cálculo derivado)';
COMMENT ON COLUMN dre_line_items.formula IS 'Fórmula de cálculo (ex: receita_bruta - deducoes)';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_dre_line_items_regime ON dre_line_items(tax_regime);
CREATE INDEX IF NOT EXISTS idx_dre_line_items_line_code ON dre_line_items(line_code);

-- 5️⃣ SEED DE LINHAS DA DRE PARA SIMPLES NACIONAL
INSERT INTO dre_line_items (tax_regime, line_code, line_name, parent_line_code, calculation_type, formula, sort_order, show_in_dre, is_subtotal) VALUES
  -- SIMPLES NACIONAL
  ('SIMPLES', 'receita_bruta', 'Receita Bruta', NULL, 'sum', NULL, 10, TRUE, FALSE),
  ('SIMPLES', 'deducoes_receita', '(–) Deduções da Receita', NULL, 'sum', NULL, 20, TRUE, FALSE),
  ('SIMPLES', 'receita_liquida', '= Receita Líquida', NULL, 'formula', 'receita_bruta - deducoes_receita', 30, TRUE, TRUE),
  ('SIMPLES', 'custos', '(–) Custos', NULL, 'sum', NULL, 40, TRUE, FALSE),
  ('SIMPLES', 'lucro_bruto', '= Lucro Bruto', NULL, 'formula', 'receita_liquida - custos', 50, TRUE, TRUE),
  ('SIMPLES', 'despesas_operacionais', '(–) Despesas Operacionais (inclui DAS)', NULL, 'sum', NULL, 60, TRUE, FALSE),
  ('SIMPLES', 'outras_receitas_despesas', '(+/–) Outras Receitas/Despesas', NULL, 'sum', NULL, 70, TRUE, FALSE),
  ('SIMPLES', 'lucro_liquido', '= Lucro Líquido', NULL, 'formula', 'lucro_bruto - despesas_operacionais + outras_receitas_despesas', 80, TRUE, TRUE);

-- 6️⃣ SEED DE LINHAS DA DRE PARA LUCRO PRESUMIDO
INSERT INTO dre_line_items (tax_regime, line_code, line_name, parent_line_code, calculation_type, formula, sort_order, show_in_dre, is_subtotal) VALUES
  -- LUCRO PRESUMIDO
  ('PRESUMIDO', 'receita_bruta', 'Receita Bruta', NULL, 'sum', NULL, 10, TRUE, FALSE),
  ('PRESUMIDO', 'deducoes_receita', '(–) Deduções da Receita', NULL, 'sum', NULL, 20, TRUE, FALSE),
  ('PRESUMIDO', 'receita_liquida', '= Receita Líquida', NULL, 'formula', 'receita_bruta - deducoes_receita', 30, TRUE, TRUE),
  ('PRESUMIDO', 'custos', '(–) Custos', NULL, 'sum', NULL, 40, TRUE, FALSE),
  ('PRESUMIDO', 'lucro_bruto', '= Lucro Bruto', NULL, 'formula', 'receita_liquida - custos', 50, TRUE, TRUE),
  ('PRESUMIDO', 'despesas_operacionais', '(–) Despesas Operacionais', NULL, 'sum', NULL, 60, TRUE, FALSE),
  ('PRESUMIDO', 'outras_receitas_despesas', '(+/–) Outras Receitas/Despesas', NULL, 'sum', NULL, 70, TRUE, FALSE),
  ('PRESUMIDO', 'resultado_operacional', '= Resultado Operacional', NULL, 'formula', 'lucro_bruto - despesas_operacionais + outras_receitas_despesas', 80, TRUE, TRUE),
  ('PRESUMIDO', 'irpj', '(–) IRPJ', NULL, 'sum', NULL, 90, TRUE, FALSE),
  ('PRESUMIDO', 'csll', '(–) CSLL', NULL, 'sum', NULL, 100, TRUE, FALSE),
  ('PRESUMIDO', 'lucro_liquido', '= Lucro Líquido', NULL, 'formula', 'resultado_operacional - irpj - csll', 110, TRUE, TRUE);

-- 7️⃣ SEED DE LINHAS DA DRE PARA LUCRO REAL
INSERT INTO dre_line_items (tax_regime, line_code, line_name, parent_line_code, calculation_type, formula, sort_order, show_in_dre, is_subtotal) VALUES
  -- LUCRO REAL
  ('REAL', 'receita_bruta', 'Receita Bruta', NULL, 'sum', NULL, 10, TRUE, FALSE),
  ('REAL', 'deducoes_receita', '(–) Deduções da Receita', NULL, 'sum', NULL, 20, TRUE, FALSE),
  ('REAL', 'receita_liquida', '= Receita Líquida', NULL, 'formula', 'receita_bruta - deducoes_receita', 30, TRUE, TRUE),
  ('REAL', 'custos', '(–) Custos', NULL, 'sum', NULL, 40, TRUE, FALSE),
  ('REAL', 'lucro_bruto', '= Lucro Bruto', NULL, 'formula', 'receita_liquida - custos', 50, TRUE, TRUE),
  ('REAL', 'despesas_operacionais', '(–) Despesas Operacionais', NULL, 'sum', NULL, 60, TRUE, FALSE),
  ('REAL', 'outras_receitas_despesas', '(+/–) Outras Receitas/Despesas', NULL, 'sum', NULL, 70, TRUE, FALSE),
  ('REAL', 'resultado_operacional', '= Resultado Operacional', NULL, 'formula', 'lucro_bruto - despesas_operacionais + outras_receitas_despesas', 80, TRUE, TRUE),
  ('REAL', 'irpj', '(–) IRPJ', NULL, 'sum', NULL, 90, TRUE, FALSE),
  ('REAL', 'csll', '(–) CSLL', NULL, 'sum', NULL, 100, TRUE, FALSE),
  ('REAL', 'lucro_liquido', '= Lucro Líquido', NULL, 'formula', 'resultado_operacional - irpj - csll', 110, TRUE, TRUE);

-- 8️⃣ CRIAR TABELA DE SNAPSHOTS DE DRE (HISTÓRICO)
CREATE TABLE IF NOT EXISTS dre_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_regime TEXT NOT NULL REFERENCES tax_regimes(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dre_snapshots_company ON dre_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_dre_snapshots_period ON dre_snapshots(company_id, period_start, period_end);

COMMENT ON TABLE dre_snapshots IS 'Snapshots históricos de DRE geradas (para comparação temporal)';
COMMENT ON COLUMN dre_snapshots.data IS 'Dados completos da DRE em JSON';

-- 9️⃣ VERIFICAR SE EXISTEM DADOS ANTIGOS E MIGRAR
-- Marcar contas existentes como analíticas se não tiver parent_id
UPDATE account_categories 
SET account_type = 'analitica', 
    level = 4,
    dre_line_item = CASE 
      WHEN type = 'Receita' AND code LIKE '3.1.%' THEN 'receita_bruta'
      WHEN type = 'Receita' AND code LIKE '3.2.%' THEN 'deducoes_receita'
      WHEN type = 'Receita' AND code LIKE '3.3.%' THEN 'outras_receitas_despesas'
      WHEN type = 'Receita' AND code LIKE '3.4.%' THEN 'outras_receitas_despesas'
      WHEN type = 'Despesa' AND code LIKE '4.1.%' THEN 'custos'
      WHEN type = 'Despesa' AND code LIKE '4.2.%' THEN 'despesas_operacionais'
      WHEN type = 'Despesa' AND code LIKE '4.3.%' THEN 'irpj'
      ELSE 'despesas_operacionais'
    END
WHERE parent_id IS NULL;

COMMENT ON TABLE account_categories IS 'Plano de contas hierárquico com vínculo direto à DRE';
