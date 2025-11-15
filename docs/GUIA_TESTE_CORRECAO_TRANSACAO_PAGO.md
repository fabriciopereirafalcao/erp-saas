# 🧪 Guia de Teste: Correção de Duplicação de Transações

## ⚡ Teste Rápido (5 minutos)

### Passo 1: Criar Pedido de Venda
1. Abra o módulo **Pedidos de Venda**
2. Clique em **"+ Criar Pedido"**
3. Preencha os dados:
   - **Cliente**: Qualquer cliente ativo
   - **Produto**: Qualquer produto do estoque
   - **Quantidade**: 1
   - **Status inicial**: Deve estar em **"Processando"** por padrão
4. Clique em **"Criar Pedido"**
5. **Anote o ID do pedido** (ex: PV-1025)

### Passo 2: Verificar Estado Inicial
1. Abra o módulo **Transações Financeiras**
2. Verifique que **NÃO** há transação para este pedido ainda
3. ✅ **Esperado**: Nenhuma transação com referência PV-1025

### Passo 3: Alterar Status para Pago
1. Volte ao módulo **Pedidos de Venda**
2. Localize o pedido criado (PV-1025)
3. Clique no **menu de ações** (três pontinhos)
4. Selecione **"Alterar Status"**
5. Escolha **"Pago"**
6. Confirme a alteração

### Passo 4: Verificar Resultado (Console)
1. Abra o **Console do navegador** (F12)
2. Procure pelos logs:
   ```
   ✅ Transição permitida [PV-1025]: Processando → Pago
   🔄 Criando conta a receber para pedido PV-1025...
   ✅ Conta a receber criada: FIN-XXXX para pedido PV-1025
   🔄 Recebendo pagamento para pedido PV-1025...
   ✅ Transação encontrada por referência: FIN-XXXX com status "A Vencer"
   🔄 Atualizando transação existente FIN-XXXX para "Recebido"...
   ✅ Transação FIN-XXXX atualizada para "Recebido"
   ```

3. ✅ **SUCESSO** se ver: `"Transação encontrada por referência"`
4. ❌ **PROBLEMA** se ver: `"Criando nova transação"`

### Passo 5: Verificar Módulo Financeiro
1. Abra o módulo **Transações Financeiras**
2. Procure por transações do pedido PV-1025
3. **Contagem esperada**: ✅ **1 transação apenas**
4. **Status esperado**: ✅ **"Recebido"**
5. **Valor**: ✅ Deve ser o valor total do pedido

### Passo 6: Verificar Saldo Bancário
1. Abra **Configurações da Empresa** > **Contas Bancárias**
2. Verifique o saldo da conta usada
3. ✅ **Esperado**: Saldo aumentou exatamente o valor do pedido (1x)
4. ❌ **Problema**: Saldo aumentou 2x o valor

---

## ✅ Critérios de Sucesso

| Item | Esperado | Onde Verificar |
|------|----------|----------------|
| **Transações criadas** | 1 única | Módulo Financeiro |
| **Status da transação** | "Recebido" | Módulo Financeiro |
| **Log no console** | "encontrada por referência" | Console (F12) |
| **Saldo bancário** | +valor do pedido (1x) | Configurações > Banco |
| **Dados do cliente** | totalSpent correto | Módulo Clientes |

---

## 🔍 Teste Completo (10 minutos)

### Cenário 1: Pulo Direto (Processando → Pago)
**Status**: ✅ Este é o caso corrigido

1. Criar pedido com status "Processando"
2. Alterar diretamente para "Pago"
3. **Resultado**: 1 transação com status "Recebido"

### Cenário 2: Sequencial (Processando → Entregue → Pago)
**Status**: ✅ Já funcionava, mas validar que continua funcionando

1. Criar pedido com status "Processando"
2. Alterar para "Entregue"
   - ✅ Deve criar 1 transação com status "A Vencer"
3. Alterar para "Pago"
   - ✅ Deve **atualizar** a mesma transação para "Recebido"
   - ✅ Total de transações: 1

### Cenário 3: Pulo Parcial (Processando → Confirmado → Pago)
**Status**: ✅ Corrigido

1. Criar pedido com status "Processando"
2. Alterar para "Confirmado"
3. Alterar para "Pago"
4. **Resultado**: 1 transação com status "Recebido"

---

## 🐛 Troubleshooting

### ❌ Problema: Ainda cria 2 transações

**Verificar**:
1. A correção foi aplicada corretamente em `/contexts/ERPContext.tsx`?
2. O cache do navegador foi limpo? (Ctrl+Shift+R)
3. Os logs mostram "Transação encontrada por referência"?

**Ação**:
- Recarregar a página completamente
- Verificar console por erros
- Verificar se o código foi salvo corretamente

### ❌ Problema: Erro ao alterar status

**Logs esperados**:
```
❌ Erro ao receber pagamento: [mensagem de erro]
```

**Ação**:
- Copiar mensagem completa do erro
- Verificar se existe transação anterior com referência duplicada
- Verificar se o lock está funcionando corretamente

### ⚠️ Problema: Transação não encontrada

**Logs esperados**:
```
ℹ️ Nenhuma transação anterior encontrada. Criando nova transação...
```

**Isso pode ser normal se**:
- Pedido foi criado já com status "Pago" (não passou por "Entregue")
- Transação anterior foi cancelada

**Ação**:
- Verificar histórico do pedido
- Verificar se existe transação cancelada com mesma referência

---

## 📊 Logs Detalhados para Debug

### Log Completo de Sucesso
```
🔄 Transição permitida [PV-1025]: Processando → Pago
Status intermediários executados: Confirmado → Enviado → Entregue

// AÇÃO DO STATUS "ENTREGUE"
🔄 Criando conta a receber para pedido PV-1025...
💾 Criando transação financeira: {
  id: 'FIN-2001',
  status: 'A Vencer',
  amount: 1500,
  reference: 'PV-1025'
}
📊 Array de transações atualizado. Total: 15
✅ Conta a receber criada: FIN-2001 para pedido PV-1025

// AÇÃO DO STATUS "PAGO"
🔄 Recebendo pagamento para pedido PV-1025...
✅ Transação encontrada por referência: FIN-2001 com status "A Vencer"
🔄 Atualizando transação existente FIN-2001 para "Recebido"...
✅ Transação FIN-2001 atualizada para "Recebido"
✅ Pagamento recebido: FIN-2001

// RESULTADO FINAL
💾 Salvando pedido PV-1025 com actionFlags: {
  stockReduced: true,
  accountsReceivableCreated: true,
  accountsReceivablePaid: true,
  financialTransactionId: 'FIN-2001',
  customerStatsUpdated: true
}
✅ Pedido pago! Pagamento recebido e saldo atualizado.
```

---

## 📋 Checklist de Validação

### Antes do Teste
- [ ] Código atualizado em `/contexts/ERPContext.tsx`
- [ ] Cache do navegador limpo
- [ ] Console aberto (F12) para monitorar logs
- [ ] Módulo Financeiro aberto em outra aba

### Durante o Teste
- [ ] Pedido criado com status "Processando"
- [ ] ID do pedido anotado
- [ ] Status alterado para "Pago"
- [ ] Logs monitorados no console

### Depois do Teste
- [ ] ✅ Apenas 1 transação criada
- [ ] ✅ Status da transação: "Recebido"
- [ ] ✅ Saldo bancário correto (1x valor)
- [ ] ✅ totalSpent do cliente correto
- [ ] ✅ Log mostra "encontrada por referência"

---

## 🎯 Resultados Esperados

### ✅ SUCESSO (Correção Funcionando)

**Console**:
```
✅ Transação encontrada por referência: FIN-XXXX
🔄 Atualizando transação existente FIN-XXXX para "Recebido"
```

**Financeiro**:
- 1 transação com status "Recebido"
- Valor correto
- Referência correta ao pedido

**Banco**:
- Saldo aumentou 1x valor do pedido

---

### ❌ FALHA (Problema Ainda Existe)

**Console**:
```
ℹ️ Nenhuma transação anterior encontrada. Criando nova transação...
💾 Criando nova transação (modo Pago): FIN-YYYY
```

**Financeiro**:
- 2 transações (FIN-XXXX e FIN-YYYY)
- Uma com status "A Vencer"
- Outra com status "Recebido"

**Banco**:
- Saldo aumentou 2x valor do pedido ❌

---

## 💡 Dicas

1. **Teste múltiplas vezes** com valores diferentes para garantir consistência
2. **Monitore os logs** para entender o fluxo
3. **Use o histórico do pedido** para ver todas as ações executadas
4. **Verifique o módulo de auditoria** se estiver ativo
5. **Compare com pedidos antigos** para ver a diferença

---

## 📞 Suporte

Se encontrar problemas durante o teste:
1. Copie todos os logs do console
2. Anote o ID do pedido problemático
3. Tire screenshot do módulo financeiro
4. Verifique o arquivo `/CORRECAO_DUPLICACAO_TRANSACAO_PAGO.md`

---

**Última Atualização**: 07/11/2024  
**Versão do Guia**: 1.0  
**Tempo Estimado**: 5-10 minutos
