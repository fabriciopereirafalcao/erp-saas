# 📘 GUIA DE APLICAÇÃO DAS MIGRATIONS SQL

## 🎯 OBJETIVO

Aplicar as migrations **014** e **015** no Supabase para expandir o schema SQL e adicionar tabelas auxiliares, preparando o sistema para a migração do KV Store para PostgreSQL.

---

## 📋 PRÉ-REQUISITOS

- ✅ Acesso ao Supabase Dashboard
- ✅ Projeto Staging configurado
- ✅ Projeto Production configurado
- ✅ Página de manutenção ATIVA na produção

---

## 🔄 ORDEM DE EXECUÇÃO

### **FASE 1: STAGING (Desenvolvimento)**
### **FASE 2: PRODUCTION (Após validação)**

---

## 🛠️ PASSO A PASSO - STAGING

### **1️⃣ Acessar Supabase Dashboard**

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto **STAGING**
3. Vá em: **SQL Editor** (ícone no menu lateral)

---

### **2️⃣ Aplicar Migration 014 - Expandir Tabelas Core**

1. No SQL Editor, clique em **"New query"**
2. Cole o conteúdo completo do arquivo:
   ```
   /supabase/migrations/014_expand_core_tables.sql
   ```
3. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
4. **Aguarde a execução** (~30 segundos)

#### **✅ Validação:**
```sql
-- Verificar se colunas foram adicionadas em products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('ncm', 'cest', 'origin', 'cfop', 'requires_batch_control');

-- Verificar se colunas foram adicionadas em customers
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name IN ('document_type', 'trade_name', 'icms_contributor', 'price_table_id');

-- Verificar se colunas foram adicionadas em sales_orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
  AND column_name IN ('stock_reduced', 'accounts_receivable_created', 'is_exceptional_order');
```

**Resultado esperado:** Todas as colunas devem aparecer na listagem.

---

### **3️⃣ Aplicar Migration 015 - Criar Tabelas Auxiliares**

1. No SQL Editor, clique em **"New query"** novamente
2. Cole o conteúdo completo do arquivo:
   ```
   /supabase/migrations/015_add_auxiliary_tables.sql
   ```
3. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
4. **Aguarde a execução** (~45 segundos)

#### **✅ Validação:**
```sql
-- Verificar se tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'payment_methods',
    'account_categories',
    'bank_accounts',
    'cost_centers',
    'product_categories',
    'stock_locations',
    'product_batches',
    'cash_flow_entries',
    'price_tables',
    'price_table_items',
    'dashboard_metrics',
    'saved_reports'
  )
ORDER BY table_name;
```

**Resultado esperado:** Devem aparecer **12 tabelas** criadas.

---

### **4️⃣ Verificar RLS (Row Level Security)**

```sql
-- Verificar se RLS está habilitado nas novas tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'payment_methods',
    'account_categories',
    'bank_accounts',
    'cost_centers',
    'product_categories',
    'stock_locations',
    'product_batches',
    'cash_flow_entries',
    'price_tables',
    'price_table_items',
    'dashboard_metrics',
    'saved_reports'
  )
ORDER BY tablename;
```

**Resultado esperado:** Todas as tabelas devem ter `rowsecurity = true`.

---

### **5️⃣ Verificar Políticas RLS**

```sql
-- Contar políticas criadas
SELECT schemaname, tablename, COUNT(*) as policies_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'payment_methods',
    'account_categories',
    'bank_accounts',
    'cost_centers',
    'product_categories',
    'stock_locations',
    'product_batches',
    'cash_flow_entries',
    'price_tables',
    'price_table_items',
    'dashboard_metrics',
    'saved_reports'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;
```

**Resultado esperado:** Cada tabela deve ter **4 políticas** (SELECT, INSERT, UPDATE, DELETE).

---

### **6️⃣ Verificar Triggers**

```sql
-- Verificar triggers de updated_at
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'payment_methods',
    'account_categories',
    'bank_accounts',
    'cost_centers',
    'product_categories',
    'stock_locations',
    'product_batches',
    'cash_flow_entries',
    'price_tables',
    'price_table_items',
    'saved_reports'
  )
ORDER BY event_object_table;
```

**Resultado esperado:** Cada tabela (exceto `dashboard_metrics`) deve ter trigger `update_*_updated_at`.

---

### **7️⃣ Verificar Índices**

```sql
-- Verificar índices criados
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN (
    'payment_methods',
    'account_categories',
    'bank_accounts',
    'cost_centers',
    'product_categories',
    'stock_locations',
    'product_batches',
    'cash_flow_entries',
    'price_tables',
    'price_table_items',
    'dashboard_metrics',
    'saved_reports'
  )
ORDER BY tablename, indexname;
```

**Resultado esperado:** Múltiplos índices por tabela (company_id, active, unique indexes, etc).

---

## ✅ CHECKLIST DE VALIDAÇÃO - STAGING

Antes de aplicar em PRODUCTION, confirme:

- [ ] Migration 014 executada com sucesso
- [ ] Migration 015 executada com sucesso
- [ ] Todas as 12 novas tabelas criadas
- [ ] Todas as colunas adicionadas nas tabelas existentes
- [ ] RLS habilitado em todas as tabelas
- [ ] 4 políticas por tabela (SELECT, INSERT, UPDATE, DELETE)
- [ ] Triggers de `updated_at` criados
- [ ] Índices criados corretamente
- [ ] Constraints CHECK funcionando

---

## 🚀 PASSO A PASSO - PRODUCTION

**⚠️ IMPORTANTE: SÓ EXECUTE APÓS VALIDAÇÃO COMPLETA NO STAGING!**

### **1️⃣ Confirmar Manutenção Ativa**

Acesse: https://metaerp.com.br

**Resultado esperado:** Página de manutenção deve estar sendo exibida.

---

### **2️⃣ Backup do Banco (Opcional mas Recomendado)**

1. No Supabase Dashboard (projeto PRODUCTION)
2. Vá em: **Database** → **Backups**
3. Clique em **"Create backup"**
4. Aguarde confirmação

---

### **3️⃣ Aplicar Migrations em Production**

**REPITA EXATAMENTE OS MESMOS PASSOS 2, 3, 4, 5, 6 e 7 do STAGING, mas no projeto PRODUCTION.**

1. Selecione projeto **PRODUCTION**
2. Aplique Migration 014
3. Valide Migration 014
4. Aplique Migration 015
5. Valide Migration 015
6. Execute todos os comandos de verificação

---

### **4️⃣ Validação Final em Production**

Execute o **CHECKLIST DE VALIDAÇÃO** completo novamente.

---

## 📊 RESUMO DAS ALTERAÇÕES

### **Migration 014 - Campos Adicionados:**

| Tabela | Novos Campos |
|--------|-------------|
| **companies** | max_users, max_nfe_month, nfe_used_current_month, stripe_customer_id, stripe_subscription_id, current_period_end |
| **users** | Role expandido (7 tipos) |
| **products** | 23 campos (fiscais + rastreabilidade) |
| **customers** | 17 campos (fiscais + estatísticas) |
| **suppliers** | 15 campos (fiscais + estatísticas) |
| **sales_orders** | 18 campos (controle avançado + flags) |
| **purchase_orders** | 18 campos (controle avançado + flags) |
| **financial_transactions** | 22 campos (parcelamento + transferências) |

### **Migration 015 - Tabelas Criadas:**

1. ✅ **payment_methods** (Formas de Pagamento)
2. ✅ **account_categories** (Plano de Contas)
3. ✅ **bank_accounts** (Contas Bancárias)
4. ✅ **cost_centers** (Centros de Custo)
5. ✅ **product_categories** (Categorias de Produtos)
6. ✅ **stock_locations** (Locais de Estoque)
7. ✅ **product_batches** (Lotes de Produtos)
8. ✅ **cash_flow_entries** (Fluxo de Caixa)
9. ✅ **price_tables** (Tabelas de Preço)
10. ✅ **price_table_items** (Itens de Tabelas de Preço)
11. ✅ **dashboard_metrics** (Métricas do Dashboard)
12. ✅ **saved_reports** (Relatórios Salvos)

---

## 🔧 TROUBLESHOOTING

### **Erro: "column already exists"**
**Causa:** Migration já foi executada antes.  
**Solução:** Verifique se os campos existem com o query de validação. Se existirem, ignore o erro.

### **Erro: "constraint already exists"**
**Causa:** Constraint já existe.  
**Solução:** Ignore o erro ou remova a constraint antiga antes de recriar.

### **Erro: "permission denied"**
**Causa:** Usuário sem permissões de DDL.  
**Solução:** Execute como usuário administrador do Supabase.

### **Erro: "function user_company_id() does not exist"**
**Causa:** Migration 001 não foi executada.  
**Solução:** Execute primeiro a migration 001_initial_schema.sql.

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique os logs** no SQL Editor do Supabase
2. **Copie a mensagem de erro completa**
3. **Anote qual migration e qual linha causou o erro**

---

## ✅ CONCLUSÃO

Após aplicar ambas as migrations em STAGING e PRODUCTION com sucesso:

✅ Schema SQL expandido  
✅ 12 novas tabelas auxiliares  
✅ 100+ campos adicionados  
✅ RLS e triggers configurados  
✅ Sistema pronto para migração do KV Store

**Próximo passo:** Refatorar código para usar PostgreSQL ao invés do KV Store.

---

**Última atualização:** Dezembro 2024
