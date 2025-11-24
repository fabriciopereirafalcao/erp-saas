# 🔄 Forçar Redeploy Limpo no Supabase

---

## ⚠️ **PROBLEMA DE CACHE**

O Supabase Edge Functions está usando **código antigo em cache**, mesmo após correções.

### **Sintoma:**
```
Unexpected reserved word at line 24:18
```
Erro persiste mesmo após correção no arquivo.

---

## 🔧 **SOLUÇÕES**

### **1️⃣ SOLUÇÃO RÁPIDA: Voltar para V1**

✅ **JÁ IMPLEMENTADO** - Voltamos para `nfe-signature.tsx` (V1 corrigido)

| Arquivo | Status |
|---------|--------|
| `/supabase/functions/server/fiscal/routes.ts` | ✅ Usando `nfe-signature.tsx` (V1) |
| `/supabase/functions/server/nfe-signature.tsx` | ✅ V1 corrigido com `digestAlgorithm` |
| `/supabase/functions/server/nfe-signature-v2.tsx` | ⏸️ V2 em standby (sem cache) |

---

### **2️⃣ FORÇAR REDEPLOY LIMPO**

Algumas opções para limpar o cache:

#### **Opção A: Adicionar comentário para mudar hash do arquivo**
```typescript
// FORCE REDEPLOY - 2025-11-24 00:02:51
```

#### **Opção B: Reiniciar Edge Functions no Dashboard**
1. Ir para: **Supabase Dashboard → Edge Functions**
2. Clicar em **"Restart"** ou **"Redeploy"**

#### **Opção C: Aguardar propagação automática**
- Edge Functions podem demorar 2-5 minutos para propagar
- O cache pode estar no CDN global

---

## 📝 **CÓDIGO ATUAL (V1 CORRIGIDO)**

### **nfe-signature.tsx:**

```typescript
// 5. Adicionar referência ao elemento a ser assinado
signature.addReference({
  xpath: `//*[@Id='${infNFeId}']`,
  digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',  // ✅
  transforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
  ]
});
```

### **fiscal/routes.ts:**

```typescript
// 3. Importar módulo de assinatura (V1 com correções)
const { assinarXmlSimplificado, pemParaBase64 } = await import('../nfe-signature.tsx');

console.log('[FISCAL_ROUTES] Assinando XML com xml-crypto (V1 corrigido)...');

// 5. Assinar XML
const resultado = assinarXmlSimplificado(
  xml,
  chavePrivadaPem,
  certificadoBase64
);
```

---

## 🚀 **DEPLOY ATUAL**

```bash
# Adicionar arquivos
git add supabase/functions/server/fiscal/routes.ts \
        supabase/functions/server/nfe-signature-v2.tsx \
        docs/FORCE-REDEPLOY.md \
        docs/CORRECAO-SYNTAX-ERROR.md \
        docs/ASSINATURA-V2-MANUAL.md

# Commit
git commit -m "fix(fiscal): Voltar para nfe-signature V1 (corrigido)

Problema: Cache do Supabase Edge Functions mantém V2 com erro

Solução temporária:
- Voltar para nfe-signature.tsx (V1 com digestAlgorithm)
- Manter nfe-signature-v2.tsx para uso futuro
- V1 já tem correções necessárias

Arquivos:
- fiscal/routes.ts (usar V1)
- nfe-signature-v2.tsx (standby)
- FORCE-REDEPLOY.md (docs)

Status: Aguardando propagação do deploy"

# Push
git push origin main
```

---

## 🧪 **TESTE APÓS DEPLOY**

### **1. Aguardar 3-5 minutos para propagação**

### **2. Verificar logs do backend:**

Procure por:
```
[FISCAL_ROUTES] Assinando XML com xml-crypto (V1 corrigido)...
```

**Se aparecer "V2"**, o cache ainda não limpou.  
**Se aparecer "V1"**, o novo código está rodando.

### **3. Teste completo:**
1. Gerar XML de NF-e
2. Clicar em "Assinar"
3. Upload certificados PEM
4. Clicar em "Assinar XML Digitalmente"

### **4. Erros possíveis:**

| Erro | Significado |
|------|-------------|
| ❌ 500 + "line 24:18" | Cache ainda está ativo (V2 antiga) |
| ❌ 400 + "digestAlgorithm" | V1 antiga sem correção |
| ✅ 200 OK | Funcionou! |
| ❌ Outro erro de assinatura | xml-crypto tem outro problema |

---

## 🔬 **SE AINDA DER ERRO**

### **Cenário 1: Erro "digestAlgorithm is required"**

Significa que está usando V1 antiga. **Aguardar mais tempo** ou tentar:
- Limpar cache do navegador
- Usar aba anônima
- Aguardar 10 minutos

### **Cenário 2: Erro "line 24:18"**

Significa que está usando V2 antiga. **Cache do Supabase ainda ativo**.

**Solução:**
1. Adicionar comentário forçando mudança de hash
2. Fazer novo deploy
3. Aguardar

### **Cenário 3: Novo erro diferente**

Enviar logs completos para investigar.

---

## 🎯 **PRÓXIMOS PASSOS**

1. ⏳ **Aguardar 3-5 minutos**
2. 🧪 **Testar assinatura**
3. 📊 **Verificar logs (F12 + Supabase Dashboard)**
4. ✅ **Se funcionar:** Prosseguir para validação XSD
5. ❌ **Se falhar:** Enviar logs completos

---

## 📚 **HISTÓRICO DE CORREÇÕES**

| # | Erro | Arquivo | Status |
|---|------|---------|--------|
| 1️⃣ | 401 Unauthorized | TaxInvoicing.tsx, SignXmlDialog.tsx | ✅ |
| 2️⃣ | 400 digestAlgorithm | nfe-signature.tsx | ✅ |
| 3️⃣ | 500 Syntax V2 | nfe-signature-v2.tsx | ✅ |
| 4️⃣ | Cache Supabase | routes.ts (voltar V1) | ✅ |

---

**Aguarde o deploy e teste! Se o cache limpar, a V1 corrigida deve funcionar.** 🚀

**Se persistir, podemos:**
- Adicionar timestamp forçado
- Renomear arquivo (quebra cache)
- Usar abordagem diferente
