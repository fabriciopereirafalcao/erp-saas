# 🧪 GUIA DE TESTES - VALIDAÇÃO DAS PROTEÇÕES CRIT-001 e CRIT-002

**Data:** 06 de Novembro de 2024  
**Objetivo:** Validar proteções contra duplicação de operações  
**Status:** Pronto para execução

---

## 📋 ÍNDICE DE TESTES

1. [Teste de Cliques Múltiplos](#teste-1-cliques-múltiplos)
2. [Teste de Mudança de Status](#teste-2-mudança-de-status)
3. [Teste de Race Condition](#teste-3-race-condition)
4. [Teste de Rollback](#teste-4-rollback)
5. [Teste de Lock Timeout](#teste-5-lock-timeout)
6. [Teste de Verificação de Referência](#teste-6-verificação-de-referência)

---

## 🧪 TESTE 1: Cliques Múltiplos

### Objetivo
Verificar se múltiplos cliques rápidos no botão "Marcar como Entregue" resultam em apenas uma execução.

### Pré-requisitos
- Pedido de venda com status "Confirmado"
- Produto com estoque disponível

### Passos

1. **Configuração Inicial**
   ```
   - Acessar módulo "Pedidos de Venda"
   - Localizar pedido com status "Confirmado"
   - Anotar estoque atual do produto (ex: 5000 unidades)
   - Anotar quantidade do pedido (ex: 1000 unidades)
   ```

2. **Execução do Teste**
   ```
   - Clicar rapidamente 5 vezes no botão "Marcar como Entregue"
   - Observar console do navegador (F12)
   - Aguardar conclusão das operações
   ```

3. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Console mostra apenas 1 execução bem-sucedida
   - Console mostra 4 mensagens de bloqueio
   - Estoque reduzido apenas 1 vez (5000 → 4000)
   - Flag stockReduced = true
   - Apenas 1 movimento de estoque criado
   
   ❌ FALHA SE:
   - Estoque reduzido múltiplas vezes
   - Múltiplos movimentos criados
   - Console não mostra bloqueios
   ```

4. **Logs Esperados**
   ```javascript
   ✅ Lock adquirido: PV-1045-stock_reduction (LOCK-xxx)
   🔄 Executando baixa de estoque para pedido PV-1045...
   ✅ Baixa executada com sucesso! Movimento: MOV-xxx
   🔓 Lock liberado: PV-1045-stock_reduction (LOCK-xxx)
   ⚠️ Baixa de estoque já executada anteriormente (ID: MOV-xxx)
   ⚠️ Baixa de estoque já executada anteriormente (ID: MOV-xxx)
   ⚠️ Baixa de estoque já executada anteriormente (ID: MOV-xxx)
   ⚠️ Baixa de estoque já executada anteriormente (ID: MOV-xxx)
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Execuções | 1 | ___ | ⬜ |
| Bloqueios | 4 | ___ | ⬜ |
| Estoque Final | 4000 | ___ | ⬜ |
| Movimento ID | 1 único | ___ | ⬜ |
| Flag stockReduced | true | ___ | ⬜ |

---

## 🧪 TESTE 2: Mudança de Status

### Objetivo
Verificar se mudar status para trás e depois para frente não duplica conta a receber.

### Pré-requisitos
- Pedido de venda com status "Confirmado"

### Passos

1. **Marcar como Entregue (Primeira vez)**
   ```
   - Clicar em "Marcar como Entregue"
   - Verificar criação de conta a receber (ex: FT-0001)
   - Anotar ID da transação financeira
   ```

2. **Reverter Status**
   ```
   - Editar pedido manualmente (se necessário)
   - Mudar status para "Enviado" (voltar)
   - Verificar que flag accountsReceivableCreated ainda = true
   ```

3. **Marcar como Entregue (Segunda vez)**
   ```
   - Clicar novamente em "Marcar como Entregue"
   - Observar console do navegador
   ```

4. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Console mostra "Conta a receber já criada"
   - Apenas 1 transação financeira existe (FT-0001)
   - Nenhuma transação duplicada
   - Flag permanece true
   
   ❌ FALHA SE:
   - Nova transação criada (FT-0002)
   - Múltiplas contas a receber para mesmo pedido
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Transações Criadas | 1 | ___ | ⬜ |
| ID da Transação | FT-0001 | ___ | ⬜ |
| Flag accountsReceivableCreated | true | ___ | ⬜ |
| Bloqueio na 2ª tentativa | Sim | ___ | ⬜ |

---

## 🧪 TESTE 3: Race Condition

### Objetivo
Simular execução simultânea de duas operações para verificar proteção de lock.

### Pré-requisitos
- Conhecimento de ferramentas de desenvolvedor do navegador
- Pedido de venda com status "Confirmado"

### Passos

1. **Preparação**
   ```javascript
   // Abrir console do navegador (F12)
   // Copiar a função de atualização de status do Context
   
   // Executar as duas linhas SIMULTANEAMENTE:
   updateSalesOrderStatus('PV-1045', 'Entregue', 'Usuário 1')
   updateSalesOrderStatus('PV-1045', 'Entregue', 'Usuário 2')
   ```

2. **Execução**
   ```
   - Colar ambas as linhas no console
   - Pressionar Enter para executar simultaneamente
   - Observar logs no console
   ```

3. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Thread 1: Lock adquirido → Executa → Libera
   - Thread 2: Bloqueado (lock ativo)
   - Apenas 1 baixa de estoque
   - Apenas 1 conta a receber
   
   ❌ FALHA SE:
   - Ambos executam simultaneamente
   - Dupla baixa de estoque
   - Dupla criação de conta
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Locks Adquiridos | 1 | ___ | ⬜ |
| Execuções | 1 | ___ | ⬜ |
| Bloqueios | 1 | ___ | ⬜ |
| Estoque Correto | Sim | ___ | ⬜ |

---

## 🧪 TESTE 4: Rollback

### Objetivo
Verificar se erro durante execução reverte operação e libera lock.

### Pré-requisitos
- Conhecimento para injetar erro no código (opcional)

### Passos

1. **Simular Erro**
   ```javascript
   // Opção 1: Remover produto do inventário temporariamente
   // Isso causará erro ao buscar produto
   
   // Opção 2: Modificar temporariamente updateInventory para lançar erro
   ```

2. **Executar Operação**
   ```
   - Tentar marcar pedido como "Entregue"
   - Observar console
   ```

3. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Erro capturado e logado
   - Lock liberado automaticamente (finally)
   - Flag stockReduced permanece false
   - Estoque não alterado
   - Possível tentar novamente depois
   
   ❌ FALHA SE:
   - Lock não liberado (deadlock)
   - Flag marcada como true mesmo com erro
   - Estoque alterado parcialmente
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Erro Capturado | Sim | ___ | ⬜ |
| Lock Liberado | Sim | ___ | ⬜ |
| Flag = false | Sim | ___ | ⬜ |
| Estoque Inalterado | Sim | ___ | ⬜ |

---

## 🧪 TESTE 5: Lock Timeout

### Objetivo
Verificar se lock expira após 30 segundos e permite nova execução.

### Pré-requisitos
- Paciência para aguardar 30 segundos

### Passos

1. **Criar Lock Manualmente**
   ```javascript
   // No console do navegador
   import { acquireLock } from './utils/stockValidation';
   
   const lock = acquireLock('PV-TEST', 'stock_reduction');
   console.log('Lock criado:', lock);
   ```

2. **Aguardar Timeout**
   ```
   - Aguardar 30 segundos
   - Não liberar o lock manualmente
   ```

3. **Tentar Nova Operação**
   ```javascript
   // Após 30 segundos
   const lock2 = acquireLock('PV-TEST', 'stock_reduction');
   console.log('Segundo lock:', lock2);
   ```

4. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Lock1: acquired = true
   - Aguarda 30 segundos
   - Lock expirado automaticamente
   - Lock2: acquired = true (sucesso)
   - Mensagem: "Lock expirado removido"
   
   ❌ FALHA SE:
   - Lock2 bloqueado após timeout
   - Deadlock permanente
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Lock Inicial | Adquirido | ___ | ⬜ |
| Timeout 30s | Expirado | ___ | ⬜ |
| Lock Posterior | Adquirido | ___ | ⬜ |
| Sem Deadlock | Sim | ___ | ⬜ |

---

## 🧪 TESTE 6: Verificação de Referência

### Objetivo
Verificar se sistema detecta conta a receber duplicada mesmo sem flag.

### Pré-requisitos
- Conhecimento de manipulação de estado

### Passos

1. **Criar Conta Normalmente**
   ```
   - Marcar pedido como "Entregue"
   - Verificar criação de FT-0001 com reference = "PV-1045"
   ```

2. **Simular Perda de Flag**
   ```javascript
   // No console, simular flag corrompida
   // (Em produção isso não deveria acontecer, mas é teste de segurança)
   
   // Limpar flag manualmente
   order.actionFlags.accountsReceivableCreated = false;
   ```

3. **Tentar Criar Novamente**
   ```
   - Tentar marcar como "Entregue" novamente
   - Observar console
   ```

4. **Verificação**
   ```
   ✅ RESULTADO ESPERADO:
   - Sistema detecta transação existente por referência
   - Retorna ID existente (FT-0001)
   - Não cria duplicata
   - Mensagem: "Transação já existe para pedido"
   
   ❌ FALHA SE:
   - Nova transação criada (FT-0002)
   - Proteção por referência não funciona
   ```

### Resultado do Teste

| Item | Esperado | Resultado | Status |
|------|----------|-----------|--------|
| Detecção por Referência | Sim | ___ | ⬜ |
| Transações Totais | 1 | ___ | ⬜ |
| ID Retornado | FT-0001 | ___ | ⬜ |
| Sem Duplicata | Sim | ___ | ⬜ |

---

## 📊 RESUMO DOS TESTES

### Checklist de Validação

- [ ] **TESTE 1:** Cliques múltiplos protegidos
- [ ] **TESTE 2:** Mudança de status não duplica
- [ ] **TESTE 3:** Race condition bloqueada
- [ ] **TESTE 4:** Rollback funciona corretamente
- [ ] **TESTE 5:** Lock timeout funciona
- [ ] **TESTE 6:** Verificação de referência funciona

### Critérios de Aceitação

Para considerar as proteções **VALIDADAS**, todos os testes devem:
- ✅ Passar sem erros
- ✅ Produzir logs esperados
- ✅ Manter integridade de dados
- ✅ Não permitir duplicações

---

## 🔍 FERRAMENTAS DE DEBUG

### Verificar Locks Ativos

```javascript
// No console do navegador
import { debugLocks, getActiveLocks } from './utils/stockValidation';

// Ver locks ativos
debugLocks();

// Obter array de locks
const locks = getActiveLocks();
console.log('Locks ativos:', locks);
```

### Limpar Locks (DESENVOLVIMENTO APENAS)

```javascript
import { forceCleanAllLocks } from './utils/stockValidation';

// ATENÇÃO: Usar apenas em desenvolvimento
const removed = forceCleanAllLocks();
console.log(`${removed} locks removidos`);
```

### Verificar Flags de Pedido

```javascript
// Buscar pedido específico
const order = salesOrders.find(o => o.id === 'PV-1045');

console.log('Flags do pedido:', {
  stockReduced: order.actionFlags?.stockReduced,
  accountsReceivableCreated: order.actionFlags?.accountsReceivableCreated,
  accountsReceivablePaid: order.actionFlags?.accountsReceivablePaid,
  stockReductionId: order.actionFlags?.stockReductionId,
  financialTransactionId: order.actionFlags?.financialTransactionId
});
```

---

## 📝 TEMPLATE DE RELATÓRIO

### Relatório de Teste - [Nome do Teste]

**Data:** ___________  
**Executor:** ___________  
**Ambiente:** Desenvolvimento / Produção

#### Configuração Inicial
- Pedido ID: ___________
- Status Inicial: ___________
- Estoque Inicial: ___________

#### Execução
- Ações Realizadas: ___________
- Resultado Observado: ___________

#### Verificação
- [ ] Resultado conforme esperado
- [ ] Logs corretos
- [ ] Sem duplicações
- [ ] Integridade mantida

#### Observações
___________________________________________
___________________________________________

#### Status Final
- ✅ Aprovado
- ❌ Reprovado
- ⚠️ Aprovado com ressalvas

---

## 🎯 TESTES AUTOMATIZADOS (Recomendado)

### Exemplo de Teste com Jest

```javascript
describe('CRIT-001: Proteção contra Duplicação de Estoque', () => {
  test('deve bloquear múltiplas baixas de estoque', async () => {
    const order = createMockOrder();
    
    // Primeira execução
    const result1 = await executeStockReduction(order);
    expect(result1.success).toBe(true);
    expect(order.actionFlags.stockReduced).toBe(true);
    
    // Segunda execução (deve bloquear)
    const result2 = await executeStockReduction(order);
    expect(result2.success).toBe(false);
    expect(result2.message).toContain('já executada');
  });
  
  test('deve proteger contra race condition', async () => {
    const order = createMockOrder();
    
    // Executar simultaneamente
    const [result1, result2] = await Promise.all([
      executeStockReduction(order),
      executeStockReduction(order)
    ]);
    
    // Apenas uma deve ter sucesso
    const successCount = [result1, result2].filter(r => r.success).length;
    expect(successCount).toBe(1);
  });
});

describe('CRIT-002: Proteção contra Duplicação de Contas', () => {
  test('deve bloquear criação duplicada de conta a receber', async () => {
    const order = createMockOrder();
    
    // Primeira execução
    const result1 = await executeAccountsReceivableCreation(order);
    expect(result1.success).toBe(true);
    expect(result1.transactionId).toBeDefined();
    
    // Segunda execução (deve retornar ID existente)
    const result2 = await executeAccountsReceivableCreation(order);
    expect(result2.success).toBe(true);
    expect(result2.transactionId).toBe(result1.transactionId);
  });
});
```

---

## ✅ CONCLUSÃO

Este guia fornece testes completos para validar as proteções implementadas para CRIT-001 e CRIT-002.

**Próximos Passos:**
1. Executar todos os testes manualmente
2. Documentar resultados
3. Implementar testes automatizados
4. Executar em ambiente de staging
5. Validar em produção com monitoramento

---

**Preparado por:** Figma Make AI System  
**Data:** 06/11/2024  
**Versão:** 1.0
