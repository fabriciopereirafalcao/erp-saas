-- ============================================================================
-- MIGRATION: Sistema de Emissão Fiscal - Certificados Digitais A1
-- Descrição: Tabela para armazenar certificados digitais criptografados
-- Data: 2024-11-22
-- ============================================================================

-- Tabela de Certificados Digitais A1
CREATE TABLE IF NOT EXISTS fiscal_certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emitente_id UUID NOT NULL REFERENCES fiscal_emitentes(id) ON DELETE CASCADE,
  
  -- Informações do Arquivo
  nome_arquivo VARCHAR(255) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  
  -- Storage (Supabase Storage)
  storage_bucket VARCHAR(100) NOT NULL DEFAULT 'fiscal-certificates',
  storage_path VARCHAR(500) NOT NULL,
  
  -- Chaves Criptografadas (AES-256-GCM)
  -- IMPORTANTE: Nunca armazenar em texto plano
  senha_criptografada TEXT NOT NULL, -- senha do PFX criptografada
  private_key_criptografada TEXT NOT NULL, -- chave privada extraída e criptografada
  public_key_criptografada TEXT NOT NULL, -- certificado público criptografado
  chain_criptografada TEXT, -- cadeia de certificação
  
  -- Metadados do Certificado
  subject_cn VARCHAR(255), -- Common Name (razão social)
  subject_ou VARCHAR(255), -- Organizational Unit
  issuer_cn VARCHAR(255), -- Emissor do certificado
  serial_number VARCHAR(100), -- Número de série
  
  -- Validade
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
  dias_validade INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (valid_to - valid_from))
  ) STORED,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  revogado BOOLEAN DEFAULT false,
  motivo_revogacao TEXT,
  
  -- Uso
  ultima_utilizacao TIMESTAMP WITH TIME ZONE,
  total_utilizacoes INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_certificados_validade_check 
    CHECK (valid_to > valid_from)
);

-- Índice único parcial: apenas um certificado ativo por emitente
-- (substitui a constraint inline que causava erro de sintaxe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_certificados_emitente_ativo_unique
  ON fiscal_certificados(emitente_id)
  WHERE ativo = true;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_certificados_user ON fiscal_certificados(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_certificados_emitente ON fiscal_certificados(emitente_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_certificados_ativo ON fiscal_certificados(ativo);
CREATE INDEX IF NOT EXISTS idx_fiscal_certificados_validade ON fiscal_certificados(valid_to);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fiscal_certificados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiscal_certificados_updated_at
  BEFORE UPDATE ON fiscal_certificados
  FOR EACH ROW
  EXECUTE FUNCTION update_fiscal_certificados_updated_at();

-- Função para verificar certificados expirados
CREATE OR REPLACE FUNCTION verificar_certificados_expirados()
RETURNS void AS $$
BEGIN
  UPDATE fiscal_certificados
  SET ativo = false
  WHERE valid_to < NOW() AND ativo = true;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE fiscal_certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar seus próprios certificados"
  ON fiscal_certificados FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios certificados"
  ON fiscal_certificados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios certificados"
  ON fiscal_certificados FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios certificados"
  ON fiscal_certificados FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE fiscal_certificados IS 'Certificados digitais A1 criptografados para assinatura de NF-e/NFC-e';
COMMENT ON COLUMN fiscal_certificados.senha_criptografada IS 'Senha do arquivo PFX criptografada com AES-256-GCM';
COMMENT ON COLUMN fiscal_certificados.private_key_criptografada IS 'Chave privada extraída do PFX e criptografada';
COMMENT ON COLUMN fiscal_certificados.public_key_criptografada IS 'Certificado público (X.509) criptografado';
