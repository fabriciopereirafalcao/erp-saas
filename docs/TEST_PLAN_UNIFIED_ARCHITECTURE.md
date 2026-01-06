# 🧪 PLANO DE TESTES: Arquitetura Unificada de Contas A Pagar/Receber

**Data:** 06/01/2025  
**Versão:** 1.0  
**Migração:** Completa ✅

---

## 📋 OBJETIVO

Validar que a arquitetura unificada funciona corretamente em todos os fluxos de negócio, garantindo:
1. ✅ Contas a receber/pagar são criadas automaticamente
2. ✅ Sincronização perfeita com financial_transactions
3. ✅ Liquidações funcionam corretamente
4. ✅ Cancelamentos removem de contas pendentes
5. ✅ Filtros e buscas funcionam
6. ✅ Cálculos de totais estão corretos

---

## 🎯 CASOS DE TESTE

### GRUPO 1: Criação de Contas a Receber (Pedido de Venda)

#### TC-001: Criar pedido de venda à vista
**Objetivo:** Validar que pedido à vista NÃO cria conta a receber

**Passos:**
1. Ir para "Pedidos de Venda"
2. Criar novo pedido:
   - Cliente: Cliente Teste
   - Produto: Produto XYZ (R$ 1.000)
   - Forma de pagamento: À vista
3. Confirmar pedido

**Resultado Esperado:**
- ✅ Pedido criado com sucesso
- ✅ Transação financeira criada com status "Recebido"
- ✅ **NÃO** aparece em "Contas a Receber"
- ✅ Saldo bancário atualizado (+R$ 1.000)

---

#### TC-002: Criar pedido de venda a prazo (parcela única)
**Objetivo:** Validar criação automática de conta a receber

**Passos:**
1. Ir para "Pedidos de Venda"
2. Criar novo pedido:
   - Cliente: Cliente Teste
   - Produto: Produto XYZ (R$ 1.000)
   - Forma de pagamento: A prazo
   - Vencimento: 15/01/2025
3. Confirmar pedido

**Resultado Esperado:**
- ✅ Pedido criado com sucesso
- ✅ Transação financeira criada com status "A Receber"
- ✅ Aparece em "Contas a Receber" com:
  - Cliente: Cliente Teste
  - Valor: R$ 1.000
  - Status: A Receber (ou Vencido se data passada)
  - Vencimento: 15/01/2025
- ✅ Saldo bancário **não** atualizado
- ✅ Total "A Receber" atualizado no dashboard

---

#### TC-003: Criar pedido de venda parcelado (3x)
**Objetivo:** Validar criação de múltiplas contas a receber

**Passos:**
1. Ir para "Pedidos de Venda"
2. Criar novo pedido:
   - Cliente: Cliente Teste
   - Produto: Produto XYZ (R$ 3.000)
   - Forma de pagamento: Parcelado
   - Número de parcelas: 3
   - Vencimento primeira parcela: 15/01/2025
3. Confirmar pedido

**Resultado Esperado:**
- ✅ Pedido criado com sucesso
- ✅ 3 transações financeiras criadas
- ✅ 3 contas a receber aparecem na lista:
  - Parcela 1/3: R$ 1.000 - Venc: 15/01/2025
  - Parcela 2/3: R$ 1.000 - Venc: 15/02/2025
  - Parcela 3/3: R$ 1.000 - Venc: 15/03/2025
- ✅ Total "A Receber" = R$ 3.000

---

### GRUPO 2: Liquidação de Contas a Receber

#### TC-004: Liquidar conta a receber (integral)
**Objetivo:** Validar que liquidação remove da lista de pendentes

**Pré-requisito:** TC-002 concluído

**Passos:**
1. Ir para "Contas a Receber"
2. Selecionar conta criada no TC-002
3. Clicar em "Liquidar"
4. Preencher:
   - Data: 10/01/2025
   - Conta bancária: Conta Principal
5. Confirmar liquidação

**Resultado Esperado:**
- ✅ Toast de sucesso exibido
- ✅ Conta **removida** de "Contas a Receber"
- ✅ Transação financeira atualizada para status "Recebido"
- ✅ Saldo bancário atualizado (+R$ 1.000)
- ✅ Total "A Receber" atualizado (-R$ 1.000)
- ✅ Aparece em "Transações Financeiras" com status "Recebido"

---

#### TC-005: Liquidar parcela de pedido parcelado
**Objetivo:** Validar liquidação parcial de pedido parcelado

**Pré-requisito:** TC-003 concluído

**Passos:**
1. Ir para "Contas a Receber"
2. Selecionar **apenas parcela 1/3**
3. Liquidar com data 10/01/2025

**Resultado Esperado:**
- ✅ Parcela 1/3 removida de "Contas a Receber"
- ✅ Parcelas 2/3 e 3/3 **permanecem** na lista
- ✅ Total "A Receber" = R$ 2.000 (reduzido de R$ 3.000)
- ✅ Pedido de venda mostra "1/3 parcelas recebidas"

---

### GRUPO 3: Criação de Contas a Pagar (Pedido de Compra)

#### TC-006: Criar pedido de compra à vista
**Objetivo:** Validar que pedido à vista NÃO cria conta a pagar

**Passos:**
1. Ir para "Pedidos de Compra"
2. Criar novo pedido:
   - Fornecedor: Fornecedor Teste
   - Produto: Produto ABC (R$ 500)
   - Forma de pagamento: À vista
3. Confirmar pedido

**Resultado Esperado:**
- ✅ Pedido criado com sucesso
- ✅ Transação financeira criada com status "Pago"
- ✅ **NÃO** aparece em "Contas a Pagar"
- ✅ Saldo bancário atualizado (-R$ 500)

---

#### TC-007: Criar pedido de compra a prazo
**Objetivo:** Validar criação automática de conta a pagar

**Passos:**
1. Ir para "Pedidos de Compra"
2. Criar novo pedido:
   - Fornecedor: Fornecedor Teste
   - Produto: Produto ABC (R$ 500)
   - Forma de pagamento: A prazo
   - Vencimento: 20/01/2025
3. Confirmar pedido

**Resultado Esperado:**
- ✅ Pedido criado com sucesso
- ✅ Transação financeira criada com status "A Pagar"
- ✅ Aparece em "Contas a Pagar" com:
  - Fornecedor: Fornecedor Teste
  - Valor: R$ 500
  - Status: A Pagar (ou Vencido se data passada)
  - Vencimento: 20/01/2025
- ✅ Total "A Pagar" atualizado no dashboard

---

#### TC-008: Liquidar conta a pagar
**Objetivo:** Validar que pagamento remove da lista de pendentes

**Pré-requisito:** TC-007 concluído

**Passos:**
1. Ir para "Contas a Pagar"
2. Selecionar conta criada no TC-007
3. Clicar em "Pagar"
4. Preencher:
   - Data: 18/01/2025
   - Conta bancária: Conta Principal
5. Confirmar pagamento

**Resultado Esperado:**
- ✅ Toast de sucesso exibido
- ✅ Conta **removida** de "Contas a Pagar"
- ✅ Transação financeira atualizada para status "Pago"
- ✅ Saldo bancário atualizado (-R$ 500)
- ✅ Total "A Pagar" atualizado (-R$ 500)

---

### GRUPO 4: Cancelamento de Transações

#### TC-009: Cancelar transação pendente (A Receber)
**Objetivo:** Validar que cancelamento remove de contas a receber

**Pré-requisito:** TC-002 concluído (ou criar nova transação)

**Passos:**
1. Ir para "Transações Financeiras"
2. Selecionar transação com status "A Receber"
3. Clicar em "Cancelar"
4. Confirmar motivo: "Pedido cancelado pelo cliente"

**Resultado Esperado:**
- ✅ Transação marcada como `administrative_status = 'cancelled'`
- ✅ **Removida** de "Contas a Receber" (não aparece mais)
- ✅ Aparece em "Transações Financeiras" com tag "CANCELADA"
- ✅ Total "A Receber" atualizado (excluindo valor cancelado)

---

#### TC-010: Cancelar transação liquidada
**Objetivo:** Validar que cancelamento de transação paga não afeta contas

**Pré-requisito:** TC-004 concluído

**Passos:**
1. Ir para "Transações Financeiras"
2. Selecionar transação com status "Recebido"
3. Clicar em "Cancelar"
4. Confirmar motivo: "Devolução de venda"

**Resultado Esperado:**
- ✅ Transação marcada como `administrative_status = 'cancelled'`
- ✅ **NÃO** aparece em "Contas a Receber" (já estava liquidada)
- ✅ Saldo bancário **não** alterado (requer estorno manual)
- ✅ Tag "CANCELADA" exibida

---

### GRUPO 5: Substituição de Transações

#### TC-011: Substituir transação pendente
**Objetivo:** Validar que substituição atualiza contas pendentes

**Pré-requisito:** TC-002 concluído

**Passos:**
1. Ir para "Transações Financeiras"
2. Selecionar transação com status "A Receber"
3. Clicar em "Substituir"
4. Preencher nova transação:
   - Valor: R$ 1.200 (alterado)
   - Vencimento: 20/01/2025 (alterado)
5. Motivo: "Renegociação com cliente"
6. Confirmar substituição

**Resultado Esperado:**
- ✅ Transação antiga marcada como `administrative_status = 'replaced'`
- ✅ Transação antiga **removida** de "Contas a Receber"
- ✅ Nova transação criada com status "A Receber"
- ✅ Nova transação **aparece** em "Contas a Receber" com:
  - Valor: R$ 1.200
  - Vencimento: 20/01/2025
- ✅ Total "A Receber" atualizado

---

### GRUPO 6: Estorno de Liquidação

#### TC-012: Estornar liquidação de receita
**Objetivo:** Validar que estorno re-adiciona a contas a receber

**Pré-requisito:** TC-004 concluído

**Passos:**
1. Ir para "Transações Financeiras"
2. Selecionar transação com status "Recebido"
3. Clicar em "Estornar Liquidação"
4. Motivo: "Cheque devolvido"
5. Confirmar estorno

**Resultado Esperado:**
- ✅ Transação volta para status "A Receber"
- ✅ **Reaparece** em "Contas a Receber"
- ✅ Saldo bancário revertido (-R$ 1.000)
- ✅ Total "A Receber" atualizado (+R$ 1.000)
- ✅ Log de estorno registrado

---

### GRUPO 7: Filtros e Buscas

#### TC-013: Filtrar por status (A vencer)
**Objetivo:** Validar filtro de status

**Pré-requisito:** Ter contas com datas futuras

**Passos:**
1. Ir para "Contas a Receber"
2. Selecionar filtro: "A vencer"

**Resultado Esperado:**
- ✅ Lista mostra **apenas** contas com status "A Receber" e data futura
- ✅ **NÃO** mostra contas vencidas
- ✅ **NÃO** mostra contas recebidas

---

#### TC-014: Filtrar por status (Vencido)
**Objetivo:** Validar filtro de vencidos

**Pré-requisito:** Ter contas com datas passadas

**Passos:**
1. Ir para "Contas a Receber"
2. Selecionar filtro: "Vencido"

**Resultado Esperado:**
- ✅ Lista mostra **apenas** contas com status "Vencido"
- ✅ Contas destacadas em vermelho/laranja
- ✅ Total de contas vencidas correto

---

#### TC-015: Buscar por cliente/fornecedor
**Objetivo:** Validar busca por nome

**Passos:**
1. Ir para "Contas a Receber"
2. Digitar no campo de busca: "Cliente Teste"

**Resultado Esperado:**
- ✅ Lista filtrada mostrando apenas contas do "Cliente Teste"
- ✅ Busca case-insensitive
- ✅ Busca por nome parcial funciona

---

### GRUPO 8: Cálculos e Totalizadores

#### TC-016: Validar totais no dashboard
**Objetivo:** Garantir que cálculos estão corretos

**Passos:**
1. Criar 3 contas a receber:
   - R$ 1.000 (A Receber)
   - R$ 500 (Vencido)
   - R$ 300 (Recebido - NÃO deve contar)
2. Ir para Dashboard
3. Verificar card "Contas a Receber"

**Resultado Esperado:**
- ✅ Total A Receber: R$ 1.500 (soma de pendentes)
- ✅ A Vencer: R$ 1.000
- ✅ Vencido: R$ 500
- ✅ **NÃO** inclui transações canceladas
- ✅ **NÃO** inclui transações já recebidas

---

#### TC-017: Validar ordenação por vencimento
**Objetivo:** Garantir ordenação correta

**Passos:**
1. Ir para "Contas a Receber"
2. Verificar ordenação padrão

**Resultado Esperado:**
- ✅ Contas ordenadas por data de vencimento (mais antigo primeiro)
- ✅ Contas vencidas no topo
- ✅ Ordenação estável ao filtrar

---

### GRUPO 9: Transações Financeiras Diretas

#### TC-018: Criar transação financeira manual (Receita pendente)
**Objetivo:** Validar criação direta (sem pedido)

**Passos:**
1. Ir para "Transações Financeiras"
2. Clicar em "Nova Transação"
3. Preencher:
   - Tipo: Receita
   - Status: A Receber
   - Cliente: Cliente XYZ
   - Valor: R$ 750
   - Vencimento: 25/01/2025
   - Descrição: "Serviço de consultoria"
4. Salvar

**Resultado Esperado:**
- ✅ Transação criada com sucesso
- ✅ **Aparece automaticamente** em "Contas a Receber"
- ✅ Dados corretos:
  - Cliente: Cliente XYZ
  - Valor: R$ 750
  - Status: A Receber
  - Vencimento: 25/01/2025

---

#### TC-019: Criar transação financeira manual (Despesa pendente)
**Objetivo:** Validar criação direta de despesa

**Passos:**
1. Ir para "Transações Financeiras"
2. Clicar em "Nova Transação"
3. Preencher:
   - Tipo: Despesa
   - Status: A Pagar
   - Fornecedor: Fornecedor ABC
   - Valor: R$ 400
   - Vencimento: 22/01/2025
   - Descrição: "Aluguel janeiro"
4. Salvar

**Resultado Esperado:**
- ✅ Transação criada com sucesso
- ✅ **Aparece automaticamente** em "Contas a Pagar"
- ✅ Dados corretos

---

#### TC-020: Criar transação já liquidada
**Objetivo:** Validar que transação paga NÃO vai para contas pendentes

**Passos:**
1. Ir para "Transações Financeiras"
2. Clicar em "Nova Transação"
3. Preencher:
   - Tipo: Receita
   - Status: **Recebido** (já pago)
   - Cliente: Cliente XYZ
   - Valor: R$ 500
   - Data: 05/01/2025
   - Conta bancária: Conta Principal
4. Salvar

**Resultado Esperado:**
- ✅ Transação criada com status "Recebido"
- ✅ **NÃO** aparece em "Contas a Receber"
- ✅ Saldo bancário atualizado (+R$ 500)
- ✅ Aparece em "Transações Financeiras" como paga

---

### GRUPO 10: Edge Cases

#### TC-021: Validar transação com administrative_status = 'cancelled'
**Objetivo:** Garantir que transações canceladas não aparecem

**Passos:**
1. Cancelar uma transação pendente (TC-009)
2. Ir para "Contas a Receber"

**Resultado Esperado:**
- ✅ Transação cancelada **NÃO** aparece na lista
- ✅ Total exclui valor cancelado
- ✅ Filtro "Todos" também não mostra canceladas

---

#### TC-022: Validar transação com administrative_status = 'replaced'
**Objetivo:** Garantir que transações substituídas não aparecem

**Passos:**
1. Substituir uma transação (TC-011)
2. Ir para "Contas a Receber"

**Resultado Esperado:**
- ✅ Transação antiga (replaced) **NÃO** aparece
- ✅ Transação nova aparece
- ✅ Total considera apenas nova transação

---

#### TC-023: Recarregar página (persistência)
**Objetivo:** Validar que computed properties persistem

**Passos:**
1. Criar algumas contas a receber (TC-002)
2. **Recarregar página** (F5)
3. Ir para "Contas a Receber"

**Resultado Esperado:**
- ✅ Contas continuam aparecendo corretamente
- ✅ Totais corretos
- ✅ Nenhuma duplicação
- ✅ Nenhuma conta perdida

---

#### TC-024: Sincronização multi-tab
**Objetivo:** Validar sincronização entre abas

**Passos:**
1. Abrir sistema em 2 abas
2. Na aba 1: Criar conta a receber
3. Na aba 2: Ir para "Contas a Receber"

**Resultado Esperado:**
- ✅ Aba 2 atualiza automaticamente (ou após refresh)
- ✅ Dados consistentes entre abas

---

## 📊 RESUMO DE EXECUÇÃO

### Checklist Rápido

```
GRUPO 1: Criação de Contas a Receber
[ ] TC-001: Pedido à vista não cria conta
[ ] TC-002: Pedido a prazo cria conta
[ ] TC-003: Pedido parcelado cria 3 contas

GRUPO 2: Liquidação de Contas a Receber
[ ] TC-004: Liquidar remove da lista
[ ] TC-005: Liquidar parcela mantém outras

GRUPO 3: Criação de Contas a Pagar
[ ] TC-006: Pedido à vista não cria conta
[ ] TC-007: Pedido a prazo cria conta
[ ] TC-008: Pagar remove da lista

GRUPO 4: Cancelamento
[ ] TC-009: Cancelar pendente remove
[ ] TC-010: Cancelar liquidada não afeta

GRUPO 5: Substituição
[ ] TC-011: Substituir atualiza contas

GRUPO 6: Estorno
[ ] TC-012: Estornar re-adiciona

GRUPO 7: Filtros e Buscas
[ ] TC-013: Filtro "A vencer"
[ ] TC-014: Filtro "Vencido"
[ ] TC-015: Busca por nome

GRUPO 8: Cálculos
[ ] TC-016: Totais no dashboard
[ ] TC-017: Ordenação correta

GRUPO 9: Transações Diretas
[ ] TC-018: Criar receita manual pendente
[ ] TC-019: Criar despesa manual pendente
[ ] TC-020: Criar transação liquidada

GRUPO 10: Edge Cases
[ ] TC-021: Canceladas não aparecem
[ ] TC-022: Substituídas não aparecem
[ ] TC-023: Persistência após reload
[ ] TC-024: Sincronização multi-tab
```

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### Deve Passar 100%
- Todos os 24 casos de teste devem passar
- Zero regressões em funcionalidades existentes
- Performance igual ou melhor que antes

### Pode Ter Pequenos Ajustes
- UI/UX melhorias identificadas durante testes
- Mensagens de erro mais descritivas

### Não Pode Acontecer
- ❌ Duplicação de contas
- ❌ Contas órfãs (sem transação correspondente)
- ❌ Desincronização entre contas e transações
- ❌ Totais incorretos
- ❌ Breaking changes na UI

---

## 🐛 REGISTRO DE BUGS (Se Encontrados)

### Template
```markdown
**Bug ID:** BUG-001
**Severidade:** Alta/Média/Baixa
**Caso de Teste:** TC-XXX
**Descrição:** [Descrição do problema]
**Passos para Reproduzir:**
1. ...
2. ...
**Resultado Esperado:** ...
**Resultado Atual:** ...
**Screenshots:** [Se aplicável]
```

---

## 📝 RELATÓRIO FINAL

Após execução, preencher:

**Data de Execução:** ___/___/_____  
**Executado por:** _______________  
**Ambiente:** Staging / Produção  

**Resultados:**
- Total de casos: 24
- Passou: ___ / 24
- Falhou: ___ / 24
- Bloqueado: ___ / 24

**Bugs Críticos Encontrados:** ___  
**Bugs Médios Encontrados:** ___  
**Bugs Baixos Encontrados:** ___  

**Decisão:**
- [ ] ✅ Aprovado para produção
- [ ] ⚠️ Aprovado com ressalvas (bugs não críticos)
- [ ] ❌ Reprovado (bugs críticos encontrados)

**Observações:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Assinatura:** _______________  
**Data:** ___/___/_____
