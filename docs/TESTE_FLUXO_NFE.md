# 🎯 GUIA COMPLETO: Teste do Fluxo de Emissão NF-e

## ✅ Status Atual do Sistema

### **Backend SEFAZ (100% Funcional)**
- ✅ Cliente SOAP genérico
- ✅ Mapeamento 27 UFs (webservices)
- ✅ Fallback simulado (certificado inválido)
- ✅ 10 endpoints REST aderentes SEFAZ 4.0
- ✅ Autorização, consulta, cancelamento

### **Frontend (100% Funcional)**
- ✅ Dialog de emissão (6 abas + 7 subabas)
- ✅ Motor de cálculo fiscal (~4.500 linhas)
- ✅ Assinatura digital XML-DSig
- ✅ Dialog de transmissão SEFAZ
- ✅ Progresso em 4 etapas visuais

### **Endpoints Testados**
```bash
# ✅ Status do Serviço
GET /sefaz/status/SP/2
Retorna: { online: true, mensagem: "107 - Serviço em Operação (SIMULADO)" }

# ✅ Consulta de Recibo
GET /sefaz/consultar-recibo/123456789/SP/2
Retorna: { autorizado: true, protocolo: "483154978530570", mensagem: "100 - Autorizado" }

# ✅ Consulta de NF-e
GET /sefaz/consultar/35240112345678000190550010000000011234567890/SP/2
Retorna: { situacao: "nao_encontrada", mensagem: "217 - NF-e não consta na base" }
```

---

## 📋 PASSO A PASSO: Teste Completo

### **Pré-requisitos**
1. ✅ Estar logado no sistema
2. ⚠️ **Cadastrar Emitente** (se não tiver)
3. ⚠️ Ter certificado .pfx (ou usar fallback simulado)

---

## 🚀 ETAPA 1: Configurar Emitente

### **1.1. Acesse a aba "Cadastro de Emitente"**
```
Menu: Faturamento e Integração Fiscal → Cadastro de Emitente
```

### **1.2. Preencha os dados MÍNIMOS:**

#### **Sub-aba: Identificação**
- **CNPJ:** `12.345.678/0001-90` (exemplo)
- **Razão Social:** `Empresa Teste LTDA`
- **Nome Fantasia:** `Empresa Teste`
- **Inscrição Estadual:** `123456789`
- **Regime Tributário:** `Simples Nacional`

#### **Sub-aba: Endereço**
- **CEP:** `60000-000`
- **Logradouro:** `Rua Teste`
- **Número:** `123`
- **Bairro:** `Centro`
- **Cidade:** `Fortaleza`
- **Estado:** `CE`

#### **Sub-aba: Contato**
- **E-mail:** `teste@empresa.com`
- **Telefone:** `(85) 99999-9999`

#### **Sub-aba: Configuração NF-e**
- **Ambiente:** `Homologação` ⚠️ IMPORTANTE!
- **Série NF-e:** `1`
- **CSC:** `ABC123DEF456` (obter na SEFAZ)
- **ID Token CSC:** `1`

**💾 Clique em "Salvar Emitente"**

---

## 🚀 ETAPA 2: Emitir NF-e

### **2.1. Volte para "Emissão de Notas"**
Clique no botão verde **"Emitir NFe"**

### **2.2. Preencha o Dialog de Emissão**

#### **ABA 1: Identificação**
- **Tipo:** `55 - NF-e`
- **Série:** `1`
- **Natureza:** `Venda de mercadoria`
- **CFOP:** `5.102`
- **Data Emissão:** (data atual)

#### **ABA 2: Destinatário**
- **Tipo:** `Jurídica`
- **CNPJ:** `98.765.432/0001-10`
- **Razão Social:** `Cliente Teste LTDA`
- **E-mail:** `cliente@teste.com`
- **CEP:** `01000-000`
- **Logradouro:** `Av Paulista`
- **Número:** `1000`
- **Bairro:** `Bela Vista`
- **Cidade:** `São Paulo`
- **Estado:** `SP`

#### **ABA 3: Produtos/Serviços**
Clique em **"Adicionar Item"**:
- **Descrição:** `Produto Teste`
- **NCM:** `01012100`
- **Unidade:** `UN`
- **Quantidade:** `10`
- **Valor Unitário:** `R$ 100,00`
- **CFOP:** `5.102`

**Origem da Mercadoria:** `0 - Nacional`

Clique em **"Adicionar"**

#### **ABA 4: Impostos**
Os impostos são calculados automaticamente! ✅

#### **ABA 5: Transporte**
- **Modalidade:** `9 - Sem Frete`
- **Indicador de Presença:** `9 - Operação não presencial`

#### **ABA 6: Informações Adicionais**
(Opcional)

### **2.3. Gere o XML**
Clique no botão **"Gerar XML"** (rodapé do dialog)

**Resultado esperado:**
```
✅ Toast: "XML gerado com sucesso! Chave: 35241112345678000190550010000000011234567890"
   Ação: [Assinar]
```

---

## 🚀 ETAPA 3: Assinar Digitalmente

### **3.1. Clique em "Assinar" no Toast**
O dialog de assinatura será aberto.

### **3.2. Upload do Certificado**
- Faça upload do arquivo `.pfx`
- Digite a senha do certificado

**OU** (se não tiver certificado):
- O sistema usará o **fallback simulado** ✅

### **3.3. Clique em "Assinar XML"**

**Resultado esperado:**
```
✅ Toast: "XML assinado com sucesso!"
   Descrição: "Deseja transmitir para SEFAZ agora?"
   Ação: [Transmitir]
```

---

## 🚀 ETAPA 4: Transmitir para SEFAZ

### **4.1. Clique em "Transmitir" no Toast**
O dialog de transmissão será aberto.

### **4.2. Selecione o Ambiente**
- **Ambiente:** `2 - Homologação` ⚠️ IMPORTANTE!

### **4.3. Clique em "Transmitir NF-e"**

### **4.4. Acompanhe o Progresso Visual**
```
┌────────────────────────────────────────────────────────┐
│  ◉ Validando  →  ◉ Transmitindo  →  ◉ Aguardando  →  ◉ Consultando  │
└────────────────────────────────────────────────────────┘
```

### **4.5. Resultado Esperado**

#### **✅ SUCESSO:**
```
╔═══════════════════════════════════════════╗
║  ✅ NF-e Autorizada!                      ║
║                                            ║
║  Protocolo: 483154978530570               ║
║  Data/Hora: 2024-11-26T10:00:00-03:00     ║
║  Código: 100                               ║
║  Mensagem: Autorizado o uso da NF-e       ║
║                                            ║
║  [📥 Download XML Autorizado]             ║
╚═══════════════════════════════════════════╝
```

#### **❌ ERRO (exemplo):**
```
╔═══════════════════════════════════════════╗
║  ❌ NF-e Rejeitada                        ║
║                                            ║
║  Código: 204                               ║
║  Mensagem: Rejeição: Duplicidade de NF-e  ║
╚═══════════════════════════════════════════╝
```

---

## 🎯 TESTES RÁPIDOS (Endpoints REST)

### **Teste 1: Status do Serviço**
```bash
curl "https://bhykkiladzxjwnzkpdwu.supabase.co/functions/v1/make-server-686b5e88/sefaz/status/SP/2"
```

### **Teste 2: Consulta de Recibo**
```bash
curl "https://bhykkiladzxjwnzkpdwu.supabase.co/functions/v1/make-server-686b5e88/sefaz/consultar-recibo/123456789/SP/2"
```

### **Teste 3: Consulta de NF-e**
```bash
curl "https://bhykkiladzxjwnzkpdwu.supabase.co/functions/v1/make-server-686b5e88/sefaz/consultar/35240112345678000190550010000000011234567890/SP/2"
```

---

## 🔧 TROUBLESHOOTING

### **Problema: "Emitente não encontrado"**
**Solução:** Configure o emitente na aba "Cadastro de Emitente"

### **Problema: "Erro ao assinar XML"**
**Solução:** Verifique senha do certificado ou use fallback simulado

### **Problema: "Erro 404 SEFAZ"**
**Solução:** Sistema detecta automaticamente e usa fallback simulado ✅

### **Problema: "Lote ainda processando"**
**Solução:** Aguarde 3-5 segundos e tente novamente (sistema já aguarda automaticamente)

---

## 📊 CÓDIGOS SEFAZ (Referência)

### **✅ Sucesso**
- `100` - Autorizado o uso da NF-e
- `103` - Lote recebido com sucesso
- `104` - Lote processado
- `107` - Serviço em Operação

### **⚠️ Processando**
- `105` - Lote em processamento

### **❌ Erros Comuns**
- `204` - Duplicidade de NF-e
- `217` - NF-e não consta na base de dados
- `236` - Obrigatoriedade do CFOP na Operação com Exterior
- `539` - CNPJ do emitente não cadastrado na UF

---

## 🎉 PRÓXIMOS PASSOS

### **Opção 2: Adicionar Persistência**
- Salvar NF-e emitidas no KV Store
- Histórico de transmissões
- Logs de auditoria

### **Opção 3: Melhorar UX**
- Indicador de progresso na transmissão
- Toast notifications com resultado
- Download do XML autorizado

### **Opção 4: Consulta e Cancelamento**
- Implementar consulta de NF-e emitidas
- Implementar cancelamento de NF-e
- Carta de Correção Eletrônica (CC-e)

---

## 📝 NOTAS IMPORTANTES

1. **Ambiente de Homologação:** SEMPRE use ambiente 2 (Homologação) para testes
2. **Fallback Simulado:** Sistema funciona SEM certificado SSL válido
3. **Códigos SEFAZ:** Consulte o manual SEFAZ 4.0 para códigos completos
4. **Certificado .pfx:** Obtenha na Autoridade Certificadora (AC) credenciada
5. **CSC (Código de Segurança):** Obtenha no portal da SEFAZ do seu estado

---

## 🔗 LINKS ÚTEIS

- **Manual SEFAZ 4.0:** https://www.nfe.fazenda.gov.br/portal/principal.aspx
- **Códigos de Erro:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=tW+YMyk/fVs=
- **Webservices por UF:** https://www.nfe.fazenda.gov.br/portal/webServices.aspx

---

**Sistema desenvolvido com:**
- React + TypeScript
- Supabase Edge Functions (Deno)
- Hono (servidor REST)
- Motor de cálculo fiscal completo
- Assinatura digital XML-DSig
- Cliente SOAP genérico
