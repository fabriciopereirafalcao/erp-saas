# Debug - Problema de Redução de Estoque

## Correções Aplicadas

1. **Linha 1439**: Adicionado parâmetro `'sales'` na função `getSkippedStatuses`:
   ```typescript
   const getSkippedStatuses = (currentStatus: SalesOrder['status'], newStatus: SalesOrder['status']): SalesOrder['status'][] => {
     return getSkippedStatusesFromValidator(
       currentStatus as any,
       newStatus as any,
       'sales' // <-- ADICIONADO
     ) as SalesOrder['status'][];
   };
   ```

2. **Linha 1976**: Adicionado parâmetro `'sales'` na chamada de `getSkippedStatuses`:
   ```typescript
   const skippedStatuses = getSkippedStatuses(oldStatus, newStatus, 'sales');
   ```

3. **Logs de Debug Adicionados**:
   - Linha 1978: Log de transição e status intermediários
   - Linha 1987: Log de status a processar
   - Linha 1997: Log para cada status sendo processado no loop

## Como Testar

1. Abra o console do navegador (F12)
2. Crie um pedido em status "Processando"
3. Mude o status para "Entregue"
4. Verifique os logs no console:
   - `🔍 [DEBUG] Transição PV-XXXX: Processando → Entregue`
   - `🔍 [DEBUG] Status intermediários detectados: ["Confirmado", "Enviado"]`
   - `🔍 [DEBUG] Status a processar: ["Confirmado", "Enviado", "Entregue"]`
   - `🔍 [DEBUG LOOP] Processando status: "Confirmado"`
   - `🔍 [DEBUG LOOP] Processando status: "Enviado"`
   - `🔍 [DEBUG LOOP] Processando status: "Entregue"`

## O que Deve Acontecer

Quando o status "Enviado" for processado, o case deve executar e chamar `executeStockReduction`.

## Possíveis Problemas

Se mesmo com essas correções o estoque não for reduzido, pode ser:
1. O `executeStockReduction` está retornando sucesso mas não executando (verificar logs internos)
2. O produto não é encontrado no inventário
3. O pedido é multi-item e está sendo detectado incorretamente
