# ⚡ Quick Start - GitHub Actions

## 🚀 Em 5 Minutos

### 1️⃣ Criar Repositório (2 min)

```bash
# No terminal, na pasta do projeto:
git init
git add .
git commit -m "Initial commit"

# Criar repo no GitHub (interface web), depois:
git remote add origin https://github.com/SEU-USUARIO/erp-saas.git
git branch -M main
git push -u origin main

# Criar branch develop
git checkout -b develop
git push -u origin develop
```

### 2️⃣ Configurar Vercel (1 min)

1. Acesse https://vercel.com
2. **Import Git Repository** → Escolha seu repo
3. Clique em **Deploy** (pode falhar, tudo bem!)
4. Vá em **Settings** → **General** → Copie:
   - Project ID
5. Vá em **Account Settings** → **Tokens** → Crie token
6. Vá em **Account** → Copie Team/User ID

### 3️⃣ Adicionar Secrets no GitHub (2 min)

Vá em: **Repositório → Settings → Secrets → Actions → New secret**

**MÍNIMO NECESSÁRIO (6 secrets):**

```
Nome: VERCEL_TOKEN
Valor: [token da Vercel]

Nome: VERCEL_ORG_ID  
Valor: [team/user ID]

Nome: VERCEL_PROJECT_ID
Valor: [project ID]

Nome: STAGING_SUPABASE_URL
Valor: https://[seu-projeto].supabase.co

Nome: STAGING_SUPABASE_ANON_KEY
Valor: [anon key do Supabase]

Nome: STAGING_PROJECT_REF
Valor: [ref do projeto - ver URL]
```

### 4️⃣ Testar Deploy

```bash
# Trigger deploy para staging
git checkout develop
echo "test" >> README.md
git add .
git commit -m "test: first deploy"
git push origin develop

# Acompanhar em: https://github.com/SEU-USUARIO/erp-saas/actions
```

---

## 🎯 Resultado Esperado

- ✅ Workflow roda automaticamente
- ✅ Build é criado
- ✅ Deploy na Vercel acontece
- ✅ App fica disponível em [URL da Vercel]

---

## ❌ Se Algo Falhar

### "Vercel deployment failed"
→ Verifique se os 3 secrets da Vercel estão corretos

### "Build failed"
→ Teste localmente: `npm run build`

### "Supabase functions deploy failed"
→ Normal! Pode ignorar por enquanto (marque `continue-on-error: true`)

---

## 📚 Próximo Passo

Depois que funcionar, leia o guia completo:
→ `.github/SETUP_GITHUB_ACTIONS.md`

---

## 💡 Dica

Comece simples! Configure apenas:
1. Vercel (3 secrets)
2. Supabase Staging (3 secrets)

Depois adicione Production quando estiver pronto.

---

**Tempo total:** ~5 minutos  
**Dificuldade:** Fácil  
**Resultado:** Deploy automático funcionando! 🎉
