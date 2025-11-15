-- =====================================================
-- LIMPEZA COMPLETA - Apagar todos os dados de teste
-- =====================================================
-- ATENÇÃO: Isso apaga TODOS os dados!
-- Use apenas em ambiente de desenvolvimento/testes

-- Passo 1: Deletar todos os usuários da tabela users
DELETE FROM users;

-- Passo 2: Deletar todas as empresas
DELETE FROM companies;

-- Passo 3: Deletar usuários do Supabase Auth
-- (Você precisa fazer isso manualmente na UI do Supabase)
-- Vá em: Authentication → Users → Selecione todos → Delete

-- =====================================================
-- VALIDAÇÃO: Verificar se tudo foi deletado
-- =====================================================
-- Executar após limpar:

-- SELECT COUNT(*) FROM users;       -- Deve retornar 0
-- SELECT COUNT(*) FROM companies;   -- Deve retornar 0
