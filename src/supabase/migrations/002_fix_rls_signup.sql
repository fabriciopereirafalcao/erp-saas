-- =====================================================
-- CORREÇÃO RLS - Permitir Signup de Novos Usuários
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- para corrigir o erro de signup

-- Passo 1: Adicionar políticas de INSERT para companies
-- (permitir criação durante signup)
CREATE POLICY IF NOT EXISTS "Allow insert companies during signup"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Passo 2: Adicionar políticas de INSERT para users
-- (permitir criação apenas do próprio usuário)
CREATE POLICY IF NOT EXISTS "Allow insert users during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- =====================================================
-- Validação: Verificar se as políticas foram criadas
-- =====================================================
-- Execute as queries abaixo para confirmar:

-- Ver políticas da tabela companies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'companies';

-- Ver políticas da tabela users
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';
