# 🛠️ CONFIGURAÇÃO DO MODO DE MANUTENÇÃO

## ✅ O QUE FOI FEITO

1. **Criado componente MaintenancePage** (`/components/MaintenancePage.tsx`)
   - Página profissional de manutenção
   - Design com logo ciano do MetaERP
   - Informações sobre migração SQL

2. **Modificado App.tsx** com verificação de ambiente
   - Detecta automaticamente se está em produção
   - Mostra manutenção **APENAS em produção**
   - Funcionamento normal em Preview/Staging

---

## 🔧 COMO FUNCIONA

### Detecção de Ambiente

O código verifica duas variáveis:

```typescript
const IS_PRODUCTION = import.meta.env.VITE_VERCEL_ENV === 'production' || 
                      import.meta.env.PROD === true;
const IS_MAINTENANCE_MODE = IS_PRODUCTION;
```

### Lógica

- **Produção** (branch `main`) → Mostra página de manutenção
- **Preview/Staging** (branch `develop`) → Funciona normalmente
- **Development** (localhost) → Funciona normalmente

---

## ⚙️ CONFIGURAÇÃO NO VERCEL (IMPORTANTE!)

Para que funcione corretamente, você precisa adicionar uma variável de ambiente no Vercel:

### PASSO 1: Acessar o Projeto no Vercel

1. Acesse https://vercel.com
2. Entre no projeto **MetaERP**
3. Vá em **Settings** → **Environment Variables**

### PASSO 2: Adicionar Variável

Adicione a seguinte variável:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_VERCEL_ENV` | `production` | ✅ **Production ONLY** |

**⚠️ IMPORTANTE:**
- Marque **APENAS** o checkbox **Production**
- **NÃO** marque Preview nem Development
- Isso garante que a variável só existe em produção

### PASSO 3: Redeploy

Após adicionar a variável:
1. Vá em **Deployments**
2. Clique nos 3 pontinhos do último deployment de **Production**
3. Clique em **Redeploy**
4. Aguarde o deploy completar

---

## 🧪 COMO TESTAR

### Testar Produção (deve mostrar manutenção)
1. Acesse: `https://metaerp.com.br`
2. Deve mostrar a **página de manutenção**

### Testar Preview/Staging (deve funcionar normal)
1. Faça push para branch `develop`
2. Acesse a URL de Preview gerada pelo Vercel
3. Deve funcionar **normalmente** (sem manutenção)

### Testar Local (deve funcionar normal)
1. Execute `npm run dev` localmente
2. Acesse `http://localhost:5173`
3. Deve funcionar **normalmente** (sem manutenção)

---

## 🔄 REMOVENDO O MODO DE MANUTENÇÃO

Quando quiser tirar a página de manutenção do ar:

### OPÇÃO 1: Variável de Ambiente (Recomendado)
1. Vá em Vercel → Settings → Environment Variables
2. Delete ou desabilite `VITE_VERCEL_ENV`
3. Redeploy em Production

### OPÇÃO 2: Código (Rápido para emergência)
No arquivo `/App.tsx`, linha ~114, mude:

```typescript
// De:
const IS_MAINTENANCE_MODE = IS_PRODUCTION;

// Para:
const IS_MAINTENANCE_MODE = false; // 🚨 DESABILITA MANUTENÇÃO
```

Depois faça commit e push para `main`.

---

## 📊 LOGS DE DEBUG

O App.tsx imprime logs no console para debug:

```
🔧 Environment Check: {
  VITE_VERCEL_ENV: 'production',
  IS_PROD: true,
  IS_PRODUCTION: true,
  IS_MAINTENANCE_MODE: true,
  mode: 'production'
}
```

Para ver esses logs:
1. Abra o site
2. Pressione F12 (DevTools)
3. Vá na aba **Console**
4. Procure por "🔧 Environment Check"

---

## ⚠️ IMPORTANTE

### ✅ PRODUÇÃO (`main` branch)
- Domínio: `metaerp.com.br`
- Supabase: `yxaqwtvuvbtyvpmccxlw` (production)
- Status: **🛑 MANUTENÇÃO ATIVA**

### ✅ PREVIEW/STAGING (`develop` branch)
- Domínio: `metaerp-*.vercel.app` (auto-gerado)
- Supabase: `bhykkiladzxjwnzkpdwu` (staging)
- Status: **✅ FUNCIONANDO NORMAL**

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Commit e push deste código
2. ✅ Configurar variável `VITE_VERCEL_ENV` no Vercel
3. ✅ Redeploy production
4. ✅ Verificar que produção mostra manutenção
5. ✅ Verificar que preview funciona normal
6. ⏳ Iniciar migração SQL no ambiente de staging

---

**Status**: Pronto para deploy
**Próxima ação**: Configurar variável de ambiente no Vercel
