# 🚀 Configuração do GitHub Actions - Guia Completo

Este guia explica como configurar completamente o GitHub Actions para seu ERP SaaS.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configurar Secrets](#configurar-secrets)
3. [Configurar Vercel](#configurar-vercel)
4. [Configurar Supabase](#configurar-supabase)
5. [Testar Workflows](#testar-workflows)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Pré-requisitos

### 1. Criar Repositório no GitHub

```bash
# No terminal, na pasta do seu projeto:

# Inicializar Git (se ainda não fez)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "Initial commit - ERP SaaS"

# Criar repositório no GitHub (via interface web)
# Depois conectar localmente:
git remote add origin https://github.com/SEU-USUARIO/erp-saas.git

# Criar e enviar branch principal
git branch -M main
git push -u origin main

# Criar branch de desenvolvimento
git checkout -b develop
git push -u origin develop
```

### 2. Criar Contas Necessárias

- [ ] **GitHub** - Repositório criado
- [ ] **Vercel** - Conta criada (gratuita)
- [ ] **Supabase** - 3 projetos criados (dev, staging, prod)

---

## 🔐 Configurar Secrets no GitHub

### Acessar Configurações de Secrets

1. Vá para seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** → **Actions**
4. Clique em **New repository secret**

### Secrets Obrigatórios

#### **VERCEL (Obter em: https://vercel.com/account/tokens)**

```
VERCEL_TOKEN
  └─ Token de acesso da Vercel
  └─ Como obter:
     1. Acesse https://vercel.com/account/tokens
     2. Clique em "Create"
     3. Dê um nome: "GitHub Actions"
     4. Copie o token gerado

VERCEL_ORG_ID
  └─ ID da sua organização/conta Vercel
  └─ Como obter:
     1. Acesse https://vercel.com/[seu-usuario]/settings
     2. Copie o "Team ID" ou "User ID"

VERCEL_PROJECT_ID
  └─ ID do projeto no Vercel
  └─ Como obter:
     1. Crie um projeto na Vercel (pode ser vazio inicialmente)
     2. Vá em Settings do projeto
     3. Copie o "Project ID"
```

#### **SUPABASE - STAGING**

```
STAGING_SUPABASE_URL
  └─ https://[PROJECT_ID].supabase.co

STAGING_SUPABASE_ANON_KEY
  └─ Chave pública anônima
  └─ Como obter:
     1. Acesse projeto Staging no Supabase
     2. Settings → API
     3. Copie "anon public"

STAGING_API_URL
  └─ https://[PROJECT_ID].supabase.co/functions/v1

STAGING_APP_URL
  └─ https://staging.seudominio.com
     (ou o domínio que a Vercel atribuir)

STAGING_PROJECT_REF
  └─ ID do projeto (aparece na URL e em Settings)

STAGING_DATABASE_URL
  └─ String de conexão PostgreSQL
  └─ Como obter:
     1. Settings → Database
     2. Copie "Connection string" (URI)
```

#### **SUPABASE - PRODUCTION**

```
PROD_SUPABASE_URL
  └─ https://[PROJECT_ID].supabase.co

PROD_SUPABASE_ANON_KEY
  └─ Chave pública anônima

PROD_API_URL
  └─ https://[PROJECT_ID].supabase.co/functions/v1

PROD_APP_URL
  └─ https://app.seudominio.com
     (seu domínio de produção)

PROD_PROJECT_REF
  └─ ID do projeto

PROD_DATABASE_URL
  └─ String de conexão PostgreSQL
```

#### **SUPABASE - GERAL**

```
SUPABASE_ACCESS_TOKEN
  └─ Token para CLI do Supabase
  └─ Como obter:
     1. Acesse https://app.supabase.com/account/tokens
     2. Clique em "Generate new token"
     3. Dê um nome: "GitHub Actions"
     4. Copie o token
```

#### **SENTRY (Opcional - Monitoramento de Erros)**

```
SENTRY_DSN
  └─ https://xxx@xxx.ingest.sentry.io/xxx
  └─ Como obter:
     1. Crie conta no Sentry (gratuita)
     2. Crie um projeto
     3. Copie o DSN em Settings
```

---

## 🚀 Configurar Vercel (Interface Web)

### 1. Criar Projeto na Vercel

```
1. Acesse https://vercel.com
2. Clique em "Add New..." → "Project"
3. Importe seu repositório do GitHub
4. Configure:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
   - Install Command: npm ci
```

### 2. Configurar Variáveis de Ambiente na Vercel

**Para STAGING (Preview Deployments):**
```
VITE_SUPABASE_URL = [URL do projeto staging]
VITE_SUPABASE_ANON_KEY = [Chave staging]
VITE_ENVIRONMENT = staging
```

**Para PRODUCTION:**
```
VITE_SUPABASE_URL = [URL do projeto prod]
VITE_SUPABASE_ANON_KEY = [Chave prod]
VITE_ENVIRONMENT = production
VITE_SENTRY_DSN = [DSN do Sentry]
```

### 3. Desabilitar Auto-Deploy (para usar GitHub Actions)

```
1. Project Settings → Git
2. Desmarque "Automatically deploy commits"
   (vamos usar GitHub Actions para controlar os deploys)
```

---

## 🗄️ Configurar Supabase

### 1. Criar 3 Projetos

```
Projeto DEVELOPMENT
├─ Nome: erp-saas-dev
├─ Região: South America (São Paulo)
└─ Tier: Free

Projeto STAGING  
├─ Nome: erp-saas-staging
├─ Região: South America (São Paulo)
└─ Tier: Free

Projeto PRODUCTION
├─ Nome: erp-saas-prod
├─ Região: South America (São Paulo)
└─ Tier: Pro ($25/mês)
```

### 2. Configurar RLS em Cada Projeto

**Aplicar em TODOS os 3 projetos:**

```sql
-- Já está configurado no seu sistema!
-- Apenas certifique-se de que o SQL de migração
-- está aplicado em cada ambiente
```

### 3. Migrar Schema

```bash
# Exportar schema do projeto atual (Figma Make)
# Você precisará fazer isso manualmente copiando as tabelas

# Aplicar em cada ambiente:
# 1. Acesse SQL Editor no Supabase
# 2. Cole o SQL de criação das tabelas
# 3. Execute
```

### 4. Popular Dados de Teste (Staging)

```sql
-- Em STAGING, adicione dados fictícios
INSERT INTO organizations (name, cnpj, email) VALUES
  ('Empresa Teste', '00.000.000/0001-00', 'teste@exemplo.com');

INSERT INTO users (email, name, organization_id, role) VALUES
  ('admin@teste.com', 'Admin Teste', '[ORG_ID]', 'Administrador');
```

---

## 🧪 Testar Workflows

### Teste 1: Deploy para Staging

```bash
# 1. Fazer mudança no código
git checkout develop
echo "// Test change" >> README.md
git add .
git commit -m "test: trigger staging deploy"
git push origin develop

# 2. Acompanhar no GitHub
# - Vá para Actions no repositório
# - Veja o workflow "🚀 Deploy Pipeline" rodando
# - Aguarde conclusão (~2-5 minutos)

# 3. Verificar deploy
# - Acesse a URL de staging
# - Verifique se a mudança apareceu
```

### Teste 2: Deploy para Production

```bash
# 1. Merge de develop para main
git checkout main
git merge develop
git push origin main

# 2. Acompanhar no GitHub Actions
# - Workflow deve rodar automaticamente
# - Deploy para produção será executado

# 3. Verificar produção
# - Acesse URL de produção
# - Confirme que está atualizado
```

### Teste 3: Pull Request Check

```bash
# 1. Criar feature branch
git checkout -b feature/test-pr
echo "// PR test" >> README.md
git add .
git commit -m "feat: test PR workflow"
git push origin feature/test-pr

# 2. Criar PR no GitHub
# - Interface web: "Compare & pull request"
# - Target: develop
# - Aguarde checks rodarem

# 3. Verificar comentário automático
# - Bot deve adicionar comentário com resultados
```

---

## 🔍 Verificar Configuração

### Checklist Final

```bash
✅ REPOSITÓRIO
  □ Repositório criado no GitHub
  □ Branch main existe
  □ Branch develop existe
  □ Workflows na pasta .github/workflows/

✅ SECRETS CONFIGURADOS
  □ Todos os secrets da Vercel
  □ Todos os secrets do Supabase Staging
  □ Todos os secrets do Supabase Production
  □ SUPABASE_ACCESS_TOKEN

✅ VERCEL
  □ Projeto criado
  □ Conectado ao GitHub
  □ Variáveis de ambiente configuradas
  □ Auto-deploy desabilitado (opcional)

✅ SUPABASE
  □ 3 projetos criados
  □ Schema migrado em cada um
  □ RLS configurado
  □ Edge Functions deployadas

✅ TESTES
  □ Deploy staging funcionou
  □ Deploy production funcionou
  □ PR checks funcionaram
  □ Aplicação abre sem erros
```

---

## ❌ Troubleshooting

### Erro: "Vercel deployment failed"

```bash
# Verificar:
1. VERCEL_TOKEN está correto?
2. VERCEL_PROJECT_ID está correto?
3. Build local funciona? (npm run build)

# Solução:
- Gerar novo token na Vercel
- Verificar se projeto existe
- Testar build localmente
```

### Erro: "Supabase functions deploy failed"

```bash
# Verificar:
1. SUPABASE_ACCESS_TOKEN está correto?
2. PROJECT_REF está correto?
3. Edge Functions existem?

# Solução:
- Recriar token em https://app.supabase.com/account/tokens
- Verificar PROJECT_REF em Settings do projeto
- Pode marcar como "continue-on-error: true" temporariamente
```

### Erro: "Build size too large"

```bash
# Solução:
1. Analisar bundle com:
   npm run build
   npx vite-bundle-visualizer

2. Otimizar imports:
   - Usar imports específicos
   - Remover bibliotecas não usadas
   - Code splitting

3. Habilitar compressão no Vercel
```

### Erro: "Database connection failed"

```bash
# Verificar:
1. DATABASE_URL está correto?
2. Formato: postgresql://user:pass@host:5432/db?sslmode=require
3. IP do GitHub Actions está permitido?

# Solução:
- Verificar string de conexão no Supabase
- Supabase permite conexões de qualquer IP por padrão
```

---

## 📊 Monitorar Workflows

### Ver Execuções

```
GitHub → Actions → Workflows

Você verá:
- 🚀 Deploy Pipeline (main/develop)
- 🔍 Pull Request Check (PRs)
- 🔒 Security Scan (semanal)
- 💾 Database Backup (diário)
```

### Ver Logs

```
1. Clique no workflow
2. Clique na execução específica
3. Clique no job (ex: "deploy-staging")
4. Expanda cada step para ver logs
```

### Notificações

```
Settings → Notifications
  ✓ Actions: Email on workflow failure
```

---

## 🎯 Próximos Passos

Após configurar GitHub Actions:

1. ✅ Configurar domínio personalizado na Vercel
2. ✅ Configurar SSL (automático na Vercel)
3. ✅ Implementar monitoramento (Sentry)
4. ✅ Configurar analytics
5. ✅ Documentar processo para equipe

---

## 📚 Recursos Adicionais

- [Documentação GitHub Actions](https://docs.github.com/actions)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

---

## 💡 Dicas Finais

### Secrets Seguros
```bash
# NUNCA commitar secrets!
# Adicionar ao .gitignore:
.env
.env.*
!.env.example
```

### Testar Localmente
```bash
# Simular ambiente de CI:
npm ci        # Ao invés de npm install
npm run build # Testar build
npm run lint  # Verificar linting
```

### Reverter Deploy
```bash
# Se algo der errado em produção:
1. GitHub → Deployments → View deployment
2. Vercel Dashboard → Rollback to previous
3. Ou fazer revert no Git:
   git revert HEAD
   git push origin main
```

---

**Configuração criada em:** 2025-01-14  
**Última atualização:** 2025-01-14  
**Versão:** 1.0

---

## ✅ Lista de Secrets (Copiar e Colar)

Para facilitar, aqui está a lista completa de secrets para adicionar:

```
# VERCEL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# SUPABASE - STAGING
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_API_URL
STAGING_APP_URL
STAGING_PROJECT_REF
STAGING_DATABASE_URL

# SUPABASE - PRODUCTION
PROD_SUPABASE_URL
PROD_SUPABASE_ANON_KEY
PROD_API_URL
PROD_APP_URL
PROD_PROJECT_REF
PROD_DATABASE_URL

# SUPABASE - GERAL
SUPABASE_ACCESS_TOKEN

# MONITORAMENTO (OPCIONAL)
SENTRY_DSN
```

**Total: 16 secrets obrigatórios + 1 opcional**

Boa sorte! 🚀
