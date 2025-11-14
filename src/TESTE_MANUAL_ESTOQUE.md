# 🧪 Teste Manual - Baixa de Estoque

## 📋 Problema Relatado
Pedidos de venda que mudam de "Processando" para "Entregue" NÃO estão reduzindo o estoque, apenas criando a transação financeira.

## 🔍 O Que Deve Acontecer

Quando um pedido passa de "Processando" → "Entregue", o sistema detecta os status intermediários pulados e deve executar:

1. **Status "Confirmado" (pulado):** Nenhuma ação automática
2. **Status "Enviado" (pulado):** ✅ Executar baixa de estoque
3. **Status "Entregue" (destino):** ✅ Criar transação financeira

## 🧪 Como Testar

### Passo 1: Abrir Console
1. Pressione `F12`
2. Vá para a aba "Console"
3. Limpe o console (clique no ícone 🚫)

### Passo 2: Criar ou Selecionar Pedido
- **Opção A:** Criar novo pedido em status "Processando"
- **Opção B:** Usar o pedido PV-1050 existente

### Passo 3: Alterar Status
1. Altere o status de "Processando" para "Entregue"
2. Observe os logs no console

## 📊 Logs Esperados

Se estiver funcionando corretamente, você verá:

```
🔍 [DEBUG] Transição PV-1050: Processando → Entregue
🔍 [DEBUG] Status intermediários detectados: (2) ["Confirmado", "Enviado"]
🔍 [DEBUG] Status a processar: (3) ["Confirmado", "Enviado", "Entregue"]

🔍 [DEBUG LOOP] Processando status: "Confirmado"

🔍 [DEBUG LOOP] Processando status: "Enviado"
🔍 [executeStockReduction] INICIANDO para pedido PV-1050
🔍 [executeStockReduction] actionFlags: { ... }
🔍 [executeStockReduction] Resultado da validação: { canProceed: true, ... }
🔄 Executando baixa de estoque para pedido PV-1050...
✅ Baixa executada com sucesso! Movimento: MOV-...

🔍 [DEBUG LOOP] Processando status: "Entregue"
📌 [CORREÇÃO DEFINITIVA] Transação criada e guardada: FIN-...
```

## ❌ Possíveis Problemas

### Problema 1: Status Intermediários Vazios
Se você ver:
```
🔍 [DEBUG] Status intermediários detectados: []
```

**Causa:** A função `getSkippedStatuses` não está retornando os status intermediários.

**Solução:** Verificar se o parâmetro `'sales'` está sendo passado corretamente.

### Problema 2: Case "Enviado" Não Executa
Se você NÃO ver os logs do `executeStockReduction`:

**Causa:** O case "Enviado" não está sendo alcançado no switch.

**Solução:** Verificar se há algum problema com o tipo do status (espaços, maiúsculas/minúsculas).

### Problema 3: Validação Bloqueia
Se você ver:
```
⚠️ [PV-1050] Validação de estoque falhou: Baixa de estoque já executada anteriormente
```

**Causa:** O pedido já tem a flag `stockReduced = true`.

**Solução:** Este é o comportamento correto! A validação está impedindo execução duplicada. Teste com um pedido novo.

### Problema 4: Produto Não Encontrado
Se você ver:
```
❌ Produto não encontrado: Nome do Produto
```

**Causa:** O produto do pedido não existe no inventário.

**Solução:** Verifique se o produto existe no módulo de Inventário.

## ✅ Como Verificar Sucesso

### 1. Verificar Estoque
1. Vá para o módulo "Inventário"
2. Localize o produto do pedido
3. Verifique se a quantidade foi reduzida

### 2. Verificar Movimento de Estoque
1. No console, procure por: `✅ Baixa executada com sucesso! Movimento: MOV-...`
2. Este ID deveria estar registrado no histórico

### 3. Verificar Transação Financeira
1. Vá para o módulo "Transações Financeiras"
2. Verifique se as contas a receber foram criadas
3. Procure pelo ID da transação mostrado no console

## 📝 Relatório de Teste

Após testar, forneça as seguintes informações:

### Informações do Pedido
- **ID do Pedido:** _______________
- **Produto:** _______________
- **Quantidade:** _______________
- **Status Inicial:** _______________
- **Status Final:** _______________

### Resultados
- [ ] Status intermediários foram detectados?
- [ ] Case "Enviado" foi executado?
- [ ] Baixa de estoque foi executada?
- [ ] Movimento de estoque foi criado?
- [ ] Transação financeira foi criada?
- [ ] Estoque foi reduzido corretamente?

### Logs do Console
Cole aqui os logs relevantes do console:

```
[COLE OS LOGS AQUI]
```

### Capturas de Tela
- [ ] Console com os logs
- [ ] Estoque antes da alteração
- [ ] Estoque depois da alteração
- [ ] Transação financeira criada

## 🆘 Se Ainda Não Funcionar

Se após todos esses testes a baixa de estoque ainda não estiver acontecendo, precisaremos:

1. **Verificar o código do switch case** para confirmar que "Enviado" está escrito exatamente igual
2. **Verificar se há alguma condição** que está impedindo a execução
3. **Verificar se há algum erro** sendo suprimido silenciosamente
4. **Verificar o tipo de dado** do status para confirmar que não há espaços ou caracteres invisíveis

---

**Criado em:** 11/11/2025  
**Versão:** 1.0
