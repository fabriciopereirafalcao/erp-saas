-- ============================================================================
-- MIGRATION: Sistema de Emissão Fiscal - Emitentes
-- Descrição: Tabela para armazenar configurações fiscais dos emitentes
-- Data: 2024-11-22
-- ============================================================================

-- Tabela de Emitentes (Configurações Fiscais da Empresa)
CREATE TABLE IF NOT EXISTS fiscal_emitentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  cnpj VARCHAR(18) NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  suframa VARCHAR(20),
  cnae VARCHAR(10),
  
  -- Regime Tributário
  crt INTEGER NOT NULL DEFAULT 1, -- 1=Simples Nacional, 2=Presumido, 3=Real
  regime_tributario VARCHAR(50) NOT NULL DEFAULT 'Simples Nacional',
  
  -- Endereço
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  codigo_municipio VARCHAR(7),
  
  -- Contato
  telefone VARCHAR(20),
  email VARCHAR(255),
  
  -- Configurações NF-e
  nfe_ambiente INTEGER NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação
  nfe_serie VARCHAR(3) NOT NULL DEFAULT '1',
  nfe_numero_atual INTEGER NOT NULL DEFAULT 0,
  nfe_natureza_operacao_padrao VARCHAR(100),
  nfe_cfop_padrao VARCHAR(10),
  nfe_tipo_operacao_padrao VARCHAR(20) DEFAULT 'Saída',
  nfe_email_copia VARCHAR(255),
  nfe_informacoes_complementares TEXT,
  
  -- CSC (Código de Segurança do Contribuinte) - NF-e
  nfe_csc_token VARCHAR(100),
  nfe_csc_id VARCHAR(10),
  
  -- Substituição Tributária
  nfe_st_ativo BOOLEAN DEFAULT false,
  nfe_st_uf_destino VARCHAR(2),
  nfe_st_ie VARCHAR(20),
  
  -- Configurações NFC-e
  nfce_ativo BOOLEAN DEFAULT false,
  nfce_ambiente INTEGER DEFAULT 2, -- 1=Produção, 2=Homologação
  nfce_serie VARCHAR(3) DEFAULT '1',
  nfce_numero_atual INTEGER DEFAULT 0,
  nfce_csc_token VARCHAR(100),
  nfce_csc_id VARCHAR(10),
  nfce_email_copia VARCHAR(255),
  nfce_informacoes_complementares TEXT,
  
  -- Configurações SPED
  sped_ativo BOOLEAN DEFAULT false,
  sped_perfil VARCHAR(1) DEFAULT 'B', -- A=Completo, B=Resumido, C=Simplificado
  sped_tipo_atividade VARCHAR(50),
  sped_inventario_mensal BOOLEAN DEFAULT false,
  sped_bloco_k BOOLEAN DEFAULT false,
  sped_bloco_h BOOLEAN DEFAULT true,
  sped_bloco_1 BOOLEAN DEFAULT false,
  
  -- Token IBPT (Tabela de Impostos)
  token_ibpt VARCHAR(100),
  
  -- Impostos Federais
  pis_aliquota_padrao DECIMAL(5,2) DEFAULT 0.65,
  pis_regime VARCHAR(20) DEFAULT 'Cumulativo',
  cofins_aliquota_padrao DECIMAL(5,2) DEFAULT 3.00,
  cofins_regime VARCHAR(20) DEFAULT 'Cumulativo',
  ipi_aliquota_padrao DECIMAL(5,2) DEFAULT 0.00,
  ipi_aplicavel BOOLEAN DEFAULT false,
  
  -- ICMS
  icms_aliquota_interna DECIMAL(5,2) DEFAULT 18.00,
  icms_estado_origem VARCHAR(2),
  
  -- Retenções
  irrf_ativo BOOLEAN DEFAULT false,
  irrf_aliquota DECIMAL(5,2) DEFAULT 1.50,
  iss_ativo BOOLEAN DEFAULT false,
  iss_aliquota DECIMAL(5,2) DEFAULT 5.00,
  inss_ativo BOOLEAN DEFAULT false,
  inss_aliquota DECIMAL(5,2) DEFAULT 11.00,
  csll_ativo BOOLEAN DEFAULT false,
  csll_aliquota DECIMAL(5,2) DEFAULT 1.00,
  
  -- Certificado Digital (referência)
  certificado_id UUID,
  
  -- Metadados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_emitentes_cnpj_user_unique UNIQUE(cnpj, user_id)
);

-- Tabela de Alíquotas Interestaduais ICMS
CREATE TABLE IF NOT EXISTS fiscal_icms_interestadual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitente_id UUID NOT NULL REFERENCES fiscal_emitentes(id) ON DELETE CASCADE,
  uf VARCHAR(2) NOT NULL,
  aliquota DECIMAL(5,2) NOT NULL,
  fcp DECIMAL(5,2) DEFAULT 0.00, -- Fundo de Combate à Pobreza
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_icms_interestadual_emitente_uf_unique UNIQUE(emitente_id, uf)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_emitentes_user_id ON fiscal_emitentes(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_emitentes_cnpj ON fiscal_emitentes(cnpj);
CREATE INDEX IF NOT EXISTS idx_fiscal_emitentes_ativo ON fiscal_emitentes(ativo);
CREATE INDEX IF NOT EXISTS idx_fiscal_icms_emitente ON fiscal_icms_interestadual(emitente_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_fiscal_emitentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiscal_emitentes_updated_at
  BEFORE UPDATE ON fiscal_emitentes
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_emitentes_updated_at();

-- RLS (Row Level Security)
ALTER TABLE fiscal_emitentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_icms_interestadual ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fiscal_emitentes
CREATE POLICY "Usuários podem visualizar seus próprios emitentes"
  ON fiscal_emitentes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios emitentes"
  ON fiscal_emitentes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios emitentes"
  ON fiscal_emitentes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios emitentes"
  ON fiscal_emitentes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para fiscal_icms_interestadual
CREATE POLICY "Usuários podem visualizar ICMS de seus emitentes"
  ON fiscal_icms_interestadual FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_emitentes 
      WHERE id = emitente_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir ICMS em seus emitentes"
  ON fiscal_icms_interestadual FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fiscal_emitentes 
      WHERE id = emitente_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar ICMS de seus emitentes"
  ON fiscal_icms_interestadual FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_emitentes 
      WHERE id = emitente_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar ICMS de seus emitentes"
  ON fiscal_icms_interestadual FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fiscal_emitentes 
      WHERE id = emitente_id AND user_id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE fiscal_emitentes IS 'Configurações fiscais dos emitentes (empresas) para emissão de NF-e/NFC-e';
COMMENT ON TABLE fiscal_icms_interestadual IS 'Alíquotas de ICMS interestadual por UF para cada emitente';
