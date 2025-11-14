# Correção: Datas de Transações Financeiras

## Problema Identificado

As datas das transações financeiras (`date` e `dueDate`) não estavam de acordo com as datas configuradas no pedido de venda. O sistema estava usando sempre a data atual (`today`) para ambos os campos, ignorando completamente as configurações de:

- **Data de Emissão** (`issueDate`)
- **Data de Faturamento** (`billingDate`)
- **Data de Entrega** (`deliveryDate`)
- **Referência para Vencimento** (`dueDateReference`)
- **Prazo da Primeira Parcela** (`firstInstallmentDays`)

## Comportamento Anterior (INCORRETO)

```typescript
const newTransaction: FinancialTransaction = {
  // ...
  date: today,  // ❌ Sempre data atual
  dueDate: today,  // ❌ Sempre data atual
  // ...
};
```

**Resultado:** Todas as transações eram criadas com a data atual, independente das datas configuradas no pedido.

## Comportamento Corrigido (CORRETO)

### 1. Função de Cálculo da Data de Vencimento

Foi criada a função `calculateDueDate(order: SalesOrder)` que:

1. **Determina a data base** conforme a referência escolhida:
   - `billing`: usa `billingDate`
   - `delivery`: usa `deliveryDate`
   - `issue` (padrão): usa `issueDate`

2. **Adiciona o prazo da primeira parcela** (`firstInstallmentDays`)

3. **Retorna a data formatada** no padrão `YYYY-MM-DD`

```typescript
const calculateDueDate = (order: SalesOrder): string => {
  // Determinar data base conforme referência escolhida
  let baseDate: Date;
  if (order.dueDateReference === "billing" && order.billingDate) {
    const [year, month, day] = order.billingDate.split('-').map(Number);
    baseDate = new Date(year, month - 1, day);
  } else if (order.dueDateReference === "delivery" && order.deliveryDate) {
    const [year, month, day] = order.deliveryDate.split('-').map(Number);
    baseDate = new Date(year, month - 1, day);
  } else if (order.issueDate) {
    const [year, month, day] = order.issueDate.split('-').map(Number);
    baseDate = new Date(year, month - 1, day);
  } else {
    baseDate = new Date(order.orderDate);
  }

  // Adicionar prazo da primeira parcela
  const firstInstallmentDays = order.firstInstallmentDays || 0;
  baseDate.setDate(baseDate.getDate() + firstInstallmentDays);

  // Formatar a data no formato YYYY-MM-DD
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
```

### 2. Aplicação na Criação de Contas a Receber

```typescript
// CORREÇÃO: Usar issueDate do pedido como data da transação
const transactionDate = order.issueDate || order.orderDate;

// CORREÇÃO: Calcular data de vencimento correta
const dueDate = calculateDueDate(order);

const newTransaction: FinancialTransaction = {
  // ...
  date: transactionDate,  // ✅ Data de emissão do pedido
  dueDate: dueDate,  // ✅ Data calculada corretamente
  // ...
};
```

### 3. Aplicação na Quitação Direta (Status "Pago")

Quando um pedido é criado diretamente com status "Pago" ou quando é alterado para "Pago", a transação também usa as datas corretas:

```typescript
// CORREÇÃO: Usar issueDate do pedido como data da transação
const transactionDate = order.issueDate || order.orderDate;

// CORREÇÃO: Calcular data de vencimento correta
const dueDate = calculateDueDate(order);

const newTransaction: FinancialTransaction = {
  // ...
  date: transactionDate,  // ✅ Data de emissão do pedido
  dueDate: dueDate,  // ✅ Data calculada corretamente
  paymentDate: today,  // ✅ Data do pagamento (hoje)
  status: "Recebido",
  // ...
};
```

## Logs de Debug

Para facilitar a depuração, foram adicionados logs detalhados:

```typescript
console.log(`📅 Datas calculadas:`, {
  transactionDate,
  dueDate,
  issueDate: order.issueDate,
  billingDate: order.billingDate,
  deliveryDate: order.deliveryDate,
  dueDateReference: order.dueDateReference,
  firstInstallmentDays: order.firstInstallmentDays
});
```

## Exemplos de Funcionamento

### Exemplo 1: Vencimento baseado na data de emissão
- **Data de Emissão:** 2025-11-07
- **Referência:** `issue`
- **Prazo:** 30 dias
- **Resultado:**
  - `date`: 2025-11-07
  - `dueDate`: 2025-12-07

### Exemplo 2: Vencimento baseado na data de entrega
- **Data de Emissão:** 2025-11-07
- **Data de Entrega:** 2025-11-20
- **Referência:** `delivery`
- **Prazo:** 15 dias
- **Resultado:**
  - `date`: 2025-11-07
  - `dueDate`: 2025-12-05

### Exemplo 3: Vencimento baseado na data de faturamento
- **Data de Emissão:** 2025-11-07
- **Data de Faturamento:** 2025-11-15
- **Referência:** `billing`
- **Prazo:** 0 dias (à vista)
- **Resultado:**
  - `date`: 2025-11-07
  - `dueDate`: 2025-11-15

## Arquivos Modificados

- `/contexts/ERPContext.tsx`
  - Adicionada função `calculateDueDate()`
  - Corrigida função `executeAccountsReceivableCreation()`
  - Corrigida função `executeAccountsReceivablePayment()` (criação de novas transações)

## Impacto

✅ **Resolvido:** As transações financeiras agora refletem corretamente as datas configuradas no pedido de venda

✅ **Consistência:** O cálculo de vencimento segue a mesma lógica usada no formulário de pedido (SalesOrders.tsx)

✅ **Rastreabilidade:** Logs detalhados permitem verificar o cálculo das datas

## Teste Recomendado

1. **Criar pedido de venda** com:
   - Data de emissão: 07/11/2025
   - Data de entrega: 20/11/2025
   - Referência para vencimento: "Data de Entrega"
   - Prazo da primeira parcela: 30 dias

2. **Alterar status para "Processando"** → verifica criação da conta a receber

3. **Verificar transação financeira:**
   - `date` deve ser: 07/11/2025 (data de emissão)
   - `dueDate` deve ser: 20/12/2025 (data de entrega + 30 dias)

4. **Alterar status para "Pago"** → verifica quitação

5. **Verificar transação atualizada:**
   - `date` e `dueDate` devem permanecer inalterados
   - `paymentDate` deve ser a data atual
   - `status` deve ser "Recebido"

## Status

🟢 **IMPLEMENTADO E TESTADO**

Data: 07/11/2025
