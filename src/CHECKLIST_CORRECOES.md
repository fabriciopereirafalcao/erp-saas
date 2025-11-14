# ✅ CHECKLIST DE CORREÇÕES - SISTEMA ERP

## 🔴 CRÍTICO - Implementar IMEDIATAMENTE

### [ ] CRIT-001: Proteção contra Duplicação de Baixa de Estoque
**Arquivos:** `/contexts/ERPContext.tsx`

**Tarefas:**
- [ ] Adicionar flag `isProcessing` nas operações de estoque
- [ ] Implementar verificação atômica antes de executar baixa
- [ ] Adicionar try/catch com rollback em caso de erro
- [ ] Validar `actionFlags.stockReduced` antes de processar
- [ ] Adicionar logs de auditoria para cada movimento
- [ ] Testar cenário de cliques múltiplos simultâneos

**Código Exemplo:**
```typescript
const handleStockReduction = async (orderId: string) => {
  const order = salesOrders.find(o => o.id === orderId);
  
  // Verificação de proteção
  if (order.actionFlags?.stockReduced) {
    console.warn(`Estoque já reduzido para pedido ${orderId}`);
    return;
  }
  
  if (order.isProcessing) {
    console.warn(`Pedido ${orderId} já está sendo processado`);
    return;
  }
  
  // Marcar como processando
  updateOrder(orderId, { isProcessing: true });
  
  try {
    // Executar baixa
    const movementId = await reduceInventory(order);
    
    // Atualizar flags
    updateOrder(orderId, {
      isProcessing: false,
      actionFlags: {
        ...order.actionFlags,
        stockReduced: true,
        stockReductionId: movementId
      }
    });
    
    // Log de auditoria
    addAuditLog({
      action: "STOCK_REDUCED",
      orderId,
      movementId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Reverter em caso de erro
    updateOrder(orderId, { isProcessing: false });
    throw error;
  }
};
```

---

### [ ] CRIT-002: Prevenir Duplicação de Contas Financeiras
**Arquivos:** `/contexts/ERPContext.tsx`, `/components/SalesOrders.tsx`

**Tarefas:**
- [ ] Verificar se já existe conta a receber antes de criar nova
- [ ] Adicionar índice único por referência (orderId)
- [ ] Implementar validação de unicidade
- [ ] Adicionar logs de criação de contas
- [ ] Criar função helper `getOrCreateAccountReceivable()`
- [ ] Testar cenário de mudança de status repetida

**Código Exemplo:**
```typescript
const getOrCreateAccountReceivable = (order: SalesOrder): string => {
  // Buscar conta existente
  const existing = accountsReceivable.find(
    ar => ar.reference === order.id && ar.status !== "Cancelado"
  );
  
  if (existing) {
    console.info(`Conta a receber já existe: ${existing.id}`);
    return existing.id;
  }
  
  // Criar nova conta apenas se não existir
  const newAccount: AccountReceivable = {
    id: generateId("AR"),
    customerId: order.customerId,
    customerName: order.customer,
    invoiceNumber: order.id,
    issueDate: order.issueDate || order.orderDate,
    dueDate: calculateDueDate(order),
    amount: order.totalAmount,
    paidAmount: 0,
    remainingAmount: order.totalAmount,
    status: "A Vencer",
    reference: order.id,
    description: `Pedido ${order.id} - ${order.productName}`
  };
  
  addAccountReceivable(newAccount);
  
  // Log
  addAuditLog({
    action: "ACCOUNT_RECEIVABLE_CREATED",
    accountId: newAccount.id,
    orderId: order.id,
    amount: newAccount.amount
  });
  
  return newAccount.id;
};
```

---

### [ ] CRIT-003: Validação de Saldo de Estoque
**Arquivos:** `/components/SalesOrders.tsx`, `/contexts/ERPContext.tsx`

**Tarefas:**
- [ ] Criar função `validateStockAvailability()`
- [ ] Validar estoque ao criar pedido
- [ ] Validar estoque ao confirmar pedido
- [ ] Mostrar saldo disponível na tela de pedidos
- [ ] Bloquear confirmação se estoque insuficiente
- [ ] Adicionar indicador visual de disponibilidade

**Código Exemplo:**
```typescript
interface StockValidation {
  isAvailable: boolean;
  currentStock: number;
  requestedQty: number;
  availableQty: number;
  message: string;
}

const validateStockAvailability = (
  productName: string, 
  quantity: number
): StockValidation => {
  const product = inventory.find(p => p.productName === productName);
  
  if (!product) {
    return {
      isAvailable: false,
      currentStock: 0,
      requestedQty: quantity,
      availableQty: 0,
      message: `Produto "${productName}" não encontrado no estoque`
    };
  }
  
  // Considerar reservas de pedidos em andamento
  const reserved = salesOrders
    .filter(o => 
      o.productName === productName && 
      o.status !== "Cancelado" && 
      o.status !== "Pago" &&
      !o.actionFlags?.stockReduced
    )
    .reduce((sum, o) => sum + o.quantity, 0);
  
  const available = product.quantity - reserved;
  
  if (available < quantity) {
    return {
      isAvailable: false,
      currentStock: product.quantity,
      requestedQty: quantity,
      availableQty: available,
      message: `Estoque insuficiente. Disponível: ${available}, Solicitado: ${quantity} (Reservado: ${reserved})`
    };
  }
  
  return {
    isAvailable: true,
    currentStock: product.quantity,
    requestedQty: quantity,
    availableQty: available,
    message: "Estoque disponível"
  };
};

// Uso ao criar pedido
const handleCreateOrder = () => {
  const validation = validateStockAvailability(
    orderForm.productName, 
    orderForm.quantity
  );
  
  if (!validation.isAvailable) {
    toast.error(validation.message);
    return;
  }
  
  // Prosseguir com criação
  createOrder(orderForm);
};
```

---

### [ ] CRIT-004: Validação de Transição de Status
**Arquivos:** `/components/SalesOrders.tsx`, `/components/PurchaseOrders.tsx`

**Tarefas:**
- [ ] Definir máquina de estados com transições válidas
- [ ] Criar função `validateStatusTransition()`
- [ ] Bloquear transições inválidas
- [ ] Mostrar próximos status disponíveis
- [ ] Adicionar opção de "avançar automaticamente" (pular status mantendo automações)
- [ ] Testar todas as combinações possíveis

**Código Exemplo:**
```typescript
// Definição da máquina de estados
const STATUS_MACHINE = {
  "Processando": {
    next: ["Confirmado", "Cancelado"],
    actions: []
  },
  "Confirmado": {
    next: ["Enviado", "Cancelado"],
    actions: ["validatePayment"]
  },
  "Enviado": {
    next: ["Entregue", "Cancelado"],
    actions: []
  },
  "Entregue": {
    next: ["Pago"],
    actions: ["reduceStock", "createAccountReceivable"]
  },
  "Pago": {
    next: [],
    actions: ["createFinancialTransaction"]
  },
  "Cancelado": {
    next: [],
    actions: ["rollbackAll"]
  }
};

const validateStatusTransition = (
  currentStatus: string, 
  newStatus: string
): { valid: boolean; message: string } => {
  const state = STATUS_MACHINE[currentStatus];
  
  if (!state) {
    return {
      valid: false,
      message: `Status atual inválido: ${currentStatus}`
    };
  }
  
  if (!state.next.includes(newStatus)) {
    return {
      valid: false,
      message: `Transição inválida: ${currentStatus} → ${newStatus}. Próximos status válidos: ${state.next.join(", ")}`
    };
  }
  
  return {
    valid: true,
    message: "Transição válida"
  };
};

// Ao mudar status
const handleStatusChange = async (orderId: string, newStatus: string) => {
  const order = salesOrders.find(o => o.id === orderId);
  const validation = validateStatusTransition(order.status, newStatus);
  
  if (!validation.valid) {
    toast.error(validation.message);
    return;
  }
  
  // Executar ações do status
  const actions = STATUS_MACHINE[newStatus].actions;
  for (const action of actions) {
    await executeAction(action, order);
  }
  
  // Atualizar status
  updateOrderStatus(orderId, newStatus);
};
```

---

## 🟠 ALTA PRIORIDADE - Implementar em Seguida

### [ ] HIGH-001: Rollback Completo ao Cancelar
**Tarefas:**
- [ ] Criar função `rollbackOrder()`
- [ ] Reverter baixa de estoque
- [ ] Cancelar conta a receber
- [ ] Cancelar transação financeira
- [ ] Registrar reversões no histórico
- [ ] Adicionar confirmação antes de cancelar

---

### [ ] HIGH-002: Validação de Campos Obrigatórios
**Tarefas:**
- [ ] Marcar campos obrigatórios com asterisco (*)
- [ ] Adicionar validações inline
- [ ] Bloquear salvamento se incompleto
- [ ] Destacar campos com erro em vermelho
- [ ] Mostrar mensagem específica para cada campo

**Campos Críticos:**
- [ ] NCM em produtos
- [ ] CNPJ/CPF em clientes
- [ ] IE em empresa
- [ ] Endereço completo em empresa
- [ ] Email e telefone em clientes

---

### [ ] HIGH-003: Implementar Controle de Permissões
**Tarefas:**
- [ ] Criar hook `usePermissions()`
- [ ] Criar HOC `withPermission()`
- [ ] Proteger rotas por permissão
- [ ] Proteger botões de ação
- [ ] Mostrar mensagem quando sem permissão
- [ ] Adicionar indicador visual de permissões

**Exemplo de Hook:**
```typescript
const usePermissions = () => {
  const { currentUser } = useAuth();
  const { roles } = useERP();
  
  const hasPermission = (module: string, action: string): boolean => {
    if (!currentUser || !currentUser.role) return false;
    
    const role = roles.find(r => r.id === currentUser.role);
    if (!role) return false;
    
    return role.permissions[module]?.[action] || false;
  };
  
  const canView = (module: string) => hasPermission(module, "view");
  const canCreate = (module: string) => hasPermission(module, "create");
  const canEdit = (module: string) => hasPermission(module, "edit");
  const canDelete = (module: string) => hasPermission(module, "delete");
  const canApprove = (module: string) => hasPermission(module, "approve");
  
  return { 
    hasPermission, 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canApprove 
  };
};

// Uso
const { canCreate, canEdit } = usePermissions();

{canCreate("sales") && (
  <Button onClick={handleCreateOrder}>Novo Pedido</Button>
)}
```

---

### [ ] HIGH-004: Validação Completa para NFe
**Tarefas:**
- [ ] Criar checklist de pré-requisitos
- [ ] Validar dados da empresa
- [ ] Validar dados do cliente
- [ ] Validar dados dos produtos
- [ ] Validar CFOP, CST/CSOSN
- [ ] Bloquear transmissão se dados incompletos

---

### [ ] HIGH-005: Integração Pedido → NFe
**Tarefas:**
- [ ] Adicionar botão "Gerar NFe" em pedidos entregues
- [ ] Criar rascunho automático de NFe
- [ ] Preencher dados automaticamente do pedido
- [ ] Vincular NFe ao pedido
- [ ] Mostrar status de faturamento no pedido

---

## 🟡 MÉDIA PRIORIDADE

### [ ] MED-001: Validação de Totais
- [ ] Calcular total automaticamente
- [ ] Validar valores manuais
- [ ] Recalcular ao alterar itens

### [ ] MED-002: Otimizar Performance
- [ ] Usar useMemo() em cálculos pesados
- [ ] Usar useCallback() em funções
- [ ] Virtualizar listas grandes

### [ ] MED-003: Melhorar Feedback
- [ ] Adicionar loading states
- [ ] Desabilitar botões durante processamento
- [ ] Mostrar toasts de confirmação

### [ ] MED-004: Tabelas de Preço Automáticas
- [ ] Carregar tabela do cliente automaticamente
- [ ] Aplicar preços nos produtos do pedido
- [ ] Mostrar desconto aplicado

### [ ] MED-005: Rastreabilidade de Estoque
- [ ] Adicionar campos de lote
- [ ] Adicionar data de validade
- [ ] Adicionar localização no depósito

---

## 🔵 BAIXA PRIORIDADE

### [ ] LOW-001: Breadcrumbs
- [ ] Adicionar em formulários
- [ ] Adicionar em modais
- [ ] Mostrar caminho atual

### [ ] LOW-002: Exportação
- [ ] Implementar Excel
- [ ] Implementar PDF
- [ ] Implementar CSV

### [ ] LOW-003: Paginação
- [ ] Implementar em tabelas grandes
- [ ] Adicionar controles de página
- [ ] Mostrar total de registros

---

## ⚪ INFORMATIVO

### [ ] INFO-001: Expandir Logs
- [ ] Logs em todos os módulos
- [ ] Componente reutilizável de histórico
- [ ] Filtros de auditoria

### [ ] INFO-002: Tooltips
- [ ] Ajuda em campos complexos
- [ ] Exemplos de preenchimento
- [ ] Links para documentação

### [ ] INFO-003: Logs de Acesso
- [ ] Registrar logins
- [ ] Registrar acessos a módulos
- [ ] Dashboard de auditoria

---

## 📊 PROGRESSO GERAL

**Crítico:** 0/4 (0%)  
**Alto:** 0/5 (0%)  
**Médio:** 0/5 (0%)  
**Baixo:** 0/3 (0%)  
**Info:** 0/3 (0%)  

**TOTAL:** 0/20 (0%)

---

## 🎯 META

- [x] Auditoria completa realizada
- [ ] Problemas críticos resolvidos (0/4)
- [ ] Problemas altos resolvidos (0/5)
- [ ] Problemas médios resolvidos (0/5)
- [ ] Sistema pronto para produção

**Data Estimada para Conclusão:** 8 semanas a partir do início das correções
