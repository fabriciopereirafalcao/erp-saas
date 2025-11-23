# 🧪 **FASE 2 - COMO TESTAR A GERAÇÃO DE XML**

---

## ✅ **RESPOSTA RÁPIDA**

### **1. Configurações do Supabase:**
**❌ NENHUMA configuração manual necessária para a Fase 2!**

A Fase 2 é 100% código TypeScript (utilitários + builders). Tudo já foi integrado automaticamente no backend.

---

### **2. Sobre o código de teste:**
Sim, aquele código era um **EXEMPLO**. Agora ele está **integrado no backend** através de um endpoint REST!

---

## 🚀 **INTEGRAÇÃO COMPLETA - O QUE FOI FEITO**

Criei **2 novos arquivos** para você:

### **1. `/supabase/functions/server/fiscal/routes.ts`** ✨ NOVO
- **Endpoint REST:** `POST /make-server-686b5e88/fiscal/gerar-xml`
- **Endpoint REST:** `GET /make-server-686b5e88/fiscal/xml/:nfeId`

### **2. `/supabase/functions/server/index.tsx`** (atualizado)
- Adicionado: `import fiscal from './fiscal/routes.ts';`
- Adicionado: `app.use('/make-server-686b5e88/fiscal', fiscal);`

---

## 📡 **ENDPOINTS DISPONÍVEIS**

### **1. POST `/make-server-686b5e88/fiscal/gerar-xml`**

**Descrição:** Gera o XML de uma NF-e a partir de dados do banco

**Autenticação:** Requer token JWT (Bearer token)

**Request Body:**
```json
{
  "nfeId": "uuid-da-nfe"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "data": {
    "chaveAcesso": "35240512345678000190550010000000011234567890",
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "tamanho": 8542
  },
  "message": "XML gerado com sucesso"
}
```

**Response (Erro):**
```json
{
  "success": false,
  "error": "Dados inválidos para geração do XML",
  "message": "Natureza da operação é obrigatória; ..."
}
```

---

### **2. GET `/make-server-686b5e88/fiscal/xml/:nfeId`**

**Descrição:** Retorna o XML de uma NF-e já gerada

**Autenticação:** Requer token JWT (Bearer token)

**Response (Sucesso):**
```json
{
  "success": true,
  "data": {
    "chaveAcesso": "35240512345678000190550010000000011234567890",
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "status": "xml_gerado"
  }
}
```

---

## 🧪 **COMO TESTAR - 3 FORMAS**

---

### **FORMA 1: Testar via Frontend (RECOMENDADO)**

No seu módulo de NF-e no frontend, adicione um botão "Gerar XML":

```typescript
// Em: /components/fiscal/ListaNfes.tsx (ou similar)

const gerarXmlNFe = async (nfeId: string) => {
  try {
    setIsLoading(true);
    
    const response = await fetch(
      `${projectId}.supabase.co/functions/v1/make-server-686b5e88/fiscal/gerar-xml`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ nfeId })
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      toast.success(`XML gerado com sucesso! Chave: ${result.data.chaveAcesso}`);
      console.log('XML:', result.data.xml);
      console.log('Tamanho:', result.data.tamanho, 'bytes');
      
      // Atualizar a lista de NF-es
      refreshNfes();
    } else {
      toast.error(result.error || 'Erro ao gerar XML');
      console.error('Detalhes:', result.message);
    }
  } catch (error: any) {
    toast.error('Erro ao gerar XML');
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};

// Adicionar botão na listagem
<Button onClick={() => gerarXmlNFe(nfe.id)} variant="outline">
  Gerar XML
</Button>
```

---

### **FORMA 2: Testar via Postman/Insomnia**

#### **Passo 1: Obter Token de Autenticação**
1. Faça login no seu frontend
2. Abra o Console do navegador (F12)
3. Execute: `localStorage.getItem('supabase.auth.token')`
4. Copie o valor do `access_token`

#### **Passo 2: Criar Request no Postman**

**URL:**
```
POST https://<seu-project-id>.supabase.co/functions/v1/make-server-686b5e88/fiscal/gerar-xml
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <seu-access-token>
```

**Body (JSON):**
```json
{
  "nfeId": "uuid-da-nfe-aqui"
}
```

**Clique em "Send"**

#### **Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "chaveAcesso": "35240512345678000190550010000000011234567890",
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<NFe xmlns=\"http://www.portalfiscal.inf.br/nfe\">...",
    "tamanho": 8542
  },
  "message": "XML gerado com sucesso"
}
```

---

### **FORMA 3: Testar via cURL (Terminal)**

```bash
# Obter token (substitua com suas credenciais)
TOKEN="seu-access-token-aqui"
PROJECT_ID="seu-project-id"
NFE_ID="uuid-da-nfe"

# Gerar XML
curl -X POST \
  "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-686b5e88/fiscal/gerar-xml" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"nfeId\": \"${NFE_ID}\"}"
```

---

## 📊 **FLUXO COMPLETO DE TESTE**

### **Pré-requisitos:**
1. ✅ Ter um **emitente** cadastrado
2. ✅ Ter uma **NF-e** cadastrada (com status rascunho)
3. ✅ Ter **itens** cadastrados na NF-e

---

### **Passo a Passo:**

#### **1. Cadastrar Emitente** (via frontend)
- Menu: Fiscal → Cadastro de Emitente
- Preencher todos os dados obrigatórios:
  - CNPJ, Razão Social
  - Endereço completo (com código do município)
  - IE, CRT
- Salvar

#### **2. Cadastrar NF-e** (via frontend)
- Menu: Fiscal → NF-e → Nova
- Preencher:
  - Emitente
  - Modelo (55 ou 65)
  - Série, Número
  - Natureza da Operação
  - Destinatário (CPF/CNPJ, Nome, Endereço)
  - Modalidade de frete
  - Forma de pagamento
- Salvar (status: rascunho)

#### **3. Adicionar Itens** (via frontend)
- Na tela da NF-e, adicionar itens:
  - Código do produto
  - Descrição
  - NCM, CFOP
  - Quantidade, Valor unitário
  - Impostos (ICMS, IPI, PIS, COFINS)
- Salvar itens

#### **4. Gerar XML** (3 formas acima)
- Chamar o endpoint `POST /fiscal/gerar-xml`
- Passar o `nfeId`
- Receber XML + Chave de Acesso

#### **5. Verificar Resultado**
- ✅ Chave de acesso: 44 dígitos
- ✅ XML: Válido e bem formatado
- ✅ Status da NF-e atualizado: `xml_gerado`
- ✅ Chave salva no banco
- ✅ XML salvo no campo `xml_assinado`

---

## 🔍 **LOGS E DEBUG**

### **Verificar logs no Supabase:**
1. Vá em: **Functions** → **make-server**
2. Clique em **Logs**
3. Procure por:
   ```
   [FISCAL_ROUTES] POST /gerar-xml - Início
   [XML_GENERATOR] Iniciando geração de XML...
   [XML_GENERATOR] Montando bloco IDE...
   [XML_GENERATOR] ✅ XML gerado com sucesso!
   ```

### **Logs esperados:**
```
[FISCAL_ROUTES] Usuário autenticado: uuid-usuario
[FISCAL_ROUTES] NF-e ID: uuid-nfe
[FISCAL_ROUTES] NF-e encontrada: 1
[FISCAL_ROUTES] Itens encontrados: 2
[FISCAL_ROUTES] Emitente encontrado: EMPRESA TESTE LTDA
[FISCAL_ROUTES] Gerando XML...
[XML_GENERATOR] Iniciando geração de XML...
[XML_GENERATOR] Chave de acesso: 35240512345678000190550010000000011234567890
[XML_GENERATOR] ✅ XML gerado com sucesso!
[XML_GENERATOR] Tamanho: 8542 bytes
[FISCAL_ROUTES] NF-e atualizada no banco
```

---

## ❌ **POSSÍVEIS ERROS E SOLUÇÕES**

### **Erro 401: Não autorizado**
**Causa:** Token expirado ou inválido
**Solução:** Faça login novamente e obtenha novo token

### **Erro 404: NF-e não encontrada**
**Causa:** ID da NF-e não existe ou não pertence ao usuário
**Solução:** Verifique se o `nfeId` está correto

### **Erro 400: NF-e sem itens cadastrados**
**Causa:** NF-e não tem produtos/itens
**Solução:** Adicione pelo menos 1 item na NF-e

### **Erro 400: Dados inválidos**
**Causa:** Campos obrigatórios faltando
**Solução:** Verifique a mensagem de erro detalhada
- Exemplo: "Natureza da operação é obrigatória"
- Corrija no cadastro da NF-e

### **Erro: ICMS calculation error**
**Causa:** CST/CSOSN inválido ou dados de imposto incorretos
**Solução:** Verifique os campos de imposto nos itens

---

## 🎯 **EXEMPLO COMPLETO DE DADOS VÁLIDOS**

### **Emitente:**
```json
{
  "cnpj": "12345678000190",
  "razaoSocial": "EMPRESA TESTE LTDA",
  "nomeFantasia": "Empresa Teste",
  "inscricaoEstadual": "123456789",
  "crt": 1,
  "logradouro": "Rua Teste",
  "numero": "123",
  "bairro": "Centro",
  "codigoMunicipio": "3550308",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01000000"
}
```

### **NF-e:**
```json
{
  "modelo": "55",
  "serie": "1",
  "numero": 1,
  "naturezaOperacao": "VENDA DE MERCADORIA",
  "tipoOperacao": 1,
  "finalidadeNfe": 1,
  "ambiente": 2,
  "destinatarioTipo": "PF",
  "destinatarioDocumento": "12345678901",
  "destinatarioNome": "CLIENTE TESTE",
  "destinatarioEndereco": {
    "logradouro": "Rua Cliente",
    "numero": "456",
    "bairro": "Bairro",
    "codigoMunicipio": "3550308",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "02000000"
  },
  "modalidadeFrete": 9,
  "formaPagamento": 0
}
```

### **Item:**
```json
{
  "codigoProduto": "PROD001",
  "descricao": "PRODUTO TESTE",
  "ncm": "12345678",
  "cfop": "5102",
  "unidadeComercial": "UN",
  "quantidadeComercial": 1,
  "valorUnitarioComercial": 100.00,
  "origem": 0,
  "csosn": "102"
}
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

Antes de testar, certifique-se:

- [ ] Fase 1 completa (migrações aplicadas, bucket criado)
- [ ] Arquivos da Fase 2 criados (13 arquivos)
- [ ] Rotas fiscais integradas no index.tsx
- [ ] Backend reiniciado (deploy automático do Supabase)
- [ ] Emitente cadastrado
- [ ] NF-e cadastrada com itens
- [ ] Token de autenticação válido

---

## 🚀 **PRÓXIMOS PASSOS APÓS TESTAR**

Depois de validar a geração de XML, você pode:

1. ✅ **Visualizar o XML** gerado no campo `xml_assinado`
2. ✅ **Baixar o XML** para arquivo `.xml`
3. ✅ **Validar manualmente** em validadores online
4. ✅ **Prosseguir para FASE 3** (Assinatura Digital)

---

## 💡 **DICAS IMPORTANTES**

1. **Ambiente de teste:** Use `ambiente: 2` (Homologação) durante testes
2. **Código do município:** Obrigatório! Use 7 dígitos (ex: 3550308 para SP)
3. **NCM:** Sempre 8 dígitos (ex: 12345678)
4. **CFOP:** Sempre 4 dígitos (ex: 5102)
5. **CRT:** 1=Simples Nacional, 3=Regime Normal

---

**🎉 Pronto! Agora você pode testar a geração de XML!**

Se tiver qualquer erro, verifique os logs no Supabase Functions.

---

## 📞 **SUPORTE**

Caso encontre erros, me envie:
1. 📋 **Log completo** do Supabase Functions
2. 🔍 **Mensagem de erro** exata
3. 📦 **Dados usados** no teste (emitente, nfe, itens)
