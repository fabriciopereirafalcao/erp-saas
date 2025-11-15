# 📊 Visão Geral dos Workflows

## 🚀 Workflows Configurados

### 1. **Deploy Pipeline** (`deploy.yml`)

**Quando executa:**
- Push para `main` → Deploy PRODUCTION
- Push para `develop` → Deploy STAGING
- Pull Request → Apenas testes

**O que faz:**
```
┌─────────────┐
│  Git Push   │
└──────┬──────┘
       │
       ├─→ 🔍 Lint & Type Check
       │
       ├─→ 🧪 Run Tests
       │
       ├─→ 🏗️ Build Test
       │
       ├─→ 🚀 Deploy Vercel
       │
       └─→ 📦 Deploy Edge Functions
```

**Tempo estimado:** 3-5 minutos

**Ambientes:**
- `develop` → https://staging.seudominio.com
- `main` → https://app.seudominio.com

---

### 2. **Pull Request Check** (`pr-check.yml`)

**Quando executa:**
- Abertura de PR
- Novo commit em PR

**O que faz:**
```
┌─────────────┐
│ Open PR     │
└──────┬──────┘
       │
       ├─→ 🎨 ESLint
       │
       ├─→ 📝 TypeScript Check
       │
       ├─→ 🏗️ Build Test
       │
       ├─→ 🧪 Run Tests
       │
       └─→ 💬 Comentário Automático
```

**Tempo estimado:** 2-3 minutos

**Resultado:**
- ✅ Aprovado → Merge liberado
- ❌ Falhou → Corrigir antes de merge

---

### 3. **Security Scan** (`security-scan.yml`)

**Quando executa:**
- Toda segunda às 9h
- Push para `main` ou `develop`
- Manualmente (workflow_dispatch)

**O que faz:**
```
┌──────────────┐
│ Schedule/Push│
└──────┬───────┘
       │
       ├─→ 🔍 NPM Audit (vulnerabilidades)
       │
       ├─→ 🔐 Secret Scanning (chaves expostas)
       │
       ├─→ 📦 Dependency Review
       │
       └─→ 📊 Code Quality Check
```

**Tempo estimado:** 1-2 minutos

**Alertas:**
- 🔴 Crítico → Corrigir IMEDIATAMENTE
- 🟡 Moderado → Corrigir em breve
- 🟢 Baixo → Acompanhar

---

### 4. **Database Backup** (`backup.yml`)

**Quando executa:**
- Todo dia às 3h UTC (0h BRT)
- Manualmente (workflow_dispatch)

**O que faz:**
```
┌──────────────┐
│  Schedule    │
└──────┬───────┘
       │
       ├─→ 💾 Dump Production DB
       │
       ├─→ 📦 Compress (gzip)
       │
       ├─→ 📤 Upload Artifacts
       │
       └─→ 📊 Notificação
```

**Tempo estimado:** 5-10 minutos

**Retenção:**
- Production: 30 dias
- Staging: 14 dias

**Restaurar backup:**
```bash
# Baixar do GitHub Actions Artifacts
# Descomprimir
gunzip backup_YYYYMMDD_HHMMSS.sql.gz

# Restaurar
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📋 Matriz de Execução

| Evento | Deploy | PR Check | Security | Backup |
|--------|--------|----------|----------|--------|
| Push `main` | ✅ Prod | - | ✅ | - |
| Push `develop` | ✅ Staging | - | ✅ | - |
| Pull Request | ⚠️ Tests | ✅ | - | - |
| Schedule | - | - | ✅ Segunda | ✅ Diário |
| Manual | ✅ | - | ✅ | ✅ |

---

## 🎯 Fluxo de Trabalho Completo

### Desenvolvimento Normal

```
1. Criar feature branch
   git checkout -b feature/nova-funcionalidade

2. Desenvolver localmente
   npm run dev

3. Commit e push
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin feature/nova-funcionalidade

4. Abrir Pull Request para develop
   → PR Check roda automaticamente
   → Revisar código
   → Merge

5. Push para develop
   → Deploy automático para STAGING
   → Testar em staging

6. Quando aprovado, merge develop → main
   → Deploy automático para PRODUCTION
   → Sistema atualizado para clientes
```

### Deploy de Emergência (Hotfix)

```
1. Criar branch de hotfix
   git checkout -b hotfix/bug-critico

2. Corrigir bug

3. PR direto para main (excepcionalmente)
   → Aprovar rápido
   → Merge

4. Deploy automático para produção
   → Monitorar Sentry

5. Fazer backport para develop
   git checkout develop
   git merge hotfix/bug-critico
   git push
```

---

## 📊 Monitoramento

### Ver Status dos Workflows

```
GitHub → [Seu Repo] → Actions
```

### Receber Notificações

```
GitHub → Settings → Notifications
  ✓ Email notifications for failed workflows
```

### Badge no README

Adicione ao README.md:
```markdown
![Deploy Status](https://github.com/SEU-USUARIO/erp-saas/actions/workflows/deploy.yml/badge.svg)
```

---

## 🔧 Customizar Workflows

### Desabilitar Temporariamente

Edite o workflow e comente `on:`:
```yaml
# on:
#   push:
#     branches:
#       - main
```

### Rodar Manualmente

Na interface do GitHub:
```
Actions → [Nome do Workflow] → Run workflow
```

### Adicionar Novo Job

```yaml
new-job:
  name: 🎯 Meu Job
  runs-on: ubuntu-latest
  steps:
    - name: Fazer algo
      run: echo "Olá!"
```

---

## 💰 Custos

### GitHub Actions (Gratuito)

- **Repositório Público:** Ilimitado
- **Repositório Privado:** 2.000 minutos/mês (Free tier)

**Estimativa de uso mensal:**
```
Deploy staging: 5 min × 20 deploys = 100 min
Deploy prod: 5 min × 10 deploys = 50 min
PR checks: 3 min × 30 PRs = 90 min
Security: 2 min × 4 runs = 8 min
Backups: 8 min × 30 runs = 240 min
─────────────────────────────────────────
TOTAL: ~488 minutos/mês (gratuito)
```

✅ **Você tem folga de ~1.500 minutos!**

---

## 🚨 Alertas Importantes

### ⚠️ Secrets Expostos
- **NUNCA** commite arquivos .env
- **SEMPRE** use GitHub Secrets
- **ROTACIONE** tokens regularmente

### ⚠️ Deploy Quebrado
- Reverte com: `git revert HEAD && git push`
- Ou rollback na Vercel

### ⚠️ Backup Falhou
- Verificar logs no Actions
- Rodar manualmente se necessário
- Testar restauração periodicamente

---

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Workflow Syntax](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

## ✅ Checklist de Saúde

Verificar mensalmente:

```
□ Todos os workflows rodando sem erros
□ Backups sendo criados (verificar artifacts)
□ Security scan sem vulnerabilidades críticas
□ Deploy time < 5 minutos
□ Secrets atualizados e seguros
□ Documentação atualizada
□ Equipe treinada no processo
```

---

**Última atualização:** 2025-01-14  
**Versão:** 1.0  
**Manutenção:** Revisão trimestral recomendada
