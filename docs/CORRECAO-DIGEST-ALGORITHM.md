# 🔧 Correção: Erro "digestAlgorithm is required"

---

## 🐛 **PROBLEMA**

### **Erro 400 Bad Request:**
```
{
  success: false,
  error: 'Erro ao assinar XML',
  details: 'digestAlgorithm is required'
}
```

### **Causa Raiz:**
A biblioteca `xml-crypto@6.0.0` espera que o método `addReference()` receba um **objeto de configuração** com a propriedade `digestAlgorithm`, não parâmetros separados.

---

## ❌ **CÓDIGO INCORRETO**

### **Antes (nfe-signature.tsx):**

```typescript
// ❌ Sintaxe antiga - parâmetros separados
signature.addReference(
  `#${infNFeId}`,                              // URI
  [                                            // Transforms (array)
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
  ],
  'http://www.w3.org/2001/04/xmlenc#sha256'   // Digest Algorithm
);
```

**Problema:** A biblioteca `xml-crypto@6.0.0` mudou a API e agora requer um objeto.

---

## ✅ **CÓDIGO CORRIGIDO**

### **Depois (nfe-signature.tsx):**

```typescript
// ✅ Sintaxe nova - objeto de configuração
signature.addReference({
  xpath: `//*[@Id='${infNFeId}']`,              // XPath do elemento
  digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',  // ✅ OBRIGATÓRIO
  transforms: [                                 // Transformações
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
  ]
});
```

---

## 🔧 **CORREÇÕES ADICIONAIS**

### **1. Configurar algoritmos de assinatura:**

**Adicionado:**
```typescript
// 3. Criar objeto de assinatura
const signature = new SignedXml();

// 4. Configurar chave privada
signature.signingKey = certificado.chavePrivadaPem;

// 4.1. Configurar algoritmos conforme SEFAZ 4.0 ✅ NOVO
signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
signature.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
```

---

## 📝 **ARQUIVO MODIFICADO**

| Arquivo | Alterações |
|---------|------------|
| `/supabase/functions/server/nfe-signature.tsx` | ✅ `addReference()` com objeto<br>✅ `digestAlgorithm` obrigatório<br>✅ `signatureAlgorithm` configurado<br>✅ `canonicalizationAlgorithm` configurado |

---

## 🎯 **PADRÃO XML-DSIG**

### **Estrutura da Assinatura SEFAZ 4.0:**

```xml
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <!-- Algoritmo de Canonização -->
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    
    <!-- Algoritmo de Assinatura (RSA-SHA256) -->
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
    
    <!-- Referência ao elemento assinado -->
    <Reference URI="#NFe23251158374727000119550010000000011260712676">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      
      <!-- Algoritmo de Digest (SHA-256) ✅ ESTE ERA O PROBLEMA -->
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue>ABC123...</DigestValue>
    </Reference>
  </SignedInfo>
  
  <SignatureValue>XYZ789...</SignatureValue>
  
  <KeyInfo>
    <X509Data>
      <X509Certificate>MIID...</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>
```

---

## 🔍 **ALGORITMOS UTILIZADOS**

| Componente | Algoritmo | URI |
|------------|-----------|-----|
| **Assinatura** | RSA-SHA256 | `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` |
| **Canonização** | C14N | `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` |
| **Digest** | SHA-256 | `http://www.w3.org/2001/04/xmlenc#sha256` ✅ |
| **Transform 1** | Enveloped Signature | `http://www.w3.org/2000/09/xmldsig#enveloped-signature` |
| **Transform 2** | C14N | `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` |

---

## 🧪 **TESTE ESPERADO**

### **1. Console Logs (Backend - Supabase Functions):**

```
🔐 Iniciando assinatura digital do XML...
📋 Tag encontrada: NFe23251158374727000119550010000000011260712676
✅ XML assinado com sucesso
```

### **2. Console Logs (Frontend):**

```
🔐 Abrindo diálogo de assinatura. Token disponível: SIM
📝 Preparando assinatura...
🔑 Token obtido: SIM
🔐 Enviando para assinatura...
✅ Resposta da API: {success: true, data: {...}}
✅ XML assinado com sucesso!
```

### **3. Network Tab:**

**Request:**
```
POST /fiscal/nfe/assinar-xml
Status: 200 OK ✅ (não 400)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "xmlAssinado": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "tamanho": 12345
  },
  "message": "XML assinado com sucesso"
}
```

---

## 📚 **REFERÊNCIAS**

- **W3C XML-DSig:** https://www.w3.org/TR/xmldsig-core/
- **xml-crypto (GitHub):** https://github.com/node-saml/xml-crypto
- **SEFAZ NT 2020.006:** Manual de Orientação do Contribuinte

---

## 🚀 **COMANDOS GIT**

```bash
# Adicionar arquivo modificado
git add supabase/functions/server/nfe-signature.tsx
git add docs/CORRECAO-DIGEST-ALGORITHM.md

# Commit
git commit -m "fix(fiscal): Corrigir erro digestAlgorithm na assinatura XML

- Atualizar addReference() para usar objeto de configuração
- Adicionar digestAlgorithm obrigatório (SHA-256)
- Configurar signatureAlgorithm (RSA-SHA256)
- Configurar canonicalizationAlgorithm (C14N)

Erro corrigido: 400 Bad Request - digestAlgorithm is required

Biblioteca: xml-crypto@6.0.0 (API atualizada)
Padrão: SEFAZ 4.0 XML-DSig

Status: Pronto para testes com certificado real"

# Push
git push origin main
```

---

## ✅ **CHECKLIST DE VERIFICAÇÃO**

- [x] Erro 401 Unauthorized → **CORRIGIDO** (token)
- [x] Erro 400 digestAlgorithm → **CORRIGIDO AGORA**
- [ ] Teste completo com certificado real
- [ ] Validar estrutura XML assinado
- [ ] Verificar tag `<Signature>` presente
- [ ] Testar download do XML assinado

---

## 🎯 **PRÓXIMO TESTE**

Execute novamente o fluxo completo:

1. ✅ Gerar XML de NF-e
2. ✅ Clicar em "Assinar" no toast
3. ✅ Upload certificado.pem + chave-privada.pem
4. ✅ Validar certificado
5. ✅ Clicar em "Assinar XML Digitalmente"
6. ✅ **AGORA DEVE FUNCIONAR!** 🎉
7. ✅ Download XML assinado
8. ✅ Abrir XML e verificar tag `<Signature>`

---

**Se surgir outro erro, envie os logs completos! Estamos progredindo! 🚀**
