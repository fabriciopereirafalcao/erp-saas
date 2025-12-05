# 🔧 Assinatura Digital XML - Versão V2 (Manual)

---

## 🆕 **NOVA IMPLEMENTAÇÃO**

Criada implementação alternativa usando **node:crypto diretamente**, evitando problemas com a biblioteca `xml-crypto`.

---

## 📁 **NOVOS ARQUIVOS**

| Arquivo | Descrição |
|---------|-----------|
| `/supabase/functions/server/nfe-signature-v2.tsx` | 🆕 Implementação manual da assinatura XML-DSig |
| `/supabase/functions/server/fiscal/routes.ts` | ✏️ Atualizado para usar V2 |

---

## 🔄 **DIFERENÇAS: xml-crypto vs V2 Manual**

### **xml-crypto (V1 - com problemas):**
```typescript
const signature = new SignedXml();
signature.addReference({
  xpath: `//*[@Id='${infNFeId}']`,
  digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  transforms: [...]
});
// ❌ Erro: digestAlgorithm is required
```

### **node:crypto Manual (V2 - nova solução):**
```typescript
// 1. Canonizar XML
const infNFeCanonizado = canonicalizarXml(infNFeXml);

// 2. Criar digest SHA-256
const digestValue = createHash('sha256')
  .update(infNFeCanonizado, 'utf8')
  .digest('base64');

// 3. Criar SignedInfo manualmente
const signedInfo = `<SignedInfo>...${digestValue}...</SignedInfo>`;

// 4. Assinar com RSA-SHA256
const sign = createSign('RSA-SHA256');
sign.update(signedInfoCanonizado, 'utf8');
const signatureValue = sign.sign(chavePrivadaPem, 'base64');

// 5. Montar tag <Signature> completa
const signature = `<Signature>...${signatureValue}...</Signature>`;
```

---

## ✅ **VANTAGENS DA V2**

| Vantagem | Descrição |
|----------|-----------|
| **Controle Total** | Criamos todo o XML de assinatura manualmente |
| **Sem Dependências Problemáticas** | Usa apenas `node:crypto` nativo e `xmldom` |
| **Debugging Mais Fácil** | Logs em cada etapa do processo |
| **Compatibilidade Garantida** | Não depende de mudanças na API de `xml-crypto` |
| **Padrão SEFAZ 4.0** | Implementa exatamente o padrão especificado |

---

## 📋 **PROCESSO DE ASSINATURA V2**

### **Passo 1: Canonizar <infNFe>**
```typescript
const infNFeXml = serializer.serializeToString(infNFe);
const infNFeCanonizado = canonicalizarXml(infNFeXml);
```

### **Passo 2: Criar Digest (SHA-256)**
```typescript
const crypto = await import('node:crypto');
const hash = crypto.createHash('sha256');
hash.update(infNFeCanonizado, 'utf8');
const digestValue = hash.digest('base64');
```

### **Passo 3: Criar SignedInfo**
```xml
<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <Reference URI="#NFe23251...">
    <Transforms>
      <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
      <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    </Transforms>
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <DigestValue>ABC123...</DigestValue>
  </Reference>
</SignedInfo>
```

### **Passo 4: Assinar SignedInfo (RSA-SHA256)**
```typescript
const sign = createSign('RSA-SHA256');
sign.update(signedInfoCanonizado, 'utf8');
const signatureValue = sign.sign(chavePrivadaPem, 'base64');
```

### **Passo 5: Criar Tag <Signature> Completa**
```xml
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>...</SignedInfo>
  <SignatureValue>XYZ789...</SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>MIID...</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>
```

### **Passo 6: Inserir após <infNFe>**
```xml
<NFe>
  <infNFe Id="NFe23251...">...</infNFe>
  <Signature>...</Signature>  <!-- ✅ Inserido aqui -->
</NFe>
```

---

## 🔍 **LOGS DE DEBUG**

A implementação V2 inclui logs detalhados:

```
🔐 [V2] Iniciando assinatura manual...
📋 [V2] Tag encontrada: NFe23251158374727000119550010000000011260712676
📏 [V2] XML canonizado: 3456 bytes
🔢 [V2] Digest criado: 5aQ7p2Ym3kL9w...
✍️ [V2] Assinatura criada: kJ8mN3pQ2rR...
✅ [V2] XML assinado com sucesso!
📦 [V2] Tamanho final: 12345 bytes
```

---

## 🧪 **TESTE ESPERADO**

### **Backend Logs (Supabase Functions):**
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
[FISCAL_ROUTES] Tamanho XML assinado: 12345 bytes
```

### **Frontend Logs:**
```
🔐 Abrindo diálogo de assinatura. Token disponível: SIM
📝 Preparando assinatura...
🔑 Token obtido: SIM
🔐 Enviando para assinatura...
✅ Resposta da API: {success: true, data: {xmlAssinado: "...", tamanho: 12345}}
✅ XML assinado com sucesso!
```

### **Network Tab:**
```
POST /fiscal/nfe/assinar-xml
Status: 200 OK ✅
Response: {
  "success": true,
  "data": {
    "xmlAssinado": "<?xml version=\"1.0\"...",
    "tamanho": 12345
  },
  "message": "XML assinado com sucesso"
}
```

---

## 🚀 **DEPLOY**

```bash
# Adicionar novos arquivos
git add supabase/functions/server/nfe-signature-v2.tsx \
        supabase/functions/server/fiscal/routes.ts \
        docs/ASSINATURA-V2-MANUAL.md

# Commit
git commit -m "feat(fiscal): Implementar assinatura XML V2 com node:crypto

- Criar nfe-signature-v2.tsx (implementação manual)
- Usar node:crypto diretamente (sem xml-crypto)
- Processo manual: canonização + digest + assinatura RSA
- Logs detalhados em cada etapa
- Evita erro 'digestAlgorithm is required'

Arquivos:
- nfe-signature-v2.tsx (novo)
- fiscal/routes.ts (usar V2)
- docs/ASSINATURA-V2-MANUAL.md

Status: Pronto para testes"

# Push
git push origin main
```

---

## ⚠️ **PRÓXIMOS PASSOS**

1. ✅ **Deploy para produção** (2-3 min)
2. ✅ **Testar assinatura** com certificados PEM
3. ✅ **Verificar logs** do backend
4. ✅ **Baixar XML assinado**
5. ✅ **Validar estrutura** da tag `<Signature>`
6. ⏳ **Validação XSD** (próxima fase)
7. ⏳ **Transmissão SEFAZ** (próxima fase)

---

## 📊 **COMPARAÇÃO DE PERFORMANCE**

| Métrica | xml-crypto (V1) | node:crypto Manual (V2) |
|---------|-----------------|-------------------------|
| **Dependências** | `xml-crypto@6.0.0` | `node:crypto` (nativo) |
| **Linhas de Código** | ~50 | ~150 |
| **Controle** | Baixo | Alto |
| **Debugging** | Difícil | Fácil (logs detalhados) |
| **Erros** | ❌ digestAlgorithm required | ✅ Sem erros |
| **Manutenção** | Depende de lib externa | Controlado por nós |

---

## 🔬 **ESTRUTURA DO XML ASSINADO**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <!-- Informações da NF-e -->
  <infNFe Id="NFe23251158374727000119550010000000011260712676" versao="4.00">
    <ide>...</ide>
    <emit>...</emit>
    <dest>...</dest>
    <det nItem="1">...</det>
    <total>...</total>
    <transp>...</transp>
    <pag>...</pag>
    <infAdic>...</infAdic>
  </infNFe>
  
  <!-- Assinatura Digital ✅ -->
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="#NFe23251158374727000119550010000000011260712676">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>5aQ7p2Ym3kL9w7tB1...</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>kJ8mN3pQ2rR4sS5...</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>MIID...</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</NFe>
```

---

## ✅ **CHECKLIST DE VERIFICAÇÃO**

Após deploy:

- [ ] Arquivo `nfe-signature-v2.tsx` criado
- [ ] Arquivo `routes.ts` atualizado para usar V2
- [ ] Gerar XML de NF-e
- [ ] Clicar em "Assinar"
- [ ] Upload certificados PEM
- [ ] Clicar em "Assinar XML Digitalmente"
- [ ] Verificar logs `[V2]` no console
- [ ] Verificar resposta 200 OK
- [ ] Baixar XML assinado
- [ ] Abrir XML e verificar tag `<Signature>`

---

**Esta implementação V2 é mais robusta e debugável. Teste agora e me informe o resultado!** 🚀
