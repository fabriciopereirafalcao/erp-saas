# ✅ CORREÇÃO APLICADA - Erro de Permissão no Schema Auth

## 🐛 Problema Identificado

Você executou a migração SQL e recebeu este erro:

```
ERROR: 42501: permission denied for schema auth
```

## 🔍 Causa

O script de migração original tentava criar uma função no schema `auth`:

```sql
-- ❌ ERRADO (não permitido no Supabase)
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```

**Por que não funciona?**
- O schema `auth` é gerenciado pelo Supabase
- Usuários não podem criar objetos (funções, tabelas, etc.) nesse schema
- É uma restrição de segurança da plataforma

## ✅ Correção Aplicada

Movi a função para o schema `public` (permitido):

```sql
-- ✅ CORRETO (funciona no Supabase)
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```

### Mudanças realizadas:

1. **Função criada no schema `public`** ao invés de `auth`
2. **Todas as políticas RLS atualizadas** para usar `user_company_id()` sem prefixo
3. **Referência explícita** à tabela `public.users` dentro da função

## 🔄 O Que Você Precisa Fazer Agora

### Opção A: Se Ainda Não Executou (Recomendado)

1. **Copie novamente** o arquivo `/supabase/migrations/001_initial_schema.sql`
2. Cole no SQL Editor do Supabase
3. Execute normalmente
4. ✅ Deve funcionar sem erros!

### Opção B: Se Já Executou e Deu Erro

**Limpe tudo e recomece:**

1. No SQL Editor do Supabase, execute este código primeiro:

```sql
-- Limpar tudo (apaga tabelas e funções anteriores)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS accounts_payable CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS sales_order_items CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Deletar função antiga (se existir)
DROP FUNCTION IF EXISTS auth.user_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_company_id() CASCADE;
```

2. **Agora execute a migração completa** (copie o arquivo `/supabase/migrations/001_initial_schema.sql` atualizado)

## 🎯 Validação

Após executar a migração corrigida:

### 1. Verificar se a função foi criada no schema correto:

```sql
-- Executar no SQL Editor
SELECT 
  routine_schema, 
  routine_name 
FROM information_schema.routines 
WHERE routine_name = 'user_company_id';
```

**Resultado esperado:**
```
routine_schema | routine_name
---------------+------------------
public         | user_company_id
```

✅ A função deve estar no schema **`public`**, não no `auth`!

### 2. Verificar se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Resultado esperado:** 14 tabelas listadas

### 3. Verificar políticas RLS:

```sql
SELECT 
  tablename, 
  policyname 
FROM pg_policies 
WHERE schemaname = 'public'
LIMIT 10;
```

**Resultado esperado:** Várias políticas listadas com nomes como "Users can view..."

## 📊 Resumo das Mudanças

| Item | Antes (❌ Errado) | Depois (✅ Correto) |
|------|-------------------|---------------------|
| Schema da função | `auth.user_company_id()` | `public.user_company_id()` |
| Referência na RLS | `auth.user_company_id()` | `user_company_id()` |
| Tabela na função | `users` | `public.users` |

## 🚀 Próximos Passos

Após a migração bem-sucedida:

1. ✅ Verifique que as 14 tabelas estão criadas
2. ✅ Verifique que a função `user_company_id()` está no schema `public`
3. ✅ Teste o sistema no Figma Make:
   - Recarregue a aplicação
   - Clique em "Criar conta grátis"
   - Preencha os dados
   - Crie sua conta
4. ✅ Confirme que consegue fazer login

## 💡 Por Que Essa Correção É Importante?

### Segurança Multi-Tenant

A função `user_company_id()` é **CRUCIAL** para o isolamento de dados:

```sql
-- Exemplo de política RLS que usa a função
CREATE POLICY "Users can view products from their company"
  ON products FOR SELECT
  USING (company_id = user_company_id());
```

**O que isso faz:**
- Toda vez que um usuário busca produtos, o banco verifica:
  1. Pega o ID do usuário autenticado: `auth.uid()`
  2. Busca o `company_id` dele na tabela `users`
  3. Retorna apenas produtos onde `company_id` bate

**Resultado:** Cada empresa só vê seus próprios dados! 🔒

## 🆘 Se Ainda Tiver Problemas

### Erro persiste mesmo após correção?

1. **Certifique-se** de que copiou a versão MAIS RECENTE do arquivo
2. **Procure** por `CREATE OR REPLACE FUNCTION public.user_company_id()`
3. **NÃO deve conter** `auth.user_company_id()` em lugar nenhum

### Arquivo correto deve começar com:

```sql
-- =====================================================
-- MIGRAÇÃO INICIAL - ERP SaaS Multi-Tenant
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: companies
-- ...
```

E deve ter esta função:

```sql
-- Função auxiliar para pegar company_id do usuário autenticado
-- IMPORTANTE: Criada no schema PUBLIC, não no auth (restrição do Supabase)
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## ✅ Checklist Final

Antes de continuar, confirme:

- [ ] Arquivo `/supabase/migrations/001_initial_schema.sql` atualizado
- [ ] Função está no schema `public`, não `auth`
- [ ] Executou a limpeza (DROP TABLE) se necessário
- [ ] Executou a migração completa
- [ ] Viu mensagem "Success" no Supabase
- [ ] 14 tabelas aparecem no Table Editor
- [ ] Função `user_company_id()` existe no schema `public`
- [ ] Pronto para testar o sistema!

**Se todos os itens estão ✅, você está pronto para usar o sistema!** 🎉

---

**🎯 Resumo:** O erro foi corrigido movendo a função do schema `auth` (protegido) para o schema `public` (permitido). Agora você pode executar a migração sem problemas!
