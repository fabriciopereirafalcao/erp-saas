# 🧹 LIMPAR DADOS DE TESTE

## 🎯 Quando Usar

Use este guia quando receber o erro:
```
A user with this email address has already been registered
```

## 🚀 PASSO A PASSO - 3 Minutos

### PASSO 1: Limpar Tabelas (SQL Editor)

1. **Abra o Supabase Dashboard**
2. **Vá em SQL Editor**
3. **Clique em "+ New query"**
4. **Cole e execute:**

```sql
-- Deletar todos os usuários da tabela users
DELETE FROM users;

-- Deletar todas as empresas
DELETE FROM companies;
```

5. **Clique em "Run"**

✅ Resultado esperado: "Success. No rows returned"

---

### PASSO 2: Limpar Usuários do Auth (UI)

1. **Vá em "Authentication"** (menu lateral)
2. **Clique em "Users"**
3. **Você verá uma lista de usuários**
4. **Para cada usuário:**
   - Clique nos **3 pontinhos** (⋮) do lado direito
   - Clique em **"Delete user"**
   - Confirme

**OU** (mais rápido):
- Marque a **checkbox** ao lado de cada usuário
- Clique no botão **"Delete"** no topo
- Confirme

✅ Lista deve ficar vazia

---

### PASSO 3: Validar Limpeza

**No SQL Editor, execute:**

```sql
-- Verificar se as tabelas estão vazias
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as companies_count FROM companies;
```

**Resultado esperado:**
```
users_count: 0
companies_count: 0
```

**Na aba Authentication → Users:**
- Lista deve estar vazia

---

### PASSO 4: Testar Signup Novamente

1. **Volte para o Figma Make**
2. **Recarregue a página** (F5)
3. **Clique em "Criar conta grátis"**
4. **Preencha com um email NOVO ou o mesmo (agora funciona!)**
   - Nome: `João Silva`
   - Email: `joao@teste.com`
   - Senha: `senha123456`
   - Empresa: `Minha Empresa`
   - CNPJ: `12.345.678/0001-90`
5. **Clique em "Criar conta"**

✅ **DEVE FUNCIONAR!** Você será redirecionado para o Dashboard!

---

## 📊 Checklist

Antes de testar signup novamente:

- [ ] Executei o DELETE FROM users
- [ ] Executei o DELETE FROM companies
- [ ] Deletei os usuários em Authentication → Users
- [ ] Validei que as tabelas estão vazias (COUNT = 0)
- [ ] Recarreguei a aplicação no Figma Make
- [ ] Pronto para criar conta!

---

## 🔄 Alternativa: Usar Outro Email

Se não quiser deletar os dados, simplesmente use **outro email** para testar:

- ❌ `joao@teste.com` (já existe)
- ✅ `maria@teste.com` (novo)
- ✅ `joao2@teste.com` (novo)
- ✅ `teste123@gmail.com` (novo)

---

## 💡 Dica para Desenvolvimento

Durante testes, você pode:

1. **Usar emails temporários:**
   - `teste1@exemplo.com`
   - `teste2@exemplo.com`
   - `teste3@exemplo.com`

2. **Ou usar o truque do Gmail:**
   - Se seu email é `seuemail@gmail.com`
   - Use: `seuemail+teste1@gmail.com`
   - Use: `seuemail+teste2@gmail.com`
   - Todos vão para a mesma caixa, mas o Supabase trata como emails diferentes!

---

## 🆘 Se Ainda Der Erro

### Erro: "User not found" ao deletar

**Solução:**
- Já foi deletado antes
- Pode ignorar e continuar

### Erro: "Permission denied" no SQL

**Solução:**
- Você não tem permissão de DELETE
- Use a UI do Supabase para deletar manualmente

### Erro após limpar tudo

**Solução:**
- Me envie o erro completo do console
- Pode ser outro problema não relacionado ao email

---

**⏰ Tempo total: 3 minutos**

🎯 **Depois de limpar, o signup VAI FUNCIONAR!**
