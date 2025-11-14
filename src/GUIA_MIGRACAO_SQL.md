# 🗄️ EXECUTAR MIGRAÇÃO SQL - Guia Passo a Passo

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se:
- [ ] Você tem acesso ao projeto Supabase (ID: bhykkiladzxjwnzkpdwu)
- [ ] Você está logado no Supabase Dashboard
- [ ] O projeto está ativo e funcionando

---

## 🚀 PASSO A PASSO

### 1️⃣ Acessar o SQL Editor

1. **Faça login** no Supabase: https://supabase.com
2. **Selecione seu projeto** (bhykkiladzxjwnzkpdwu ou o que você criou)
3. No **menu lateral esquerdo**, procure o ícone **"SQL Editor"**
   - É um ícone que parece `</>` ou um terminal
   - Fica geralmente na seção "Database" ou próximo ao topo
4. **Clique em "SQL Editor"**

### 2️⃣ Criar Nova Query

Você verá a tela do SQL Editor. Agora:

1. Procure o botão **"+ New query"** 
   - Fica no canto superior direito
   - Ou pode aparecer como "+ New" ou "New query"
2. **Clique nele**
3. Um editor de texto em branco aparecerá

### 3️⃣ Copiar o Script SQL

Agora você precisa copiar o conteúdo do arquivo de migração:

**Opção A - Copiar do arquivo no Figma Make:**

1. Abra o arquivo: `/supabase/migrations/001_initial_schema.sql`
2. **Selecione TODO o conteúdo** (Ctrl+A ou Cmd+A)
3. **Copie** (Ctrl+C ou Cmd+C)

**Opção B - Eu vou te fornecer o conteúdo aqui:**

Vou criar um arquivo compacto para você copiar facilmente:

### 4️⃣ Colar no SQL Editor

1. **Cole o conteúdo** no editor de texto do Supabase (Ctrl+V ou Cmd+V)
2. Você verá um monte de código SQL (aproximadamente 600 linhas)
3. O código começa com: `-- MIGRAÇÃO INICIAL - ERP SaaS Multi-Tenant`

### 5️⃣ Executar a Migração

Agora vem a parte importante:

1. **Procure o botão "Run"** 
   - Fica no canto inferior direito do editor
   - Ou pode ser atalho: **Ctrl+Enter** (Windows/Linux) ou **Cmd+Enter** (Mac)
2. **Clique em "Run"** ou pressione o atalho

### 6️⃣ Aguardar Execução

1. Você verá um **indicador de loading** (spinner/loading)
2. Aguarde **15-30 segundos**
3. O Supabase está criando:
   - 14 tabelas
   - Índices
   - Políticas RLS
   - Triggers
   - Funções

### 7️⃣ Verificar Sucesso

Após a execução, você deve ver:

✅ **Mensagem de sucesso:**
```
Success. No rows returned
```
Ou:
```
Success
Query executed successfully
```

⚠️ **Se aparecer erro:**
- Leia a mensagem de erro
- Vá para a seção "Troubleshooting" abaixo

---

## ✅ VALIDAR A MIGRAÇÃO

Agora vamos confirmar que tudo foi criado corretamente:

### Método 1: Table Editor

1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver **14 tabelas** na lista à esquerda:
   - companies
   - users
   - products
   - customers
   - suppliers
   - sales_orders
   - sales_order_items
   - purchase_orders
   - purchase_order_items
   - financial_transactions
   - accounts_receivable
   - accounts_payable
   - stock_movements
   - audit_logs

3. **Clique em qualquer tabela** (ex: `companies`)
4. Você verá:
   - Colunas da tabela (id, name, plan, status, etc.)
   - Tabela vazia (0 rows) - normal!

### Método 2: SQL Query de Verificação

1. Volte ao **SQL Editor**
2. **Nova query**: `+ New query`
3. Cole este código:

```sql
-- Verificar quantas tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

4. **Execute** (Run ou Ctrl+Enter)
5. Você deve ver **14 linhas** com os nomes das tabelas

---

## 🐛 TROUBLESHOOTING

### Erro: "permission denied for schema public"

**Causa:** Você não tem permissões de admin

**Solução:**
1. Verifique se está logado com a conta correta
2. Verifique se está no projeto correto
3. Se criou o projeto, você é admin automaticamente

### Erro: "table already exists"

**Causa:** A migração já foi executada antes

**Soluções:**

**Opção A - Limpar e recriar (CUIDADO: apaga dados):**
```sql
-- Deletar todas as tabelas existentes
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

-- Deletar função
DROP FUNCTION IF EXISTS auth.user_company_id() CASCADE;
```

Depois execute a migração novamente.

**Opção B - Pular se já está tudo criado:**
- Se as 14 tabelas já existem, você pode pular a migração
- Vá direto para testar o sistema

### Erro: "syntax error at or near..."

**Causa:** Código SQL copiado incorretamente

**Solução:**
1. Limpe o editor (delete tudo)
2. Copie novamente o arquivo `/supabase/migrations/001_initial_schema.sql`
3. Certifique-se de copiar TODO o conteúdo (do início ao fim)
4. Execute novamente

### Erro: "invalid input syntax for type uuid"

**Causa:** Extensão UUID não habilitada

**Solução:**
```sql
-- Execute primeiro:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Depois execute a migração completa.

### Erro: "permission denied for schema auth"

**Causa:** Tentativa de criar função no schema `auth` (protegido pelo Supabase)

**Solução:** ✅ **JÁ CORRIGIDO!**

O arquivo de migração foi atualizado para criar a função no schema `public` ao invés de `auth`.

Se você ainda ver esse erro:
1. Certifique-se de estar usando a versão MAIS RECENTE do arquivo `/supabase/migrations/001_initial_schema.sql`
2. O arquivo correto deve ter: `CREATE OR REPLACE FUNCTION public.user_company_id()`
3. NÃO deve ter: `CREATE OR REPLACE FUNCTION auth.user_company_id()`

Se ainda tiver o arquivo antigo, copie novamente o conteúdo atualizado e execute.

---

## 🎯 CHECKLIST FINAL

Após executar a migração, confirme:

- [ ] Migração executada sem erros
- [ ] Mensagem "Success" apareceu
- [ ] 14 tabelas aparecem no Table Editor
- [ ] Consegue abrir cada tabela e ver as colunas
- [ ] Tabelas estão vazias (0 rows) - isso é normal!

**Se todos os itens estão ✅, PARABÉNS! A migração foi concluída com sucesso!** 🎉

---

## 📸 REFERÊNCIA VISUAL

### Como deve aparecer o SQL Editor:

```
┌─────────────────────────────────────────────────────┐
│  SQL Editor                           [+ New query] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1  -- MIGRAÇÃO INICIAL                            │
│  2  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    │
│  3                                                  │
│  4  CREATE TABLE companies (                       │
│  5    id UUID PRIMARY KEY ...                      │
│  ...                                                │
│                                                     │
│                                                     │
│                                    [Run] [Ctrl+⏎]  │
└─────────────────────────────────────────────────────┘
```

### Como deve aparecer após executar:

```
┌─────────────────────────────────────────────────────┐
│  Results                                            │
├─────────────────────────────────────────────────────┤
│  ✓ Success. No rows returned                       │
│                                                     │
│  Execution time: 1.2s                              │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 PRÓXIMO PASSO

Após concluir a migração com sucesso:

1. **Volte para o Figma Make** e recarregue a aplicação
2. Você verá a **tela de login**
3. Clique em **"Criar conta grátis"**
4. Preencha seus dados
5. **Teste o sistema!**

A autenticação agora está funcionando com banco de dados real! 🎉

---

## 💡 DICAS

### Salvar a Query (Opcional)

Se quiser salvar a query para referência futura:

1. Após colar o código, clique no **nome da query** (topo)
2. Renomeie para: `001_initial_migration`
3. Ela ficará salva no histórico

### Ver Histórico de Queries

1. No SQL Editor, há uma aba **"History"**
2. Lá você vê todas as queries executadas
3. Útil para debugar

### Exportar Schema (Avançado)

Se quiser exportar o schema atual:

```sql
-- Ver estrutura de uma tabela específica
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies';
```

---

**🎯 Fim do guia! Se tiver dúvidas, consulte `/SETUP_SUPABASE.md` ou pergunte!**