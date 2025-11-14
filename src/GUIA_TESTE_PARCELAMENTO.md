# 🧪 Guia de Teste: Correção de Parcelamento

## 📋 Objetivo
Validar que a correção implementada está gerando corretamente múltiplas transações financeiras para pedidos parcelados.

## ✅ Teste 1: Pedido Parcelado em 2x

### Passo a Passo
1. **Criar Pedido de Venda**
   - Ir para módulo "Pedidos de Venda"
   - Clicar em "Novo Pedido"
   
2. **Preencher Aba "Cabeçalho"**
   - Cliente: Selecionar qualquer cliente
   - Vendedor: Informar nome
   - Status: Deixar em "Processando"
   - Data de Emissão: Hoje
   - Data de Faturamento: Hoje
   - Data de Entrega: Hoje
   - **Condição de Pagamento: Selecionar "2"** ⭐
   - Método de Pagamento: Qualquer
   - Prazo 1ª Parcela: 30 dias
   - Referência do Vencimento: Data de Emissão
   
3. **Preencher Aba "Itens"**
   - Adicionar pelo menos 1 produto
   - Quantidade: 1
   - Clicar em "Adicionar Item"
   
4. **Pular Aba "Frete"**
   - Deixar em branco ou preencher conforme desejado
   
5. **Criar Pedido**
   - Clicar em "Criar Pedido"
   - Aguardar confirmação
   - **Anotar o ID do pedido criado** (ex: PV-1046)

6. **Mudar Status para "Entregue"**
   - Na lista de pedidos, localizar o pedido criado
   - Clicar nos 3 pontos (...)
   - Selecionar "Alterar Status"
   - Escolher status "Entregue"
   - Confirmar

### ✅ Resultado Esperado
Ao mudar para "Entregue", o sistema deve:
- Criar **2 transações financeiras**
- Console deve mostrar:
  ```
  📅 Configuração de parcelamento:
     paymentCondition: "2"
     numberOfInstallments: 2
     totalAmount: [valor]
  
  💾 Criando transação financeira 1/2: [detalhes]
  💾 Criando transação financeira 2/2: [detalhes]
  📊 2 transação(ões) financeira(s) criada(s).
  ✅ 2 conta(s) a receber criada(s) para pedido PV-XXXX
  ```

### 🔍 Validação
1. **Ir para módulo "Transações Financeiras"**
2. **Clicar na aba "A Receber"**
3. **Verificar:**
   - ✅ Existem 2 transações com o ID do pedido
   - ✅ Primeira transação: "Parcela 1/2"
   - ✅ Segunda transação: "Parcela 2/2"
   - ✅ Valor de cada parcela = Total do pedido / 2
   - ✅ Status de ambas: "A Receber"
   - ✅ Data de vencimento da 2ª parcela = 1ª parcela + 30 dias

---

## ✅ Teste 2: Pedido Parcelado em 3x

### Passo a Passo
1. Seguir mesmos passos do Teste 1
2. **Na Condição de Pagamento: Selecionar "3"** ⭐

### ✅ Resultado Esperado
- Criar **3 transações financeiras**
- Console deve mostrar criação de 3 transações

### 🔍 Validação
1. **Ir para módulo "Transações Financeiras" → "A Receber"**
2. **Verificar:**
   - ✅ Existem 3 transações com o ID do pedido
   - ✅ Transações: "Parcela 1/3", "Parcela 2/3", "Parcela 3/3"
   - ✅ Valor de cada parcela = Total do pedido / 3
   - ✅ Status de todas: "A Receber"
   - ✅ Datas de vencimento:
     - Parcela 1: Data base + 30 dias
     - Parcela 2: Data base + 60 dias
     - Parcela 3: Data base + 90 dias

---

## ✅ Teste 3: Pedido À Vista (1x)

### Passo a Passo
1. Seguir mesmos passos do Teste 1
2. **Na Condição de Pagamento: Selecionar "1"** ⭐

### ✅ Resultado Esperado
- Criar **1 transação financeira**
- Console deve mostrar criação de 1 transação

### 🔍 Validação
1. **Ir para módulo "Transações Financeiras" → "A Receber"**
2. **Verificar:**
   - ✅ Existe 1 transação com o ID do pedido
   - ✅ Descrição: "Parcela única"
   - ✅ Valor = Total do pedido
   - ✅ Status: "A Receber"

---

## ✅ Teste 4: Modo Excepcional com Parcelamento

### Passo a Passo
1. **Criar Pedido de Venda**
2. **Na aba "Cabeçalho":**
   - Preencher todos os campos normalmente
   - **Status: Selecionar "Entregue"** ⭐
   - **Condição de Pagamento: Selecionar "2"** ⭐
   - **Marcar checkbox "⚠️ Modo Excepcional"** ⭐
3. **Adicionar itens normalmente**
4. **Criar Pedido**

### ✅ Resultado Esperado
- Pedido criado diretamente com status "Entregue"
- **2 transações financeiras criadas imediatamente**
- Console deve mostrar todas as ações executadas

### 🔍 Validação
1. **Verificar que pedido foi criado com status "Entregue"**
2. **Ir para "Transações Financeiras" → "A Receber"**
3. **Verificar:**
   - ✅ Existem 2 transações criadas
   - ✅ Ambas com status "A Receber"
   - ✅ Descrição com número das parcelas (1/2 e 2/2)

---

## ✅ Teste 5: Atualização de Status (Parcialmente Concluído)

### Passo a Passo
1. **Criar pedido parcelado em 2x** (seguir Teste 1)
2. **Mudar status para "Entregue"** (cria 2 transações)
3. **Ir para "Transações Financeiras" → "A Receber"**
4. **Localizar a primeira parcela**
5. **Clicar em "..." → "Marcar como Recebido"**
6. **Confirmar**

### ✅ Resultado Esperado
- Primeira transação muda para status "Recebido"
- **Pedido muda automaticamente para "Parcialmente Concluído"** ⭐
- Console deve mostrar:
  ```
  📊 1 de 2 parcelas recebidas
  🔄 Atualizando status do pedido para "Parcialmente Concluído"
  ```

### 🔍 Validação
1. **Voltar para "Pedidos de Venda"**
2. **Verificar:**
   - ✅ Status do pedido = "Parcialmente Concluído"
   - ✅ Badge do status com cor correspondente

---

## ✅ Teste 6: Atualização de Status (Concluído)

### Passo a Passo
1. **Continuar do Teste 5** (primeira parcela já está recebida)
2. **Ir para "Transações Financeiras" → "A Receber"**
3. **Localizar a segunda parcela**
4. **Clicar em "..." → "Marcar como Recebido"**
5. **Confirmar**

### ✅ Resultado Esperado
- Segunda transação muda para status "Recebido"
- **Pedido muda automaticamente para "Concluído"** ⭐
- Console deve mostrar:
  ```
  📊 2 de 2 parcelas recebidas
  🔄 Atualizando status do pedido para "Concluído"
  ```

### 🔍 Validação
1. **Voltar para "Pedidos de Venda"**
2. **Verificar:**
   - ✅ Status do pedido = "Concluído"
   - ✅ Badge do status com cor correspondente

---

## 🚫 Teste de Proteção: Não Permitir Mudança Manual

### Passo a Passo
1. **Criar pedido parcelado** (qualquer condição)
2. **Mudar status para "Entregue"**
3. **Tentar mudar status manualmente para "Parcialmente Concluído"**

### ✅ Resultado Esperado
- **Sistema DEVE BLOQUEAR a mudança** ⭐
- Toast de erro:
  ```
  ❌ Não é possível alterar manualmente para "Parcialmente Concluído"
  Este status é atualizado automaticamente ao receber parcelas nas transações financeiras
  ```
- Console deve mostrar:
  ```
  🚫 [PROTEÇÃO] Tentativa bloqueada de alterar manualmente pedido PV-XXXX para "Parcialmente Concluído"
  ```

### 🔍 Validação
- ✅ Status do pedido permanece inalterado
- ✅ Mensagem de erro exibida
- ✅ Log de proteção registrado

---

## 📊 Checklist de Validação Completa

### Criação de Transações
- [ ] Pedido 2x cria 2 transações
- [ ] Pedido 3x cria 3 transações
- [ ] Pedido 1x cria 1 transação
- [ ] Modo excepcional cria transações imediatamente
- [ ] Cada transação tem ID único
- [ ] Descrição correta com número da parcela
- [ ] Valores das parcelas são iguais (total / nº parcelas)
- [ ] Status inicial é "A Receber"
- [ ] Referência ao pedido está correta

### Datas de Vencimento
- [ ] Primeira parcela: Data base + prazo configurado
- [ ] Segunda parcela: Primeira + 30 dias
- [ ] Terceira parcela: Primeira + 60 dias
- [ ] Datas calculadas corretamente conforme referência (emissão/faturamento/entrega)

### Atualização Automática de Status
- [ ] Recebimento parcial → "Parcialmente Concluído"
- [ ] Recebimento total → "Concluído"
- [ ] Status automáticos não podem ser alterados manualmente
- [ ] Proteção funciona corretamente

### Logs do Sistema
- [ ] Logs de configuração de parcelamento
- [ ] Logs de criação de cada transação
- [ ] Logs de total de transações criadas
- [ ] Logs de atualização de status do pedido

---

## 🐛 Problemas Conhecidos (Já Corrigidos)

### ❌ ANTES (Bug)
- Pedido 2x criava apenas 1 transação
- Campo `paymentCondition` não era interpretado corretamente
- Regex `/(\d+)x/i` não encontrava match

### ✅ DEPOIS (Corrigido)
- Pedido 2x cria 2 transações
- Campo `paymentCondition` é interpretado com `parseInt()`
- Funciona com formato "2" e "2x"

---

## 📞 Suporte

Se algum teste falhar:
1. **Verificar console do navegador** (F12 → Console)
2. **Procurar por logs relevantes** (🔍 buscar por "parcelamento" ou "transação")
3. **Anotar mensagens de erro**
4. **Verificar se correção foi aplicada** (arquivo `/contexts/ERPContext.tsx`, linha ~1405)

---

**Última Atualização:** 08/11/2025  
**Versão:** 1.0  
**Status:** ✅ Correção Implementada
