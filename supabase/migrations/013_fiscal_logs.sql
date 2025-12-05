-- ============================================================================
-- MIGRATION: Sistema de Emissão Fiscal - Logs e Auditoria
-- Descrição: Tabela para logs completos de todas as operações fiscais
-- Data: 2024-11-22
-- ============================================================================

-- Tabela de Logs Fiscais (Auditoria Completa)
CREATE TABLE IF NOT EXISTS fiscal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Referências
  emitente_id UUID REFERENCES fiscal_emitentes(id) ON DELETE SET NULL,
  nfe_id UUID REFERENCES fiscal_nfes(id) ON DELETE SET NULL,
  certificado_id UUID REFERENCES fiscal_certificados(id) ON DELETE SET NULL,
  
  -- Tipo de Operação
  tipo VARCHAR(50) NOT NULL,
  -- Tipos possíveis:
  -- 'envio', 'retorno', 'autorizacao', 'rejeicao', 'denegacao',
  -- 'cancelamento', 'inutilizacao', 'cce', 'consulta',
  -- 'erro_xml', 'erro_assinatura', 'erro_validacao', 'erro_comunicacao'
  
  -- Severidade
  severidade VARCHAR(20) NOT NULL DEFAULT 'info',
  -- info, warning, error, critical
  
  -- Mensagem
  mensagem TEXT NOT NULL,
  detalhes TEXT,
  
  -- Dados da SEFAZ
  codigo_status_sefaz VARCHAR(10),
  mensagem_sefaz TEXT,
  protocolo VARCHAR(20),
  
  -- Payload (request/response completos)
  request_payload JSONB,
  response_payload JSONB,
  
  -- XML (se aplicável)
  xml_enviado TEXT,
  xml_retornado TEXT,
  
  -- Contexto Técnico
  ip_address INET,
  user_agent TEXT,
  ambiente VARCHAR(20), -- 'producao' ou 'homologacao'
  
  -- Tempo de Processamento
  duracao_ms INTEGER,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices parciais para queries comuns
  CONSTRAINT fiscal_logs_tipo_check CHECK (
    tipo IN (
      'envio', 'retorno', 'autorizacao', 'rejeicao', 'denegacao',
      'cancelamento', 'inutilizacao', 'cce', 'consulta',
      'erro_xml', 'erro_assinatura', 'erro_validacao', 'erro_comunicacao',
      'upload_certificado', 'validacao_certificado'
    )
  ),
  CONSTRAINT fiscal_logs_severidade_check CHECK (
    severidade IN ('info', 'warning', 'error', 'critical')
  )
);

-- Tabela de Eventos da NF-e (Histórico de Status)
CREATE TABLE IF NOT EXISTS fiscal_nfe_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nfe_id UUID NOT NULL REFERENCES fiscal_nfes(id) ON DELETE CASCADE,
  
  -- Tipo de Evento
  tipo_evento VARCHAR(50) NOT NULL,
  -- Tipos: 'criacao', 'envio', 'processamento', 'autorizacao', 'rejeicao',
  -- 'cancelamento', 'cce', 'inutilizacao', 'consulta'
  
  sequencia INTEGER NOT NULL DEFAULT 1,
  
  -- Descrição
  descricao TEXT NOT NULL,
  
  -- Dados do Evento
  codigo_evento VARCHAR(10),
  protocolo VARCHAR(20),
  
  -- Status Anterior e Novo
  status_anterior VARCHAR(20),
  status_novo VARCHAR(20),
  
  -- XML do Evento (se aplicável)
  xml_evento TEXT,
  xml_retorno TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fiscal_nfe_eventos_nfe_sequencia_unique UNIQUE(nfe_id, sequencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_user ON fiscal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_tipo ON fiscal_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_severidade ON fiscal_logs(severidade);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_created ON fiscal_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_nfe ON fiscal_logs(nfe_id) WHERE nfe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_emitente ON fiscal_logs(emitente_id) WHERE emitente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_eventos_nfe ON fiscal_nfe_eventos(nfe_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_eventos_tipo ON fiscal_nfe_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_eventos_created ON fiscal_nfe_eventos(created_at DESC);

-- View para últimos logs por NF-e
CREATE OR REPLACE VIEW v_fiscal_nfe_ultimo_log AS
SELECT DISTINCT ON (nfe_id) 
  nfe_id,
  tipo,
  mensagem,
  codigo_status_sefaz,
  mensagem_sefaz,
  created_at
FROM fiscal_logs
WHERE nfe_id IS NOT NULL
ORDER BY nfe_id, created_at DESC;

-- View para estatísticas de logs
CREATE OR REPLACE VIEW v_fiscal_logs_estatisticas AS
SELECT 
  user_id,
  DATE(created_at) as data,
  tipo,
  severidade,
  COUNT(*) as total,
  AVG(duracao_ms) as duracao_media_ms
FROM fiscal_logs
GROUP BY user_id, DATE(created_at), tipo, severidade;

-- Função para limpar logs antigos (opcional - executar manualmente)
CREATE OR REPLACE FUNCTION limpar_fiscal_logs_antigos(dias INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  linhas_deletadas INTEGER;
BEGIN
  DELETE FROM fiscal_logs
  WHERE created_at < NOW() - INTERVAL '1 day' * dias
    AND severidade NOT IN ('error', 'critical');
  
  GET DIAGNOSTICS linhas_deletadas = ROW_COUNT;
  RETURN linhas_deletadas;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE fiscal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfe_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fiscal_logs
CREATE POLICY "Usuários podem visualizar seus próprios logs"
  ON fiscal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios logs"
  ON fiscal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Não permitir UPDATE e DELETE em logs (imutabilidade)

-- Políticas RLS para fiscal_nfe_eventos
CREATE POLICY "Usuários podem visualizar eventos de suas NF-es"
  ON fiscal_nfe_eventos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir eventos em suas NF-es"
  ON fiscal_nfe_eventos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE fiscal_logs IS 'Logs completos de todas as operações fiscais para auditoria';
COMMENT ON TABLE fiscal_nfe_eventos IS 'Histórico de eventos e mudanças de status das NF-es';
COMMENT ON COLUMN fiscal_logs.tipo IS 'Tipo da operação: envio, retorno, erro, etc.';
COMMENT ON COLUMN fiscal_logs.severidade IS 'Nível de severidade: info, warning, error, critical';
COMMENT ON COLUMN fiscal_logs.request_payload IS 'Payload completo da requisição em JSON';
COMMENT ON COLUMN fiscal_logs.response_payload IS 'Payload completo da resposta em JSON';
