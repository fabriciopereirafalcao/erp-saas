# 📊 **MÓDULO DE CÁLCULOS FISCAIS - FASE 3**

Sistema completo de cálculo de impostos para NF-e (Nota Fiscal Eletrônica) modelo 55 e NFC-e modelo 65.

---

## 📋 **ÍNDICE**

1. [Visão Geral](#visão-geral)
2. [Módulos Implementados](#módulos-implementados)
3. [Endpoints REST](#endpoints-rest)
4. [Exemplos de Uso](#exemplos-de-uso)
5. [Estrutura de Dados](#estrutura-de-dados)
6. [Validações](#validações)
7. [Referências](#referências)

---

## 🎯 **VISÃO GERAL**

### **Características:**

✅ **ICMS** - Cálculo completo com suporte a CST e CSOSN (Simples Nacional)  
✅ **IPI** - Cálculo com suporte a todos os CSTs  
✅ **PIS/COFINS** - Regime Cumulativo e Não-Cumulativo  
✅ **FCP** - Fundo de Combate à Pobreza por UF  
✅ **ICMS-ST** - Substituição Tributária com MVA  
✅ **Lei da Transparência** - Lei 12.741/2012  
✅ **Totalização** - Cálculo de totais conforme layout SEFAZ  

### **Padrões:**

- ✅ 100% compatível com layout NF-e 4.0
- ✅ Validação de dados conforme Manual de Orientação SEFAZ
- ✅ Cálculos com precisão de 2 casas decimais
- ✅ Tratamento de erros detalhado

---

## 📦 **MÓDULOS IMPLEMENTADOS**

### **1. Dados Estáticos**

| Arquivo | Descrição |
|---------|-----------|
| `icmsAliquotas.ts` | Alíquotas de ICMS por UF (internas e interestaduais) |
| `fcpAliquotas.ts` | Alíquotas de FCP por estado |
| `pisCofinsRegimes.ts` | Alíquotas de PIS/COFINS por regime |
| `mvaTable.ts` | Tabela MVA para ICMS-ST por NCM |

### **2. Calculadores**

| Arquivo | Função | CSTs Suportados |
|---------|--------|-----------------|
| `icmsCalculator.ts` | Calcula ICMS | CST 00, 10, 20, 30, 40, 41, 51, 60, 70, 90<br>CSOSN 101, 102, 103, 201, 202, 500, 900 |
| `ipiCalculator.ts` | Calcula IPI | CST 00, 01-05, 49, 50, 51-55, 99 |
| `pisCofinsCalculator.ts` | Calcula PIS/COFINS | Todos os CSTs (01-99) |
| `fcpCalculator.ts` | Calcula FCP | - |
| `icmsStCalculator.ts` | Calcula ICMS-ST | - |
| `leiTransparencia.ts` | Lei 12.741/2012 | - |
| `totalCalculator.ts` | Totaliza NF-e | - |

### **3. Utilitários**

| Arquivo | Descrição |
|---------|-----------|
| `calculationTypes.ts` | Definições de tipos TypeScript |
| `calculationHelpers.ts` | Funções auxiliares e orquestrador |

### **4. Rotas REST**

| Arquivo | Descrição |
|---------|-----------|
| `calculationRoutes.ts` | Endpoints HTTP para cálculos |

---

## 🌐 **ENDPOINTS REST**

Base URL: `https://{project-id}.supabase.co/functions/v1/make-server-686b5e88/fiscal/calculos`

### **1. Calcular NF-e Completa**

```http
POST /calcular-nfe
Content-Type: application/json
Authorization: Bearer {token}

{
  "emitente": {
    "cnpj": "12345678000190",
    "uf": "SP",
    "regimeTributario": "lucro_presumido",
    "crt": 3
  },
  "destinatario": {
    "documento": "98765432000100",
    "uf": "RJ",
    "contribuinteICMS": true,
    "consumidorFinal": false
  },
  "operacao": {
    "tipo": "saida",
    "natureza": "VENDA DE MERCADORIA",
    "finalidade": "normal",
    "presenca": "presencial"
  },
  "itens": [
    {
      "numeroItem": 1,
      "codigoProduto": "PROD001",
      "descricao": "PRODUTO TESTE",
      "ncm": "12345678",
      "cfop": "5102",
      "unidadeComercial": "UN",
      "quantidadeComercial": 10,
      "valorUnitarioComercial": 100.00,
      "valorTotalBruto": 1000.00,
      "origem": 0,
      "importado": false,
      "icms": {
        "cst": "00",
        "modalidadeBC": 3
      },
      "ipi": {
        "cst": "50",
        "aliquota": 10
      },
      "pis": {
        "cst": "01"
      },
      "cofins": {
        "cst": "01"
      }
    }
  ],
  "opcoes": {
    "calcularFCP": true,
    "calcularLeiTransparencia": true
  }
}
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "itens": [...],
    "totais": {
      "valorProdutos": 1000.00,
      "valorICMS": 180.00,
      "valorIPI": 100.00,
      "valorPIS": 16.50,
      "valorCOFINS": 76.00,
      "valorTotal": 1100.00
    },
    "validacoes": {
      "valido": true,
      "erros": [],
      "avisos": []
    },
    "dataCalculo": "2024-01-15T10:30:00Z",
    "versaoCalculadora": "1.0.0"
  }
}
```

### **2. Calcular ICMS Individual**

```http
POST /calcular-icms
Content-Type: application/json

{
  "valorProdutos": 1000.00,
  "cst": "00",
  "origem": 0,
  "ufOrigem": "SP",
  "ufDestino": "RJ"
}
```

### **3. Calcular IPI Individual**

```http
POST /calcular-ipi
Content-Type: application/json

{
  "valorProdutos": 1000.00,
  "cst": "50",
  "ncm": "12345678",
  "aliquota": 10
}
```

### **4. Calcular PIS/COFINS**

```http
POST /calcular-pis-cofins
Content-Type: application/json

{
  "valorProdutos": 1000.00,
  "cstPis": "01",
  "cstCofins": "01"
}
```

### **5. Calcular FCP**

```http
POST /calcular-fcp
Content-Type: application/json

{
  "baseCalculo": 1000.00,
  "ufDestino": "RJ",
  "ncm": "12345678"
}
```

### **6. Calcular ICMS-ST**

```http
POST /calcular-st
Content-Type: application/json

{
  "valorOperacao": 1000.00,
  "ncm": "22030000",
  "valorIcmsProprio": 120.00,
  "aliquotaInterestadual": 12,
  "aliquotaInterna": 18,
  "ufOrigem": "SP",
  "ufDestino": "RJ"
}
```

### **7. Calcular Lei da Transparência**

```http
POST /calcular-lei-transparencia
Content-Type: application/json

{
  "valorTotal": 1000.00,
  "ncm": "12345678"
}
```

### **8. Totalizar NF-e**

```http
POST /totalizar-nfe
Content-Type: application/json

{
  "itens": [
    {
      "codigo": "PROD001",
      "descricao": "PRODUTO TESTE",
      "ncm": "12345678",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 10,
      "valorUnitario": 100.00,
      "valorTotal": 1000.00,
      "icms": {
        "baseCalculo": 1000.00,
        "valor": 180.00,
        "aliquota": 18
      },
      "pis": {
        "baseCalculo": 1000.00,
        "valor": 16.50
      },
      "cofins": {
        "baseCalculo": 1000.00,
        "valor": 76.00
      }
    }
  ]
}
```

### **9. Health Check**

```http
GET /health-check
```

**Resposta:**

```json
{
  "success": true,
  "message": "Módulo de cálculos fiscais funcionando",
  "versao": "1.0.0",
  "modulos": {
    "icms": "OK",
    "ipi": "OK",
    "pisCofins": "OK",
    "fcp": "OK",
    "icmsSt": "OK",
    "leiTransparencia": "OK",
    "totalizacao": "OK"
  }
}
```

### **10. Listar Tabelas**

```http
GET /tabelas
```

---

## 💻 **EXEMPLOS DE USO**

### **Exemplo 1: Venda Simples (CST 00)**

```typescript
import { calcularICMS } from './calculations/icmsCalculator.ts';

const resultado = calcularICMS({
  valorProdutos: 1000.00,
  cst: '00',
  origem: 0,
  ufOrigem: 'SP',
  ufDestino: 'SP',  // Operação interna
});

console.log(resultado);
// {
//   baseCalculo: 1000.00,
//   aliquota: 18,
//   valor: 180.00,
//   cst: '00',
//   origem: 0,
//   isInterestadual: false
// }
```

### **Exemplo 2: Simples Nacional (CSOSN 101)**

```typescript
const resultado = calcularICMS({
  valorProdutos: 1000.00,
  csosn: '101',
  origem: 0,
  ufOrigem: 'SP',
  ufDestino: 'RJ',
  aliquotaIcms: 1.25,  // Alíquota de crédito do Simples
});
```

### **Exemplo 3: Com Substituição Tributária**

```typescript
import { calcularICMSSTCompleto } from './calculations/icmsStCalculator.ts';

const resultado = calcularICMSSTCompleto({
  valorOperacao: 1000.00,
  ncm: '22030000',  // Cerveja - tem ST
  valorIcmsProprio: 120.00,
  aliquotaInterestadual: 12,
  aliquotaInterna: 18,
  ufOrigem: 'SP',
  ufDestino: 'RJ',
});

console.log(resultado);
// {
//   temST: true,
//   baseCalculoST: 1400.00,
//   valorST: 132.00,
//   mvaOriginal: 40,
//   mvaAjustado: 45.83
// }
```

### **Exemplo 4: NF-e Completa**

```typescript
import { calcularNFeCompleta } from './calculations/calculationHelpers.ts';

const nfe = await calcularNFeCompleta({
  emitente: {
    cnpj: '12345678000190',
    uf: 'SP',
    regimeTributario: 'lucro_presumido',
    crt: 3,
  },
  destinatario: {
    documento: '98765432000100',
    uf: 'RJ',
    contribuinteICMS: true,
    consumidorFinal: false,
  },
  operacao: {
    tipo: 'saida',
    natureza: 'VENDA DE MERCADORIA',
    finalidade: 'normal',
    presenca: 'presencial',
  },
  itens: [
    {
      numeroItem: 1,
      codigoProduto: 'PROD001',
      descricao: 'PRODUTO TESTE',
      ncm: '12345678',
      cfop: '6102',  // Interestadual
      unidadeComercial: 'UN',
      quantidadeComercial: 10,
      valorUnitarioComercial: 100.00,
      valorTotalBruto: 1000.00,
      origem: 0,
      importado: false,
      icms: { cst: '00' },
      ipi: { cst: '50', aliquota: 10 },
      pis: { cst: '01' },
      cofins: { cst: '01' },
    }
  ],
  opcoes: {
    calcularFCP: true,
    calcularLeiTransparencia: true,
  },
});

console.log(nfe.totais);
```

---

## 📊 **ESTRUTURA DE DADOS**

### **Tipos Principais:**

```typescript
// Regime Tributário
type RegimeTributario = 
  | 'simples_nacional'
  | 'lucro_presumido'
  | 'lucro_real'
  | 'mei';

// Origem da Mercadoria
type OrigemMercadoria = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Item de Cálculo
interface ItemCalculoCompleto {
  numeroItem: number;
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidadeComercial: number;
  valorUnitarioComercial: number;
  valorTotalBruto: number;
  origem: OrigemMercadoria;
  icms: {
    cst?: string;
    csosn?: string;
    aliquota?: number;
  };
  ipi?: {
    cst: string;
    aliquota?: number;
  };
  pis: { cst: string };
  cofins: { cst: string };
}

// Resultado do Cálculo
interface NFeCalculoResult {
  itens: ItemCalculoResult[];
  totais: {
    valorProdutos: number;
    valorICMS: number;
    valorIPI: number;
    valorPIS: number;
    valorCOFINS: number;
    valorTotal: number;
  };
  validacoes: {
    valido: boolean;
    erros: string[];
    avisos: string[];
  };
}
```

---

## ✅ **VALIDAÇÕES**

### **Validações Automáticas:**

- ✅ CNPJ/CPF com dígito verificador
- ✅ NCM com 8 dígitos
- ✅ CFOP com 4 dígitos
- ✅ Valores positivos
- ✅ CST/CSOSN válidos
- ✅ UF válida
- ✅ Quantidade de itens (máx 990)
- ✅ Totalização consistente

### **Tratamento de Erros:**

```typescript
try {
  const resultado = await calcularNFeCompleta(params);
} catch (error) {
  if (error instanceof ErroCalculoFiscal) {
    console.error('Código:', error.codigo);
    console.error('Mensagem:', error.message);
    console.error('Detalhes:', error.detalhes);
  }
}
```

---

## 📚 **REFERÊNCIAS**

### **Documentação Oficial:**

- [Manual de Orientação NF-e](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=)
- [Schemas XML NF-e 4.0](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fwLvLUSmU8=)
- [CONFAZ - Protocolos ICMS](https://www.confaz.fazenda.gov.br/)
- [Tabela NCM](http://www.mdic.gov.br/comercio-exterior/estatisticas-de-comercio-exterior/comex-vis/frame-ncm)

### **Legislação:**

- Lei 12.741/2012 - Lei da Transparência
- Emenda Constitucional 87/2015 - Partilha ICMS
- Resolução Senado 13/2012 - Alíquotas Interestaduais
- Convênio ICMS 52/2017 - CFOP

### **Tabelas e Alíquotas:**

- IBPT - Instituto Brasileiro de Planejamento Tributário
- SEFAZ - Secretarias de Fazenda Estaduais
- Receita Federal - Alíquotas IPI (TIPI)

---

## ⚠️ **AVISOS IMPORTANTES**

1. **Alíquotas**: As alíquotas neste sistema são aproximadas. Consulte sempre a legislação vigente de cada estado.

2. **MVA**: As MVAs variam por protocolo ICMS. Verifique os protocolos específicos de cada UF.

3. **IBPT**: Para valores exatos da Lei da Transparência, integre com a API IBPT oficial.

4. **Regime de ST**: Produtos com ST variam por estado e protocolo. Consulte os convênios ICMS.

5. **Atualizações**: Mantenha as tabelas atualizadas conforme mudanças na legislação.

---

## 🔄 **PRÓXIMAS FASES**

- ✅ **FASE 3:** Cálculos Fiscais (CONCLUÍDA)
- 🔜 **FASE 4:** Assinatura Digital XML
- 🔜 **FASE 5:** Transmissão SEFAZ
- 🔜 **FASE 6:** Refatoração Frontend

---

**Desenvolvido para ERP Generalizado - Figma Make**  
**Versão:** 1.0.0  
**Data:** 2024
