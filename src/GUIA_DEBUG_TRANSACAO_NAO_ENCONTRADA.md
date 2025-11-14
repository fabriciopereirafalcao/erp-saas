# Guia de Debug: Transação Não Encontrada

## 🔍 Problema Reportado

```
⚠️ Transação FT-0005 não encontrada ou com status inesperado. Criando nova...
```

## 📋 O Que Este Erro Significa

Quando você vê este erro, significa que o sistema está tentando atualizar uma transação financeira que foi criada anteriormente (quando o pedido estava no status "Entregue"), mas:

1. A transação não existe mais no array `financialTransactions`
2. A transação foi deletada manualmente
3. A transação tem um status inesperado (nem "A vencer" nem "Recebido")
4. Houve um problema de sincronização entre o pedido e as transações

## 🔧 Melhorias Implementadas

### 1. Logs Detalhados para Debug

Agora o sistema exibe logs completos quando procura uma transação:

```javascript
🔍 Procurando transação: FT-0005
📊 Total de transações disponíveis: 12
📋 IDs das transações: FT-0001, FT-0002, FT-0003, FT-0004, FT-0006...
❌ Transação FT-0005 NÃO ENCONTRADA no array de transações!
```

Esses logs ajudam a identificar:
- Se a transação existe
- Qual é o status dela
- Quantas transações existem no total
- Quais são os IDs disponíveis

### 2. Geração Robusta de IDs

**ANTES (Problemático):**
```javascript
id: `FT-${String(financialTransactions.length + 1).padStart(4, '0')}`
```

Problemas:
- Se deletarmos uma transação, o `length` diminui
- Se tivermos 5 transações e deletarmos a FT-0003, o próximo ID seria FT-0005 (duplicado!)
- Inconsistências ao carregar do localStorage

**DEPOIS (Robusto):**
```javascript
const generateNextFinancialTransactionId = (): string => {
  if (financialTransactions.length === 0) {
    return 'FT-0001';
  }
  
  // Extrair todos os números de IDs existentes
  const existingNumbers = financialTransactions
    .map(t => {
      const match = t.id.match(/FT-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  
  // Encontrar o maior número e adicionar 1
  const maxNumber = Math.max(...existingNumbers, 0);
  const nextNumber = maxNumber + 1;
  
  return `FT-${String(nextNumber).padStart(4, '0')}`;
};
```

Vantagens:
- Sempre encontra o maior ID existente
- Adiciona 1 ao maior número
- Nunca cria IDs duplicados
- Funciona mesmo se transações forem deletadas

### 3. Logs na Criação de Transações

```javascript
💾 Criando transação financeira: {
  id: 'FT-0005',
  status: 'A Vencer',
  amount: 5000,
  reference: 'PV-1050'
}
📊 Array de transações atualizado. Total: 5
📋 IDs após criação: FT-0005, FT-0004, FT-0003, FT-0002, FT-0001
✅ Conta a receber criada: FT-0005 para pedido PV-1050
```

### 4. Logs no Salvamento de ActionFlags

```javascript
📌 Salvando financialTransactionId no pedido PV-1050: FT-0005
💾 Salvando pedido PV-1050 com actionFlags: {
  stockReduced: true,
  stockReductionId: 'MOV-001',
  financialTransactionId: 'FT-0005',
  accountsReceivableCreated: true
}
```

## 🕵️ Como Investigar o Problema

### Passo 1: Verificar os Logs do Console

Quando alterar um pedido de "Entregue" para "Pago", procure por esta sequência de logs:

1. **Criação da transação (status "Entregue"):**
```
💾 Criando transação financeira: { id: 'FT-0005', ... }
📌 Salvando financialTransactionId no pedido PV-1050: FT-0005
💾 Salvando pedido PV-1050 com actionFlags: { financialTransactionId: 'FT-0005', ... }
```

2. **Busca da transação (status "Pago"):**
```
🔄 Recebendo pagamento para pedido PV-1050...
🔍 Procurando transação: FT-0005
📊 Total de transações disponíveis: 5
📋 IDs das transações: FT-0001, FT-0002, FT-0003, FT-0004, FT-0005
✅ Transação encontrada: FT-0005 com status "A vencer"
🔄 Atualizando transação existente FT-0005 para "Recebido"...
✅ Transação FT-0005 atualizada para "Recebido"
```

### Passo 2: Verificar se a Transação Existe

Se você vir o erro:
```
❌ Transação FT-0005 NÃO ENCONTRADA no array de transações!
```

Compare com a lista de IDs:
```
📋 IDs das transações: FT-0001, FT-0002, FT-0003, FT-0004, FT-0006
                                                            ^^^^ FT-0005 não está na lista!
```

### Passo 3: Verificar o localStorage

Abra o DevTools do navegador:

1. **Console > Application > Local Storage**
2. Procure pela chave: `erp_financial_transactions`
3. Verifique se a transação FT-0005 está lá
4. Compare com o array em memória

```javascript
// No console do navegador:
JSON.parse(localStorage.getItem('erp_financial_transactions'))
  .find(t => t.id === 'FT-0005')
```

### Passo 4: Verificar ActionFlags do Pedido

```javascript
// No console do navegador:
JSON.parse(localStorage.getItem('erp_sales_orders'))
  .find(o => o.id === 'PV-1050')
  .actionFlags
  
// Deve retornar:
{
  stockReduced: true,
  stockReductionId: 'MOV-001',
  financialTransactionId: 'FT-0005',  // ← Este ID deve existir nas transações!
  accountsReceivableCreated: true
}
```

## 🐛 Cenários Possíveis

### Cenário 1: Transação Deletada Manualmente

**Causa:** Usuário deletou a transação FT-0005 no módulo "Transações Financeiras"

**Solução:** O sistema cria uma nova transação automaticamente

**Log:**
```
❌ Transação FT-0005 NÃO ENCONTRADA no array de transações!
💾 Criando nova transação (modo Pago): { id: 'FT-0007', ... }
```

**Prevenção futura:** Implementar validação que impede deletar transações vinculadas a pedidos

### Cenário 2: Problema de Sincronização

**Causa:** O state do React não foi atualizado antes de salvar o pedido

**Log:**
```
💾 Criando transação financeira: { id: 'FT-0005', ... }
📌 Salvando financialTransactionId no pedido: FT-0005
// ... mas quando busca ...
📋 IDs das transações: FT-0001, FT-0002, FT-0003, FT-0004
// FT-0005 não aparece!
```

**Solução:** O novo gerador de IDs é mais robusto e evita este problema

### Cenário 3: ID Duplicado

**Causa:** Duas transações com o mesmo ID

**Como acontecia antes:**
```
1. Criar FT-0005 (5 transações no array)
2. Deletar FT-0003 (4 transações no array)
3. Criar nova: length=4, próximo ID = FT-0005 (DUPLICADO!)
```

**Solução:** Novo gerador busca o maior ID existente, não o length

### Cenário 4: localStorage Corrompido

**Causa:** Dados inconsistentes entre memória e localStorage

**Diagnóstico:**
```javascript
// Comparar:
const inMemory = financialTransactions.length; // Ex: 5
const inStorage = JSON.parse(localStorage.getItem('erp_financial_transactions')).length; // Ex: 3

// Se diferentes, há inconsistência!
```

**Solução:** Limpar localStorage e recriar dados:
```javascript
// CUIDADO: Isto apaga TODOS os dados!
localStorage.clear();
// Depois, recarregue a página
```

## 🎯 Próximos Passos Recomendados

### 1. Implementar Proteção de Exclusão

Impedir exclusão de transações vinculadas a pedidos:

```typescript
const deleteFinancialTransaction = (id: string) => {
  // Verificar se está vinculada a algum pedido
  const linkedOrder = salesOrders.find(
    o => o.actionFlags?.financialTransactionId === id
  );
  
  if (linkedOrder) {
    toast.error(
      `Não é possível excluir esta transação pois está vinculada ao pedido ${linkedOrder.id}`,
      { description: 'Cancele o pedido primeiro para excluir a transação.' }
    );
    return;
  }
  
  // Prosseguir com exclusão...
};
```

### 2. Adicionar Validação de Integridade

Criar função que verifica integridade dos dados:

```typescript
const validateDataIntegrity = () => {
  const issues: string[] = [];
  
  salesOrders.forEach(order => {
    if (order.actionFlags?.financialTransactionId) {
      const transaction = financialTransactions.find(
        t => t.id === order.actionFlags.financialTransactionId
      );
      
      if (!transaction) {
        issues.push(
          `Pedido ${order.id} referencia transação inexistente: ${order.actionFlags.financialTransactionId}`
        );
      }
    }
  });
  
  return issues;
};
```

### 3. Implementar Auto-Recuperação

Se detectar inconsistência, tentar recuperar:

```typescript
const autoRecoverTransaction = (order: SalesOrder) => {
  // Buscar transação por referência em vez de ID
  const transaction = financialTransactions.find(
    t => t.reference === order.id && t.origin === "Pedido"
  );
  
  if (transaction) {
    console.log(`🔧 Auto-recuperação: vinculando transação ${transaction.id} ao pedido ${order.id}`);
    
    // Atualizar actionFlags do pedido
    setSalesOrders(prev => prev.map(o =>
      o.id === order.id
        ? { ...o, actionFlags: { ...o.actionFlags, financialTransactionId: transaction.id } }
        : o
    ));
    
    return transaction.id;
  }
  
  return null;
};
```

## 📚 Checklist de Debug

Quando ver o erro, siga este checklist:

- [ ] Copiar logs do console
- [ ] Verificar se a transação existe nas Transações Financeiras
- [ ] Verificar actionFlags do pedido
- [ ] Comparar IDs esperados vs disponíveis
- [ ] Verificar localStorage
- [ ] Verificar se houve exclusão manual
- [ ] Executar validação de integridade
- [ ] Tentar auto-recuperação
- [ ] Se necessário, criar nova transação (comportamento atual)

## 🎓 Entendendo o Fluxo Completo

### Fluxo Normal (SEM erros)

```
1. Criar pedido PV-1050 (status: "Processando")
   └─ Nenhuma ação financeira

2. Alterar para "Entregue"
   ├─ executeAccountsReceivableCreation()
   ├─ Gera ID: FT-0005 (usando novo gerador)
   ├─ Cria transação com status "A Vencer"
   ├─ Salva no financialTransactions
   ├─ Atualiza actionFlags: { financialTransactionId: 'FT-0005' }
   └─ Log: ✅ Conta a receber criada: FT-0005

3. Alterar para "Pago"
   ├─ executeAccountsReceivablePayment()
   ├─ Busca transação FT-0005
   ├─ Log: ✅ Transação encontrada: FT-0005 com status "A vencer"
   ├─ Atualiza status para "Recebido"
   ├─ Adiciona paymentDate
   ├─ Atualiza saldo bancário
   └─ Log: ✅ Transação FT-0005 atualizada para "Recebido"
```

### Fluxo com Erro (Transação deletada)

```
1. Criar pedido PV-1050 (status: "Processando")

2. Alterar para "Entregue"
   ├─ Cria FT-0005 com status "A Vencer"
   └─ Salva actionFlags: { financialTransactionId: 'FT-0005' }

3. USUÁRIO DELETA FT-0005 manualmente

4. Alterar para "Pago"
   ├─ Busca FT-0005
   ├─ Log: ❌ Transação FT-0005 NÃO ENCONTRADA!
   ├─ isNewTransaction = true
   ├─ Gera novo ID: FT-0007
   ├─ Cria nova transação com status "Recebido"
   ├─ Atualiza saldo bancário
   └─ Log: ⚠️ Transação FT-0005 não encontrada. Criando nova: FT-0007
```

## 🚀 Resultado Final

Com as melhorias implementadas:

1. **Logs detalhados** permitem debug rápido
2. **Gerador robusto de IDs** evita duplicações
3. **Fallback automático** cria nova transação se necessário
4. **Rastreabilidade completa** de todas as operações

**Status:** ✅ **MELHORIAS IMPLEMENTADAS**  
**Próximo:** Implementar proteções adicionais conforme recomendações acima
