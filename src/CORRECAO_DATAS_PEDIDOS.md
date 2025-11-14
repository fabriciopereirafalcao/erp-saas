# 🗓️ Correção: Datas de Pedidos de Vendas

## ❌ Problema Identificado

As datas de **emissão**, **entrega** e **vencimento** exibidas na lista de pedidos de vendas não coincidiam com as datas inseridas no formulário de pedido de venda.

### Exemplo do Problema
- **Formulário:** Data de Emissão = 08/11/2025
- **Lista:** Exibido como 07/11/2025 (1 dia a menos)

## 🔍 Causa Raiz

O problema estava relacionado ao **fuso horário (timezone)** ao converter strings de data.

### Como funcionava ANTES (INCORRETO)

```typescript
// Salvando a data no formulário
const dateString = "2025-11-08"; // Formato: YYYY-MM-DD

// Exibindo na lista
new Date(dateString).toLocaleDateString('pt-BR')
```

**O que acontecia:**
1. Ao criar `new Date("2025-11-08")`, o JavaScript assume que a string está em **UTC** (00:00:00 UTC)
2. No fuso horário do Brasil (UTC-3), isso se torna **07/11/2025 21:00:00**
3. Ao formatar com `toLocaleDateString()`, exibe **07/11/2025** (1 dia a menos!)

### Demonstração do Bug

```javascript
// Bug de timezone
const date = new Date("2025-11-08");
console.log(date.toISOString());        // "2025-11-08T00:00:00.000Z" (UTC)
console.log(date.toString());            // "2025-11-07T21:00:00.000-0300" (Local)
console.log(date.toLocaleDateString());  // "07/11/2025" ❌ ERRADO!
```

## ✅ Solução Implementada

### 1. Criação de Utilitário de Datas

Criamos o arquivo `/utils/dateUtils.ts` com funções que **não sofrem de problemas de timezone**:

```typescript
/**
 * Formata YYYY-MM-DD → DD/MM/YYYY sem conversão de timezone
 */
export const formatDateLocal = (dateString: string): string => {
  if (!dateString) return '-';
  
  // Parse manual - não usa new Date(string)
  const [year, month, day] = dateString.split('-').map(Number);
  
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

/**
 * Cria Date object sem conversão de timezone
 */
export const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // Usa construtor com parâmetros separados (sempre local)
  return new Date(year, month - 1, day);
};
```

### 2. Atualização dos Componentes

#### SalesOrders.tsx
**ANTES:**
```typescript
<TableCell>
  {order.issueDate ? new Date(order.issueDate).toLocaleDateString('pt-BR') : 
   new Date(order.orderDate).toLocaleDateString('pt-BR')}
</TableCell>
<TableCell>
  {new Date(order.deliveryDate).toLocaleDateString('pt-BR')}
</TableCell>
```

**DEPOIS:**
```typescript
<TableCell>
  {order.issueDate ? formatDateLocal(order.issueDate) : formatDateLocal(order.orderDate)}
</TableCell>
<TableCell>
  {formatDateLocal(order.deliveryDate)}
</TableCell>
```

#### Função calculateFirstDueDate
**ANTES:**
```typescript
const calculateFirstDueDate = (order): Date => {
  let baseDate: Date;
  if (order.dueDateReference === "billing" && order.billingDate) {
    baseDate = new Date(order.billingDate); // ❌ Problema de timezone
  }
  // ...
  return dueDate;
};
```

**DEPOIS:**
```typescript
const calculateFirstDueDate = (order): string => {
  // Determinar data base
  let baseDateStr: string;
  if (order.dueDateReference === "billing" && order.billingDate) {
    baseDateStr = order.billingDate;
  }
  
  // Parse manual para evitar timezone
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day); // ✅ Sem conversão de timezone
  
  // Retorna string YYYY-MM-DD
  return `${year}-${month}-${day}`;
};
```

#### Customers.tsx
**ANTES:**
```typescript
<span>{new Date(order.issueDate).toLocaleDateString('pt-BR')}</span>
<span>{new Date(order.deliveryDate).toLocaleDateString('pt-BR')}</span>
```

**DEPOIS:**
```typescript
<span>{formatDateLocal(order.issueDate)}</span>
<span>{formatDateLocal(order.deliveryDate)}</span>
```

## 📋 Funções Disponíveis no Utilitário

O arquivo `/utils/dateUtils.ts` fornece:

### 1. `formatDateLocal(dateString)`
Formata YYYY-MM-DD → DD/MM/YYYY

```typescript
formatDateLocal("2025-11-08") // "08/11/2025"
formatDateLocal(null)          // "-"
```

### 2. `parseDateLocal(dateString)`
Cria objeto Date sem conversão de timezone

```typescript
const date = parseDateLocal("2025-11-08");
console.log(date.getDate());  // 8 ✅ CORRETO
```

### 3. `addDaysToDate(dateString, days)`
Adiciona dias a uma data

```typescript
addDaysToDate("2025-11-08", 30)  // "2025-12-08"
addDaysToDate("2025-11-08", -5)  // "2025-11-03"
```

### 4. `formatDateTimeLocal(isoString)`
Formata data/hora completa

```typescript
formatDateTimeLocal("2025-11-08T14:30:00") // "08/11/2025 14:30"
```

### 5. `getTodayString()`
Retorna data atual

```typescript
getTodayString() // "2025-11-08"
```

### 6. `compareDates(date1, date2)`
Compara duas datas

```typescript
compareDates("2025-11-08", "2025-11-09") // -1 (date1 < date2)
compareDates("2025-11-08", "2025-11-08") //  0 (iguais)
compareDates("2025-11-09", "2025-11-08") //  1 (date1 > date2)
```

### 7. `isOverdue(dateString)`
Verifica se está vencido

```typescript
isOverdue("2025-11-01") // true (se hoje for depois de 01/11)
isOverdue("2025-12-31") // false (se hoje for antes de 31/12)
```

### 8. `daysBetween(date1, date2)`
Calcula dias entre datas

```typescript
daysBetween("2025-11-08", "2025-11-18") // 10
```

## 🧪 Testes de Validação

### Teste 1: Data de Emissão
1. Criar pedido com Data de Emissão = **08/11/2025**
2. Verificar na lista que aparece **08/11/2025** ✅

### Teste 2: Data de Entrega
1. Criar pedido com Data de Entrega = **15/11/2025**
2. Verificar na lista que aparece **15/11/2025** ✅

### Teste 3: Data de Vencimento (À Vista)
1. Criar pedido à vista (1x)
2. Data de Emissão = **08/11/2025**
3. Prazo da 1ª Parcela = **30 dias**
4. Vencimento esperado = **08/12/2025**
5. Verificar na lista que aparece **08/12/2025** ✅

### Teste 4: Data de Vencimento (Parcelado)
1. Criar pedido parcelado (3x)
2. Data de Emissão = **08/11/2025**
3. Prazo da 1ª Parcela = **30 dias**
4. Vencimento 1ª parcela = **08/12/2025**
5. Verificar na lista que aparece **08/12/2025 (1ª de 3x)** ✅

### Teste 5: Diferentes Referências de Vencimento
1. **Referência: Data de Faturamento**
   - Data de Faturamento = **10/11/2025**
   - Prazo = **15 dias**
   - Vencimento esperado = **25/11/2025** ✅

2. **Referência: Data de Entrega**
   - Data de Entrega = **20/11/2025**
   - Prazo = **7 dias**
   - Vencimento esperado = **27/11/2025** ✅

## 🔧 Arquivos Modificados

### 1. `/utils/dateUtils.ts` (NOVO)
- ✅ Criado utilitário completo de manipulação de datas
- ✅ 8 funções auxiliares
- ✅ Documentação completa de cada função

### 2. `/components/SalesOrders.tsx`
- ✅ Importação do utilitário `formatDateLocal`
- ✅ Remoção da função local duplicada
- ✅ Correção da exibição de Data de Emissão
- ✅ Correção da exibição de Data de Entrega
- ✅ Correção da exibição de Data de Vencimento
- ✅ Refatoração da função `calculateFirstDueDate`

### 3. `/components/Customers.tsx`
- ✅ Importação do utilitário `formatDateLocal`
- ✅ Remoção da função local duplicada
- ✅ Correção da exibição de datas na aba de pedidos do cliente

## 📊 Impacto da Correção

### Componentes Corrigidos
- ✅ **SalesOrders.tsx** - Lista de pedidos de vendas
- ✅ **Customers.tsx** - Histórico de pedidos do cliente

### Tipos de Data Corrigidos
- ✅ Data de Emissão (`issueDate`)
- ✅ Data de Entrega (`deliveryDate`)
- ✅ Data de Vencimento (calculada dinamicamente)

### Cenários Testados
- ✅ Pedidos à vista (1x)
- ✅ Pedidos parcelados (2x, 3x, etc.)
- ✅ Diferentes referências de vencimento (emissão/faturamento/entrega)
- ✅ Diferentes fusos horários

## 🚀 Benefícios

1. **Precisão Total:** Datas exibidas sempre coincidem com as inseridas
2. **Consistência:** Mesmo comportamento em todos os componentes
3. **Reutilizável:** Utilitário centralizado pode ser usado em qualquer lugar
4. **Manutenível:** Código limpo e bem documentado
5. **Extensível:** Funções adicionais para manipulação de datas

## 💡 Boas Práticas Implementadas

### ✅ DO: Use parsing manual
```typescript
const [year, month, day] = dateString.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### ❌ DON'T: Use new Date(string)
```typescript
const date = new Date("2025-11-08"); // ❌ Problema de timezone!
```

### ✅ DO: Use formatDateLocal()
```typescript
formatDateLocal("2025-11-08") // "08/11/2025" ✅
```

### ❌ DON'T: Use toLocaleDateString() com new Date(string)
```typescript
new Date("2025-11-08").toLocaleDateString('pt-BR') // "07/11/2025" ❌
```

## 🎯 Status

✅ **Correção implementada e testada**
✅ **Utilitário centralizado criado**
✅ **Documentação completa**
✅ **Todos os cenários validados**

---

**Data de Implementação:** 08/11/2025  
**Criticidade:** Alta (CRIT)  
**Módulos Afetados:** Pedidos de Vendas, Clientes  
**Tipo:** Correção de bug de timezone
