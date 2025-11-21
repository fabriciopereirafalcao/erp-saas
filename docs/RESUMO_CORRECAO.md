# ✅ Correção Aplicada - Problema de Redução de Estoque

## 🎯 Problema Identificado

**Local:** `/contexts/ERPContext.tsx` linha 1976  
**Função:** `updateSalesOrderStatus`

### O Erro:
```typescript
// ❌ ANTES (INCORRETO):
const skippedStatuses = getSkippedStatuses(oldStatus, newStatus, 'sales');
                                                                  ^^^^^^^^
                                                        Parâmetro extra inválido!
```

A função `getSkippedStatuses` aceita apenas **2 parâmetros**, mas estava sendo chamada com **3**.

## ✅ Correção Aplicada

```typescript
// ✅ DEPOIS (CORRETO):
const skippedStatuses = getSkippedStatuses(oldStatus, newStatus);
```

## 📊 Logs de Debug Adicionados

Para facilitar o diagnóstico, foram adicionados logs detalhados:

1. **Linha 1978-1979:** Log da transição e status intermediários
2. **Linha 1987:** Log dos status a processar
3. **Linha 1997:** Log de cada status no loop

## 🧪 Como Testar

### Passo a Passo:

1. Abra o console do navegador (F12)
2. Crie um pedido de venda em status "Processando"
3. Altere o status para "Entregue"
4. Observe os logs no console

### Logs Esperados:

```
🔍 [DEBUG] Transição PV-1050: Processando → Entregue
🔍 [DEBUG] Status intermediários detectados: (2) ["Confirmado", "Enviado"]
🔍 [DEBUG] Status a processar: (3) ["Confirmado", "Enviado", "Entregue"]
🔍 [DEBUG LOOP] Processando status: "Confirmado"
🔍 [DEBUG LOOP] Processando status: "Enviado"
🔍 [DEBUG LOOP] Processando status: "Entregue"
```

### Resultado Esperado:

✅ **Status "Enviado" deve executar:**
- Baixa de estoque automática
- Criação de movimento de estoque tipo "Saída"
- Flag `stockReduced = true`

✅ **Status "Entregue" deve executar:**
- Criação de transação financeira
- Criação de contas a receber
- Flag `accountsReceivableCreated = true`

## 📝 Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `/contexts/ERPContext.tsx` | Linha 1976: Removido parâmetro extra<br>Linhas 1978-1987: Logs de debug<br>Linha 1997: Log do loop |

## ✅ Status

**CORRIGIDO E PRONTO PARA TESTE**

Teste agora com o pedido PV-1050 e verifique se o estoque é reduzido corretamente ao alterar de "Processando" para "Entregue".
