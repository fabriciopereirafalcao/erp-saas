-- =====================================================
-- MIGRAÇÃO INICIAL - ERP SaaS Multi-Tenant
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: companies
-- Armazena dados das empresas (tenants)
-- =====================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: users
-- Armazena usuários do sistema (vinculados ao auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- TABELA: products
-- Produtos do estoque
-- =====================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
  max_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_sku ON products(company_id, sku);

-- =====================================================
-- TABELA: customers
-- Clientes
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'company')),
  document TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, document)
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_document ON customers(company_id, document);

-- =====================================================
-- TABELA: suppliers
-- Fornecedores
-- =====================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, document)
);

CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX idx_suppliers_document ON suppliers(company_id, document);

-- =====================================================
-- TABELA: sales_orders
-- Pedidos de venda
-- =====================================================
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  payment_condition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

CREATE INDEX idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(company_id, order_date);

-- =====================================================
-- TABELA: sales_order_items
-- Itens dos pedidos de venda
-- =====================================================
CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_order_items_company_id ON sales_order_items(company_id);
CREATE INDEX idx_sales_order_items_order_id ON sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_product_id ON sales_order_items(product_id);

-- =====================================================
-- TABELA: purchase_orders
-- Pedidos de compra
-- =====================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  payment_condition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

CREATE INDEX idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(company_id, order_date);

-- =====================================================
-- TABELA: purchase_order_items
-- Itens dos pedidos de compra
-- =====================================================
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchase_order_items_company_id ON purchase_order_items(company_id);
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(order_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- =====================================================
-- TABELA: financial_transactions
-- Transações financeiras
-- =====================================================
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  account TEXT NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_company_id ON financial_transactions(company_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(company_id, type);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(company_id, transaction_date);

-- =====================================================
-- TABELA: accounts_receivable
-- Contas a receber
-- =====================================================
CREATE TABLE accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  payment_amount DECIMAL(10, 2),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_receivable_company_id ON accounts_receivable(company_id);
CREATE INDEX idx_accounts_receivable_customer_id ON accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(company_id, due_date);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(company_id, status);

-- =====================================================
-- TABELA: accounts_payable
-- Contas a pagar
-- =====================================================
CREATE TABLE accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  payment_amount DECIMAL(10, 2),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_payable_company_id ON accounts_payable(company_id);
CREATE INDEX idx_accounts_payable_supplier_id ON accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(company_id, due_date);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(company_id, status);

-- =====================================================
-- TABELA: stock_movements
-- Movimentações de estoque
-- =====================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'transfer')),
  quantity DECIMAL(10, 3) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(company_id, created_at);

-- =====================================================
-- TABELA: audit_logs
-- Logs de auditoria
-- =====================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(company_id, created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Garantir isolamento de dados entre empresas
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para pegar company_id do usuário autenticado
-- IMPORTANTE: Criada no schema PUBLIC, não no auth (restrição do Supabase)
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Políticas RLS para companies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = user_company_id());

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = user_company_id());

-- IMPORTANTE: Permitir INSERT para novos registros (necessário para signup)
CREATE POLICY "Allow insert companies during signup"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Políticas RLS para users
CREATE POLICY "Users can view users from their company"
  ON users FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- IMPORTANTE: Permitir INSERT para novos usuários (necessário para signup)
CREATE POLICY "Allow insert users during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Políticas RLS para products
CREATE POLICY "Users can view products from their company"
  ON products FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert products to their company"
  ON products FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update products from their company"
  ON products FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete products from their company"
  ON products FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para customers
CREATE POLICY "Users can view customers from their company"
  ON customers FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert customers to their company"
  ON customers FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update customers from their company"
  ON customers FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete customers from their company"
  ON customers FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para suppliers
CREATE POLICY "Users can view suppliers from their company"
  ON suppliers FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert suppliers to their company"
  ON suppliers FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update suppliers from their company"
  ON suppliers FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete suppliers from their company"
  ON suppliers FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para sales_orders
CREATE POLICY "Users can view sales orders from their company"
  ON sales_orders FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert sales orders to their company"
  ON sales_orders FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update sales orders from their company"
  ON sales_orders FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete sales orders from their company"
  ON sales_orders FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para sales_order_items
CREATE POLICY "Users can view sales order items from their company"
  ON sales_order_items FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert sales order items to their company"
  ON sales_order_items FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update sales order items from their company"
  ON sales_order_items FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete sales order items from their company"
  ON sales_order_items FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para purchase_orders
CREATE POLICY "Users can view purchase orders from their company"
  ON purchase_orders FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert purchase orders to their company"
  ON purchase_orders FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update purchase orders from their company"
  ON purchase_orders FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete purchase orders from their company"
  ON purchase_orders FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para purchase_order_items
CREATE POLICY "Users can view purchase order items from their company"
  ON purchase_order_items FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert purchase order items to their company"
  ON purchase_order_items FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update purchase order items from their company"
  ON purchase_order_items FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete purchase order items from their company"
  ON purchase_order_items FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para financial_transactions
CREATE POLICY "Users can view financial transactions from their company"
  ON financial_transactions FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert financial transactions to their company"
  ON financial_transactions FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update financial transactions from their company"
  ON financial_transactions FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete financial transactions from their company"
  ON financial_transactions FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para accounts_receivable
CREATE POLICY "Users can view accounts receivable from their company"
  ON accounts_receivable FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert accounts receivable to their company"
  ON accounts_receivable FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update accounts receivable from their company"
  ON accounts_receivable FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete accounts receivable from their company"
  ON accounts_receivable FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para accounts_payable
CREATE POLICY "Users can view accounts payable from their company"
  ON accounts_payable FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert accounts payable to their company"
  ON accounts_payable FOR INSERT
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "Users can update accounts payable from their company"
  ON accounts_payable FOR UPDATE
  USING (company_id = user_company_id());

CREATE POLICY "Users can delete accounts payable from their company"
  ON accounts_payable FOR DELETE
  USING (company_id = user_company_id());

-- Políticas RLS para stock_movements
CREATE POLICY "Users can view stock movements from their company"
  ON stock_movements FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert stock movements to their company"
  ON stock_movements FOR INSERT
  WITH CHECK (company_id = user_company_id());

-- Políticas RLS para audit_logs
CREATE POLICY "Users can view audit logs from their company"
  ON audit_logs FOR SELECT
  USING (company_id = user_company_id());

CREATE POLICY "Users can insert audit logs to their company"
  ON audit_logs FOR INSERT
  WITH CHECK (company_id = user_company_id());

-- =====================================================
-- TRIGGERS
-- Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON accounts_payable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();