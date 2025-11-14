# 🔧 Correção: Geração de Transações Financeiras Parceladas

## ❌ Problema Identificado

Ao mudar o status de um pedido para "Entregue", o sistema criava apenas **uma transação financeira** com o valor total (parcela 1/1), mesmo quando a condição de pagamento era parcelada (2x, 3x, etc.).

### Comportamento Incorreto
- **Pedido:** 2x ou 3x
- **Resultado:** 1 transação com valor total (parcela 1/1)
- **Esperado:** 2 ou 3 transações, uma para cada parcela

## 🔍 Causa Raiz

O problema estava na função `executeAccountsReceivableCreation` no arquivo `/contexts/ERPContext.tsx` (linha ~1405):

```typescript
// ❌ CÓDIGO ANTERIOR (INCORRETO)
let numberOfInstallments = 1;
if (order.paymentCondition) {
  const match = order.paymentCondition.match(/(\d+)x/i);
  if (match) {
    numberOfInstallments = parseInt(match[1]);
  }
}
```

### Por que falhava?

1. O campo `paymentCondition` nos pedidos é salvo como string numérica simples: `"1"`, `"2"`, `"3"`, etc.
2. O regex `/(\d+)x/i` buscava o formato `"2x"`, `"3x"` (com o "x" no final)
3. Como o formato real era apenas `"2"` ou `"3"`, o regex não encontrava match
4. Resultado: `numberOfInstallments` permanecia sempre como `1`
5. Conclusão: Apenas 1 transação era criada, independente da quantidade de parcelas

## ✅ Solução Implementada

Substituímos o regex por um `parseInt()` direto que funciona com ambos os formatos:

```typescript
// ✅ CÓDIGO NOVO (CORRETO)
let numberOfInstallments = 1;
if (order.paymentCondition) {
  // Aceitar tanto "2" quanto "2x" como formato
  const parsedValue = parseInt(order.paymentCondition);
  if (!isNaN(parsedValue) && parsedValue > 0) {
    numberOfInstallments = parsedValue;
  }
}
```

### Vantagens da nova abordagem:
- ✅ Funciona com formato numérico simples: `"1"`, `"2"`, `"3"`
- ✅ Funciona com formato "x": `"2x"`, `"3x"`
- ✅ Validação robusta: verifica se é número válido e positivo
- ✅ Compatível com todos os fluxos existentes

## 📋 Como Funciona Agora

### Fluxo Correto de Geração de Transações

Quando um pedido muda para status **"Entregue"**, a função `executeAccountsReceivableCreation` é chamada e:

1. **Extrai o número de parcelas** da condição de pagamento:
   - Se `paymentCondition = "3"` → `numberOfInstallments = 3`
   - Se `paymentCondition = "2x"` → `numberOfInstallments = 2`

2. **Calcula o valor de cada parcela**:
   ```typescript
   const installmentAmount = order.totalAmount / numberOfInstallments;
   ```

3. **Cria uma transação para cada parcela** (loop de 0 até `numberOfInstallments`):
   ```typescript
   for (let i = 0; i < numberOfInstallments; i++) {
     // Cria transação para parcela i+1
   }
   ```

4. **Cada transação contém**:
   - ✅ **ID único**: `FT-0001`, `FT-0002`, etc.
   - ✅ **Número da parcela**: `1/3`, `2/3`, `3/3`
   - ✅ **Valor da parcela**: `totalAmount / numberOfInstallments`
   - ✅ **Data de vencimento**: Calculada com base na data de referência + prazo + (30 dias × número da parcela)
   - ✅ **Status inicial**: `"A Receber"`
   - ✅ **Vínculo com pedido**: `reference: order.id`

### Exemplo Prático

#### Pedido Parcelado em 3x
- **Total:** R$ 3.000,00
- **Parcelas:** 3x
- **Primeira parcela:** 30 dias após emissão

**Transações Criadas:**
```
📄 FT-0001
   Descrição: Pedido de venda PV-1046 - Parcela 1/3
   Valor: R$ 1.000,00
   Vencimento: 2025-12-08 (30 dias)
   Status: A Receber
   
📄 FT-0002
   Descrição: Pedido de venda PV-1046 - Parcela 2/3
   Valor: R$ 1.000,00
   Vencimento: 2026-01-07 (60 dias)
   Status: A Receber
   
📄 FT-0003
   Descrição: Pedido de venda PV-1046 - Parcela 3/3
   Valor: R$ 1.000,00
   Vencimento: 2026-02-06 (90 dias)
   Status: A Receber
```

## 🧪 Testes de Validação

### Teste 1: Pedido Parcelado 2x
1. Criar pedido de venda com condição `"2"`
2. Mudar status para "Entregue"
3. **Resultado Esperado:** 2 transações financeiras criadas (parcelas 1/2 e 2/2)

### Teste 2: Pedido Parcelado 3x
1. Criar pedido de venda com condição `"3"`
2. Mudar status para "Entregue"
3. **Resultado Esperado:** 3 transações financeiras criadas (parcelas 1/3, 2/3, 3/3)

### Teste 3: Pedido À Vista
1. Criar pedido de venda com condição `"1"`
2. Mudar status para "Entregue"
3. **Resultado Esperado:** 1 transação financeira criada (parcela única)

### Teste 4: Modo Excepcional
1. Criar pedido em modo excepcional com status "Entregue" e condição `"2"`
2. **Resultado Esperado:** 2 transações financeiras criadas imediatamente

## 📊 Dados Técnicos da Implementação

### Arquivo Modificado
- **Caminho:** `/contexts/ERPContext.tsx`
- **Função:** `executeAccountsReceivableCreation`
- **Linhas:** ~1402-1410
- **Tipo:** Correção de lógica de parsing

### Cálculo de Datas de Vencimento
```typescript
// Data base: conforme referência (emissão/faturamento/entrega)
const firstDueDateBase = calculateDueDate(order);
const baseDueDate = new Date(firstDueDateBase);

// Adicionar 30 dias para cada parcela subsequente
baseDueDate.setDate(baseDueDate.getDate() + (i * 30));
```

### Descrição das Transações
```typescript
const description = numberOfInstallments === 1
  ? `Pedido de venda ${order.id} - Parcela única`
  : `Pedido de venda ${order.id} - Parcela ${i + 1}/${numberOfInstallments}`;
```

## 🔗 Integração com Outros Módulos

### 1. Módulo de Transações Financeiras
- Transações criadas aparecem automaticamente na aba "A Receber"
- Status inicial: `"A Receber"`
- Podem ser marcadas como "Recebido" manualmente pelo usuário

### 2. Atualização Automática do Status do Pedido
Quando o usuário marca parcelas como recebidas:
- **Primeira parcela recebida:** Status → `"Parcialmente Concluído"`
- **Todas as parcelas recebidas:** Status → `"Concluído"`

### 3. Proteções Implementadas
- ✅ IDs únicos garantidos pelo sistema de reserva
- ✅ Proteção contra duplicação (verifica transação existente antes de criar)
- ✅ Lock atômico durante criação para prevenir race conditions
- ✅ Logs detalhados de cada etapa do processo

## 📝 Logs do Sistema

Durante a criação de transações parceladas, o sistema registra:

```
📅 Configuração de parcelamento:
   paymentCondition: "3"
   numberOfInstallments: 3
   totalAmount: 3000

💾 Criando transação financeira 1/3:
   id: FT-0001
   status: A Receber
   amount: 1000
   dueDate: 2025-12-08
   installment: 1/3

💾 Criando transação financeira 2/3:
   id: FT-0002
   status: A Receber
   amount: 1000
   dueDate: 2026-01-07
   installment: 2/3

💾 Criando transação financeira 3/3:
   id: FT-0003
   status: A Receber
   amount: 1000
   dueDate: 2026-02-06
   installment: 3/3

📊 3 transação(ões) financeira(s) criada(s). Total: 150

✅ 3 conta(s) a receber criada(s) para pedido PV-1046
```

## ✨ Benefícios da Correção

1. **Conformidade com Requisitos:** Sistema agora cria transações conforme especificado
2. **Visibilidade Financeira:** Cada parcela é rastreável individualmente
3. **Controle de Recebimentos:** Usuário pode marcar recebimento de cada parcela separadamente
4. **Automação de Status:** Status do pedido atualiza automaticamente baseado em parcelas recebidas
5. **Relatórios Precisos:** Análise financeira mais precisa com parcelas individualizadas

## 🎯 Status

✅ **Correção implementada e testada**
✅ **Código robusto e compatível com formatos existentes**
✅ **Logs detalhados para debugging**
✅ **Documentação completa**

---

**Data de Implementação:** 08/11/2025  
**Criticidade:** Alta (CRIT)  
**Módulos Afetados:** Pedidos de Venda, Transações Financeiras  
**Impacto:** Correção de bug crítico no fluxo de parcelamento
