-- ============================================================================
-- MIGRATION: Sistema de Emissão Fiscal - NF-e e NFC-e
-- Descrição: Tabelas para armazenar notas fiscais emitidas
-- Data: 2024-11-22
-- ============================================================================

-- Tabela de Notas Fiscais Eletrônicas
CREATE TABLE IF NOT EXISTS fiscal_nfes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emitente_id UUID NOT NULL REFERENCES fiscal_emitentes(id) ON DELETE CASCADE,
  
  -- Identificação da NF-e
  tipo_nfe INTEGER NOT NULL, -- 55=NF-e, 65=NFC-e
  modelo VARCHAR(2) NOT NULL, -- '55' ou '65'
  serie VARCHAR(3) NOT NULL,
  numero INTEGER NOT NULL,
  chave_acesso VARCHAR(44) UNIQUE, -- Chave de 44 dígitos
  
  -- Datas
  data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
  data_saida_entrada TIMESTAMP WITH TIME ZONE,
  
  -- Natureza da Operação
  natureza_operacao VARCHAR(100) NOT NULL,
  tipo_operacao INTEGER NOT NULL, -- 0=Entrada, 1=Saída
  finalidade_nfe INTEGER NOT NULL DEFAULT 1, -- 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  
  -- Destinatário/Remetente
  destinatario_tipo VARCHAR(20) NOT NULL, -- 'PF' ou 'PJ'
  destinatario_documento VARCHAR(18) NOT NULL,
  destinatario_nome VARCHAR(255) NOT NULL,
  destinatario_ie VARCHAR(20),
  destinatario_email VARCHAR(255),
  destinatario_telefone VARCHAR(20),
  destinatario_endereco JSONB, -- Endereço completo em JSON
  
  -- Valores Totais
  valor_produtos DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  valor_frete DECIMAL(15,2) DEFAULT 0.00,
  valor_seguro DECIMAL(15,2) DEFAULT 0.00,
  valor_desconto DECIMAL(15,2) DEFAULT 0.00,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0.00,
  valor_total_nota DECIMAL(15,2) NOT NULL,
  
  -- Impostos
  valor_icms DECIMAL(15,2) DEFAULT 0.00,
  valor_icms_st DECIMAL(15,2) DEFAULT 0.00,
  valor_icms_desonerado DECIMAL(15,2) DEFAULT 0.00,
  valor_fcp DECIMAL(15,2) DEFAULT 0.00,
  valor_ipi DECIMAL(15,2) DEFAULT 0.00,
  valor_pis DECIMAL(15,2) DEFAULT 0.00,
  valor_cofins DECIMAL(15,2) DEFAULT 0.00,
  valor_ii DECIMAL(15,2) DEFAULT 0.00,
  
  -- Transporte
  modalidade_frete INTEGER DEFAULT 9, -- 0-9 (9=Sem Frete)
  transportadora_documento VARCHAR(18),
  transportadora_nome VARCHAR(255),
  veiculo_placa VARCHAR(10),
  veiculo_uf VARCHAR(2),
  
  -- Pagamento
  forma_pagamento INTEGER DEFAULT 0, -- 0=À vista, 1=A prazo
  meio_pagamento JSONB, -- Array de meios de pagamento
  
  -- Informações Adicionais
  informacoes_complementares TEXT,
  informacoes_fisco TEXT,
  
  -- Status da NF-e
  status VARCHAR(20) NOT NULL DEFAULT 'Rascunho',
  -- Status possíveis: Rascunho, Processando, Autorizada, Denegada, Rejeitada, Cancelada, Inutilizada
  
  -- Dados da SEFAZ
  ambiente INTEGER NOT NULL, -- 1=Produção, 2=Homologação
  protocolo_autorizacao VARCHAR(20),
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  codigo_status_sefaz VARCHAR(10),
  mensagem_sefaz TEXT,
  digest_value VARCHAR(100), -- Hash do XML assinado
  
  -- Arquivos (Supabase Storage)
  xml_enviado_path VARCHAR(500),
  xml_assinado_path VARCHAR(500),
  xml_autorizado_path VARCHAR(500),
  danfe_pdf_path VARCHAR(500),
  
  -- Cancelamento
  cancelada BOOLEAN DEFAULT false,
  data_cancelamento TIMESTAMP WITH TIME ZONE,
  protocolo_cancelamento VARCHAR(20),
  justificativa_cancelamento TEXT,
  
  -- Carta de Correção
  cce_enviada BOOLEAN DEFAULT false,
  cce_sequencia INTEGER DEFAULT 0,
  
  -- Contingência
  em_contingencia BOOLEAN DEFAULT false,
  tipo_contingencia VARCHAR(20),
  justificativa_contingencia TEXT,
  
  -- Pedido de Venda (se aplicável)
  pedido_venda_id VARCHAR(100),
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_nfes_emitente_serie_numero_unique 
    UNIQUE(emitente_id, serie, numero, tipo_nfe)
);

-- Tabela de Itens da NF-e
CREATE TABLE IF NOT EXISTS fiscal_nfe_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES fiscal_nfes(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  
  -- Produto
  codigo_produto VARCHAR(100) NOT NULL,
  ean VARCHAR(14),
  descricao VARCHAR(500) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cest VARCHAR(7),
  cfop VARCHAR(10) NOT NULL,
  unidade_comercial VARCHAR(10) NOT NULL,
  quantidade_comercial DECIMAL(15,4) NOT NULL,
  valor_unitario_comercial DECIMAL(15,10) NOT NULL,
  valor_total_bruto DECIMAL(15,2) NOT NULL,
  ean_tributavel VARCHAR(14),
  unidade_tributavel VARCHAR(10) NOT NULL,
  quantidade_tributavel DECIMAL(15,4) NOT NULL,
  valor_unitario_tributavel DECIMAL(15,10) NOT NULL,
  valor_frete DECIMAL(15,2) DEFAULT 0.00,
  valor_seguro DECIMAL(15,2) DEFAULT 0.00,
  valor_desconto DECIMAL(15,2) DEFAULT 0.00,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0.00,
  
  -- ICMS
  origem INTEGER NOT NULL, -- 0-8
  cst_icms VARCHAR(3),
  csosn VARCHAR(4),
  modalidade_bc_icms INTEGER,
  base_calculo_icms DECIMAL(15,2) DEFAULT 0.00,
  aliquota_icms DECIMAL(5,2) DEFAULT 0.00,
  valor_icms DECIMAL(15,2) DEFAULT 0.00,
  
  -- ICMS ST
  modalidade_bc_icms_st INTEGER,
  base_calculo_icms_st DECIMAL(15,2) DEFAULT 0.00,
  aliquota_icms_st DECIMAL(5,2) DEFAULT 0.00,
  valor_icms_st DECIMAL(15,2) DEFAULT 0.00,
  
  -- FCP (Fundo de Combate à Pobreza)
  aliquota_fcp DECIMAL(5,2) DEFAULT 0.00,
  valor_fcp DECIMAL(15,2) DEFAULT 0.00,
  
  -- IPI
  cst_ipi VARCHAR(2),
  base_calculo_ipi DECIMAL(15,2) DEFAULT 0.00,
  aliquota_ipi DECIMAL(5,2) DEFAULT 0.00,
  valor_ipi DECIMAL(15,2) DEFAULT 0.00,
  
  -- PIS
  cst_pis VARCHAR(2),
  base_calculo_pis DECIMAL(15,2) DEFAULT 0.00,
  aliquota_pis DECIMAL(5,2) DEFAULT 0.00,
  valor_pis DECIMAL(15,2) DEFAULT 0.00,
  
  -- COFINS
  cst_cofins VARCHAR(2),
  base_calculo_cofins DECIMAL(15,2) DEFAULT 0.00,
  aliquota_cofins DECIMAL(5,2) DEFAULT 0.00,
  valor_cofins DECIMAL(15,2) DEFAULT 0.00,
  
  -- Informações Adicionais
  informacoes_adicionais TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_nfe_itens_nfe_numero_unique UNIQUE(nfe_id, numero_item)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_user ON fiscal_nfes(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_emitente ON fiscal_nfes(emitente_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_chave ON fiscal_nfes(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_status ON fiscal_nfes(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_data_emissao ON fiscal_nfes(data_emissao);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfes_numero ON fiscal_nfes(numero);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_itens_nfe ON fiscal_nfe_itens(nfe_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fiscal_nfes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiscal_nfes_updated_at
  BEFORE UPDATE ON fiscal_nfes
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_nfes_updated_at();

-- RLS (Row Level Security)
ALTER TABLE fiscal_nfes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfe_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fiscal_nfes
CREATE POLICY "Usuários podem visualizar suas próprias NF-es"
  ON fiscal_nfes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias NF-es"
  ON fiscal_nfes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias NF-es"
  ON fiscal_nfes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias NF-es"
  ON fiscal_nfes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para fiscal_nfe_itens
CREATE POLICY "Usuários podem visualizar itens de suas NF-es"
  ON fiscal_nfe_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_nfes 
      WHERE id = nfe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir itens em suas NF-es"
  ON fiscal_nfe_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fiscal_nfes 
      WHERE id = nfe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar itens de suas NF-es"
  ON fiscal_nfe_itens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_nfes 
      WHERE id = nfe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar itens de suas NF-es"
  ON fiscal_nfe_itens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_nfes 
      WHERE id = nfe_id AND user_id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE fiscal_nfes IS 'Notas Fiscais Eletrônicas (NF-e e NFC-e) emitidas';
COMMENT ON TABLE fiscal_nfe_itens IS 'Itens (produtos/serviços) das Notas Fiscais Eletrônicas';
