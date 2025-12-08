-- ============================================================================
-- MIGRATION 014: Expandir Tabelas Core
-- Descrição: Adicionar campos faltantes nas tabelas existentes
-- Data: Dezembro 2024
-- ============================================================================

-- =====================================================
-- EXPANDIR: companies
-- Adicionar campos de Billing/Planos
-- =====================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_nfe_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nfe_used_current_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Índices para Stripe
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);

-- Comentários
COMMENT ON COLUMN companies.max_users IS 'Limite de usuários do plano atual';
COMMENT ON COLUMN companies.max_nfe_month IS 'Limite de NF-es por mês do plano';
COMMENT ON COLUMN companies.nfe_used_current_month IS 'Quantidade de NF-es usadas no mês atual';
COMMENT ON COLUMN companies.stripe_customer_id IS 'ID do cliente no Stripe';
COMMENT ON COLUMN companies.stripe_subscription_id IS 'ID da assinatura no Stripe';

-- =====================================================
-- EXPANDIR: users
-- Adicionar roles adicionais
-- =====================================================
-- Remover constraint antiga e criar nova com mais roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (
    role IN ('owner', 'admin', 'manager', 'salesperson', 'buyer', 'financial', 'viewer', 'user')
  );

COMMENT ON COLUMN users.role IS 'Papel do usuário: owner, admin, manager, salesperson, buyer, financial, viewer, user';

-- =====================================================
-- EXPANDIR: products
-- Adicionar dados fiscais e rastreabilidade
-- =====================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Em Estoque',
  ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE,
  
  -- Dados fiscais
  ADD COLUMN IF NOT EXISTS ncm TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS service_code TEXT,
  ADD COLUMN IF NOT EXISTS csosn TEXT,
  ADD COLUMN IF NOT EXISTS cst TEXT,
  ADD COLUMN IF NOT EXISTS icms_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS pis_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cofins_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS ipi_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cfop TEXT,
  ADD COLUMN IF NOT EXISTS tax_customized BOOLEAN DEFAULT false,
  
  -- Rastreabilidade (MED-005)
  ADD COLUMN IF NOT EXISTS requires_batch_control BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_expiry_date BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_location TEXT,
  ADD COLUMN IF NOT EXISTS shelf_life INTEGER;

-- Adicionar constraint de status
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products
  ADD CONSTRAINT products_status_check CHECK (
    status IN ('Em Estoque', 'Baixo Estoque', 'Fora de Estoque')
  );

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_ncm ON products(ncm) WHERE ncm IS NOT NULL;

-- Comentários
COMMENT ON COLUMN products.ncm IS 'Nomenclatura Comum do Mercosul (8 dígitos)';
COMMENT ON COLUMN products.cest IS 'Código Especificador da Substituição Tributária';
COMMENT ON COLUMN products.origin IS 'Origem da mercadoria (0-8)';
COMMENT ON COLUMN products.cfop IS 'Código Fiscal de Operações';
COMMENT ON COLUMN products.requires_batch_control IS 'Se requer controle por lote';
COMMENT ON COLUMN products.requires_expiry_date IS 'Se tem data de validade';

-- =====================================================
-- EXPANDIR: customers
-- Adicionar campos fiscais completos
-- =====================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS state_registration TEXT,
  ADD COLUMN IF NOT EXISTS city_registration TEXT,
  ADD COLUMN IF NOT EXISTS icms_contributor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo',
  ADD COLUMN IF NOT EXISTS price_table_id UUID;

-- Atualizar constraint de type para document_type
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_type_check;
ALTER TABLE customers
  ADD CONSTRAINT customers_document_type_check CHECK (
    document_type IN ('PJ', 'PF')
  );

-- Constraint de status
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers
  ADD CONSTRAINT customers_status_check CHECK (
    status IN ('Ativo', 'Inativo')
  );

-- Índice de status
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Comentários
COMMENT ON COLUMN customers.document_type IS 'PJ (Pessoa Jurídica) ou PF (Pessoa Física)';
COMMENT ON COLUMN customers.icms_contributor IS 'Se é contribuinte de ICMS';
COMMENT ON COLUMN customers.price_table_id IS 'Tabela de preço vinculada ao cliente';

-- =====================================================
-- EXPANDIR: suppliers
-- Adicionar campos fiscais completos
-- =====================================================
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS state_registration TEXT,
  ADD COLUMN IF NOT EXISTS city_registration TEXT,
  ADD COLUMN IF NOT EXISTS icms_contributor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

-- Constraint de document_type
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_document_type_check;
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_document_type_check CHECK (
    document_type IN ('PJ', 'PF')
  );

-- Constraint de status
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_status_check;
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_status_check CHECK (
    status IN ('Ativo', 'Inativo')
  );

-- Índice de status
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- Comentários
COMMENT ON COLUMN suppliers.document_type IS 'PJ (Pessoa Jurídica) ou PF (Pessoa Física)';

-- =====================================================
-- EXPANDIR: sales_orders
-- Adicionar campos de controle avançado
-- =====================================================
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(15,3),
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS billing_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS price_table_id UUID,
  ADD COLUMN IF NOT EXISTS revenue_category_id UUID,
  ADD COLUMN IF NOT EXISTS sales_person TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS first_installment_days INTEGER,
  ADD COLUMN IF NOT EXISTS due_date_reference TEXT,
  
  -- Flags de ações executadas
  ADD COLUMN IF NOT EXISTS stock_reduced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounts_receivable_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounts_receivable_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_stats_updated BOOLEAN DEFAULT false,
  
  -- Referências
  ADD COLUMN IF NOT EXISTS stock_reduction_id UUID,
  ADD COLUMN IF NOT EXISTS accounts_receivable_id UUID,
  ADD COLUMN IF NOT EXISTS financial_transaction_id UUID,
  
  -- Controle
  ADD COLUMN IF NOT EXISTS is_exceptional_order BOOLEAN DEFAULT false;

-- Atualizar constraint de status com mais opções
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_status_check CHECK (
    status IN ('pending', 'partial', 'completed', 'cancelled', 
               'Processando', 'Confirmado', 'Enviado', 'Entregue', 
               'Parcialmente Concluído', 'Concluído', 'Cancelado')
  );

-- Constraint de due_date_reference
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_due_date_ref_check;
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_due_date_ref_check CHECK (
    due_date_reference IN ('issue', 'billing', 'delivery')
  );

-- Comentários
COMMENT ON COLUMN sales_orders.stock_reduced IS 'Flag: estoque já foi reduzido';
COMMENT ON COLUMN sales_orders.accounts_receivable_created IS 'Flag: contas a receber já foram criadas';
COMMENT ON COLUMN sales_orders.is_exceptional_order IS 'Pedido com fluxo excepcional (pular etapas)';

-- =====================================================
-- EXPANDIR: purchase_orders
-- Adicionar campos de controle avançado
-- =====================================================
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(15,3),
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS billing_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS price_table_id UUID,
  ADD COLUMN IF NOT EXISTS expense_category_id UUID,
  ADD COLUMN IF NOT EXISTS buyer TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS first_installment_days INTEGER,
  ADD COLUMN IF NOT EXISTS due_date_reference TEXT,
  
  -- Flags de ações executadas
  ADD COLUMN IF NOT EXISTS stock_increased BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounts_payable_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accounts_payable_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_stats_updated BOOLEAN DEFAULT false,
  
  -- Referências
  ADD COLUMN IF NOT EXISTS stock_increase_id UUID,
  ADD COLUMN IF NOT EXISTS accounts_payable_id UUID,
  ADD COLUMN IF NOT EXISTS financial_transaction_id UUID,
  
  -- Controle
  ADD COLUMN IF NOT EXISTS is_exceptional_order BOOLEAN DEFAULT false;

-- Atualizar constraint de status com mais opções
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check CHECK (
    status IN ('pending', 'partial', 'completed', 'cancelled',
               'Processando', 'Confirmado', 'Enviado', 'Recebido',
               'Parcialmente Concluído', 'Concluído', 'Cancelado')
  );

-- Constraint de due_date_reference
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_due_date_ref_check;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_due_date_ref_check CHECK (
    due_date_reference IN ('issue', 'billing', 'delivery')
  );

-- =====================================================
-- EXPANDIR: financial_transactions
-- Adicionar campos completos
-- =====================================================
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS party_type TEXT,
  ADD COLUMN IF NOT EXISTS party_id UUID,
  ADD COLUMN IF NOT EXISTS party_name TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS cost_center_id UUID,
  ADD COLUMN IF NOT EXISTS cost_center_name TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pago',
  ADD COLUMN IF NOT EXISTS payment_method_id UUID,
  ADD COLUMN IF NOT EXISTS payment_method_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER,
  ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES financial_transactions(id),
  ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_pair_id UUID REFERENCES financial_transactions(id),
  ADD COLUMN IF NOT EXISTS transfer_direction TEXT,
  ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP WITH TIME ZONE;

-- Constraint de origin
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_origin_check;
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_origin_check CHECK (
    origin IN ('Manual', 'Pedido')
  );

-- Constraint de party_type
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_party_type_check;
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_party_type_check CHECK (
    party_type IN ('Cliente', 'Fornecedor', 'Outro')
  );

-- Constraint de status
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_status_check CHECK (
    status IN ('A Receber', 'Recebido', 'A Pagar', 'Pago', 'Cancelado')
  );

-- Constraint de transfer_direction
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_transfer_dir_check;
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_transfer_dir_check CHECK (
    transfer_direction IN ('origem', 'destino')
  );

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_party ON financial_transactions(party_type, party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_parent ON financial_transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON financial_transactions(due_date) WHERE due_date IS NOT NULL;

-- Comentários
COMMENT ON COLUMN financial_transactions.origin IS 'Origem: Manual ou Pedido';
COMMENT ON COLUMN financial_transactions.party_type IS 'Tipo da parte: Cliente, Fornecedor ou Outro';
COMMENT ON COLUMN financial_transactions.is_transfer IS 'Se é uma transferência entre contas';
COMMENT ON COLUMN financial_transactions.parent_transaction_id IS 'ID da transação pai (para parcelas)';

-- =====================================================
-- FIM DA MIGRATION 014
-- =====================================================
