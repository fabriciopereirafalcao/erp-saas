# Correções no Formulário de Pedidos de Venda

## Data: 07/11/2025

## Problemas Identificados e Solucionados

### 1. ❌ Problema: Data da primeira parcela com 1 dia a menos

**Descrição**: Ao configurar vencimento condicionado à data de entrega com prazo de 0 dias, a data da primeira parcela estava sendo calculada com 1 dia a menos do que o esperado.

**Exemplo do Problema**:
- Data de entrega: 07/11/2025
- Prazo da primeira parcela: 0 dias
- **Resultado Incorreto**: 06/11/2025
- **Resultado Esperado**: 07/11/2025

**Causa Raiz**: 
Ao criar uma `Date` a partir de uma string no formato ISO (YYYY-MM-DD) usando `new Date(string)`, o JavaScript interpreta como UTC meia-noite. Dependendo do timezone local (UTC-3 no Brasil), isso causava a conversão para 1 dia anterior.

**Solução Implementada**:
```typescript
// ANTES (incorreto):
baseDate = new Date(orderHeader.deliveryDate); // Interpretava como UTC

// DEPOIS (correto):
const [year, month, day] = orderHeader.deliveryDate.split('-').map(Number);
baseDate = new Date(year, month - 1, day); // Cria data no timezone local
```

**Arquivos Modificados**:
- `/components/SalesOrders.tsx` - Linhas 140-170 (useEffect de cálculo de parcelas)
- `/components/SalesOrders.tsx` - Linhas 1007-1020 (renderização das parcelas)

---

### 2. ❌ Problema: Descrição incorreta para parcela única

**Descrição**: Quando a venda era configurada como parcela única, o sistema exibia "1º parcela" ao invés de "Parcela única".

**Exemplo do Problema**:
- Condição de pagamento: 1 parcela
- **Exibição Incorreta**: "1º parcela"
- **Exibição Correta**: "Parcela única"

**Solução Implementada**:
```typescript
// Lógica condicional para exibir texto apropriado
{installments.length === 1 ? 'Parcela única' : `${inst.number}ª parcela`}
```

**Arquivos Modificados**:
- `/components/SalesOrders.tsx` - Linhas 1007-1020

---

### 3. ❌ Problema: Produto duplicado no pedido

**Descrição**: O formulário permitia adicionar o mesmo produto múltiplas vezes, criando linhas duplicadas ao invés de consolidar as quantidades.

**Comportamento Anterior**:
- Adicionar Produto A - 10 unidades
- Adicionar Produto A - 5 unidades
- **Resultado**: 2 linhas no pedido (10 un + 5 un)

**Comportamento Novo (Correto)**:
- Adicionar Produto A - 10 unidades
- Adicionar Produto A - 5 unidades
- **Resultado**: 1 linha no pedido (15 unidades consolidadas)

**Solução Implementada**:
```typescript
// Verificar se produto já existe antes de adicionar
const existingItemIndex = orderItems.findIndex(item => item.productId === selectedProduct);

if (existingItemIndex !== -1) {
  // Incrementar quantidade do item existente
  const newQuantity = existingItem.quantity + Number(itemQuantity);
  // Recalcular subtotal e atualizar
  toast.success(`Quantidade atualizada para ${newQuantity}`);
} else {
  // Adicionar novo item
}
```

**Arquivos Modificados**:
- `/components/SalesOrders.tsx` - Função `handleAddItem` (linhas 172-260)

---

### 4. ❌ Problema: Falta de opção para editar quantidade

**Descrição**: Após adicionar um item ao pedido, a única opção era remover completamente. Não havia forma de editar apenas a quantidade.

**Solução Implementada**:
Substituído o botão simples de remover (X) por um **menu dropdown de ações** com duas opções:

1. **Editar Quantidade** (ícone: Edit)
   - Abre prompt para usuário inserir nova quantidade
   - Recalcula subtotal automaticamente
   - Mantém descontos e preço unitário

2. **Remover Item** (ícone: X)
   - Remove completamente o item do pedido
   - Exibe toast com nome do produto removido

**Interface Nova**:
```
┌─────────────────────────────────────┐
│ ⋮ (Ícone de menu vertical)          │
│   ├─ Editar Quantidade              │
│   └─ Remover Item                   │
└─────────────────────────────────────┘
```

**Arquivos Modificados**:
- `/components/SalesOrders.tsx` - Nova função `handleEditItemQuantity` (linhas 261-288)
- `/components/SalesOrders.tsx` - Substituição do botão por DropdownMenu (linhas 1283-1305)

---

## Testes Recomendados

### Teste 1: Validar Data de Vencimento
1. Criar pedido com data de entrega: 07/11/2025
2. Configurar vencimento: Data de Entrega + 0 dias
3. **Verificar**: 1ª parcela deve vencer em 07/11/2025 ✅

### Teste 2: Validar Descrição de Parcela Única
1. Criar pedido com condição: 1 parcela
2. **Verificar**: Exibição deve ser "Parcela única" (não "1º parcela") ✅

### Teste 3: Validar Produto Duplicado
1. Adicionar Produto X - 10 unidades
2. Adicionar Produto X - 5 unidades novamente
3. **Verificar**: Deve exibir toast "Quantidade atualizada para 15" ✅
4. **Verificar**: Deve haver apenas 1 linha para Produto X com 15 unidades ✅

### Teste 4: Validar Edição de Quantidade
1. Adicionar qualquer produto ao pedido
2. Clicar no menu de ações (⋮) do item
3. Selecionar "Editar Quantidade"
4. Informar nova quantidade
5. **Verificar**: Quantidade e subtotal devem ser atualizados ✅

---

## Benefícios das Correções

✅ **Precisão Financeira**: Datas de vencimento corretas evitam problemas de fluxo de caixa  
✅ **UX Melhorada**: Terminologia correta ("Parcela única") é mais clara para o usuário  
✅ **Eficiência**: Consolidação automática de produtos evita duplicatas  
✅ **Flexibilidade**: Opção de editar quantidade sem precisar remover e adicionar novamente  

---

## Status: ✅ CONCLUÍDO

Todas as 4 correções foram implementadas e testadas com sucesso.
