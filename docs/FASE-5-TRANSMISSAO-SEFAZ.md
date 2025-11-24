# 📡 FASE 5: Transmissão SEFAZ - IMPLEMENTADA

---

## 🎯 **OBJETIVO**

Implementar a transmissão de NF-e para os webservices SEFAZ, consulta de recibo e processamento de retorno.

---

## 📋 **ARQUIVOS CRIADOS**

| Arquivo | Descrição | Linhas |
|---------|-----------|---------|
| `/supabase/functions/server/sefaz/soap-client.tsx` | Cliente SOAP genérico | ~300 |
| `/supabase/functions/server/sefaz/webservices.tsx` | URLs por UF e ambiente | ~350 |
| `/supabase/functions/server/sefaz/nfe-services.tsx` | Serviços NF-e (autorizar, consultar) | ~450 |
| `/supabase/functions/server/sefaz/routes.ts` | Endpoints REST | ~250 |
| `/supabase/functions/server/index.tsx` | Registro de rotas SEFAZ | ~10 |

**Total:** ~1.360 linhas de código backend

---

## 🏗️ **ARQUITETURA**

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  (TaxInvoicing.tsx - botão "Transmitir para SEFAZ")   │
└──────────────────┬──────────────────────────────────────┘
                   │ POST /sefaz/nfe/transmitir
                   ↓
┌─────────────────────────────────────────────────────────┐
│              BACKEND - EDGE FUNCTIONS                   │
│                                                         │
│  ┌───────────────┐      ┌───────────────────┐         │
│  │ routes.ts     │  →   │ nfe-services.tsx  │         │
│  │ (REST API)    │      │ (Lógica NF-e)     │         │
│  └───────────────┘      └─────────┬─────────┘         │
│                                   │                    │
│                         ┌─────────▼─────────┐         │
│                         │  soap-client.tsx  │         │
│                         │  (Cliente SOAP)   │         │
│                         └─────────┬─────────┘         │
│                                   │                    │
│                         ┌─────────▼─────────┐         │
│                         │ webservices.tsx   │         │
│                         │ (URLs por UF)     │         │
│                         └─────────┬─────────┘         │
└───────────────────────────────────┼───────────────────┘
                                    │ HTTPS
                                    ↓
┌─────────────────────────────────────────────────────────┐
│                 SEFAZ WEBSERVICE                        │
│  (NFeAutorizacao4, NFeRetAutorizacao4)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Cliente SOAP (`soap-client.tsx`)**

- ✅ Montagem de envelope SOAP 1.2
- ✅ Headers HTTP corretos (SOAPAction)
- ✅ Extração de conteúdo XML da resposta
- ✅ Extração de códigos de status SEFAZ
- ✅ Tratamento de erros HTTP
- ✅ Logs detalhados de debug
- ⚠️ TLS Mútuo (certificado cliente) - NOTA implementada*

**NOTA:** O fetch nativo do Deno não suporta client certificates. Para produção com estados que exigem TLS mútuo, será necessário usar uma biblioteca externa ou proxy.

---

### **2. Webservices por UF (`webservices.tsx`)**

#### **Estados Suportados:**

| UF | SEFAZ | Homologação | Produção |
|---|---|---|---|
| **CE** | Própria | ✅ | ✅ |
| **SP** | Própria | ✅ | ✅ |
| **MG** | Própria | ✅ | ✅ |
| **Outros 24 UFs** | SVRS | ✅ | ✅ |

#### **Serviços Implementados:**

- `autorizacao` - NFeAutorizacao4
- `retornoAutorizacao` - NFeRetAutorizacao4
- `consultaProtocolo` - NFeConsultaProtocolo4
- `inutilizacao` - NFeInutilizacao4
- `eventoRecepcao` - NFeRecepcaoEvento4 (cancelamento, CCe)
- `statusServico` - NFeStatusServico4

---

### **3. Serviços NF-e (`nfe-services.tsx`)**

#### **A) Autorização de Lote**

```typescript
autorizarNFe(
  xmlNFe: string,      // XML assinado
  uf: string,          // UF do emitente
  ambiente: 1 | 2,     // 1=Produção, 2=Homologação
  idLote?: string      // ID do lote (auto-gerado se não fornecido)
): Promise<ResultadoAutorizacao>
```

**Fluxo:**
1. Obter URL do webservice baseado em UF e ambiente
2. Montar XML do lote (`<enviNFe>`)
3. Enviar via SOAP
4. Processar resposta:
   - **Código 100:** Autorizado imediatamente (raro)
   - **Código 103:** Lote recebido → consultar depois
   - **Outros:** Rejeição

**Retorno:**
- `recibo` - Para consulta posterior (se código 103)
- `protocolo` - Protocolo de autorização (se código 100)
- `codigoStatus` - Código SEFAZ
- `mensagem` - Mensagem descritiva

---

#### **B) Consulta de Recibo**

```typescript
consultarRecibo(
  recibo: string,       // Número do recibo
  uf: string,
  ambiente: 1 | 2
): Promise<ResultadoConsultaRecibo>
```

**Fluxo:**
1. Montar XML de consulta (`<consReciNFe>`)
2. Enviar via SOAP
3. Processar resposta:
   - **Código 100:** Autorizado → retornar protocolo
   - **Código 105:** Ainda processando → tentar novamente
   - **Outros:** Rejeição

**Retorno:**
- `autorizado: true/false`
- `protocolo` - Protocolo de autorização
- `dataAutorizacao` - Data/hora da autorização
- `xmlProtocoloCompleto` - XML do `<protNFe>`

---

#### **C) Status do Serviço**

```typescript
consultarStatusServico(
  uf: string,
  ambiente: 1 | 2
): Promise<ResultadoStatusServico>
```

**Fluxo:**
1. Montar XML de consulta (`<consStatServ>`)
2. Enviar via SOAP
3. Verificar se código é 107 (serviço operacional)

**Retorno:**
- `online: true/false`
- `ambiente` - Ambiente retornado
- `versao` - Versão da aplicação SEFAZ
- `tempoMedio` - Tempo médio de resposta

---

### **4. Endpoints REST (`routes.ts`)**

#### **POST /sefaz/nfe/transmitir**

Transmite NF-e para autorização.

**Request:**
```json
{
  "nfeId": "uuid",           // Opcional: ID no banco
  "xml": "<NFe>...</NFe>",   // XML assinado
  "uf": "CE",                // UF do emitente
  "ambiente": 2              // 1=Produção, 2=Homologação
}
```

**Response (Lote Recebido - 103):**
```json
{
  "success": true,
  "data": {
    "recibo": "232511000000123",
    "dataHora": "2024-11-24T01:30:00-03:00",
    "status": "processando",
    "mensagem": "Lote recebido. Consulte o recibo..."
  }
}
```

**Response (Autorizado - 100):**
```json
{
  "success": true,
  "data": {
    "protocolo": "123456789012345",
    "status": "autorizada",
    "mensagem": "Autorizado o uso da NF-e"
  }
}
```

**Response (Rejeitado):**
```json
{
  "success": false,
  "error": "Rejeição 215: Falha no schema XML",
  "codigo": "215",
  "mensagem": "Falha no schema XML da NF-e"
}
```

---

#### **POST /sefaz/nfe/consultar-recibo**

Consulta resultado de um lote já enviado.

**Request:**
```json
{
  "nfeId": "uuid",          // Opcional
  "recibo": "232511000000123",
  "uf": "CE",
  "ambiente": 2,
  "xmlOriginal": "<NFe>...</NFe>"  // Para anexar protocolo
}
```

**Response (Autorizado):**
```json
{
  "success": true,
  "data": {
    "autorizado": true,
    "protocolo": "123456789012345",
    "dataAutorizacao": "2024-11-24T01:31:00-03:00",
    "xmlAutorizado": "<nfeProc>...</nfeProc>",
    "mensagem": "Autorizado o uso da NF-e"
  }
}
```

**Response (Ainda Processando - 105):**
```json
{
  "success": true,
  "data": {
    "status": "processando",
    "mensagem": "Lote ainda em processamento..."
  }
}
```

**Response (Rejeitado):**
```json
{
  "success": false,
  "error": "NF-e rejeitada",
  "codigo": "232",
  "mensagem": "Assinatura digital inválida"
}
```

---

#### **GET /sefaz/status/:uf/:ambiente**

Consulta status do serviço SEFAZ.

**Request:**
```
GET /sefaz/status/CE/2
```

**Response:**
```json
{
  "success": true,
  "data": {
    "online": true,
    "ambiente": "2",
    "versao": "4.00",
    "tempoMedio": "1s",
    "mensagem": "Serviço em Operação"
  }
}
```

---

## 📊 **CÓDIGOS DE STATUS SEFAZ**

### **✅ Sucesso:**

| Código | Descrição |
|--------|-----------|
| 100 | Autorizado o uso da NF-e |
| 103 | Lote recebido com sucesso |
| 104 | Lote processado |
| 107 | Serviço em Operação |

### **⚠️ Processamento:**

| Código | Descrição |
|--------|-----------|
| 105 | Lote em processamento |

### **❌ Rejeições Comuns:**

| Código | Descrição | Solução |
|--------|-----------|---------|
| 204 | Duplicidade de NF-e | Alterar número/série |
| 215 | Falha no schema XML | Validar XSD |
| 232 | Assinatura inválida | Verificar certificado |
| 203 | CNPJ emitente incorreto | Corrigir cadastro |
| 206 | IE emitente incorreta | Corrigir cadastro |

---

## 🔄 **FLUXO COMPLETO DE TRANSMISSÃO**

```
┌──────────────────────────────────────────────────────┐
│ 1. GERAR XML                                         │
│    POST /fiscal/nfe/gerar-xml-direto                │
│    ✅ XML gerado, chave de acesso extraída          │
└────────────────┬─────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────┐
│ 2. ASSINAR XML                                       │
│    POST /fiscal/nfe/assinar-xml                     │
│    ✅ XML assinado digitalmente (V3 manual)         │
└────────────────┬─────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────┐
│ 3. TRANSMITIR PARA SEFAZ                            │
│    POST /sefaz/nfe/transmitir                       │
│    • Envia lote para autorização                    │
│    • Recebe recibo (código 103)                     │
└────────────────┬─────────────────────────────────────┘
                 │
                 │ Aguardar 2-5 segundos
                 │
┌────────────────▼─────────────────────────────────────┐
│ 4. CONSULTAR RECIBO                                  │
│    POST /sefaz/nfe/consultar-recibo                 │
│    • Retorna protocolo (código 100)                 │
│    • Anexa <protNFe> ao XML                         │
└────────────────┬─────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────┐
│ 5. SALVAR XML AUTORIZADO                            │
│    • Atualizar status → "autorizada"                │
│    • Salvar protocolo e data de autorização         │
│    • XML final: <nfeProc>                           │
└──────────────────────────────────────────────────────┘
```

---

## 🧪 **TESTE RÁPIDO**

### **1. Verificar Status SEFAZ:**

```bash
curl -X GET "https://bhykkiladzxjwnzkpdwu.supabase.co/functions/v1/make-server-686b5e88/sefaz/status/CE/2"
```

**Resultado Esperado:**
```json
{
  "success": true,
  "data": {
    "online": true,
    "mensagem": "Serviço em Operação"
  }
}
```

---

### **2. Transmitir NF-e (Frontend):**

```javascript
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/transmitir`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      nfeId: '...',
      xml: xmlAssinado,
      uf: 'CE',
      ambiente: 2
    })
  }
);

const result = await response.json();

if (result.success && result.data.recibo) {
  // Aguardar 3 segundos
  await new Promise(r => setTimeout(r, 3000));
  
  // Consultar recibo
  const consultaResponse = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/consultar-recibo`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        nfeId: '...',
        recibo: result.data.recibo,
        uf: 'CE',
        ambiente: 2,
        xmlOriginal: xmlAssinado
      })
    }
  );
  
  const consultaResult = await consultaResponse.json();
  
  if (consultaResult.success && consultaResult.data.autorizado) {
    console.log('✅ NF-e Autorizada!');
    console.log('Protocolo:', consultaResult.data.protocolo);
  }
}
```

---

## ⚠️ **LIMITAÇÕES CONHECIDAS**

### **1. TLS Mútuo Não Implementado**

- Deno fetch não suporta client certificates
- Estados que exigem: nenhum na homologação, alguns em produção
- **Solução para produção:** Usar proxy nginx ou biblioteca externa

### **2. Validação XSD Não Implementada**

- XML não é validado contra schema SEFAZ antes de transmitir
- SEFAZ pode rejeitar com código 215
- **Próximo passo:** Adicionar validação XSD

### **3. Retry Logic Não Implementada**

- Sem tentativas automáticas em caso de timeout
- **Próximo passo:** Implementar exponential backoff

---

## 🎯 **PRÓXIMOS PASSOS**

### **Imediatos (Frontend):**

1. ✅ Criar dialog `TransmitirNFeDialog.tsx`
2. ✅ Adicionar botão "Transmitir para SEFAZ" no dropdown
3. ✅ Implementar lógica de transmissão + consulta
4. ✅ Mostrar status (processando → autorizada/rejeitada)
5. ✅ Atualizar badge de status na tabela

### **Melhorias:**

1. ⏳ Validação XSD antes de transmitir
2. ⏳ Retry automático com exponential backoff
3. ⏳ TLS mútuo (para estados que exigem)
4. ⏳ Fila de transmissão (para lotes grandes)
5. ⏳ Cancelamento de NF-e
6. ⏳ Carta de Correção Eletrônica (CC-e)
7. ⏳ DANFE (PDF da NF-e)

---

## 📝 **ESTRUTURA DE BANCO DE DADOS**

A tabela `fiscal_nfes` deve ter os seguintes campos atualizados:

```sql
ALTER TABLE fiscal_nfes ADD COLUMN IF NOT EXISTS recibo_sefaz TEXT;
ALTER TABLE fiscal_nfes ADD COLUMN IF NOT EXISTS data_envio_sefaz TIMESTAMP;
ALTER TABLE fiscal_nfes ADD COLUMN IF NOT EXISTS codigo_rejeicao TEXT;
ALTER TABLE fiscal_nfes ADD COLUMN IF NOT EXISTS mensagem_rejeicao TEXT;

-- Status possíveis:
-- 'rascunho', 'xml_gerado', 'assinado', 'processando', 'autorizada', 'rejeitada', 'cancelada'
```

---

## 🚀 **DEPLOY**

```bash
# Adicionar arquivos
git add supabase/functions/server/sefaz/ \
        supabase/functions/server/index.tsx \
        docs/FASE-5-TRANSMISSAO-SEFAZ.md

# Commit
git commit -m "feat(sefaz): Implementar transmissão NF-e - Fase 5

Arquivos criados:
- soap-client.tsx: Cliente SOAP genérico
- webservices.tsx: URLs por UF (27 estados)
- nfe-services.tsx: Autorização, consulta, status
- routes.ts: 3 endpoints REST

Funcionalidades:
- Transmissão de lote NF-e
- Consulta de recibo assíncrona
- Status do serviço SEFAZ
- Anexar protocolo ao XML
- Suporte a 27 UFs (SVRS + próprias)

Endpoints:
- POST /sefaz/nfe/transmitir
- POST /sefaz/nfe/consultar-recibo
- GET /sefaz/status/:uf/:ambiente

Limitações:
- TLS mútuo não implementado (fetch nativo)
- Validação XSD pendente
- Retry logic pendente

Total: ~1.360 linhas

Status: BACKEND COMPLETO, FRONTEND PENDENTE"

# Push
git push origin main
```

---

**BACKEND COMPLETO! AGUARDANDO FRONTEND!** 🚀
