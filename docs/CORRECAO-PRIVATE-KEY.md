# 🔧 Correção: Private key is required to compute signature

---

## 🎉 **PROGRESSO EXCELENTE!**

Mudou de **400 DOMParser** para **400 Private key required**.

Isso significa:
- ✅ DOMParser funcionando
- ✅ V1 executando completamente
- ✅ xml-crypto carregado
- ❌ Chave privada não está sendo aceita/configurada

---

## 🐛 **ERRO 400 Bad Request**

```
Private key is required to compute signature
```

### **Causa Possível:**
1. Chave privada vazia
2. Chave privada em formato incorreto
3. xml-crypto não aceita o formato da chave
4. Chave não está sendo configurada antes de `computeSignature`

---

## 🔍 **LOGS ADICIONADOS PARA DEBUG**

### **Backend (routes.ts):**
```typescript
console.log('[FISCAL_ROUTES] Chave privada recebida:', chavePrivadaPem ? 'SIM' : 'NÃO');
console.log('[FISCAL_ROUTES] Tamanho chave privada:', chavePrivadaPem?.length || 0, 'bytes');
console.log('[FISCAL_ROUTES] Primeiros 50 chars da chave:', chavePrivadaPem?.substring(0, 50) || 'VAZIO');

// Validar que a chave não está vazia
if (!chavePrivadaPem || chavePrivadaPem.trim().length === 0) {
  return c.json({
    success: false,
    error: 'Chave privada está vazia ou inválida'
  }, 400);
}
```

### **Backend (nfe-signature.tsx):**
```typescript
// Configurar chave privada PRIMEIRO (antes de addReference)
signature.signingKey = certificado.chavePrivadaPem;

signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
signature.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

console.log('🔑 Chave privada configurada');
console.log('📏 Tamanho da chave:', certificado.chavePrivadaPem.length, 'bytes');
```

---

## 📝 **ARQUIVOS MODIFICADOS**

| Arquivo | Alteração | Timestamp |
|---------|-----------|-----------|
| `/supabase/functions/server/nfe-signature.tsx` | ✅ Logs + reordenação | 2025-11-24 00:06:00 GMT |
| `/supabase/functions/server/fiscal/routes.ts` | ✅ Logs + validação | Atual |

---

## 🚀 **DEPLOY**

```bash
# Adicionar arquivos
git add supabase/functions/server/nfe-signature.tsx \
        supabase/functions/server/fiscal/routes.ts \
        docs/CORRECAO-PRIVATE-KEY.md

# Commit
git commit -m "fix(fiscal): Adicionar logs para debug da chave privada

Erro: Private key is required to compute signature

Mudanças:
- Logs detalhados no routes.ts (tamanho, primeiros 50 chars)
- Validação de chave vazia
- Logs no nfe-signature.tsx (confirmação de configuração)
- Chave privada configurada antes de addReference
- Timestamp: 2025-11-24 00:06:00 GMT

Progresso:
✅ DOMParser funcionando
✅ V1 executando completamente
❌ Chave privada - investigando

Próximo passo: Verificar logs para identificar problema"

# Push
git push origin main
```

---

## 🧪 **TESTE APÓS DEPLOY (2-3 MIN)**

### **1. Aguardar propagação**

### **2. Verificar LOGS DO BACKEND (Supabase Functions Dashboard)**

Procure por:
```
[FISCAL_ROUTES] Chave privada recebida: SIM/NÃO
[FISCAL_ROUTES] Tamanho chave privada: XXXX bytes
[FISCAL_ROUTES] Primeiros 50 chars da chave: -----BEGIN PRIVATE KEY-----...
🔑 Chave privada configurada
📏 Tamanho da chave: XXXX bytes
```

**IMPORTANTE:** Envie estes logs! Eles vão revelar o problema.

---

## 🔎 **CENÁRIOS POSSÍVEIS**

### **Cenário 1: Chave vazia**
```
[FISCAL_ROUTES] Chave privada recebida: NÃO
[FISCAL_ROUTES] Tamanho chave privada: 0 bytes
```
**Problema:** Frontend não está enviando a chave.  
**Solução:** Verificar `SignXmlDialog.tsx`.

### **Cenário 2: Chave sem header PEM**
```
[FISCAL_ROUTES] Primeiros 50 chars da chave: MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAo...
```
**Problema:** Falta `-----BEGIN PRIVATE KEY-----`.  
**Solução:** Adicionar header.

### **Cenário 3: Chave com formato incorreto**
```
[FISCAL_ROUTES] Primeiros 50 chars da chave: -----BEGIN RSA PRIVATE KEY-----...
```
**Problema:** xml-crypto espera `-----BEGIN PRIVATE KEY-----` (PKCS#8).  
**Solução:** Converter formato.

### **Cenário 4: Chave está OK mas xml-crypto não aceita**
```
🔑 Chave privada configurada
📏 Tamanho da chave: 1675 bytes
❌ Erro ao assinar XML: Private key is required...
```
**Problema:** xml-crypto tem bug ou espera formato diferente.  
**Solução:** Usar V2 manual (node:crypto direto).

---

## 📊 **PROGRESSO DAS CORREÇÕES**

| # | Erro | Status | Tempo |
|---|------|--------|-------|
| 1️⃣ | 401 Unauthorized | ✅ | Token corrigido |
| 2️⃣ | 400 digestAlgorithm | ✅ | addReference config |
| 3️⃣ | 500 Syntax Error V2 | ✅ | Import direto |
| 4️⃣ | Cache Supabase | ✅ | V1 + timestamp |
| 5️⃣ | 400 DOMParser | ✅ | Import xmldom |
| 6️⃣ | 400 Private key | 🔍 | Investigando com logs |

---

## ⏭️ **PRÓXIMOS PASSOS**

1. **Fazer deploy**
2. **Aguardar 2-3 minutos**
3. **Testar assinatura novamente**
4. **COPIAR os logs do backend (Supabase Dashboard → Functions → Logs)**
5. **Enviar logs completos**

---

## 📋 **LOGS ESPERADOS (EXEMPLO)**

### **Se funcionar:**
```
[FISCAL_ROUTES] Chave privada recebida: SIM
[FISCAL_ROUTES] Tamanho chave privada: 1675 bytes
[FISCAL_ROUTES] Primeiros 50 chars da chave: -----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG...
🔑 Chave privada configurada
📏 Tamanho da chave: 1675 bytes
✅ XML assinado com sucesso
```

### **Se falhar:**
```
[FISCAL_ROUTES] Chave privada recebida: SIM
[FISCAL_ROUTES] Tamanho chave privada: 1675 bytes
[FISCAL_ROUTES] Primeiros 50 chars da chave: -----BEGIN PRIVATE KEY-----...
🔑 Chave privada configurada
📏 Tamanho da chave: 1675 bytes
❌ Erro ao assinar XML: Private key is required to compute signature
```

---

## 💡 **IMPORTANTE**

**NÃO se preocupe com segurança dos logs!**  
Apenas os primeiros 50 caracteres são logados (não expõe a chave).

---

## 🔄 **SE OS LOGS MOSTRAREM QUE A CHAVE ESTÁ VAZIA**

Vou verificar o `SignXmlDialog.tsx` para ver se está enviando corretamente.

## 🔄 **SE OS LOGS MOSTRAREM QUE A CHAVE ESTÁ OK**

Significa que é problema do xml-crypto. Nesse caso:
- Voltar para V2 (node:crypto direto)
- Ou tentar formato diferente da chave

---

**FAÇA O DEPLOY E ME ENVIE OS LOGS DO BACKEND! 🚀**

**Os logs vão revelar o problema exato!** 🔍
