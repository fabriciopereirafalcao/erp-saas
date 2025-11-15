# 🧪 GUIA DE VALIDAÇÃO - Correção de Duplicação de Transações

**Objetivo:** Validar que a correção eliminou a duplicação de transações financeiras

---

## 📋 Teste 1: Criar Pedido como "Processando" e Alterar para "Pago"

### Passo a Passo

1. **Criar novo pedido de venda:**
   - Cliente: Qualquer cliente cadastrado
   - Produto: Qualquer produto em estoque
   - Quantidade: 10 unidades
   - **Status inicial: "Processando"** ⚠️
   - Salvar

2. **Verificar lançamentos financeiros:**
   - Ir em "Financeiro" → "Transações Financeiras"
   - ✅ **Deve estar VAZIO** (nenhuma transação criada ainda)

3. **Alterar status do pedido para "Pago":**
   - Voltar ao pedido criado
   - Alterar status: "Processando" → **"Pago"**
   - Confirmar alteração

4. **Verificar lançamentos financeiros novamente:**
   - Ir em "Financeiro" → "Transações Financeiras"
   - ✅ **Deve ter APENAS 1 transação**
   - ✅ Status: **"Recebido"**
   - ✅ Origem: "Pedido"
   - ✅ Referência: ID do pedido (ex: PV-1046)

### ✅ Resultado Esperado

```
Transações Financeiras: 1 registro

┌──────────┬──────────┬────────────┬──────────────┬──────────┐
│ ID       │ Tipo     │ Status     │ Valor        │ Origem   │
├──────────┼──────────┼────────────┼──────────────┼──────────┤
│ FT-0001  │ Receita  │ Recebido   │ R$ 1.000,00  │ Pedido   │
└──────────┴──────────┴────────────┴──────────────┴──────────┘
```

### ❌ Resultado Incorreto (Antes da Correção)

```
Transações Financeiras: 2 registros ⚠️ DUPLICAÇÃO!

┌──────────┬──────────┬────────────┬──────────────┬──────────┐
│ ID       │ Tipo     │ Status     │ Valor        │ Origem   │
├──────────┼──────────┼────────────┼──────────────┼──────────┤
│ FT-0001  │ Receita  │ A Vencer   │ R$ 1.000,00  │ Pedido   │ ⚠️
│ FT-0002  │ Receita  │ Recebido   │ R$ 1.000,00  │ Pedido   │ ⚠️
└──────────┴──────────┴────────────┴──────────────┴──────────┘
```

---

## 📋 Teste 2: Verificar Logs do Console

### O que procurar

Abra o Console do navegador (F12) e observe os logs durante a alteração de status:

### ✅ Logs Corretos (Após Correção)

```
✅ Transição permitida [PV-1046]: Processando → Pago
🔄 Criando conta a receber para pedido PV-1046...
💾 Criando transação financeira: { id: 'FT-0001', status: 'A Vencer', ... }
📌 [CORREÇÃO] TransactionId salvo no contexto: FT-0001  ← NOVO LOG!
✅ Conta a receber criada: FT-0001 para pedido PV-1046
🔄 Recebendo pagamento para pedido PV-1046...
🔍 Procurando transação por actionFlags: FT-0001  ← Encontrou!
✅ Transação encontrada por ID: FT-0001 com status "A Vencer"
🔄 Atualizando transação existente FT-0001 para "Recebido"...
✅ Transação FT-0001 atualizada para "Recebido"
✅ Pagamento recebido: FT-0001
```

**Indicadores de sucesso:**
- ✅ Linha com `[CORREÇÃO] TransactionId salvo no contexto`
- ✅ Linha com `Transação encontrada por ID`
- ✅ Linha com `Atualizando transação existente`
- ✅ **NENHUMA** linha com `Criando nova transação (modo Pago)`

### ❌ Logs Incorretos (Antes da Correção)

```
✅ Transição permitida [PV-1046]: Processando → Pago
🔄 Criando conta a receber para pedido PV-1046...
💾 Criando transação financeira: { id: 'FT-0001', status: 'A Vencer', ... }
✅ Conta a receber criada: FT-0001 para pedido PV-1046
🔄 Recebendo pagamento para pedido PV-1046...
🔍 Procurando transação por actionFlags: undefined  ⚠️ NÃO encontrou!
ℹ️ Nenhuma transação anterior encontrada. Criando nova transação...  ⚠️
💾 Criando nova transação (modo Pago): { id: 'FT-0002', status: 'Recebido', ... }  ⚠️
✅ Nova transação criada: FT-0002 para pedido PV-1046
```

---

## 📋 Teste 3: Alterar "Entregue" para "Pago" (Sem Pular Status)

### Passo a Passo

1. **Criar pedido com status "Processando"**
2. **Alterar para "Confirmado"**
3. **Alterar para "Enviado"**
4. **Alterar para "Entregue"**
   - ✅ Deve criar 1 transação com status "A Vencer"
5. **Alterar para "Pago"**
   - ✅ Deve **ATUALIZAR** a transação existente para "Recebido"
   - ✅ **NÃO deve criar nova transação**

### ✅ Resultado Esperado

```
Após "Entregue":  1 transação (A Vencer)
Após "Pago":      1 transação (Recebido)  ← Mesma transação, status atualizado
```

---

## 📋 Teste 4: Histórico do Pedido

### Verificar Histórico de Status

1. Abrir pedido criado no Teste 1
2. Clicar em "Ver Histórico" ou similar
3. Verificar ações executadas

### ✅ Histórico Esperado

```
┌────────────────────────────────────────────────────────────────┐
│ Histórico de Status - PV-1046                                  │
├────────────────────────────────────────────────────────────────┤
│ Processando → Pago                                             │
│ Usuário: Sistema                                               │
│ Data: 07/11/2025 14:30:00                                      │
│                                                                │
│ Ações Executadas:                                              │
│ ✅ Status intermediários executados: Enviado → Entregue        │
│ ✅ Baixa de 10 unidades de Produto X                           │
│ ✅ Lançamento financeiro FT-0001 criado - Valor a receber      │
│ ✅ Pagamento recebido - Transação FT-0001 atualizada           │
│                                                                │
│ IDs Gerados:                                                   │
│ • Movimento de Estoque: MOV-1699123456789                      │
│ • Transação Financeira: FT-0001                                │
│ • Transação Financeira (Pago): FT-0001  ← MESMO ID!            │
└────────────────────────────────────────────────────────────────┘
```

**Pontos de atenção:**
- ✅ Última linha mostra "Transação FT-0001 **atualizada**"
- ✅ IDs gerados mostram o **MESMO** ID para "Transação Financeira" e "Transação Financeira (Pago)"

---

## 📋 Teste 5: Verificar Sistema Auto-Reparador

### Caso Existam Duplicados Antigos

O sistema tem proteção automática que remove duplicados ao carregar:

1. Abrir Console do navegador (F12)
2. Recarregar página (F5)
3. Procurar mensagem:

```
🧹 Sistema auto-reparador (carregamento): X ID(s) duplicado(s) removido(s)
   IDs duplicados: FT-0001, FT-0002, ...
   ✅ Y transações únicas mantidas
```

**Se aparecer:** Sistema encontrou e limpou duplicados antigos automaticamente  
**Se não aparecer:** Nenhum duplicado encontrado - sistema limpo ✅

---

## 📊 Checklist de Validação

### Antes de Aprovar a Correção

- [ ] Teste 1 executado - Apenas 1 transação criada
- [ ] Teste 2 executado - Logs corretos no console
- [ ] Teste 3 executado - Atualização sem duplicação
- [ ] Teste 4 executado - Histórico mostra mesmo ID
- [ ] Teste 5 executado - Sistema auto-reparador funcionando
- [ ] Nenhuma mensagem de erro no console
- [ ] Saldo bancário correto (apenas 1 entrada)
- [ ] Relatórios financeiros sem duplicidade

### ✅ Critérios de Aprovação

**A correção está APROVADA se:**

1. ✅ Todos os testes acima passarem
2. ✅ Nenhuma duplicação for observada
3. ✅ Logs mostrarem `[CORREÇÃO] TransactionId salvo no contexto`
4. ✅ Histórico mostrar mesmo ID para transação criada e atualizada
5. ✅ Saldo bancário for exatamente o valor do pedido (não dobrado)

---

## 🐛 Troubleshooting

### Problema: Ainda vejo duplicação

**Verificar:**
1. Limpar cache do navegador (Ctrl+Shift+Del)
2. Recarregar aplicação (Ctrl+F5)
3. Verificar se o código foi salvo corretamente
4. Verificar se há erros no console

### Problema: Transação não é criada

**Verificar:**
1. Produto tem estoque suficiente
2. Conta bancária está cadastrada
3. Cliente está ativo
4. Logs no console para identificar erro

### Problema: Erro ao alterar status

**Verificar:**
1. Transição de status é válida (CRIT-004)
2. Próximos status válidos na mensagem de erro
3. Histórico do pedido para entender estado atual

---

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. Abrir console do navegador (F12)
2. Copiar TODOS os logs relacionados
3. Anotar passos exatos que reproduzem o problema
4. Reportar com máximo de detalhes possível

---

**Data do Teste:** _______________  
**Testador:** _______________  
**Resultado:** ☐ Aprovado ☐ Reprovado  
**Observações:** _________________________________
