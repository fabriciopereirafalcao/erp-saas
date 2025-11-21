# 🔍 Análise Completa - Máquina de Estados de Pedidos

## 📊 Configuração Atual

### Ordem de Status (SALES_STATUS_ORDER)
```typescript
[
  "Processando",      // índice 0
  "Confirmado",       // índice 1
  "Enviado",          // índice 2
  "Entregue",         // índice 3
  "Parcialmente Concluído",  // índice 4
  "Concluído"         // índice 5
]
```

### Transição: Processando → Entregue

**Status Intermediários Pulados:**
```typescript
getSkippedStatuses("Processando", "Entregue", 'sales')
// Retorna: ["Confirmado", "Enviado"]
```

**Cálculo:**
- currentIndex = 0 (Processando)
- requestedIndex = 3 (Entregue)
- slice(0 + 1, 3) = slice(1, 3)
- Resultado: ["Confirmado", "Enviado"] ✅

### Status a Processar
```typescript
statusesToProcess = [...skippedStatuses, newStatus]
// = ["Confirmado", "Enviado", "Entregue"]
```

## 🎯 Ações Configuradas por Status

### Status: "Processando"
**Nenhuma ação automática ao ENTRAR neste status**

### Status: "Confirmado"
**Nenhuma ação automática ao ENTRAR neste status**
- A documentação menciona "Validar estoque" mas não há case no switch

### Status: "Enviado"
**✅ AÇÃO CRÍTICA:** Baixar estoque

**Código (linha ~2003-2016):**
```typescript
case "Enviado":
  const stockResult = executeStockReduction(orderWithUpdatedContext);
  if (stockResult.success && stockResult.movementId) {
    updatedActionFlags.stockReduced = true;
    updatedActionFlags.stockReductionId = stockResult.movementId;
  }
  break;
```

**Esta é a ação que DEVERIA estar executando!**

### Status: "Entregue"
**✅ AÇÃO:** Criar transação financeira

**Código (linha ~2018-2034):**
```typescript
case "Entregue":
  const arResult = executeAccountsReceivableCreation(orderWithUpdatedContext);
  if (arResult.success) {
    updatedActionFlags.accountsReceivableCreated = true;
    updatedActionFlags.financialTransactionId = arResult.transactionId;
  }
  break;
```

## 🔬 Análise do Problema

### O Que Deveria Acontecer

1. Usuário altera status: **Processando → Entregue**
2. Sistema detecta status intermediários: **["Confirmado", "Enviado"]**
3. Sistema processa em ordem:
   - ✅ **"Confirmado"** → Nenhuma ação (nenhum case)
   - ✅ **"Enviado"** → Executar baixa de estoque ← **AQUI ESTÁ O PROBLEMA!**
   - ✅ **"Entregue"** → Criar transação financeira

### O Que Está Acontecendo

Segundo o relato do usuário:
- ❌ Baixa de estoque NÃO executa
- ✅ Transação financeira executa

Isso sugere que:
1. O loop está executando
2. O case "Entregue" está funcionando
3. MAS o case "Enviado" NÃO está funcionando

## 🐛 Possíveis Causas

### Hipótese 1: Status intermediários não são detectados
**Status:** ❌ DESCARTADA

**Motivo:** A função `getSkippedStatuses` está correta e deveria retornar `["Confirmado", "Enviado"]`.

**Verificação:** Os logs adicionados mostrarão se isso é verdade.

### Hipótese 2: Case "Enviado" não está executando
**Status:** 🔍 INVESTIGANDO

**Possíveis razões:**
- Problema de tipagem (espaços, maiúsculas/minúsculas)
- Break anterior impedindo execução
- Condição implícita não atendida

### Hipótese 3: executeStockReduction falha silenciosamente
**Status:** 🔍 INVESTIGANDO

**Possíveis razões:**
- Flag `stockReduced` já está true
- Produto não encontrado no inventário
- Validação bloqueia execução
- Lock não pode ser adquirido

### Hipótese 4: Pedido é multi-item
**Status:** 🔍 VERIFICAR

**Verificação:**
```typescript
const isMultiItemOrder = order.productName.includes('e mais') && order.productName.includes('item(ns)');
```

Se o pedido tiver `productName = "Produto A e mais 2 item(ns)"`, a função retorna sucesso SEM executar.

## 🔧 Correções Aplicadas

### 1. Logs de Debug Adicionados

**Linha 1980-1981:**
```typescript
console.log(`🔍 [DEBUG] Transição ${order.id}: ${oldStatus} → ${newStatus}`);
console.log(`🔍 [DEBUG] Status intermediários detectados:`, skippedStatuses);
```

**Linha 1989:**
```typescript
console.log(`🔍 [DEBUG] Status a processar:`, statusesToProcess);
```

**Linha 2001:**
```typescript
console.log(`🔍 [DEBUG LOOP] Processando status: "${status}"`);
```

**Linha 1446-1447:**
```typescript
console.log(`🔍 [executeStockReduction] INICIANDO para pedido ${order.id}`);
console.log(`🔍 [executeStockReduction] actionFlags:`, order.actionFlags);
```

**Linha 1463:**
```typescript
console.log(`🔍 [executeStockReduction] Resultado da validação:`, validation);
```

### 2. Correção de Assinatura de Função

**Linha 1976 - ANTES:**
```typescript
const skippedStatuses = getSkippedStatuses(oldStatus, newStatus, 'sales');
```

**Linha 1976 - DEPOIS:**
```typescript
const skippedStatuses = getSkippedStatuses(oldStatus, newStatus);
```

A função wrapper já passa 'sales' internamente.

## 🧪 Próximos Passos para Diagnóstico

### 1. Executar Teste Manual
Seguir instruções em `/TESTE_MANUAL_ESTOQUE.md`

### 2. Analisar Logs do Console
Os logs devem mostrar:
- Se status intermediários são detectados
- Se o loop entra no case "Enviado"  
- Se executeStockReduction é chamado
- Se a validação permite execução
- Qual é o resultado final

### 3. Verificar Dados do Pedido PV-1050
- `productName`: verificar se não é multi-item
- `actionFlags.stockReduced`: verificar se não está true
- `quantity`: verificar se é válido
- Produto existe no inventário?

### 4. Se Ainda Não Funcionar

Precisaremos:
1. Adicionar log DENTRO do case "Enviado" para confirmar entrada
2. Verificar se há algo bloqueando o switch
3. Verificar se o tipo do status está correto
4. Considerar possível bug do JavaScript/TypeScript com switch/case

## 📋 Checklist de Verificação

- [x] Função `getSkippedStatuses` corrigida
- [x] Logs de debug adicionados
- [x] Função `executeStockReduction` instrumentada
- [ ] Teste manual realizado
- [ ] Logs analisados
- [ ] Causa raiz identificada
- [ ] Solução permanente implementada

## 🎯 Hipótese Mais Provável

Com base na análise, a hipótese mais provável é:

**Hipótese 3: executeStockReduction falha devido a validação**

Especificamente:
1. O pedido PV-1050 pode já ter `actionFlags.stockReduced = true`
2. A validação bloqueia com: "Baixa de estoque já executada anteriormente"
3. Como o resultado é `success: false`, o código retorna e não atualiza

**Solução:** Testar com um pedido NOVO que nunca teve baixa de estoque.

---

**Data:** 11/11/2025  
**Status:** Aguardando teste do usuário
