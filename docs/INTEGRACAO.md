# 📋 Documentação - Sistema de Integração ERP

## 🎯 Visão Geral

Este sistema ERP possui **integração automática completa** entre todos os módulos, garantindo que dados fluam de forma consistente e automática através de toda a aplicação.

---

## 🔄 Arquitetura de Integração

### **Context API Global (ERPContext)**
Localização: `/contexts/ERPContext.tsx`

Gerencia todo o estado da aplicação de forma centralizada:
- ✅ Clientes
- ✅ Fornecedores
- ✅ Pedidos de Venda
- ✅ Pedidos de Compra
- ✅ Transações
- ✅ Inventário (Estoque)

---

## 📊 Fluxos de Integração

### **1. FLUXO DE VENDAS**

```
┌─────────────────────────────────────────────────────────────────┐
│  PEDIDO DE VENDA (SalesOrders)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Status: "Processando" (inicial)
                              │
                              ├─► Status: "Confirmado"
                              │
                              ├─► Status: "Enviado"
                              │
                              ├─► Status: "Entregue" ✅
                              │   └─► TRIGGER DE INTEGRAÇÃO:
                              │       ├─► 1️⃣ Cria TRANSAÇÃO de Venda
                              │       │    - Tipo: "Venda"
                              │       │    - Status: "Concluído"
                              │       │    - Referência: ID do Pedido
                              │       │
                              │       ├─► 2️⃣ Atualiza ESTOQUE
                              │       │    - Diminui quantidade do produto
                              │       │    - Atualiza status (Em Estoque/Baixo/Fora)
                              │       │
                              │       └─► 3️⃣ Atualiza CLIENTE
                              │            - totalOrders += 1
                              │            - totalSpent += valor do pedido
                              │
                              └─► Status: "Cancelado"
                                  └─► Cria TRANSAÇÃO de Venda
                                      - Status: "Cancelado"
```

**Exemplo Prático:**
```typescript
// Quando você muda o status de um pedido para "Entregue":
updateSalesOrderStatus("PV-1045", "Entregue")

// O sistema automaticamente:
// 1. Cria transação TRN-XXX
// 2. Arroz Basmati: 8000kg → 7000kg (-1000kg)
// 3. Cliente ABC: totalOrders: 15→16, totalSpent: R$125.000→R$129.500
```

---

### **2. FLUXO DE COMPRAS**

```
┌─────────────────────────────────────────────────────────────────┐
│  PEDIDO DE COMPRA (PurchaseOrders)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Status: "Pendente" (inicial)
                              │
                              ├─► Status: "Aprovado"
                              │
                              ├─► Status: "Recebido" ✅
                              │   └─► TRIGGER DE INTEGRAÇÃO:
                              │       ├─► 1️⃣ Cria TRANSAÇÃO de Compra
                              │       │    - Tipo: "Compra"
                              │       │    - Status: "Concluído"
                              │       │    - Referência: ID do Pedido
                              │       │
                              │       ├─► 2️⃣ Atualiza ESTOQUE
                              │       │    - Aumenta quantidade do produto
                              │       │    - Atualiza status (Em Estoque/Baixo/Fora)
                              │       │    - Atualiza lastRestocked
                              │       │
                              │       └─► 3️⃣ Atualiza FORNECEDOR
                              │            - totalPurchases += 1
                              │            - totalSpent += valor do pedido
                              │
                              └─► Status: "Cancelado"
                                  └─► Cria TRANSAÇÃO de Compra
                                      - Status: "Cancelado"
```

**Exemplo Prático:**
```typescript
// Quando você muda o status de um pedido para "Recebido":
updatePurchaseOrderStatus("PC-1023", "Recebido")

// O sistema automaticamente:
// 1. Cria transação TRN-XXX
// 2. Arroz Basmati: 8000kg → 13000kg (+5000kg)
// 3. Fornecedor Vale Verde: totalPurchases: 32→33, totalSpent: R$280k→R$296k
```

---

### **3. FLUXO DE TRANSAÇÕES**

```
┌─────────────────────────────────────────────────────────────────┐
│  TRANSAÇÕES (Transactions)                                      │
└─────────────────────────────────────────────────────────────────┘

📝 Transações são SOMENTE LEITURA
❌ Não podem ser criadas manualmente
✅ São criadas automaticamente pelos pedidos

Campos da Transação:
├─► id: "TRN-XXXX" (gerado automaticamente)
├─► type: "Venda" | "Compra"
├─► date: Data atual
├─► party: Nome do Cliente/Fornecedor
├─► partyId: ID do Cliente/Fornecedor
├─► productName: Nome do produto
├─► quantity: Quantidade
├─► amount: Valor total
├─► status: "Concluído" | "Cancelado"
└─► reference: ID do pedido origem (PV-XXX ou PC-XXX)
```

---

### **4. FLUXO DE ESTOQUE**

```
┌─────────────────────────────────────────────────────────────────┐
│  INVENTÁRIO (Inventory)                                         │
└─────────────────────────────────────────────────────────────────┘

Atualização Automática:
├─► Venda Entregue: currentStock -= quantidade
└─► Compra Recebida: currentStock += quantidade

Status Automático:
├─► "Em Estoque": currentStock > reorderLevel
├─► "Baixo Estoque": currentStock ≤ reorderLevel
└─► "Fora de Estoque": currentStock = 0

Exemplo:
Produto: Arroz Basmati
├─► Estoque inicial: 8000 kg
├─► Nível de reposição: 2000 kg
├─► Status: "Em Estoque" ✅
│
├─► Pedido Compra Recebido: +5000 kg
├─► Novo estoque: 13000 kg
├─► Status: "Em Estoque" ✅
│
└─► Pedido Venda Entregue: -1000 kg
    ├─► Novo estoque: 12000 kg
    └─► Status: "Em Estoque" ✅
```

---

## 🔗 Relacionamentos entre Módulos

### **Clientes ↔ Pedidos de Venda ↔ Transações**
```
Cliente ABC Varejo (CLI-001)
    │
    ├─► Pedido PV-1045 (Entregue)
    │   └─► Transação TRN-2051 (Concluído)
    │
    ├─► Pedido PV-1050 (Processando)
    │   └─► (Sem transação ainda)
    │
    └─► totalOrders: 15 | totalSpent: R$ 125.000
```

### **Fornecedores ↔ Pedidos de Compra ↔ Transações**
```
Fornecedor Vale Verde (FOR-001)
    │
    ├─► Pedido PC-1023 (Recebido)
    │   └─► Transação TRN-2050 (Concluído)
    │
    ├─► Pedido PC-1030 (Aprovado)
    │   └─► (Sem transação ainda)
    │
    └─► totalPurchases: 32 | totalSpent: R$ 280.000
```

---

## 🎨 Como Usar o Sistema

### **1. Criar Pedido de Venda**
```typescript
// No componente SalesOrders
1. Clique em "Criar Pedido"
2. Selecione o cliente
3. Preencha produto, quantidade, preço
4. Pedido criado com status "Processando"
```

### **2. Processar Pedido de Venda**
```typescript
// Na tabela de pedidos
1. Use o dropdown de status
2. Mude para "Entregue"
3. ✨ Sistema automaticamente:
   - Cria transação
   - Atualiza estoque
   - Atualiza dados do cliente
   - Mostra notificação de sucesso
```

### **3. Criar Pedido de Compra**
```typescript
// No componente PurchaseOrders
1. Clique em "Criar PC"
2. Selecione o fornecedor
3. Preencha produto, quantidade, preço
4. Pedido criado com status "Pendente"
```

### **4. Processar Pedido de Compra**
```typescript
// Na tabela de pedidos
1. Use o dropdown de status
2. Mude para "Recebido"
3. ✨ Sistema automaticamente:
   - Cria transação
   - Atualiza estoque
   - Atualiza dados do fornecedor
   - Mostra notificação de sucesso
```

---

## 📈 Visualizações

### **Dashboard**
- Mostra dados consolidados em tempo real
- Métricas calculadas do contexto
- Alertas de estoque baixo
- Gráficos de vendas vs compras

### **Transações**
- Lista todas as transações criadas
- Filtros por tipo (Venda/Compra) e status
- Referência ao pedido origem
- Cálculo automático de lucro líquido

### **Inventário**
- Mostra estoque atual de todos os produtos
- Status automático baseado no nível de reposição
- Alertas visuais para baixo estoque
- Histórico de última atualização

---

## 🔐 Regras de Negócio

### **Validações**
✅ Pedidos só criam transações nos status finais ("Entregue" ou "Cancelado" para vendas)
✅ Pedidos só criam transações nos status finais ("Recebido" ou "Cancelado" para compras)
✅ Estoque não pode ficar negativo (atualizado apenas com status corretos)
✅ Transações incluem referência ao pedido origem para rastreabilidade

### **Consistência**
✅ Todos os dados são gerenciados pelo Context
✅ Atualizações são atômicas (acontecem todas juntas)
✅ Estado é imutável (usa spread operators)
✅ Notificações informam o usuário de cada ação

---

## 🧪 Testando o Sistema

### **Cenário 1: Fluxo Completo de Venda**
```
1. Vá em "Clientes" → Veja "ABC Varejo" com totalSpent: R$ 125.000
2. Vá em "Estoque" → Veja "Arroz Basmati" com 8.000 kg
3. Vá em "Pedidos de Venda" → Crie novo pedido:
   - Cliente: ABC Varejo
   - Produto: Arroz Basmati
   - Quantidade: 500
   - Preço: R$ 4,50
4. Mude status para "Entregue"
5. ✨ Veja a notificação de sucesso
6. Vá em "Transações" → Veja nova transação criada
7. Vá em "Estoque" → Veja estoque: 7.500 kg
8. Vá em "Clientes" → Veja totalSpent: R$ 127.250
```

### **Cenário 2: Fluxo Completo de Compra**
```
1. Vá em "Fornecedores" → Veja "Vale Verde" com totalSpent: R$ 280.000
2. Vá em "Estoque" → Veja "Feijão Preto" com 10.000 kg
3. Vá em "Pedidos de Compra" → Crie novo pedido:
   - Fornecedor: Vale Verde
   - Produto: Feijão Preto
   - Quantidade: 3000
   - Preço: R$ 3,80
4. Mude status para "Recebido"
5. ✨ Veja a notificação de sucesso
6. Vá em "Transações" → Veja nova transação criada
7. Vá em "Estoque" → Veja estoque: 13.000 kg
8. Vá em "Fornecedores" → Veja totalSpent: R$ 291.400
```

---

## 🎯 Principais Benefícios

✅ **Automatização Total**: Não precisa criar transações manualmente
✅ **Consistência de Dados**: Todas as atualizações acontecem juntas
✅ **Rastreabilidade**: Cada transação tem referência ao pedido origem
✅ **Controle de Estoque**: Atualização automática com alertas
✅ **Análises em Tempo Real**: Dashboard sempre atualizado
✅ **Experiência do Usuário**: Notificações claras de cada ação

---

## 📝 Notas Técnicas

### **Tecnologias Utilizadas**
- React Context API para gerenciamento de estado global
- TypeScript para type safety
- Sonner para notificações toast
- Shadcn/ui para componentes

### **Estrutura de Arquivos**
```
/contexts
  └─ ERPContext.tsx      # Context global com toda a lógica

/components
  ├─ Dashboard.tsx       # Usa useERP() hook
  ├─ SalesOrders.tsx     # Usa useERP() hook
  ├─ PurchaseOrders.tsx  # Usa useERP() hook
  ├─ Transactions.tsx    # Usa useERP() hook
  ├─ Inventory.tsx       # Usa useERP() hook
  ├─ Customers.tsx       # (Mantém estado local por enquanto)
  └─ Suppliers.tsx       # (Mantém estado local por enquanto)
```

### **Próximos Passos (Opcional)**
- [ ] Migrar Customers e Suppliers para usar 100% o Context
- [ ] Adicionar persistência com Supabase
- [ ] Implementar histórico de movimentações de estoque
- [ ] Adicionar relatórios em PDF
- [ ] Implementar sistema de permissões

---

## 📞 Suporte

Se precisar de ajuda ou encontrar algum problema, verifique:
1. Console do navegador para erros
2. Notificações toast que aparecem na tela
3. Esta documentação para entender o fluxo

---

**Sistema desenvolvido com ❤️ para gestão empresarial eficiente!**
