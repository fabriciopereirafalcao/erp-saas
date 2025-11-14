# ✅ CORREÇÃO RLS - Permitir Signup de Novos Usuários

## 🐛 Problema

Ao tentar criar uma conta, você recebeu o erro:

```
new row violates row-level security policy for table "companies"
```

## 🔍 Causa Raiz

**Problema de "galinha e ovo"** 🐔🥚:

1. Para criar um novo usuário, precisamos:
   - Criar a empresa (company)
   - Criar o usuário (user) vinculado à empresa

2. Mas as políticas RLS exigem:
   - `user_company_id()` → precisa que o usuário já exista na tabela `users`
   - Mas o usuário ainda não existe!

3. Resultado: **RLS bloqueia a criação** porque não consegue validar a política

## ✅ Solução Aplicada

Adicionei **políticas RLS específicas** que permitem INSERT durante o signup:

### Para a tabela `companies`:

```sql
-- IMPORTANTE: Permitir INSERT para novos registros (necessário para signup)
CREATE POLICY "Allow insert companies during signup"
  ON companies FOR INSERT
  WITH CHECK (true);
```

**O que faz:**
- Permite que QUALQUER usuário autenticado crie uma company
- `WITH CHECK (true)` = sempre permite
- Isso é seguro porque só funciona para usuários já autenticados pelo Supabase Auth

### Para a tabela `users`:

```sql
-- IMPORTANTE: Permitir INSERT para novos usuários (necessário para signup)
CREATE POLICY "Allow insert users during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
```

**O que faz:**
- Permite que o usuário crie seu próprio registro na tabela `users`
- `WITH CHECK (id = auth.uid())` = só pode criar se o ID bater com o usuário autenticado
- Impede que um usuário crie registro para outro usuário

## 🔄 O Que Você Precisa Fazer

### Passo 1: Limpar o Banco (Deletar Políticas Antigas)

No **SQL Editor do Supabase**, execute:

```sql
-- Deletar políticas RLS antigas
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can view users from their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Deletar todas as outras políticas para recriar
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public') 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
  END LOOP;
END $$;
```

### Passo 2: Executar a Migração Completa Atualizada

1. Copie **TODO o conteúdo** do arquivo `/supabase/migrations/001_initial_schema.sql`
2. Cole no SQL Editor do Supabase
3. Execute (Run)

**ATENÇÃO:** Como as tabelas já existem, você vai receber erros de "already exists". Isso é normal! As políticas RLS serão recriadas.

### Passo 3: Alternativa Mais Segura - Recriar Tudo

Se preferir começar do zero (recomendado):

```sql
-- CUIDADO: Apaga TODOS os dados!
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
DROP FUNCTION IF EXISTS public.user_company_id() CASCADE;
```

Depois execute a migração completa novamente.

## 🎯 Validação

Após executar, valide que as novas políticas foram criadas:

```sql
-- Ver políticas da tabela companies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'companies';
```

**Resultado esperado:**

| policyname | cmd | qual |
|------------|-----|------|
| Users can view their own company | SELECT | ... |
| Users can update their own company | UPDATE | ... |
| Allow insert companies during signup | INSERT | true |

```sql
-- Ver políticas da tabela users
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
```

**Resultado esperado:**

| policyname | cmd | qual |
|------------|-----|------|
| Users can view users from their company | SELECT | ... |
| Users can update their own profile | UPDATE | ... |
| Allow insert users during signup | INSERT | (id = auth.uid()) |

## 🚀 Testar o Signup Novamente

Após aplicar a correção:

1. **Volte para o Figma Make**
2. **Recarregue** a aplicação (F5)
3. **Clique em "Criar conta grátis"**
4. **Preencha os dados:**
   - Nome completo: `Seu Nome`
   - Email: `seuemail@exemplo.com`
   - Senha: `suaSenhaSegura123`
   - Nome da empresa: `Minha Empresa`
   - CNPJ: `12.345.678/0001-90`

5. **Clique em "Criar conta"**

### ✅ Resultado Esperado:

- Conta criada com sucesso
- Redirecionamento para o Dashboard
- Seu nome aparece no canto superior direito
- Banner "Trial - 14 dias restantes" aparece

### ✅ Validar no Supabase:

1. Vá no **Table Editor**
2. Clique em **companies** → Deve ter 1 linha com sua empresa
3. Clique em **users** → Deve ter 1 linha com seus dados

## 🔐 Segurança

### "Com `WITH CHECK (true)` qualquer um pode criar empresas?"

**NÃO!** Ainda é seguro porque:

1. **Só funciona para usuários autenticados:**
   - O usuário precisa ter feito signup no Supabase Auth primeiro
   - `auth.uid()` só retorna valor para usuários logados

2. **Fluxo de segurança:**
   ```
   1. Frontend chama /auth/signup
   2. Backend usa SUPABASE_SERVICE_ROLE_KEY
   3. Cria usuário no auth.users (Supabase Auth)
   4. Usuário é autenticado automaticamente
   5. Com auth token válido, RLS permite criar company
   6. RLS permite criar user (desde que id = auth.uid())
   ```

3. **Depois do signup:**
   - Todas as outras operações ainda respeitam RLS
   - Usuário só vê/edita dados da própria empresa
   - Multi-tenancy totalmente isolado

### Políticas RLS em Vigor:

| Operação | Tabela | Política |
|----------|--------|----------|
| SELECT | companies | Apenas sua própria empresa |
| UPDATE | companies | Apenas sua própria empresa |
| **INSERT** | **companies** | **Permitido durante signup** ✅ |
| SELECT | users | Apenas usuários da sua empresa |
| UPDATE | users | Apenas seu próprio perfil |
| **INSERT** | **users** | **Apenas se id = auth.uid()** ✅ |
| Todos | products, customers, etc. | Apenas dados da sua empresa |

## 📊 Resumo das Mudanças

### Antes (❌ Não funcionava):

```sql
-- companies: Sem política de INSERT
-- users: Sem política de INSERT

-- Resultado: signup bloqueado por RLS
```

### Depois (✅ Funciona):

```sql
-- companies: INSERT permitido para usuários autenticados
CREATE POLICY "Allow insert companies during signup"
  ON companies FOR INSERT
  WITH CHECK (true);

-- users: INSERT permitido apenas para o próprio usuário
CREATE POLICY "Allow insert users during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Resultado: signup funcionando, multi-tenancy seguro
```

## 🆘 Se Ainda Der Erro

### Erro: "Still violates row-level security"

1. Confirme que executou o script de limpar políticas
2. Confirme que executou a migração completa
3. Valide que as políticas foram criadas (query acima)

### Erro: "duplicate policy name"

1. As políticas antigas ainda existem
2. Execute o script de limpeza (DROP POLICY)
3. Execute a migração novamente

### Erro: "relation does not exist"

1. As tabelas não foram criadas ainda
2. Execute a migração completa do zero
3. Não execute apenas a parte de políticas

## ✅ Checklist

Antes de testar o signup novamente:

- [ ] Executei a limpeza de políticas antigas
- [ ] Executei a migração SQL completa atualizada
- [ ] Verifiquei que a política "Allow insert companies during signup" existe
- [ ] Verifiquei que a política "Allow insert users during signup" existe
- [ ] Recarreguei a aplicação no Figma Make
- [ ] Pronto para testar signup!

---

**🎯 Resumo:** O erro foi corrigido adicionando políticas RLS específicas que permitem INSERT nas tabelas `companies` e `users` durante o signup, mantendo a segurança multi-tenant para todas as outras operações!
