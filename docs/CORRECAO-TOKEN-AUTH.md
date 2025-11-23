# 🔧 Correção: Erro 401 - Token de Autenticação

---

## 🐛 **PROBLEMA IDENTIFICADO**

### **Erro:**
```
POST /fiscal/nfe/assinar-xml 401 (Unauthorized)
{success: false, error: 'Token de autenticação não fornecido'}
```

### **Causa Raiz:**
O componente `TaxInvoicing.tsx` estava tentando acessar `user.session.access_token`, mas o `AuthContext` retorna `session` como propriedade separada, não dentro de `user`.

### **Estrutura Incorreta:**
```typescript
const { user } = useAuth();
// ❌ Tentando acessar: user?.session?.access_token
```

### **Estrutura Correta:**
```typescript
const { user, session } = useAuth();
// ✅ Acessar: session?.access_token
```

---

## ✅ **CORREÇÕES IMPLEMENTADAS**

### **1. TaxInvoicing.tsx - Obter Session do Contexto**

**Antes:**
```typescript
const { user } = useAuth();
```

**Depois:**
```typescript
const { user, session } = useAuth();
```

### **2. TaxInvoicing.tsx - Passar Token Correto para SignXmlDialog**

**Antes:**
```typescript
<SignXmlDialog
  ...
  accessToken={user?.session?.access_token || ''}
/>
```

**Depois:**
```typescript
<SignXmlDialog
  ...
  accessToken={session?.access_token || ''}
/>
```

### **3. SignXmlDialog.tsx - Fallback para Obter Session**

**Adicionado:**
```typescript
import { supabase } from '../utils/supabase/client';

const handleSignXml = async () => {
  // ...
  
  // Buscar token de acesso (fallback se não foi passado via prop)
  let token = accessToken;
  if (!token) {
    console.log('⚠️ Token não fornecido via prop, buscando da sessão...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Sessão expirada. Faça login novamente.');
      setStage(SigningStage.ERROR);
      setError('Sessão expirada. Faça login novamente.');
      return;
    }
    token = session.access_token;
  }

  console.log('🔑 Token obtido:', token ? 'SIM' : 'NÃO');
  
  // Usar token na requisição
  const response = await fetch(..., {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

### **4. TaxInvoicing.tsx - Log de Debug**

**Adicionado:**
```typescript
toast.success(`XML gerado com sucesso!`, {
  action: {
    label: 'Assinar',
    onClick: () => {
      console.log('🔐 Abrindo diálogo. Token disponível:', session?.access_token ? 'SIM' : 'NÃO');
      setIsSignDialogOpen(true);
    }
  }
});
```

---

## 📝 **ARQUIVOS MODIFICADOS**

| Arquivo | Alterações |
|---------|------------|
| `/components/TaxInvoicing.tsx` | ✅ Obter `session` do contexto<br>✅ Passar `session.access_token`<br>✅ Log de debug |
| `/components/SignXmlDialog.tsx` | ✅ Import `supabase`<br>✅ Fallback para obter token<br>✅ Logs de debug |

---

## 🧪 **COMO TESTAR**

### **1. Verificar Console Logs:**

Após gerar XML e clicar em "Assinar":
```
🔐 Abrindo diálogo de assinatura. Token disponível: SIM
📝 Preparando assinatura...
🔑 Token obtido: SIM
🔐 Enviando para assinatura...
```

### **2. Verificar Network Tab:**

Request Headers devem conter:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **3. Verificar Response:**

**Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "xmlAssinado": "<?xml version=\"1.0\"...",
    "tamanho": 12345
  },
  "message": "XML assinado com sucesso"
}
```

**Erro (se token ainda estiver vazio):**
```json
{
  "success": false,
  "error": "Token de autenticação não fornecido"
}
```

---

## 🔍 **DIAGNÓSTICO ADICIONAL**

Se o erro **AINDA PERSISTIR** após as correções:

### **1. Verificar AuthContext:**

```typescript
// Em /contexts/AuthContext.tsx
console.log('[AuthContext] Session:', session);
console.log('[AuthContext] Access Token:', session?.access_token);
```

### **2. Verificar se está usando MOCK_SESSION:**

Se `FEATURES.ENABLE_AUTH === false`, o sistema usa:
```typescript
const MOCK_SESSION = {
  access_token: 'dev-token-123',
  user: MOCK_USER,
} as Session;
```

O backend deve aceitar `dev-token-123` em desenvolvimento.

### **3. Verificar Backend (routes.ts):**

Endpoint `/fiscal/nfe/assinar-xml` deve validar token:
```typescript
const authHeader = c.req.header('Authorization');
if (!authHeader) {
  return c.json({ 
    success: false, 
    error: 'Token de autenticação não fornecido' 
  }, 401);
}

const token = authHeader.replace('Bearer ', '');
// Validar token com Supabase...
```

---

## 🎯 **RESULTADO ESPERADO**

Após as correções:
1. ✅ Token JWT é obtido do `session` do contexto
2. ✅ Token é passado para `SignXmlDialog`
3. ✅ Fallback busca token se não foi passado
4. ✅ Request inclui `Authorization: Bearer {token}`
5. ✅ Backend valida token com sucesso
6. ✅ XML é assinado e retornado (200 OK)

---

## 📊 **FLUXO CORRETO DE AUTENTICAÇÃO**

```
1. Usuário faz login
   ↓
2. Supabase Auth cria Session com access_token
   ↓
3. AuthContext armazena session
   ↓
4. TaxInvoicing obtém session do contexto
   ↓
5. TaxInvoicing passa session.access_token para SignXmlDialog
   ↓
6. SignXmlDialog usa token na requisição
   ↓
7. Backend valida token com Supabase
   ↓
8. Backend processa assinatura
   ↓
9. Retorna XML assinado (200 OK)
```

---

## 🚀 **COMANDOS GIT**

```bash
# Adicionar arquivos modificados
git add components/TaxInvoicing.tsx
git add components/SignXmlDialog.tsx
git add docs/CORRECAO-TOKEN-AUTH.md

# Commit
git commit -m "fix(fiscal): Corrigir erro 401 ao assinar XML NF-e

- Obter session corretamente do AuthContext
- Passar session.access_token para SignXmlDialog (não user.session)
- Adicionar fallback para buscar token se não fornecido via prop
- Adicionar logs de debug para diagnóstico
- Corrigir estrutura de acesso ao token JWT

Erro corrigido: 401 Unauthorized ao chamar /fiscal/nfe/assinar-xml

Arquivos:
- components/TaxInvoicing.tsx (session do contexto)
- components/SignXmlDialog.tsx (fallback + logs)
- docs/CORRECAO-TOKEN-AUTH.md (documentação)

Status: Pronto para testes"

# Push
git push origin main
```

---

## ✅ **CHECKLIST DE VERIFICAÇÃO**

Antes de testar:

- [ ] `TaxInvoicing.tsx` obtém `session` do contexto
- [ ] `SignXmlDialog` recebe `session.access_token`
- [ ] `SignXmlDialog` tem fallback para buscar token
- [ ] Logs de debug adicionados
- [ ] Arquivos commitados
- [ ] Deploy realizado (2-3 min)

Durante o teste:

- [ ] Console mostra "Token disponível: SIM"
- [ ] Console mostra "Token obtido: SIM"
- [ ] Network tab mostra header Authorization
- [ ] Response é 200 OK (não 401)
- [ ] XML assinado é baixado com sucesso

---

**Se o erro persistir após essas correções, pode ser problema no backend (validação do token). Nesse caso, vamos verificar o arquivo `/supabase/functions/server/fiscal/routes.ts`.**
