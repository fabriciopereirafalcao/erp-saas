-- =====================================================
-- MIGRATION 024: Seed Plano de Contas Padrão
-- =====================================================
-- Cria função que insere plano de contas padrão
-- automaticamente para empresas novas
-- =====================================================

-- 🔧 FUNÇÃO: seed_default_chart_of_accounts
-- Insere o plano de contas padrão para uma empresa
CREATE OR REPLACE FUNCTION seed_default_chart_of_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  -- IDs das contas sintéticas (grupos)
  v_receita_root UUID;
  v_receita_bruta UUID;
  v_receita_bruta_vendas UUID;
  v_receita_servicos UUID;
  v_receita_exportacao UUID;
  v_receita_industrializacao UUID;
  v_deducoes UUID;
  v_vendas_canceladas UUID;
  v_abatimentos UUID;
  v_impostos_vendas UUID;
  v_outras_receitas UUID;
  v_receitas_nao_operacionais UUID;
  v_receitas_financeiras UUID;
  v_ganhos_ativos UUID;
  
  v_despesa_root UUID;
  v_custos UUID;
  v_cmv UUID;
  v_csp UUID;
  v_cpv UUID;
  v_despesas_operacionais UUID;
  v_despesas_vendas UUID;
  v_despesas_admin UUID;
  v_despesas_financeiras UUID;
  v_outras_despesas UUID;
  v_tributos_simples UUID;
  v_impostos_lucro UUID;
BEGIN
  -- ==================== RECEITAS ====================
  
  -- 3.0.0.00 – Contas de Resultado (Receita) - RAIZ
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.0.0.00', 'Contas de Resultado (Receita)', 'Receitas operacionais e não operacionais', NULL, 1, 'sintetica', NULL, 100, TRUE)
  RETURNING id INTO v_receita_root;

  -- 3.1.0.00 – Receita Bruta
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.1.0.00', 'Receita Bruta de Vendas e/ou Serviços', 'Receitas antes das deduções', v_receita_root, 2, 'sintetica', 'receita_bruta', 110, TRUE)
  RETURNING id INTO v_receita_bruta;

  -- 3.1.1.00 – Venda de Produtos/Mercadorias
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.1.1.00', 'Venda de Produtos/Mercadorias (Mercado Interno)', 'Receita com venda de produtos no mercado nacional', v_receita_bruta, 3, 'analitica', 'receita_bruta', 111, TRUE);

  -- 3.1.2.00 – Receita de Serviços
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.1.2.00', 'Receita de Serviços', 'Receita com prestação de serviços', v_receita_bruta, 3, 'analitica', 'receita_bruta', 112, TRUE);

  -- 3.1.3.00 – Receita de Exportação
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.1.3.00', 'Receita de Exportação', 'Receita com exportação de produtos/serviços', v_receita_bruta, 3, 'analitica', 'receita_bruta', 113, TRUE);

  -- 3.1.4.00 – Receita com Industrialização
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.1.4.00', 'Receita com Industrialização', 'Receita com processos industriais', v_receita_bruta, 3, 'analitica', 'receita_bruta', 114, TRUE);

  -- 3.2.0.00 – Deduções da Receita Bruta
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.2.0.00', 'Deduções da Receita Bruta', 'Deduções aplicadas sobre a receita bruta', v_receita_root, 2, 'sintetica', 'deducoes_receita', 120, TRUE)
  RETURNING id INTO v_deducoes;

  -- 3.2.1.00 – Vendas Canceladas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.2.1.00', 'Vendas Canceladas', 'Cancelamentos de vendas realizadas', v_deducoes, 3, 'analitica', 'deducoes_receita', 121, TRUE);

  -- 3.2.2.00 – Abatimentos e Devoluções
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.2.2.00', 'Abatimentos e Devoluções', 'Descontos e devoluções de produtos', v_deducoes, 3, 'analitica', 'deducoes_receita', 122, TRUE);

  -- 3.2.3.00 – Impostos sobre Vendas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.2.3.00', 'Impostos sobre Vendas e Serviços', 'ICMS, PIS, COFINS, ISS retidos', v_deducoes, 3, 'analitica', 'deducoes_receita', 123, TRUE);

  -- 3.3.0.00 – Outras Receitas Operacionais
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.3.0.00', 'Outras Receitas Operacionais', 'Receitas operacionais diversas', v_receita_root, 2, 'sintetica', 'outras_receitas_despesas', 130, TRUE)
  RETURNING id INTO v_outras_receitas;

  -- 3.3.1.00 – Ganhos Cambiais
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.3.1.00', 'Ganhos com Variações Cambiais Ativas', 'Ganhos com câmbio', v_outras_receitas, 3, 'analitica', 'outras_receitas_despesas', 131, TRUE);

  -- 3.3.2.00 – Receita de Aluguéis
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.3.2.00', 'Receita de Aluguéis de Propriedades', 'Aluguéis de imóveis e equipamentos', v_outras_receitas, 3, 'analitica', 'outras_receitas_despesas', 132, TRUE);

  -- 3.4.0.00 – Receitas Não Operacionais
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.4.0.00', 'Receitas Não Operacionais', 'Receitas fora da atividade principal', v_receita_root, 2, 'sintetica', 'outras_receitas_despesas', 140, TRUE)
  RETURNING id INTO v_receitas_nao_operacionais;

  -- 3.4.1.00 – Receitas Financeiras
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.4.1.00', 'Receitas Financeiras', 'Juros recebidos, rendimentos de aplicações', v_receitas_nao_operacionais, 3, 'analitica', 'outras_receitas_despesas', 141, TRUE);

  -- 3.4.2.00 – Ganhos Venda de Ativos
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Receita', '3.4.2.00', 'Ganhos na Venda de Ativos Imobilizados', 'Lucro na alienação de imobilizado', v_receitas_nao_operacionais, 3, 'analitica', 'outras_receitas_despesas', 142, TRUE);

  -- ==================== DESPESAS/CUSTOS ====================

  -- 4.0.0.00 – Contas de Resultado (Despesa e Custo) - RAIZ
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.0.0.00', 'Contas de Resultado (Despesa e Custo)', 'Custos e despesas operacionais e não operacionais', NULL, 1, 'sintetica', NULL, 200, TRUE)
  RETURNING id INTO v_despesa_root;

  -- 4.1.0.00 – Custos
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.1.0.00', 'Custos (Diretos e Indiretos)', 'Custos relacionados à produção/serviços', v_despesa_root, 2, 'sintetica', 'custos', 210, TRUE)
  RETURNING id INTO v_custos;

  -- 4.1.1.00 – CMV
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.1.1.00', 'Custo das Mercadorias Vendidas (CMV)', 'Custo de aquisição de produtos revendidos', v_custos, 3, 'analitica', 'custos', 211, TRUE);

  -- 4.1.2.00 – CSP
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.1.2.00', 'Custo dos Serviços Prestados (CSP)', 'Custos diretos com prestação de serviços', v_custos, 3, 'analitica', 'custos', 212, TRUE);

  -- 4.1.3.00 – CPV
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.1.3.00', 'Custo dos Produtos Vendidos (CPV)', 'Custos de fabricação de produtos', v_custos, 3, 'analitica', 'custos', 213, TRUE);

  -- 4.2.0.00 – Despesas Operacionais
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.0.00', 'Despesas Operacionais', 'Despesas com vendas, administrativas e financeiras', v_despesa_root, 2, 'sintetica', 'despesas_operacionais', 220, TRUE)
  RETURNING id INTO v_despesas_operacionais;

  -- 4.2.1.00 – Despesas com Vendas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.1.00', 'Despesas com Vendas', 'Despesas relacionadas ao processo de vendas', v_despesas_operacionais, 3, 'sintetica', 'despesas_operacionais', 221, TRUE)
  RETURNING id INTO v_despesas_vendas;

  -- 4.2.1.01 – Comissões
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.1.01', 'Comissões sobre Vendas', 'Comissões pagas a vendedores', v_despesas_vendas, 4, 'analitica', 'despesas_operacionais', 221.1, TRUE);

  -- 4.2.1.02 – Marketing
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.1.02', 'Despesas com Propaganda e Marketing', 'Publicidade e marketing', v_despesas_vendas, 4, 'analitica', 'despesas_operacionais', 221.2, TRUE);

  -- 4.2.1.03 – Fretes
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.1.03', 'Fretes e Entregas', 'Custos de logística e entrega', v_despesas_vendas, 4, 'analitica', 'despesas_operacionais', 221.3, TRUE);

  -- 4.2.2.00 – Despesas Administrativas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.00', 'Despesas Administrativas', 'Despesas gerais de administração', v_despesas_operacionais, 3, 'sintetica', 'despesas_operacionais', 222, TRUE)
  RETURNING id INTO v_despesas_admin;

  -- 4.2.2.01 – Pessoal
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.01', 'Despesas com Pessoal', 'Salários, encargos sociais, benefícios', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.1, TRUE);

  -- 4.2.2.02 – Terceiros
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.02', 'Despesas com Terceiros', 'Contabilidade, advocacia, consultoria', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.2, TRUE);

  -- 4.2.2.03 – Aluguéis
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.03', 'Aluguéis e Condomínios', 'Aluguel de imóveis e condomínio', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.3, TRUE);

  -- 4.2.2.04 – Utilidades
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.04', 'Energia Elétrica, Água e Telefone', 'Contas de consumo', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.4, TRUE);

  -- 4.2.2.05 – Material Escritório
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.05', 'Material de Escritório', 'Papelaria e material de expediente', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.5, TRUE);

  -- 4.2.2.06 – Depreciação
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.2.06', 'Depreciação e Amortização de Ativos', 'Depreciação de imobilizado e amortização', v_despesas_admin, 4, 'analitica', 'despesas_operacionais', 222.6, TRUE);

  -- 4.2.3.00 – Despesas Financeiras
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.3.00', 'Despesas Financeiras', 'Juros, tarifas bancárias e outras despesas financeiras', v_despesas_operacionais, 3, 'sintetica', 'despesas_operacionais', 223, TRUE)
  RETURNING id INTO v_despesas_financeiras;

  -- 4.2.3.01 – Juros e Multas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.3.01', 'Juros e Multas Pagas', 'Encargos financeiros pagos', v_despesas_financeiras, 4, 'analitica', 'despesas_operacionais', 223.1, TRUE);

  -- 4.2.3.02 – Tarifas Bancárias
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.3.02', 'Tarifas Bancárias', 'Taxas de manutenção de conta, DOC, TED', v_despesas_financeiras, 4, 'analitica', 'despesas_operacionais', 223.2, TRUE);

  -- 4.2.3.03 – Descontos Concedidos
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.3.03', 'Descontos Concedidos', 'Descontos financeiros concedidos a clientes', v_despesas_financeiras, 4, 'analitica', 'despesas_operacionais', 223.3, TRUE);

  -- 4.2.3.04 – Variações Cambiais
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.3.04', 'Perdas com Variações Cambiais Passivas', 'Perdas com câmbio', v_despesas_financeiras, 4, 'analitica', 'despesas_operacionais', 223.4, TRUE);

  -- 4.2.4.00 – Outras Despesas
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.4.00', 'Outras Despesas', 'Despesas diversas não classificadas', v_despesas_operacionais, 3, 'sintetica', 'despesas_operacionais', 224, TRUE)
  RETURNING id INTO v_outras_despesas;

  -- 4.2.4.01 – Provisões
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.4.01', 'Provisões para Perdas', 'Provisões diversas', v_outras_despesas, 4, 'analitica', 'despesas_operacionais', 224.1, TRUE);

  -- 4.2.4.02 – Doações
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.4.02', 'Doações e Contribuições', 'Doações sociais e contribuições', v_outras_despesas, 4, 'analitica', 'despesas_operacionais', 224.2, TRUE);

  -- 4.2.5.00 – Tributos Simples Nacional
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.5.00', 'Tributos do Simples Nacional', 'DAS e outras contribuições do Simples', v_despesas_operacionais, 3, 'sintetica', 'despesas_operacionais', 225, TRUE)
  RETURNING id INTO v_tributos_simples;

  -- 4.2.5.01 – DAS
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.2.5.01', 'DAS – Simples Nacional', 'Documento de Arrecadação do Simples', v_tributos_simples, 4, 'analitica', 'despesas_operacionais', 225.1, TRUE);

  -- 4.3.0.00 – Impostos sobre o Lucro
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.3.0.00', 'Impostos sobre o Lucro', 'IRPJ e CSLL (Presumido e Real)', v_despesa_root, 2, 'sintetica', 'irpj', 230, TRUE)
  RETURNING id INTO v_impostos_lucro;

  -- 4.3.1.00 – IRPJ
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.3.1.00', 'Imposto de Renda Pessoa Jurídica (IRPJ)', 'IRPJ para Lucro Presumido/Real', v_impostos_lucro, 3, 'analitica', 'irpj', 231, TRUE);

  -- 4.3.2.00 – CSLL
  INSERT INTO account_categories (company_id, type, code, name, description, parent_id, level, account_type, dre_line_item, sort_order, is_active)
  VALUES (p_company_id, 'Despesa', '4.3.2.00', 'Contribuição Social sobre o Lucro Líquido (CSLL)', 'CSLL para Lucro Presumido/Real', v_impostos_lucro, 3, 'analitica', 'csll', 232, TRUE);

  RAISE NOTICE 'Plano de contas padrão criado com sucesso para company_id: %', p_company_id;
END;
$$;

COMMENT ON FUNCTION seed_default_chart_of_accounts IS 'Insere o plano de contas padrão hierárquico para uma empresa';

-- 🎯 TRIGGER: Criar plano de contas automaticamente ao criar empresa
CREATE OR REPLACE FUNCTION trigger_seed_chart_on_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Chamar função de seed após 1 segundo (dar tempo para commit da empresa)
  PERFORM seed_default_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

-- Criar trigger (SE NÃO EXISTIR)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_seed_chart'
  ) THEN
    CREATE TRIGGER trigger_auto_seed_chart
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_chart_on_company_creation();
  END IF;
END;
$$;

COMMENT ON FUNCTION trigger_seed_chart_on_company_creation IS 'Trigger que cria plano de contas padrão automaticamente ao criar empresa';
