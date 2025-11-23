# 🔧 Correção: Erro de Sintaxe (Unexpected reserved word)

---

## 🐛 **ERRO 500 Internal Server Error**

```
Unexpected reserved word at file:///var/tmp/sb-compile-edge-runtime/make-server-686b5e88/nfe-signature-v2.tsx:24:18
```

### **Causa:**
Usei `await import('node:crypto')` dentro de uma função que **NÃO era async**.

---

## ❌ **CÓDIGO INCORRETO**

### **Linha 42-47 (antes):**

```typescript
/**
 * Cria hash SHA-256 de um XML canonizado
 */
function criarDigest(xml: string): string {  // ❌ NÃO é async
  const crypto = await import('node:crypto');  // ❌ ERRO: await sem async
  const hash = crypto.createHash('sha256');
  hash.update(xml, 'utf8');
  return hash.digest('base64');
}
```

**Problema:** `await` só pode ser usado dentro de funções `async`.

---

## ✅ **CÓDIGO CORRIGIDO**

### **Solução: Import direto no topo do arquivo**

```typescript
// ✅ Importar no topo do arquivo
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';
import { createSign, createHash } from 'node:crypto';  // ✅ ADICIONADO createHash

/**
 * Cria hash SHA-256 de um XML canonizado
 */
function criarDigest(xml: string): string {  // ✅ Função síncrona OK
  const hash = createHash('sha256');  // ✅ Usa import direto
  hash.update(xml, 'utf8');
  return hash.digest('base64');
}
```

---

## 📝 **ARQUIVO MODIFICADO**

| Arquivo | Alteração |
|---------|-----------|
| `/supabase/functions/server/nfe-signature-v2.tsx` | ✅ Remover `await import()`<br>✅ Importar `createHash` no topo |

---

## 🔍 **IMPORTS CORRETOS**

### **Antes:**
```typescript
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';
import { createSign } from 'node:crypto';  // ❌ Faltava createHash

// ...

function criarDigest(xml: string): string {
  const crypto = await import('node:crypto');  // ❌ ERRO
  const hash = crypto.createHash('sha256');
  // ...
}
```

### **Depois:**
```typescript
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';
import { createSign, createHash } from 'node:crypto';  // ✅ Adicionado createHash

// ...

function criarDigest(xml: string): string {
  const hash = createHash('sha256');  // ✅ Usa import direto
  // ...
}
```

---

## 🚀 **DEPLOY**

```bash
# Adicionar arquivo corrigido
git add supabase/functions/server/nfe-signature-v2.tsx \
        docs/CORRECAO-SYNTAX-ERROR.md

# Commit
git commit -m "fix(fiscal): Corrigir erro de sintaxe no nfe-signature-v2

Erro: Unexpected reserved word (await sem async)

Correção:
- Importar createHash diretamente no topo
- Remover await import() da função criarDigest
- Função agora é síncrona (não precisa de async)

Erro corrigido: 500 Internal Server Error
Status: Pronto para testes"

# Push
git push origin main
```

---

## 🧪 **TESTE ESPERADO**

Após o deploy:

### **1. Console Backend (Supabase Functions):**
```
[FISCAL_ROUTES] POST /nfe/assinar-xml - Início
[FISCAL_ROUTES] Usuário autenticado: dev-user-123
[FISCAL_ROUTES] XML recebido: 8765 bytes
[FISCAL_ROUTES] Certificado recebido
[FISCAL_ROUTES] Assinando XML com implementação V2...
🔐 [V2] Iniciando assinatura manual...
📋 [V2] Tag encontrada: NFe23251158374727000119550010000000011260712676
📏 [V2] XML canonizado: 3456 bytes
🔢 [V2] Digest criado: 5aQ7p2Ym3kL9w...
✍️ [V2] Assinatura criada: kJ8mN3pQ2rR...
✅ [V2] XML assinado com sucesso!
📦 [V2] Tamanho final: 12345 bytes
[FISCAL_ROUTES] ✅ XML assinado com sucesso!
```

### **2. Console Frontend (F12):**
```
🔐 Abrindo diálogo de assinatura. Token disponível: SIM
📝 Preparando assinatura...
🔑 Token obtido: SIM
🔐 Enviando para assinatura...
✅ Resposta da API: {success: true, data: {...}}
✅ XML assinado com sucesso!
```

### **3. Network Tab:**
```
POST /fiscal/nfe/assinar-xml
Status: 200 OK ✅ (não 500)
```

---

## 📊 **RESUMO DE TODAS AS CORREÇÕES**

| # | Erro | Solução | Status |
|---|------|---------|--------|
| 1️⃣ | 401 Unauthorized | Token do AuthContext | ✅ Corrigido |
| 2️⃣ | 400 digestAlgorithm | Implementação V2 manual | ✅ Implementado |
| 3️⃣ | 500 Syntax Error | Remover await sem async | ✅ Corrigido |

---

## ✅ **CHECKLIST**

- [x] Erro de sintaxe corrigido
- [x] Imports corretos no topo
- [x] Função `criarDigest` síncrona
- [ ] Deploy para produção
- [ ] Testar assinatura com certificado real
- [ ] Verificar logs [V2] no backend
- [ ] Validar XML assinado

---

**Teste novamente após o deploy! Agora deve funcionar! 🚀**
