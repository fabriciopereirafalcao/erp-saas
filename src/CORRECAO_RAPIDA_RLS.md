# ⚡ CORREÇÃO RÁPIDA - Erro de Signup (RLS)

## 🎯 Problema
Erro ao criar conta: "new row violates row-level security policy"

## ✅ Solução em 3 Passos

### PASSO 1: Abrir SQL Editor
1. Acesse o Supabase
2. Vá em **SQL Editor**
3. Clique em **+ New query**

### PASSO 2: Executar Script de Correção

Copie e execute este código:

```sql
-- Adicionar política para permitir criação de companies
CREATE POLICY IF NOT EXISTS "Allow insert companies during signup"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Adicionar política para permitir criação de users
CREATE POLICY IF NOT EXISTS "Allow insert users during signup"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
```

**Ou copie o arquivo:** `/supabase/migrations/002_fix_rls_signup.sql`

### PASSO 3: Testar Signup

1. Volte para o Figma Make
2. Recarregue a página (F5)
3. Clique em "Criar conta grátis"
4. Preencha os dados
5. Clique em "Criar conta"

## ✅ Deve Funcionar!

Se seguiu os 3 passos, o signup vai funcionar e você será redirecionado para o Dashboard.

---

## 📋 Validação Rápida

Para confirmar que as políticas foram criadas, execute:

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('companies', 'users');
```

**Resultado esperado:** Deve mostrar as políticas, incluindo:
- "Allow insert companies during signup" (INSERT)
- "Allow insert users during signup" (INSERT)

---

## 🆘 Se Ainda Der Erro

### Erro: "policy already exists"
✅ **Tudo bem!** Significa que já está corrigido. Vá direto testar.

### Erro persiste
Veja o guia completo: `/CORRECAO_RLS_SIGNUP.md`

---

**Tempo total: 2 minutos** ⚡
