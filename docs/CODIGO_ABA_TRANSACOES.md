# 💻 Código da Nova Aba: Transações de Pedidos

## 📍 Localização
Arquivo: `/components/AccountsPayableReceivable.tsx`
Posição: Adicionar ANTES da aba "Contas a Receber" (após linha 176)

## 🎨 Código Completo

```tsx
{/* Nova Aba: Transações de Pedidos */}
<TabsContent value="transactions" className="space-y-6">
  {/* Texto Explicativo */}
  <Card className="p-4 bg-blue-50 border-blue-200">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
        <DollarSign className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h4 className="text-blue-900 mb-1">ℹ️ Como funciona a liquidação manual</h4>
        <p className="text-sm text-blue-700">
          Os lançamentos financeiros são criados automaticamente ao entregar o pedido e devem ser baixados manualmente quando o pagamento for recebido.
          O status do pedido é atualizado automaticamente conforme as parcelas são marcadas como recebidas.
        </p>
      </div>
    </div>
  </Card>

  {/* Filtros */}
  <Card className="p-4">
    <div className="flex items-center gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por pedido, cliente..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos">Todos os Status</SelectItem>
          <SelectItem value="A Receber">A Receber</SelectItem>
          <SelectItem value="Recebido">Recebido</SelectItem>
          <SelectItem value="Cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </Card>

  {/* Tabela de Transações */}
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pedido</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Parcela</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data Recebimento</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {financialTransactions
          .filter(t => t.origin === "Pedido" && t.type === "Receita")
          .filter(t => {
            const matchesSearch = 
              (t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
              t.partyName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === "Todos" || t.status === filterStatus;
            return matchesSearch && matchesStatus;
          })
          .sort((a, b) => {
            // Ordenar por pedido e depois por número da parcela
            if (a.reference === b.reference) {
              return (a.installmentNumber || 0) - (b.installmentNumber || 0);
            }
            return (b.reference || "").localeCompare(a.reference || "");
          })
          .map((transaction) => {
            const order = salesOrders.find(o => o.id === transaction.reference);
            const isOverdue = new Date(transaction.dueDate) < today && transaction.status === "A Receber";
            
            return (
              <TableRow key={transaction.id} className={isOverdue ? "bg-red-50" : ""}>
                {/* Pedido */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{transaction.reference}</span>
                    {order && (
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Cliente */}
                <TableCell>
                  <div>
                    <p className="text-sm">{transaction.partyName}</p>
                    <p className="text-xs text-gray-500">{transaction.partyId}</p>
                  </div>
                </TableCell>

                {/* Parcela */}
                <TableCell>
                  {transaction.totalInstallments && transaction.totalInstallments > 1 ? (
                    <Badge variant="secondary">
                      {transaction.installmentNumber}/{transaction.totalInstallments}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Única</Badge>
                  )}
                </TableCell>

                {/* Vencimento */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Atrasado
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Valor */}
                <TableCell className="text-right font-mono">
                  R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </TableCell>

                {/* Data de Recebimento */}
                <TableCell>
                  {transaction.effectiveDate ? (
                    <div className="text-sm">
                      <p>{new Date(transaction.effectiveDate).toLocaleDateString('pt-BR')}</p>
                      {transaction.markedBy && (
                        <p className="text-xs text-gray-500">por {transaction.markedBy}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right">
                  {transaction.status === "A Receber" && (
                    <Button
                      size="sm"
                      onClick={() => openTransactionDialog(transaction)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Marcar como Recebido
                    </Button>
                  )}
                  {transaction.status === "Recebido" && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Recebido
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>

    {/* Mensagem se não houver transações */}
    {financialTransactions.filter(t => t.origin === "Pedido" && t.type === "Receita").length === 0 && (
      <div className="p-8 text-center text-gray-500">
        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma transação de pedido encontrada</p>
        <p className="text-sm mt-1">As transações serão criadas automaticamente quando um pedido for marcado como "Entregue"</p>
      </div>
    )}
  </Card>

  {/* Indicador de Progresso por Pedido */}
  <Card className="p-4">
    <h3 className="text-gray-800 mb-4">📊 Progresso de Recebimentos por Pedido</h3>
    <div className="space-y-3">
      {Array.from(new Set(financialTransactions
        .filter(t => t.origin === "Pedido" && t.type === "Receita")
        .map(t => t.reference)
      )).map(orderId => {
        const orderTransactions = financialTransactions.filter(
          t => t.reference === orderId && t.origin === "Pedido"
        );
        const receivedCount = orderTransactions.filter(t => t.status === "Recebido").length;
        const totalCount = orderTransactions.length;
        const percentage = (receivedCount / totalCount) * 100;
        const order = salesOrders.find(o => o.id === orderId);

        return (
          <div key={orderId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm">{orderId}</span>
                {order && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {order.status}
                    </Badge>
                    <span className="text-sm text-gray-600">- {order.customer}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {receivedCount}/{totalCount} parcelas
                </span>
                <span className="text-sm text-gray-600">
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </Card>
</TabsContent>
```

## 📦 Modal de Liquidação

Adicionar após o modal existente de pagamento (após linha ~400):

```tsx
{/* Modal de Liquidação de Transação */}
<Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        Marcar Parcela como Recebida
      </DialogTitle>
      <DialogDescription>
        Registre o recebimento efetivo desta parcela
      </DialogDescription>
    </DialogHeader>

    {selectedTransaction && (
      <div className="space-y-4">
        {/* Informações da Transação */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Pedido</p>
              <p className="font-mono">{selectedTransaction.reference}</p>
            </div>
            <div>
              <p className="text-gray-600">Cliente</p>
              <p className="truncate">{selectedTransaction.partyName}</p>
            </div>
            <div>
              <p className="text-gray-600">Parcela</p>
              <p>
                {selectedTransaction.totalInstallments > 1
                  ? `${selectedTransaction.installmentNumber}/${selectedTransaction.totalInstallments}`
                  : "Única"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Valor</p>
              <p className="font-mono">
                R$ {selectedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Vencimento</p>
              <p>{new Date(selectedTransaction.dueDate).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </Card>

        {/* Data de Recebimento Efetivo */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📅 Data de Recebimento Efetivo *
          </label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Data em que o pagamento foi efetivamente recebido
          </p>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📝 Observações (opcional)
          </label>
          <textarea
            className="w-full px-3 py-2 border rounded-md text-sm"
            rows={3}
            value={transactionNotes}
            onChange={(e) => setTransactionNotes(e.target.value)}
            placeholder="Ex: Recebido via PIX, comprovante anexado..."
          />
        </div>

        {/* Alerta se atrasado */}
        {new Date(selectedTransaction.dueDate) < new Date() && (
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-900 font-medium">Recebimento em Atraso</p>
                <p className="text-yellow-700 text-xs mt-1">
                  Vencimento: {new Date(selectedTransaction.dueDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    )}

    <DialogFooter className="flex gap-2 sm:gap-0">
      <Button
        variant="outline"
        onClick={() => {
          setShowTransactionDialog(false);
          setSelectedTransaction(null);
        }}
      >
        Cancelar
      </Button>
      <Button
        onClick={handleMarkTransactionAsReceived}
        className="bg-green-600 hover:bg-green-700"
        disabled={!effectiveDate}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Confirmar Recebimento
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 🎨 Ajustes Adicionais

### 1. Ícones de Status no SalesOrders.tsx

Encontrar a função que renderiza o badge de status e adicionar ícones:

```tsx
const getStatusIcon = (status: string) => {
  const icons = {
    "Processando": "🔵",
    "Confirmado": "🟣",
    "Enviado": "🟡",
    "Entregue": "🟢",
    "Parcialmente Concluído": "🟠",
    "Concluído": "🟢",
    "Cancelado": "🔴"
  };
  return icons[status] || "";
};

// No Badge:
<Badge>
  <span className="mr-1">{getStatusIcon(order.status)}</span>
  {order.status}
</Badge>
```

### 2. Indicador de Parcelas em SalesOrders

Adicionar ao lado do status na listagem:

```tsx
{order.status === "Parcialmente Concluído" && (
  <div className="text-xs text-orange-600 flex items-center gap-1 mt-1">
    <Clock className="w-3 h-3" />
    {getReceivedInstallmentsCount(order.id)}/{getTotalInstallmentsCount(order.id)} parcelas recebidas
  </div>
)}
```

---

## ✅ Checklist de Implementação

- [ ] Adicionar nova aba "Transações de Pedidos"
- [ ] Implementar tabela de transações
- [ ] Adicionar botão "Marcar como Recebido"
- [ ] Criar modal de liquidação manual
- [ ] Adicionar indicador de progresso por pedido
- [ ] Implementar ícones de status
- [ ] Adicionar contador de parcelas
- [ ] Testar fluxo completo

---

**Pronto para implementar!** 🚀
