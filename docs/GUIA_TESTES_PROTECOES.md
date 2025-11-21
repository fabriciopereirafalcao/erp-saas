# 🧪 GUIA DE TESTES - PROTEÇÕES DE ESTOQUE

## 📋 PREPARAÇÃO

### Antes de Começar

1. **Abrir Console do Navegador**
   - Pressione `F12`
   - Vá para aba "Console"
   - Deixe aberto durante todos os testes

2. **Limpar Dados Anteriores** (opcional)
   - Recarregar página: `Ctrl + F5`
   - Ou limpar Local Storage no DevTools

3. **Verificar Estoque Inicial**
   - Ir para módulo "Estoque"
   - Anotar quantidades disponíveis
   - Exemplo:
     ```
     Arroz Basmati: 5000 unidades
     Feijão Preto: 8000 unidades
     ```

---

## 🧪 TESTE 1: VALIDAÇÃO DE ESTOQUE NA CRIAÇÃO

### Objetivo
Verificar se sistema bloqueia pedido quando não há estoque disponível.

### Cenário
- Produto: Arroz Basmati (5000 unidades)
- Tentar criar pedido: 6000 unidades

### Passos

1. **Ir para "Vendas"**
2. **Clicar em "Novo Pedido"**
3. **Preencher formulário:**
   - Cliente: ABC Varejo
   - Produto: Arroz Basmati
   - Quantidade: **6000** (maior que estoque)
   - Preço: 3.50
   - Status: Processando
4. **Clicar em "Salvar"**

### Resultado Esperado

**Toast de Erro:**
```
Estoque insuficiente! Disponível: 5000, Solicitado: 6000, Reservado: 0
```

**Console:**
```
❌ Estoque insuficiente! Disponível: 5000, Solicitado: 6000, Reservado: 0
```

**Pedido:**
- ❌ NÃO foi criado
- Lista de pedidos permanece inalterada

### ✅ Critério de Sucesso
- Pedido bloqueado
- Toast exibido
- Log no console
- Lista não modificada

---

## 🧪 TESTE 2: ALERTA DE ESTOQUE BAIXO

### Objetivo
Verificar se sistema alerta quando estoque está abaixo de 20%.

### Cenário
- Produto: Arroz Basmati (5000 unidades)
- Criar pedido: 4500 unidades (deixa 500 = 10%)

### Passos

1. **Criar primeiro pedido:**
   - Produto: Arroz Basmati
   - Quantidade: 4500
   - Status: Processando
2. **Clicar em "Salvar"**

### Resultado Esperado

**Toast de Aviso (laranja):**
```
Atenção: Estoque baixo! Apenas 500 unidades disponíveis.
```

**Toast de Sucesso (verde):**
```
Pedido de venda PV-XXX criado com sucesso!
```

**Console:**
```
✅ Validação de estoque OK: Estoque disponível: 5000
```

**Pedido:**
- ✅ Criado com sucesso
- Status: Processando

### ✅ Critério de Sucesso
- Pedido criado
- Toast de aviso exibido
- Estoque reservado (não baixado ainda)

---

## 🧪 TESTE 3: RESERVAS DE ESTOQUE

### Objetivo
Verificar se sistema considera pedidos em andamento como reservas.

### Cenário
- Produto: Arroz Basmati (5000 unidades)
- Pedido A: 2000 unidades (Processando) = RESERVA
- Pedido B: 2500 unidades (Confirmado) = RESERVA
- Total Reservado: 4500
- Disponível: 500
- Tentar Pedido C: 1000 unidades

### Passos

1. **Criar Pedido A:**
   - Quantidade: 2000
   - Status: Processando
   - Salvar

2. **Criar Pedido B:**
   - Quantidade: 2500
   - Status: Confirmado
   - Salvar

3. **Tentar criar Pedido C:**
   - Quantidade: 1000
   - Status: Processando
   - Salvar

### Resultado Esperado para Pedido C

**Toast de Erro:**
```
Estoque insuficiente! Disponível: 500, Solicitado: 1000, Reservado: 4500
```

**Console:**
```
❌ Estoque insuficiente! Disponível: 500, Solicitado: 1000, Reservado: 4500
```

### ✅ Critério de Sucesso
- Pedidos A e B criados
- Pedido C bloqueado
- Console mostra reservas corretas
- Cálculo: 5000 - 2000 - 2500 = 500 disponível

---

## 🧪 TESTE 4: DUPLICAÇÃO DE BAIXA DE ESTOQUE

### Objetivo
Verificar se sistema previne baixa duplicada ao clicar múltiplas vezes.

### Cenário
- Pedido PV-XXX (500 unidades, status: Confirmado)
- Clicar 2x rapidamente em "Marcar como Entregue"

### Passos

1. **Criar pedido:**
   - Produto: Feijão Preto
   - Quantidade: 500
   - Status: Processando

2. **Mudar para Confirmado:**
   - Selecionar pedido
   - Mudar status para "Confirmado"

3. **Teste de Duplicação:**
   - Mudar status para "Entregue"
   - **IMEDIATAMENTE** (< 1 segundo) clicar novamente em "Entregue"

### Resultado Esperado

**Primeiro Clique:**
```console
✅ Validação OK. Disponível: 7500
✅ Lock adquirido: PV-XXX-stock_reduction (LOCK-123456789)
🔄 Executando baixa de estoque para pedido PV-XXX...
✅ Baixa executada com sucesso! Movimento: MOV-123456789
🔓 Lock liberado: PV-XXX-stock_reduction (LOCK-123456789)
```

**Segundo Clique:**
```console
⚠️ Validação falhou: ⚠️ Baixa de estoque já executada anteriormente (ID: MOV-XXX)
```

**Estoque:**
- ✅ Baixado apenas 500 unidades (1 vez)
- ❌ NÃO baixou 1000 unidades (2 vezes)

### ✅ Critério de Sucesso
- Lock adquirido na primeira vez
- Segunda tentativa bloqueada
- Estoque baixado apenas uma vez
- Flag `stockReduced = true` marcada

---

## 🧪 TESTE 5: LOCK DURANTE PROCESSAMENTO

### Objetivo
Verificar se lock bloqueia tentativas simultâneas.

### Cenário
- Simular processamento lento
- Tentar executar mesma operação enquanto primeira ainda processa

### Passos

1. **Preparar pedido:**
   - Criar pedido de 300 unidades
   - Status: Confirmado

2. **Abrir Console do Navegador**

3. **Executar comando para simular delay:**
   ```javascript
   // Modificar temporariamente o tempo de lock
   // Isso simula operação lenta
   ```

4. **Clicar em "Marcar como Entregue"**

5. **RAPIDAMENTE clicar novamente**

### Resultado Esperado

**Console:**
```
✅ Lock adquirido: PV-XXX-stock_reduction (LOCK-AAA)
🔄 Executando baixa de estoque...
❌ Não foi possível adquirir lock: Operação "stock_reduction" já está em andamento
✅ Baixa executada com sucesso!
🔓 Lock liberado: PV-XXX-stock_reduction (LOCK-AAA)
```

### ✅ Critério de Sucesso
- Primeiro adquire lock
- Segundo é bloqueado
- Lock liberado após conclusão
- Apenas uma execução completa

---

## 🧪 TESTE 6: DUPLICAÇÃO DE CONTA A RECEBER

### Objetivo
Verificar se sistema previne criar conta a receber duplicada.

### Cenário
- Pedido marcado como "Entregue" (cria conta)
- Tentar criar conta novamente

### Passos

1. **Criar e entregar pedido:**
   - Criar pedido de R$ 5.000
   - Marcar como "Entregue"

2. **Verificar transação criada:**
   - Ir para "Financeiro"
   - Verificar que existe FT-XXXX

3. **Voltar status:**
   - Voltar pedido para "Confirmado"

4. **Marcar como Entregue novamente:**
   - Mudar status para "Entregue" de novo

### Resultado Esperado

**Primeira Execução:**
```console
✅ Conta a receber criada: FT-0001
```

**Segunda Execução:**
```console
⚠️ Conta a receber já existe para pedido PV-XXX: FT-0001
```

**Financeiro:**
- ✅ Apenas 1 transação FT-0001
- ❌ NÃO existe FT-0002 duplicada

### ✅ Critério de Sucesso
- Conta criada apenas 1 vez
- Segunda tentativa detectada
- Sem duplicação nas transações

---

## 🧪 TESTE 7: VALIDAÇÃO DE PAGAMENTO DUPLICADO

### Objetivo
Verificar se sistema previne receber pagamento duas vezes.

### Cenário
- Pedido marcado como "Pago"
- Tentar receber pagamento novamente

### Passos

1. **Criar pedido completo:**
   - Criar pedido R$ 3.000
   - Marcar como "Entregue"
   - Marcar como "Pago"

2. **Verificar saldo bancário:**
   - Anotar saldo antes
   - Ex: R$ 50.000

3. **Verificar após pagamento:**
   - Saldo deve ser: R$ 53.000

4. **Tentar pagar novamente:**
   - Voltar status para "Entregue"
   - Marcar como "Pago" de novo

### Resultado Esperado

**Primeira Execução:**
```console
✅ Pagamento recebido: FT-XXXX
Saldo bancário: R$ 50.000 → R$ 53.000
```

**Segunda Execução:**
```console
⚠️ Pagamento já recebido anteriormente: FT-XXXX
```

**Saldo Bancário:**
- ✅ R$ 53.000 (aumentou apenas 1x)
- ❌ NÃO é R$ 56.000 (aumentou 2x)

### ✅ Critério de Sucesso
- Pagamento recebido apenas 1 vez
- Saldo aumentado apenas 1 vez
- Flag `accountsReceivablePaid = true`

---

## 🧪 TESTE 8: CLEANUP DE LOCKS EXPIRADOS

### Objetivo
Verificar se locks expirados são removidos automaticamente.

### Cenário
- Lock criado mas não liberado (simulação de erro)
- Aguardar expiração (30 segundos)
- Verificar se foi limpo

### Passos

1. **Abrir Console**

2. **Executar comando:**
   ```javascript
   import { debugLocks } from './utils/stockValidation';
   debugLocks();
   ```

3. **Criar lock manualmente (dev only):**
   ```javascript
   import { acquireLock } from './utils/stockValidation';
   acquireLock('TEST-001', 'stock_reduction');
   ```

4. **Verificar lock criado:**
   ```javascript
   debugLocks();
   // Deve mostrar: TEST-001-stock_reduction
   ```

5. **Aguardar 60 segundos**

6. **Verificar novamente:**
   ```javascript
   debugLocks();
   // Deve mostrar: Nenhum lock ativo
   ```

### Resultado Esperado

**Console após criar:**
```
✅ Lock adquirido: TEST-001-stock_reduction (LOCK-XXX)
```

**Console após 60s:**
```
🧹 Cleanup automático: 1 lock(s) expirado(s) removido(s)
```

### ✅ Critério de Sucesso
- Lock criado
- Lock expirado após timeout
- Cleanup automático funcionou

---

## 🧪 TESTE 9: VALIDAÇÃO COM FUNÇÃO `checkStockAvailability()`

### Objetivo
Verificar se componentes podem usar função de validação diretamente.

### Cenário
- Usar função no componente antes de criar pedido

### Passos

1. **Abrir Console**

2. **Executar código:**
   ```javascript
   // Simular chamada do componente
   const result = checkStockAvailability("Arroz Basmati", 500);
   console.log(result);
   ```

3. **Verificar resultado**

### Resultado Esperado

**Console:**
```javascript
{
  isAvailable: true,
  available: 5000,
  reserved: 0,
  currentStock: 5000,
  message: "Estoque disponível: 5000"
}
```

**Se tentar quantidade maior:**
```javascript
checkStockAvailability("Arroz Basmati", 6000);
// {
//   isAvailable: false,
//   available: 5000,
//   message: "Estoque insuficiente! Disponível: 5000, Solicitado: 6000"
// }
```

### ✅ Critério de Sucesso
- Função retorna objeto correto
- Cálculos precisos
- Mensagens descritivas

---

## 🧪 TESTE 10: FLUXO COMPLETO DE PEDIDO

### Objetivo
Testar fluxo completo do pedido com todas as proteções.

### Cenário
- Criar pedido
- Passar por todos os status
- Verificar automações e proteções

### Passos

1. **Criar Pedido:**
   - Produto: Café Torrado
   - Quantidade: 100
   - Preço: R$ 15,00
   - Total: R$ 1.500
   - Status: Processando

2. **Validações:**
   - ✅ Estoque validado antes de criar
   - ✅ Reserva aplicada

3. **Confirmar Pedido:**
   - Mudar para "Confirmado"
   - Nenhuma automação ainda

4. **Enviar Pedido:**
   - Mudar para "Enviado"
   - Nenhuma automação ainda

5. **Entregar Pedido:**
   - Mudar para "Entregue"
   - ✅ Baixa de estoque
   - ✅ Conta a receber criada

6. **Receber Pagamento:**
   - Mudar para "Pago"
   - ✅ Pagamento recebido
   - ✅ Saldo atualizado

### Resultado Esperado

**Console Completo:**
```
// Criação
✅ Validação de estoque OK: Disponível: 500

// Entrega
✅ Lock adquirido: PV-XXX-stock_reduction
🔄 Executando baixa de estoque...
✅ Baixa executada com sucesso!
🔓 Lock liberado

✅ Lock adquirido: PV-XXX-accounts_creation
🔄 Criando conta a receber...
✅ Conta a receber criada: FT-XXXX
🔓 Lock liberado

// Pagamento
✅ Lock adquirido: PV-XXX-payment
🔄 Recebendo pagamento...
✅ Pagamento recebido: FT-YYYY
🔓 Lock liberado
```

**Verificações:**
- ✅ Estoque: 500 → 400 (baixou 100)
- ✅ Transações: 2 criadas (a receber + recebido)
- ✅ Saldo bancário: aumentou R$ 1.500
- ✅ Flags: todas marcadas
- ✅ Locks: todos liberados

### ✅ Critério de Sucesso
- Fluxo completo sem erros
- Todas as proteções ativas
- Locks adquiridos e liberados
- Dados consistentes

---

## 📊 CHECKLIST DE TESTES

Use esta lista para marcar os testes realizados:

- [ ] Teste 1: Validação de estoque na criação
- [ ] Teste 2: Alerta de estoque baixo
- [ ] Teste 3: Reservas de estoque
- [ ] Teste 4: Duplicação de baixa de estoque
- [ ] Teste 5: Lock durante processamento
- [ ] Teste 6: Duplicação de conta a receber
- [ ] Teste 7: Validação de pagamento duplicado
- [ ] Teste 8: Cleanup de locks expirados
- [ ] Teste 9: Função checkStockAvailability
- [ ] Teste 10: Fluxo completo de pedido

---

## 🐛 TROUBLESHOOTING

### Problema: Locks não aparecem no console
**Solução:** Verificar se imports estão corretos no ERPContext.tsx

### Problema: Validação não bloqueia
**Solução:** Verificar se função validateStockAvailability está sendo chamada

### Problema: Estoque não baixa
**Solução:** Verificar logs de erro no console

### Problema: Toast não aparece
**Solução:** Verificar se Toaster está renderizado no App.tsx

---

## 📝 REGISTRO DE TESTES

Use esta tabela para registrar resultados:

| Teste | Data | Resultado | Observações |
|-------|------|-----------|-------------|
| 1 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 2 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 3 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 4 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 5 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 6 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 7 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 8 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 9 | ___/___/___ | ☐ Passou ☐ Falhou | |
| 10 | ___/___/___ | ☐ Passou ☐ Falhou | |

---

## ✅ CRITÉRIOS DE APROVAÇÃO

O sistema é considerado **APROVADO** se:

- ✅ **100% dos testes** passarem
- ✅ **Nenhuma duplicação** for detectada
- ✅ **Locks funcionarem** corretamente
- ✅ **Validações bloquearem** quando necessário
- ✅ **Logs aparecerem** no console
- ✅ **Dados permanecerem** consistentes

---

**Guia criado por:** Sistema ERP  
**Versão:** 1.0  
**Data:** 06/11/2024
