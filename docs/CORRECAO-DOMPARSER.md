# 🔧 Correção: DOMParser is not defined

---

## 🎉 **PROGRESSO!**

O erro mudou de **500 Syntax Error** para **400 DOMParser is not defined**.

Isso significa que:
- ✅ O cache do Supabase limpou
- ✅ O código V1 está rodando
- ❌ Faltava import do DOMParser/XMLSerializer

---

## 🐛 **ERRO 400 Bad Request**

```
DOMParser is not defined
```

### **Causa:**
Faltava importar `DOMParser` e `XMLSerializer` de `npm:xmldom@0.6.0`.

---

## ❌ **CÓDIGO INCORRETO**

```typescript
// ❌ Faltando imports
import { SignedXml } from 'npm:xml-crypto@6.0.0';

// ...

export function assinarXmlNFe(xmlString: string, certificado: CertificadoDigital) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');  // ❌ ERRO
  // ...
}
```

---

## ✅ **CÓDIGO CORRIGIDO**

```typescript
// ✅ Imports completos
import { SignedXml } from 'npm:xml-crypto@6.0.0';
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';  // ✅ ADICIONADO

// ...

export function assinarXmlNFe(xmlString: string, certificado: CertificadoDigital) {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');  // ✅ OK
  // ...
}
```

---

## 📝 **ARQUIVO MODIFICADO**

| Arquivo | Alteração | Timestamp |
|---------|-----------|-----------|
| `/supabase/functions/server/nfe-signature.tsx` | ✅ Adicionar import DOMParser/XMLSerializer | 2025-11-24 00:04:30 GMT |

---

## 📦 **IMPORTS NECESSÁRIOS (Deno)**

```typescript
// XML Signature
import { SignedXml } from 'npm:xml-crypto@6.0.0';

// XML Parsing (para Deno runtime)
import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0';

// Crypto (já importado em V2)
import { createSign, createHash } from 'node:crypto';
```

---

## 🚀 **DEPLOY**

```bash
# Adicionar arquivo corrigido
git add supabase/functions/server/nfe-signature.tsx \
        docs/CORRECAO-DOMPARSER.md

# Commit
git commit -m "fix(fiscal): Adicionar import DOMParser no nfe-signature

Erro: DOMParser is not defined (400)

Correção:
- Importar DOMParser e XMLSerializer de xmldom
- Necessário para Deno runtime
- Timestamp forçado: 2025-11-24 00:04:30 GMT

Progresso:
✅ 500 Syntax Error (resolvido)
✅ Cache Supabase (limpou)
✅ V1 rodando (confirmado)
➡️ 400 DOMParser (corrigido agora)

Status: Aguardando deploy para próximo teste"

# Push
git push origin main
```

---

## 🧪 **TESTE APÓS DEPLOY (2-3 MIN)**

### **Logs esperados:**

**Backend (Supabase Functions):**
```
[FISCAL_ROUTES] POST /nfe/assinar-xml - Início
[FISCAL_ROUTES] Assinando XML com xml-crypto (V1 corrigido)...
🔐 Iniciando assinatura digital do XML...
📋 Tag encontrada: NFe23251158374727000119550010000000011260712676
✅ XML assinado com sucesso
[FISCAL_ROUTES] ✅ XML assinado com sucesso!
```

**Frontend (F12):**
```
✅ Resposta da API: {success: true, data: {...}}
✅ XML assinado com sucesso!
```

**Network:**
```
POST /fiscal/nfe/assinar-xml
Status: 200 OK ✅ (não 400)
Response: {
  "success": true,
  "data": {
    "xmlAssinado": "<?xml version=\"1.0\"...<Signature>...</Signature>...",
    "tamanho": 12345
  }
}
```

---

## 📊 **PROGRESSO DAS CORREÇÕES**

| # | Erro | Status | Tempo |
|---|------|--------|-------|
| 1️⃣ | 401 Unauthorized | ✅ Corrigido | 00:00:00 |
| 2️⃣ | 400 digestAlgorithm | ✅ Corrigido | 00:00:15 |
| 3️⃣ | 500 Syntax Error | ✅ Corrigido | 00:01:30 |
| 4️⃣ | Cache Supabase | ✅ Resolvido | 00:03:00 |
| 5️⃣ | 400 DOMParser | ✅ Corrigido | 00:04:30 |
| ⏳ | Próximo erro? | ⏳ Aguardando | -- |

---

## ⚙️ **BIBLIOTECAS USADAS**

### **xml-crypto (v6.0.0)**
- Assinatura digital XML-DSig
- Canonização C14N
- Validação de assinaturas

### **xmldom (v0.6.0)**
- DOMParser (parse XML)
- XMLSerializer (serialize XML)
- Compatível com Deno runtime

### **node:crypto (built-in)**
- createSign (assinatura RSA)
- createHash (SHA-256)
- Algoritmos nativos

---

## 🎯 **PRÓXIMO ERRO POSSÍVEL**

Possíveis erros que podem aparecer:

### **1. xml-crypto interno**
```
digestAlgorithm is required
```
→ Pode ser problema interno da biblioteca

### **2. Chave privada inválida**
```
Invalid private key format
```
→ Verificar formato PEM do certificado

### **3. XPath não encontra elemento**
```
Tag <infNFe> não encontrada
```
→ Verificar estrutura do XML

### **4. Certificado inválido**
```
Invalid certificate format
```
→ Verificar base64 do certificado

---

## 🔄 **HISTÓRICO COMPLETO**

### **Erro 1: 401 Unauthorized**
- **Causa:** Token não estava sendo obtido do AuthContext
- **Solução:** `session?.access_token`
- **Arquivos:** TaxInvoicing.tsx, SignXmlDialog.tsx

### **Erro 2: 400 digestAlgorithm is required**
- **Causa:** xml-crypto não configurou `digestAlgorithm` automaticamente
- **Solução:** Configurar manualmente no `addReference`
- **Arquivos:** nfe-signature.tsx

### **Erro 3: 500 Unexpected reserved word (line 24:18)**
- **Causa:** `await import()` sem função `async`
- **Solução:** Import direto no topo do arquivo
- **Arquivos:** nfe-signature-v2.tsx

### **Erro 4: Cache Supabase**
- **Causa:** Edge Functions manteve código antigo
- **Solução:** Voltar para V1 + timestamp forçado
- **Arquivos:** fiscal/routes.ts, nfe-signature.tsx

### **Erro 5: 400 DOMParser is not defined**
- **Causa:** Faltava import para Deno runtime
- **Solução:** `import { DOMParser, XMLSerializer } from 'npm:xmldom@0.6.0'`
- **Arquivos:** nfe-signature.tsx

---

## ✅ **CHECKLIST ATUAL**

- [x] Token de autenticação (401)
- [x] digestAlgorithm configurado (400)
- [x] Syntax error V2 (500)
- [x] Cache Supabase (resolvido)
- [x] DOMParser importado (400)
- [x] Timestamp forçado (00:04:30)
- [ ] Deploy para produção
- [ ] Aguardar 3 minutos propagação
- [ ] Testar assinatura
- [ ] Verificar logs [200 OK]
- [ ] Validar XML assinado

---

**AGUARDE O DEPLOY E TESTE NOVAMENTE! 🚀**

**Estamos muito perto! Cada erro novo é progresso!** 💪
