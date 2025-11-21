# 🆕 CRIAR PROJETO SUPABASE - Guia Completo

## ⚠️ IMPORTANTE: Verificar Projeto Existente

Antes de criar um novo projeto, verifique se o projeto **bhykkiladzxjwnzkpdwu** já existe:

1. Acesse: https://supabase.com/dashboard/projects
2. Procure por um projeto com ID ou nome relacionado ao ERP
3. Se encontrar, **NÃO crie um novo!** Use o existente.

---

## 🆕 Se o Projeto NÃO Existe - Criar Novo

### Passo 1: Acessar Dashboard
- URL: https://supabase.com/dashboard

### Passo 2: Criar Novo Projeto
1. Clique no botão **"New Project"** (verde, no canto superior direito)
2. Ou clique no botão **"+ New project"** se estiver em uma organização

### Passo 3: Preencher Formulário

**Campos obrigatórios:**

1. **Name (Nome do projeto)**
   - Digite: `ERP Sistema SaaS`
   - Ou qualquer nome descritivo que preferir

2. **Database Password (Senha do banco)**
   - Crie uma senha FORTE (mínimo 12 caracteres)
   - Exemplo: `ErpS1st3ma@2025!Secure`
   - ⚠️ **ANOTE ESTA SENHA!** Você precisará dela depois
   - Guarde em local seguro (gerenciador de senhas)

3. **Region (Região)**
   - Selecione: **South America (São Paulo)** - `sa-east-1`
   - ✅ Melhor latência para Brasil
   - Se não aparecer, escolha a mais próxima: East US, etc.

4. **Pricing Plan (Plano)**
   - Selecione: **Free** (grátis)
   - Suficiente para desenvolvimento e MVP

### Passo 4: Criar Projeto
1. Clique no botão **"Create new project"**
2. Aguarde 2-3 minutos enquanto o projeto é provisionado
3. Você verá uma barra de progresso

### Passo 5: Projeto Criado!
- Você será redirecionado para o dashboard do projeto
- Anote as informações do projeto (veremos a seguir)

---

## 🔑 Obter Credenciais do Novo Projeto

⚠️ **ATENÇÃO:** Se você criou um NOVO projeto, as credenciais serão DIFERENTES das que estão no código!

### Onde encontrar:

1. No menu lateral esquerdo, clique no ícone de **Settings** (engrenagem) na parte inferior
2. Clique em **API**
3. Você verá:

```
Project URL: https://SEU_NOVO_ID.supabase.co
anon public key: eyJhbG... (chave longa)
```

### ⚠️ IMPORTANTE: Atualizar o Código

Se criou um novo projeto, você precisará atualizar o arquivo `/utils/supabase/info.tsx`:

**ANTES (credenciais antigas):**
```typescript
export const projectId = "bhykkiladzxjwnzkpdwu"
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**DEPOIS (suas novas credenciais):**
```typescript
export const projectId = "SEU_NOVO_PROJECT_ID_AQUI"
export const publicAnonKey = "SUA_NOVA_ANON_KEY_AQUI"
```

---

## ✅ Validação

Após criar o projeto, você deve ver:

- ✅ Dashboard do projeto aberto
- ✅ Menu lateral com opções: Home, Table Editor, SQL Editor, etc.
- ✅ Status: "Project is up and running"
- ✅ Região: South America (São Paulo) ou a que você escolheu

**Próximo passo:** Executar a migração SQL (volte para o guia principal)

---

## 💡 Dica

Se já tinha um projeto antigo do ERP e quer começar do zero:
1. Pode criar um novo projeto com nome diferente
2. Ou usar o projeto existente e executar a migração
3. O ideal é usar o projeto cujo ID está no código: `bhykkiladzxjwnzkpdwu`
