# 🚀 Deploy Final - Assinatura Digital V1 (Corrigida)

---

## ✅ **SOLUÇÃO IMPLEMENTADA**

Voltamos para **nfe-signature.tsx (V1)** com todas as correções aplicadas e timestamp forçado para quebrar cache do Supabase.

---

## 📝 **ARQUIVOS MODIFICADOS**

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `/supabase/functions/server/nfe-signature.tsx` | ✅ V1 corrigido + timestamp | **ATIVO** |
| `/supabase/functions/server/fiscal/routes.ts` | ✅ Usar V1 (não V2) | **ATIVO** |
| `/supabase/functions/server/nfe-signature-v2.tsx` | ⏸️ V2 em standby | Backup |
| `/components/TaxInvoicing.tsx` | ✅ Token de session | **ATIVO** |
| `/components/SignXmlDialog.tsx` | ✅ Fallback de token | **ATIVO** |

---

## 🔧 **CORREÇÕES APLICADAS**

### **1. Token de Autenticação (401)**
```typescript
// TaxInvoicing.tsx & SignXmlDialog.tsx
const token = session?.access_token;
```

### **2. digestAlgorithm (400)**
```typescript
// nfe-signature.tsx (V1)
signature.addReference({
  xpath: `//*[@Id='${infNFeId}']`,
  digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',  // ✅
  transforms: [...]
});
```

### **3. Cache do Supabase**
```typescript
// nfe-signature.tsx - Header com timestamp
/**
 * FORCE REDEPLOY: 2025-11-24 00:03:00 GMT
 */
```

---

## 🚀 **COMANDOS GIT**

```bash
# Adicionar todos os arquivos modificados
git add supabase/functions/server/nfe-signature.tsx \
        supabase/functions/server/nfe-signature-v2.tsx \
        supabase/functions/server/fiscal/routes.ts \
        components/TaxInvoicing.tsx \
        components/SignXmlDialog.tsx \
        docs/CORRECAO-TOKEN-AUTH.md \
        docs/CORRECAO-DIGEST-ALGORITHM.md \
        docs/CORRECAO-SYNTAX-ERROR.md \
        docs/ASSINATURA-V2-MANUAL.md \
        docs/FORCE-REDEPLOY.md \
        docs/DEPLOY-FINAL-V1.md

# Commit consolidado
git commit -m "fix(fiscal): Implementar assinatura digital XML-DSig + correções

CORREÇÕES IMPLEMENTADAS:
1. Token autenticação (401) - usar session.access_token
2. digestAlgorithm (400) - configurar no addReference
3. Syntax error V2 (500) - import correto
4. Cache Supabase - voltar V1 + timestamp forçado

ARQUIVOS PRINCIPAIS:
- nfe-signature.tsx (V1 corrigido + timestamp)
- fiscal/routes.ts (usar V1)
- TaxInvoicing.tsx (session token)
- SignXmlDialog.tsx (fallback token)
- nfe-signature-v2.tsx (backup para uso futuro)

ALGORITMOS CONFIGURADOS:
- Signature: RSA-SHA256
- Canonicalization: C14N
- Digest: SHA-256
- Transforms: Enveloped + C14N

PADRÃO: SEFAZ 4.0 XML-DSig
STATUS: Pronto para testes com certificado real

Documentação:
- CORRECAO-TOKEN-AUTH.md
- CORRECAO-DIGEST-ALGORITHM.md
- CORRECAO-SYNTAX-ERROR.md
- ASSINATURA-V2-MANUAL.md
- FORCE-REDEPLOY.md
- DEPLOY-FINAL-V1.md"

# Push
git push origin main
```

---

## 🧪 **TESTE APÓS DEPLOY**

### **⏰ 1. AGUARDAR 3-5 MINUTOS**

O Supabase Edge Functions demora para propagar globalmente.

---

### **🔍 2. VERIFICAR LOGS DO BACKEND**

**Acesse:** Supabase Dashboard → Functions → Logs

**Procure por:**
```
[FISCAL_ROUTES] POST /nfe/assinar-xml - Início
[FISCAL_ROUTES] Usuário autenticado: [user-id]
[FISCAL_ROUTES] XML recebido: 8765 bytes
[FISCAL_ROUTES] Certificado recebido
[FISCAL_ROUTES] Assinando XML com xml-crypto (V1 corrigido)...  ✅ ESTE LOG
🔐 Iniciando assinatura digital do XML...
📋 Tag encontrada: NFe23251...
✅ XML assinado com sucesso
[FISCAL_ROUTES] ✅ XML assinado com sucesso!
[FISCAL_ROUTES] Tamanho XML assinado: 12345 bytes
```

**⚠️ SE APARECER "V2"**, o cache ainda não limpou. Aguarde mais.

---

### **🖥️ 3. VERIFICAR LOGS DO FRONTEND (F12)**

```
🔐 Abrindo diálogo de assinatura. Token disponível: SIM
📝 Preparando assinatura...
🔑 Token obtido: SIM
🔐 Enviando para assinatura...
✅ Resposta da API: {success: true, data: {...}}
✅ XML assinado com sucesso!
```

---

### **🌐 4. VERIFICAR NETWORK TAB**

```
POST https://[project].supabase.co/functions/v1/make-server-686b5e88/fiscal/nfe/assinar-xml

Request Headers:
- Authorization: Bearer eyJ...
- Content-Type: application/json

Request Body:
{
  "xml": "<?xml version=\"1.0\"...",
  "certificadoPem": "-----BEGIN CERTIFICATE-----...",
  "chavePrivadaPem": "-----BEGIN PRIVATE KEY-----...",
  "nfeId": "uuid..."
}

Response: 200 OK ✅
{
  "success": true,
  "data": {
    "xmlAssinado": "<?xml version=\"1.0\"...<Signature>...</Signature>...",
    "tamanho": 12345
  },
  "message": "XML assinado com sucesso"
}
```

---

## ❌ **ERROS POSSÍVEIS**

| Erro | Status | Causa | Solução |
|------|--------|-------|---------|
| **Unauthorized** | 401 | Token inválido | Relogar no sistema |
| **digestAlgorithm required** | 400 | V1 antiga sem correção | Aguardar mais tempo (cache) |
| **line 24:18** | 500 | V2 antiga em cache | Aguardar mais tempo (cache) |
| **Invalid signature** | 400 | Certificado incorreto | Verificar PEM dos certificados |
| **Tag infNFe not found** | 400 | XML malformado | Regenerar XML |

---

## ✅ **SUCESSO ESPERADO**

### **Console Backend:**
```
✅ XML assinado com sucesso
```

### **Console Frontend:**
```
✅ Resposta da API: {success: true, ...}
✅ XML assinado com sucesso!
```

### **Network:**
```
Status: 200 OK
Response: {success: true, data: {xmlAssinado: "...", tamanho: 12345}}
```

### **XML Baixado:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe23251...">
    <!-- Dados da NF-e -->
  </infNFe>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">  ✅ TAG PRESENTE
    <SignedInfo>...</SignedInfo>
    <SignatureValue>...</SignatureValue>
    <KeyInfo>...</KeyInfo>
  </Signature>
</NFe>
```

---

## 📊 **RESUMO COMPLETO**

| # | Problema | Solução | Arquivo | Status |
|---|----------|---------|---------|--------|
| 1️⃣ | 401 Unauthorized | session.access_token | TaxInvoicing.tsx | ✅ |
| 2️⃣ | 401 Unauthorized | Fallback getSession | SignXmlDialog.tsx | ✅ |
| 3️⃣ | 400 digestAlgorithm | addReference({...}) | nfe-signature.tsx | ✅ |
| 4️⃣ | 400 digestAlgorithm | signatureAlgorithm config | nfe-signature.tsx | ✅ |
| 5️⃣ | 500 Syntax V2 | import createHash | nfe-signature-v2.tsx | ✅ |
| 6️⃣ | Cache Supabase | Voltar V1 + timestamp | routes.ts + V1 | ✅ |

---

## 🎯 **CHECKLIST FINAL**

- [x] Correções de token implementadas
- [x] Correções de digestAlgorithm implementadas
- [x] V2 manual criado (backup)
- [x] V1 corrigido e ativo
- [x] Timestamp forçado para quebrar cache
- [x] Documentação completa
- [x] Commit criado
- [ ] Push para produção
- [ ] Aguardar 3-5 min deploy
- [ ] Testar assinatura com certificado real
- [ ] Verificar logs backend
- [ ] Verificar logs frontend
- [ ] Validar XML assinado

---

## 🔄 **PRÓXIMAS FASES**

Após a assinatura funcionar:

1. ✅ **Fase Atual:** Assinatura Digital XML-DSig
2. ⏳ **Próxima:** Validação XSD (Schema SEFAZ)
3. ⏳ **Futura:** Transmissão para SEFAZ (WebService SOAP)
4. ⏳ **Futura:** Consulta de status e protocolo
5. ⏳ **Futura:** Cancelamento e Carta de Correção

---

## 🆘 **SE AINDA FALHAR**

**Envie os seguintes logs:**

1. **Console F12 completo**
2. **Network Tab → Request/Response completo**
3. **Logs do Supabase Functions (Backend)**
4. **Certificados usados (SEM as chaves privadas, apenas info)**

---

**DEPLOY AGORA E TESTE! 🚀**

**Se funcionar: 🎉 Próxima fase: Validação XSD**  
**Se falhar: 🔧 Envie os logs e continuaremos debugando**
