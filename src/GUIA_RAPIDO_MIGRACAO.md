# ⚡ GUIA RÁPIDO - Migração SQL em 5 Minutos

## 🎯 Objetivo
Criar as 14 tabelas do banco de dados no Supabase para o ERP funcionar.

---

## ✅ CHECKLIST PASSO A PASSO

### □ PASSO 1: Abrir Supabase
- Acesse: **https://supabase.com**
- Faça login
- Abra seu projeto (ID: bhykkiladzxjwnzkpdwu)

### □ PASSO 2: Ir para SQL Editor
- Menu lateral → **SQL Editor** (ícone `</>`)
- Clique em **"+ New query"**

### □ PASSO 3: Copiar o Código SQL
- Abra o arquivo: `/supabase/migrations/001_initial_schema.sql`
- Selecione **TODO** o conteúdo (Ctrl+A)
- Copie (Ctrl+C)

### □ PASSO 4: Colar e Executar
- Cole no editor do Supabase (Ctrl+V)
- Clique em **"Run"** (ou pressione Ctrl+Enter)
- Aguarde 15-30 segundos

### □ PASSO 5: Verificar Sucesso
- Deve aparecer: **"✓ Success. No rows returned"**
- Vá em **Table Editor** (menu lateral)
- Confirme que existem **14 tabelas**

---

## 🎉 PRONTO!

Se você viu "Success" e as 14 tabelas estão lá, **PARABÉNS!**

**Próximo passo:**
1. Volte para o Figma Make
2. Recarregue a aplicação
3. Você verá a tela de login
4. Clique em "Criar conta grátis"
5. Preencha e teste!

---

## ❌ Se der erro?

### Erro mais comum: "table already exists"

**Solução rápida:** As tabelas já foram criadas antes! 

Vá direto testar o sistema (passo "PRONTO!" acima).

### Outros erros?

Consulte o guia completo: `/GUIA_MIGRACAO_SQL.md`

---

## 📋 Resumo Visual

```
Login Supabase → SQL Editor → New Query → 
Copiar SQL → Colar → Run → Success! → 
Verificar Tabelas → Testar Sistema
```

**Tempo total: ~5 minutos** ⚡

---

## 🆘 Precisa de ajuda?

1. Guia detalhado: `/GUIA_MIGRACAO_SQL.md`
2. Setup completo: `/SETUP_SUPABASE.md`
3. Criar projeto novo: `/GUIA_CRIAR_PROJETO_SUPABASE.md`
