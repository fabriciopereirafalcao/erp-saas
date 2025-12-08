-- ============================================================================
-- MIGRATION 015: Criar Tabelas Auxiliares
-- Descrição: Adicionar tabelas de suporte (payment methods, bank accounts, etc)
-- Data: Dezembro 2024
-- ============================================================================

-- =====================================================
-- TABELA: payment_methods (Formas de Pagamento)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('À Vista', 'A Prazo')),
  
  -- Configurações
  installments_allowed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment methods from their company"
  ON payment_methods FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert payment methods to their company"
  ON payment_methods FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update payment methods from their company"
  ON payment_methods FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete payment methods from their company"
  ON payment_methods FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE payment_methods IS 'Formas de pagamento (PIX, Boleto, Cartão, etc)';

-- =====================================================
-- TABELA: account_categories (Plano de Contas)
-- =====================================================
CREATE TABLE IF NOT EXISTS account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tipo
  type TEXT NOT NULL CHECK (type IN ('Receita', 'Despesa')),
  
  -- Dados básicos
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Hierarquia
  parent_id UUID REFERENCES account_categories(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_categories_company ON account_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_account_categories_type ON account_categories(type);
CREATE INDEX IF NOT EXISTS idx_account_categories_parent ON account_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_account_categories_code ON account_categories(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_categories_company_code ON account_categories(company_id, code);

-- RLS
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account categories from their company"
  ON account_categories FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert account categories to their company"
  ON account_categories FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update account categories from their company"
  ON account_categories FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete account categories from their company"
  ON account_categories FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_account_categories_updated_at BEFORE UPDATE ON account_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE account_categories IS 'Plano de contas hierárquico (receitas e despesas)';

-- =====================================================
-- TABELA: bank_accounts (Contas Bancárias)
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados bancários
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  agency TEXT,
  account_number TEXT,
  account_type TEXT CHECK (account_type IN ('Corrente', 'Poupança', 'Caixa')),
  
  -- Saldo
  initial_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);

-- RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank accounts from their company"
  ON bank_accounts FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert bank accounts to their company"
  ON bank_accounts FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update bank accounts from their company"
  ON bank_accounts FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete bank accounts from their company"
  ON bank_accounts FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bank_accounts IS 'Contas bancárias da empresa';

-- =====================================================
-- TABELA: cost_centers (Centros de Custo)
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_active ON cost_centers(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_company_code ON cost_centers(company_id, code);

-- RLS
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost centers from their company"
  ON cost_centers FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert cost centers to their company"
  ON cost_centers FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update cost centers from their company"
  ON cost_centers FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete cost centers from their company"
  ON cost_centers FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cost_centers IS 'Centros de custo para categorização financeira';

-- =====================================================
-- TABELA: product_categories (Categorias de Produtos)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  description TEXT,
  
  -- Hierarquia
  parent_id UUID REFERENCES product_categories(id),
  
  -- Configurações fiscais padrão
  default_ncm TEXT,
  default_cest TEXT,
  default_origin TEXT,
  default_cfop TEXT,
  default_icms_rate DECIMAL(5,2),
  default_pis_rate DECIMAL(5,2),
  default_cofins_rate DECIMAL(5,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_company ON product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);

-- RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product categories from their company"
  ON product_categories FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert product categories to their company"
  ON product_categories FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update product categories from their company"
  ON product_categories FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete product categories from their company"
  ON product_categories FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE product_categories IS 'Categorias hierárquicas de produtos com configurações fiscais padrão';

-- =====================================================
-- TABELA: stock_locations (Locais de Estoque)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Localização
  address TEXT,
  type TEXT CHECK (type IN ('Depósito', 'Loja', 'Armazém', 'Outro')),
  
  -- Capacidade
  capacity_m3 DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_company ON stock_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_active ON stock_locations(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_locations_company_code ON stock_locations(company_id, code);

-- RLS
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock locations from their company"
  ON stock_locations FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert stock locations to their company"
  ON stock_locations FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update stock locations from their company"
  ON stock_locations FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete stock locations from their company"
  ON stock_locations FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_stock_locations_updated_at BEFORE UPDATE ON stock_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stock_locations IS 'Locais físicos de armazenamento de estoque';

-- =====================================================
-- TABELA: product_batches (Lotes de Produtos)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Produto
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  
  -- Dados do lote
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  
  -- Localização
  location_id UUID REFERENCES stock_locations(id),
  location_name TEXT,
  shelf_position TEXT,
  
  -- Quantidades
  initial_quantity DECIMAL(15,3) NOT NULL,
  current_quantity DECIMAL(15,3) NOT NULL,
  reserved_quantity DECIMAL(15,3) DEFAULT 0,
  
  -- Fornecedor (origem)
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  purchase_order_id UUID,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Bloqueado', 'Vencido', 'Esgotado')) DEFAULT 'Ativo',
  
  -- Observações
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_batches_company ON product_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_batch_number ON product_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON product_batches(status);
CREATE INDEX IF NOT EXISTS idx_product_batches_location ON product_batches(location_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_unique ON product_batches(company_id, product_id, batch_number);

-- RLS
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product batches from their company"
  ON product_batches FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert product batches to their company"
  ON product_batches FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update product batches from their company"
  ON product_batches FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete product batches from their company"
  ON product_batches FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON product_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE product_batches IS 'Lotes de produtos para rastreabilidade e controle de validade';

-- =====================================================
-- TABELA: cash_flow_entries (Fluxo de Caixa)
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Data
  date DATE NOT NULL,
  
  -- Tipo
  type TEXT NOT NULL CHECK (type IN ('Entrada', 'Saída')),
  
  -- Categorização
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Valor
  amount DECIMAL(15,2) NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('Realizado', 'Previsto', 'Projetado')),
  
  -- Conta bancária
  bank_account_id UUID REFERENCES bank_accounts(id),
  
  -- Referência
  reference TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_company ON cash_flow_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_date ON cash_flow_entries(date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_type ON cash_flow_entries(type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_status ON cash_flow_entries(status);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_bank_account ON cash_flow_entries(bank_account_id);

-- RLS
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash flow entries from their company"
  ON cash_flow_entries FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert cash flow entries to their company"
  ON cash_flow_entries FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update cash flow entries from their company"
  ON cash_flow_entries FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete cash flow entries from their company"
  ON cash_flow_entries FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_cash_flow_entries_updated_at BEFORE UPDATE ON cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cash_flow_entries IS 'Entradas de fluxo de caixa (realizadas, previstas e projetadas)';

-- =====================================================
-- TABELA: price_tables (Tabelas de Preço)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuração
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  markup_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_tables_company ON price_tables(company_id);
CREATE INDEX IF NOT EXISTS idx_price_tables_active ON price_tables(is_active);

-- RLS
ALTER TABLE price_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price tables from their company"
  ON price_tables FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert price tables to their company"
  ON price_tables FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update price tables from their company"
  ON price_tables FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete price tables from their company"
  ON price_tables FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_price_tables_updated_at BEFORE UPDATE ON price_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE price_tables IS 'Tabelas de preço customizadas por cliente';

-- =====================================================
-- TABELA: price_table_items (Itens das Tabelas de Preço)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_table_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Referências
  price_table_id UUID NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  
  -- Preço
  price DECIMAL(15,2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_table_items_company ON price_table_items(company_id);
CREATE INDEX IF NOT EXISTS idx_price_table_items_table ON price_table_items(price_table_id);
CREATE INDEX IF NOT EXISTS idx_price_table_items_product ON price_table_items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_table_items_unique ON price_table_items(price_table_id, product_id);

-- RLS
ALTER TABLE price_table_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price table items from their company"
  ON price_table_items FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert price table items to their company"
  ON price_table_items FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update price table items from their company"
  ON price_table_items FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete price table items from their company"
  ON price_table_items FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_price_table_items_updated_at BEFORE UPDATE ON price_table_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE price_table_items IS 'Itens (produtos) das tabelas de preço';

-- =====================================================
-- TABELA: dashboard_metrics (Métricas do Dashboard)
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Período
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  
  -- Métricas de Vendas
  total_sales DECIMAL(15,2) DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  
  -- Métricas de Compras
  total_purchases DECIMAL(15,2) DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  
  -- Métricas Financeiras
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_profit DECIMAL(15,2) DEFAULT 0,
  
  -- Contas a Receber/Pagar
  accounts_receivable_pending DECIMAL(15,2) DEFAULT 0,
  accounts_payable_pending DECIMAL(15,2) DEFAULT 0,
  
  -- Clientes e Fornecedores
  new_customers_count INTEGER DEFAULT 0,
  new_suppliers_count INTEGER DEFAULT 0,
  
  -- Estoque
  total_inventory_value DECIMAL(15,2) DEFAULT 0,
  low_stock_items_count INTEGER DEFAULT 0,
  out_of_stock_items_count INTEGER DEFAULT 0,
  
  -- NF-e
  nfe_issued_count INTEGER DEFAULT 0,
  nfe_authorized_count INTEGER DEFAULT 0,
  
  -- Última atualização
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_company ON dashboard_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type ON dashboard_metrics(metric_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_unique ON dashboard_metrics(company_id, metric_date, metric_type);

-- RLS
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dashboard metrics from their company"
  ON dashboard_metrics FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert dashboard metrics to their company"
  ON dashboard_metrics FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update dashboard metrics from their company"
  ON dashboard_metrics FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete dashboard metrics from their company"
  ON dashboard_metrics FOR DELETE
  USING (company_id = user_company_id());

COMMENT ON TABLE dashboard_metrics IS 'Cache de métricas agregadas para performance do dashboard';

-- =====================================================
-- TABELA: saved_reports (Relatórios Salvos)
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo de relatório
  report_type TEXT NOT NULL,
  
  -- Configuração (JSON)
  filters JSONB,
  columns JSONB,
  sort_config JSONB,
  
  -- Formato de exportação padrão
  default_format TEXT CHECK (default_format IN ('PDF', 'Excel', 'CSV')),
  
  -- Compartilhamento
  is_shared BOOLEAN DEFAULT false,
  
  -- Agendamento (futuro)
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT,
  schedule_config JSONB,
  
  -- Criador
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT NOT NULL,
  
  -- Favorito
  is_favorite BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON saved_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_saved_reports_creator ON saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_reports_shared ON saved_reports(is_shared);
CREATE INDEX IF NOT EXISTS idx_saved_reports_favorite ON saved_reports(is_favorite);

-- RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saved reports from their company"
  ON saved_reports FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert saved reports to their company"
  ON saved_reports FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update saved reports from their company"
  ON saved_reports FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete saved reports from their company"
  ON saved_reports FOR DELETE
  USING (company_id = user_company_id());

-- Trigger
CREATE TRIGGER update_saved_reports_updated_at BEFORE UPDATE ON saved_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE saved_reports IS 'Relatórios salvos/favoritos com configurações personalizadas';

-- =====================================================
-- FIM DA MIGRATION 015
-- =====================================================
