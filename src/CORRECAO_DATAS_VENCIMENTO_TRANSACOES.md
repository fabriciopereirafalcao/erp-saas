# Correção de Divergência de Datas de Vencimento entre Pedidos e Transações Financeiras

## 🎯 Problema Identificado

**Sintoma**: As datas de vencimento das transações financeiras estavam apresentando divergência de **1 dia a menos** em relação à data de vencimento calculada corretamente no pedido de venda.

**Exemplo Prático**:
- **Pedido PV-1054**: Vencimento calculado corretamente = `17/11/2025`
- **Transação FT-001** (originada do PV-1054): Vencimento = `16/11/2025` ❌

**Diferença**: -1 dia (incorreto)

---

## 🔍 Causa Raiz

### Problema de Timezone no Parsing de Datas

A função `executeAccountsReceivableCreation` no arquivo `/contexts/ERPContext.tsx` estava calculando as datas de vencimento das parcelas usando o construtor `new Date(string)` diretamente com uma string no formato `YYYY-MM-DD`:

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (linhas 1451-1458)
const firstDueDateBase = calculateDueDate(order);
const baseDueDate = new Date(firstDueDateBase);  // ⚠️ PROBLEMA AQUI!
baseDueDate.setDate(baseDueDate.getDate() + (i * 30));

const year = baseDueDate.getFullYear();
const month = String(baseDueDate.getMonth() + 1).padStart(2, '0');
const day = String(baseDueDate.getDate()).padStart(2, '0');
const dueDate = `${year}-${month}-${day}`;
```

### Por que isso causava o problema?

Quando você passa uma string no formato `YYYY-MM-DD` para `new Date()`, o JavaScript interpreta como **UTC (00:00:00)**:

```
new Date('2025-11-17')  →  2025-11-17T00:00:00.000Z (UTC)
```

No **fuso horário brasileiro (UTC-3)**, isso resulta em:

```
2025-11-17T00:00:00.000Z  →  2025-11-16T21:00:00.000 (horário local)
```

Ao chamar métodos como `getDate()`, o JavaScript retorna o dia do **horário local**, que é `16` em vez de `17`, causando a diferença de **1 dia**.

---

## ✅ Solução Implementada

### 1. Importação do Utilitário de Datas

Adicionada a importação da função `addDaysToDate` do utilitário `/utils/dateUtils.ts`:

```typescript
import { addDaysToDate } from '../utils/dateUtils';
```

### 2. Correção na Criação de Parcelas

Substituído o cálculo manual de datas pela função `addDaysToDate` que já trata corretamente o problema de timezone:

```typescript
// ✅ CÓDIGO CORRIGIDO (linhas 1447-1449)
for (let i = 0; i < numberOfInstallments; i++) {
  const transactionId = generateNextFinancialTransactionId();
  
  // Calcular data de vencimento para cada parcela usando utilitário sem problema de timezone
  const firstDueDateBase = calculateDueDate(order);
  const dueDate = addDaysToDate(firstDueDateBase, i * 30); // Adiciona 30 dias para cada parcela
  
  // ... resto do código
}
```

### Como funciona `addDaysToDate`?

A função faz o **parsing manual** da string de data, evitando a conversão automática de timezone:

```typescript
export const addDaysToDate = (dateString: string, days: number): string => {
  const date = parseDateLocal(dateString);  // Parsing seguro
  date.setDate(date.getDate() + days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);  // ✅ Usa timezone local
};
```

---

## 🧪 Validação da Correção

### Cenário de Teste

1. **Criar um novo pedido** com:
   - Data de emissão: `08/11/2025`
   - Prazo primeira parcela: `9 dias`
   - Condição de pagamento: `1x` (parcela única)

2. **Calcular data de vencimento esperada**:
   - Data base: `08/11/2025`
   - Adicionar 9 dias: `17/11/2025` ✅

3. **Verificar transação financeira criada**:
   - Data de vencimento: deve ser `17/11/2025` ✅
   - **SEM divergência de 1 dia**

### Múltiplas Parcelas

Para pedidos com parcelamento (exemplo: 3x):

| Parcela | Vencimento Esperado | Cálculo |
|---------|-------------------|---------|
| 1/3 | 17/11/2025 | Base + 0 dias |
| 2/3 | 17/12/2025 | Base + 30 dias |
| 3/3 | 16/01/2026 | Base + 60 dias |

Todas as datas **devem estar corretas** agora, sem problema de timezone.

---

## 📋 Arquivos Modificados

### `/contexts/ERPContext.tsx`

**Linha 26**: Adicionado import
```typescript
import { addDaysToDate } from '../utils/dateUtils';
```

**Linhas 1447-1449**: Correção do cálculo de data de vencimento
```typescript
const firstDueDateBase = calculateDueDate(order);
const dueDate = addDaysToDate(firstDueDateBase, i * 30);
```

---

## 🎯 Impacto da Correção

### ✅ Benefícios

1. **Consistência Total**: Datas de vencimento de pedidos e transações financeiras agora são **100% idênticas**
2. **Sem Problemas de Timezone**: Uso de utilitários padronizados que eliminam conversões de fuso horário
3. **Confiabilidade**: Relatórios financeiros e análises de vencimento agora são **precisos**
4. **Código Limpo**: Remoção de lógica manual de manipulação de datas, usando funções utilitárias testadas

### 🔄 Transações Existentes

**IMPORTANTE**: Esta correção afeta **apenas novos pedidos criados a partir de agora**. Transações financeiras já existentes no sistema **não serão alteradas retroativamente**.

Se houver necessidade de corrigir transações existentes:
1. Identificar transações com divergência de 1 dia
2. Ajustar manualmente na aba "Transações Financeiras"
3. Ou excluir o pedido e recriá-lo (se ainda não tiver movimentação financeira)

---

## 🔗 Documentação Relacionada

- **Correção anterior de datas**: `/CORRECAO_DATAS_PEDIDOS.md`
- **Utilitário de datas**: `/utils/dateUtils.ts`
- **Contexto ERP**: `/contexts/ERPContext.tsx`

---

## ✅ Status

**RESOLVIDO** ✅

- [x] Problema identificado
- [x] Causa raiz documentada
- [x] Solução implementada
- [x] Código atualizado
- [x] Documentação criada
- [x] Pronto para testes

---

**Data da Correção**: 08/11/2025  
**Desenvolvedor**: Sistema Figma Make AI  
**Versão**: 1.0
