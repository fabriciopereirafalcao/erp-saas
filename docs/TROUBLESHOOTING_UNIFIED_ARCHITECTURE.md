# 🔧 GUIA DE TROUBLESHOOTING: Arquitetura Unificada

**Versão:** 1.0  
**Data:** 06/01/2025

---

## 🎯 PROBLEMAS COMUNS E SOLUÇÕES

### 1. "Conta a receber não aparece após criar pedido"

**Sintomas:**
- Pedido de venda criado com sucesso
- Transação financeira existe
- MAS: Conta não aparece em "Contas a Receber"

**Possíveis Causas:**

#### Causa A: Status incorreto
```typescript
// ❌ ERRADO: Status "Recebido" não cria conta pendente
status: 'Recebido'

// ✅ CORRETO: Status deve ser pendente
status: 'A Receber' // ou 'Vencido'
```

**Solução:**
- Verificar transação em "Transações Financeiras"
- Se status for "Recebido", está correto (não deve aparecer)
- Se status for "A Receber", verificar causa B

#### Causa B: Tipo incorreto
```typescript
// ❌ ERRADO: Tipo "Despesa" não vai para Contas a Receber
type: 'Despesa'

// ✅ CORRETO: Tipo deve ser "Receita"
type: 'Receita'
```

**Solução:**
- Contas a **Receber** = Transações de **Receita** pendentes
- Contas a **Pagar** = Transações de **Despesa** pendentes

#### Causa C: Transação cancelada
```typescript
// ❌ Transação com administrative_status = 'cancelled'
administrative_status: 'cancelled'

// ✅ Deve ser 'active' ou null
administrative_status: 'active' // ou null
```

**Solução:**
- Verificar se transação foi cancelada acidentalmente
- Transações canceladas NÃO aparecem em contas pendentes (comportamento correto)

---

### 2. "Conta aparece duplicada"

**Sintomas:**
- Mesma conta aparece 2x na lista
- Valores duplicados nos totais

**Causa Provável:** Bug de migração ou cache desatualizado

**Solução:**
```typescript
// 1. Limpar cache do navegador
localStorage.clear();
sessionStorage.clear();

// 2. Recarregar página
window.location.reload();

// 3. Se persistir, verificar no backend
console.log('Financial Transactions:', financialTransactions);
console.log('Accounts Receivable (computed):', accountsReceivable);
```

**Debug:**
```typescript
// Verificar se há transações duplicadas
const duplicates = financialTransactions.filter((txn, index, self) => 
  self.findIndex(t => t.id === txn.id) !== index
);
console.log('Duplicatas encontradas:', duplicates);
```

**Correção Permanente:**
- Problema não deveria ocorrer com computed properties
- Se ocorrer, reportar como BUG CRÍTICO

---

### 3. "Conta não some após liquidar"

**Sintomas:**
- Marcar transação como "Recebido" ou "Pago"
- Conta continua em "Contas a Receber/Pagar"

**Causa Provável:** Status não atualizado ou computed property não recalculado

**Debug:**
```typescript
// 1. Verificar status da transação
const txn = financialTransactions.find(t => t.id === 'FT-0001');
console.log('Status atual:', txn.status); // Deve ser "Recebido" ou "Pago"

// 2. Verificar se está no array de contas
const isInAccounts = accountsReceivable.find(a => a.id === 'FT-0001');
console.log('Está em contas?', isInAccounts); // Deve ser undefined
```

**Solução:**
```typescript
// Se status estiver errado, atualizar:
updateFinancialTransaction('FT-0001', { status: 'Recebido' });

// Computed property deve recalcular automaticamente
// Se não recalcular, recarregar página
```

---

### 4. "Totais incorretos no dashboard"

**Sintomas:**
- Dashboard mostra valores errados
- Diferença entre lista e total

**Causa Provável:** Incluindo transações canceladas ou substituídas

**Debug:**
```typescript
// Verificar filtro de administrative_status
const pendingTransactions = financialTransactions.filter(txn =>
  txn.type === 'Receita' &&
  (txn.status === 'A Receber' || txn.status === 'Vencido') &&
  (!txn.administrativeStatus || txn.administrativeStatus === 'active')
);

console.log('Transações pendentes (filtradas):', pendingTransactions.length);
console.log('Total calculado:', pendingTransactions.reduce((sum, t) => sum + t.amount, 0));
```

**Solução:**
- Computed property já aplica filtro correto
- Se totais estiverem errados, verificar se há transações com `administrative_status` incorreto

---

### 5. "Erro: 'Cannot read property X of undefined'"

**Sintomas:**
- Erro ao acessar propriedade de conta
- App quebra ao renderizar lista

**Causa Provável:** Transação sem campos obrigatórios

**Debug:**
```typescript
// Verificar se todas as transações têm campos necessários
const invalidTransactions = financialTransactions.filter(txn =>
  !txn.id || !txn.type || !txn.status || !txn.amount
);

console.log('Transações inválidas:', invalidTransactions);
```

**Solução:**
```typescript
// Adicionar safe defaults no computed property
const accountsReceivable = useMemo(() => {
  return financialTransactions
    .filter(/* ... */)
    .map(txn => ({
      id: txn.id || 'UNKNOWN',
      customerId: txn.partyId || '',
      customerName: txn.partyName || 'Cliente Desconhecido',
      amount: txn.amount || 0,
      // ... outros campos com defaults
    }));
}, [financialTransactions]);
```

---

### 6. "Conta não atualiza após substituição"

**Sintomas:**
- Substituir transação (TC-011)
- Conta antiga continua aparecendo
- OU: Conta nova não aparece

**Causa Provável:** `administrative_status` não definido corretamente

**Debug:**
```typescript
// Verificar transações após substituição
const oldTxn = financialTransactions.find(t => t.id === 'FT-0001');
const newTxn = financialTransactions.find(t => t.id === 'FT-0002');

console.log('Transação antiga:', oldTxn);
// administrative_status deve ser 'replaced'

console.log('Transação nova:', newTxn);
// administrative_status deve ser 'active' ou null
```

**Solução:**
- Função `substituteFinancialTransaction` deve definir corretamente os status
- Computed property filtra automaticamente transações não-ativas

---

### 7. "Performance lenta ao carregar contas"

**Sintomas:**
- Lista demora para carregar
- App "trava" por alguns segundos

**Causa Provável:** Muitas transações (>1000) sem otimização

**Debug:**
```typescript
// Medir tempo de cálculo
console.time('accountsReceivable');
const accounts = useMemo(() => {
  // ... computed property
}, [financialTransactions]);
console.timeEnd('accountsReceivable');
// Deve ser < 50ms para 1000 transações
```

**Solução:**
```typescript
// Se > 100ms, otimizar com índice
const accountsReceivable = useMemo(() => {
  // Criar índice uma vez
  const activeTransactions = financialTransactions.filter(txn =>
    !txn.administrativeStatus || txn.administrativeStatus === 'active'
  );
  
  // Filtrar receitas pendentes
  return activeTransactions
    .filter(txn => 
      txn.type === 'Receita' && 
      (txn.status === 'A Receber' || txn.status === 'Vencido')
    )
    .map(/* ... */);
}, [financialTransactions]);
```

---

### 8. "Função deprecated foi chamada"

**Sintomas:**
- Toast de erro: "Função obsoleta - use Transações Financeiras"
- Console: `⚠️ addAccountReceivable DEPRECATED`

**Causa Provável:** Código antigo ainda usando funções legacy

**Funções Deprecated:**
```typescript
// ❌ NÃO USAR MAIS
addAccountReceivable(...)
updateAccountReceivable(...)
markAsReceived(...)

addAccountPayable(...)
updateAccountPayable(...)
markAsPaid(...)
```

**Migrar para:**
```typescript
// ✅ USAR ESTAS
addFinancialTransaction({ type: 'Receita', status: 'A Receber', ... })
updateFinancialTransaction(id, { ... })
markTransactionAsReceived(id, date, bankAccountId, bankAccountName)

addFinancialTransaction({ type: 'Despesa', status: 'A Pagar', ... })
updateFinancialTransaction(id, { ... })
markTransactionAsPaid(id, date, bankAccountId, bankAccountName)
```

**Solução:**
1. Identificar onde função foi chamada (ver stack trace)
2. Substituir por função correta
3. Testar funcionalidade

---

### 9. "Conta aparece mesmo após cancelar transação"

**Sintomas:**
- Cancelar transação via `cancelFinancialTransaction`
- Conta continua em lista de pendentes

**Causa Provável:** `administrative_status` não definido

**Debug:**
```typescript
const txn = financialTransactions.find(t => t.id === 'FT-0001');
console.log('Administrative status:', txn.administrativeStatus);
// Deve ser 'cancelled'
```

**Solução:**
```typescript
// Função cancelFinancialTransaction deve fazer:
setFinancialTransactions(prev =>
  prev.map(t => t.id === id ? {
    ...t,
    administrative_status: 'cancelled' // ✅ IMPORTANTE!
  } : t)
);

// Computed property automaticamente exclui
```

---

### 10. "Dados diferentes entre abas/dispositivos"

**Sintomas:**
- Aba 1 mostra 5 contas
- Aba 2 mostra 3 contas

**Causa Provável:** Cache local desatualizado ou sincronização backend pendente

**Debug:**
```typescript
// Verificar timestamp da última sincronização
console.log('Last sync:', localStorage.getItem('lastBackendSync'));

// Forçar sincronização
await syncAllEntities();
```

**Solução:**
```typescript
// 1. Recarregar dados do backend
const refreshed = await loadEntity('financial-transactions');
setFinancialTransactions(refreshed);

// 2. Limpar cache se necessário
localStorage.removeItem('cached_financial_transactions');

// 3. Recarregar página
window.location.reload();
```

---

## 🔍 FERRAMENTAS DE DEBUG

### Console Helper
```typescript
// Adicionar ao console do browser para debug rápido
window.debugAccounts = () => {
  const { financialTransactions, accountsReceivable, accountsPayable } = useERPContext();
  
  console.group('📊 DEBUG: Contas');
  
  console.log('Total Transações:', financialTransactions.length);
  console.log('Total Contas a Receber:', accountsReceivable.length);
  console.log('Total Contas a Pagar:', accountsPayable.length);
  
  console.groupCollapsed('Receitas Pendentes');
  console.table(accountsReceivable);
  console.groupEnd();
  
  console.groupCollapsed('Despesas Pendentes');
  console.table(accountsPayable);
  console.groupEnd();
  
  // Verificar integridade
  const orphanedAccounts = accountsReceivable.filter(account =>
    !financialTransactions.find(txn => txn.id === account.id)
  );
  
  if (orphanedAccounts.length > 0) {
    console.error('⚠️ CONTAS ÓRFÃS ENCONTRADAS:', orphanedAccounts);
  } else {
    console.log('✅ Nenhuma conta órfã');
  }
  
  console.groupEnd();
};

// Usar: debugAccounts()
```

### Validador de Integridade
```typescript
window.validateAccountsIntegrity = () => {
  const { financialTransactions, accountsReceivable, accountsPayable } = useERPContext();
  
  const errors = [];
  
  // 1. Verificar contas órfãs
  accountsReceivable.forEach(account => {
    const txn = financialTransactions.find(t => t.id === account.id);
    if (!txn) {
      errors.push(`Conta órfã (sem transação): ${account.id}`);
    }
  });
  
  // 2. Verificar status incorretos
  accountsReceivable.forEach(account => {
    const txn = financialTransactions.find(t => t.id === account.id);
    if (txn && (txn.status === 'Recebido' || txn.status === 'Pago')) {
      errors.push(`Conta com status pago em lista de pendentes: ${account.id}`);
    }
  });
  
  // 3. Verificar transações canceladas
  accountsReceivable.forEach(account => {
    const txn = financialTransactions.find(t => t.id === account.id);
    if (txn && txn.administrative_status === 'cancelled') {
      errors.push(`Conta cancelada em lista de pendentes: ${account.id}`);
    }
  });
  
  if (errors.length === 0) {
    console.log('✅ Integridade OK!');
  } else {
    console.error('❌ Erros de integridade:', errors);
  }
  
  return errors;
};
```

---

## 📞 QUANDO REPORTAR BUG

### Bugs Críticos (Reportar IMEDIATAMENTE)
- ✅ Contas duplicadas
- ✅ Contas órfãs (sem transação correspondente)
- ✅ Totais incorretos
- ✅ Dados perdidos após reload
- ✅ Crash da aplicação

### Bugs Médios (Reportar em 24h)
- ⚠️ Performance ruim (> 100ms)
- ⚠️ UI/UX confuso
- ⚠️ Mensagens de erro pouco claras

### Melhorias (Sugerir)
- 💡 Filtros adicionais
- 💡 Exportação para Excel
- 💡 Notificações de vencimento

---

## 📝 TEMPLATE DE REPORT

```markdown
**Título:** [Descrição curta do problema]

**Severidade:** Crítica / Média / Baixa

**Ambiente:**
- Browser: Chrome 120 / Firefox 121 / Safari 17
- Dispositivo: Desktop / Mobile
- URL: metaerp.com.br/...

**Passos para Reproduzir:**
1. Ir para [página]
2. Clicar em [botão]
3. Preencher [campos]
4. ...

**Resultado Esperado:**
[O que deveria acontecer]

**Resultado Atual:**
[O que realmente acontece]

**Screenshots/Vídeos:**
[Anexar se possível]

**Console Logs:**
```
[Copiar erros do console]
```

**Dados de Debug:**
```javascript
// Executar window.debugAccounts() e colar resultado
```

**Dados Adicionais:**
- Número de transações: X
- Número de contas: Y
- Última sincronização: [timestamp]
```

---

## ✅ CHECKLIST DE TROUBLESHOOTING

Antes de reportar bug, verificar:

- [ ] Recarreguei a página (F5)
- [ ] Limpei cache do browser
- [ ] Verifiquei console do browser (F12)
- [ ] Executei `window.debugAccounts()`
- [ ] Executei `window.validateAccountsIntegrity()`
- [ ] Consultei este guia de troubleshooting
- [ ] Verifiquei se não é função deprecated
- [ ] Testei em outro browser
- [ ] Aguardei 30s (sincronização automática)

---

**Última atualização:** 06/01/2025  
**Versão do documento:** 1.0
