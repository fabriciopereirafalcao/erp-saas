# 📊 Guia de Interpretação de Logs do Sistema

## ✅ CORREÇÃO APLICADA

Os logs do sistema foram otimizados para reduzir duplicação e melhorar clareza.

---

## 📋 Tipos de Mensagens

### ✅ Sucesso (console.log)
Operações completadas com êxito.
```
✅ Transição permitida [PV-1045]: Processando → Entregue
✅ Baixa executada com sucesso! Movimento: MOV-456
✅ Lock adquirido: PV-1045-stock_reduction
```

### ⚠️ Avisos (console.warn)
Validações que bloquearam operações inválidas - **COMPORTAMENTO ESPERADO**.
```
⚠️ Transição bloqueada [PV-1046]: Cancelado → Pago - ❌ Pedido cancelado não pode ter status alterado
⚠️ [PV-1047] Validação de estoque falhou: Estoque insuficiente! Disponível: 100, Solicitado: 150
```

### ❌ Erros (console.error)
Problemas técnicos reais que precisam de atenção.
```
❌ Produto não encontrado: Arroz XYZ
❌ Erro ao executar baixa de estoque: [erro detalhado]
```

---

## 🔍 Interpretando Mensagens Comuns

### 1. Transição de Status Bloqueada

#### Mensagem:
```
⚠️ Transição bloqueada [PV-1046]: Cancelado → Pago
   - Pedido cancelado não pode ter status alterado
```

#### O que significa:
✅ **Sistema funcionando corretamente!**
- O usuário tentou mudar o status de um pedido que está CANCELADO
- O sistema bloqueou corretamente (pedidos cancelados são finais)
- Esta é uma validação de segurança, não um erro

#### Ação necessária:
- **Nenhuma** - o sistema está protegendo a integridade dos dados
- Se precisar reativar um pedido cancelado, crie um novo pedido

---

### 2. Estoque Insuficiente

#### Mensagem:
```
⚠️ [PV-1047] Validação de estoque falhou: Estoque insuficiente! Disponível: 100, Solicitado: 150, Reservado: 0
```

#### O que significa:
✅ **Sistema funcionando corretamente!**
- Tentativa de processar pedido que solicita 150 unidades
- Estoque atual tem apenas 100 unidades disponíveis
- Sistema bloqueou para prevenir estoque negativo

#### Ação necessária:
1. **Verificar estoque real** no módulo Inventário
2. **Repor estoque** se necessário (criar Pedido de Compra)
3. **Reduzir quantidade** do pedido para quantidade disponível
4. **Aguardar reposição** antes de processar o pedido

---

### 3. Tentativa de Mudar Status de Pedido Cancelado

#### Mensagem:
```
⚠️ Transição bloqueada [PV-1049]: Cancelado → Processando
   - Pedido cancelado não pode ter status alterado
```

#### O que significa:
✅ **Sistema funcionando corretamente!**
- Pedido está em status final "Cancelado"
- Não é possível alterar status de pedidos cancelados
- Esta é uma proteção do sistema

#### Ação necessária:
- **Criar novo pedido** se necessário
- Status "Cancelado" é irreversível por design de segurança

---

## 🎯 Cenários de Validação Esperada

### Cenário 1: Retrocesso de Status Bloqueado
```
⚠️ Transição bloqueada [PV-1050]: Entregue → Confirmado
   - Não é possível retroceder status
```
**Status:** ✅ Comportamento correto
**Motivo:** Sistema não permite voltar status (use Cancelar se necessário)

---

### Cenário 2: Estoque Reservado por Outros Pedidos
```
⚠️ Validação de estoque falhou: Estoque insuficiente! Disponível: 500, Solicitado: 1000, Reservado: 4500
```
**Status:** ✅ Comportamento correto
**Detalhes:**
- Estoque total: 5000 unidades
- Reservado por outros pedidos: 4500 unidades
- Disponível para novos pedidos: 500 unidades
- Solicitado: 1000 unidades
- **Resultado:** Bloqueado corretamente

**Ação:**
1. Verificar pedidos em andamento (status "Processando" até "Entregue")
2. Finalizar pedidos antigos ou
3. Aumentar estoque com Pedido de Compra

---

### Cenário 3: Operação Já Executada
```
⚠️ Baixa de estoque já executada anteriormente (ID: MOV-1234567890)
```
**Status:** ✅ Comportamento correto
**Motivo:** Proteção contra duplicação
**Ação:** Nenhuma - operação já foi completada

---

## 📈 Logs Normais Durante Uso

### Criação de Pedido
```
✅ Pedido PV-1051 criado com sucesso!
```

### Transição de Status Válida
```
✅ Transição permitida [PV-1051]: Processando → Entregue
🔄 Executando baixa de estoque para pedido PV-1051...
✅ Lock adquirido: PV-1051-stock_reduction (LOCK-1234567890-abc123)
✅ Baixa executada com sucesso! Movimento: MOV-1234567891
🔓 Lock liberado: PV-1051-stock_reduction (LOCK-1234567890-abc123)
✅ Conta a receber criada: FT-0123
```

---

## 🚨 Quando Se Preocupar

### ❌ ESTES são erros reais:

```
❌ Produto não encontrado: Arroz XYZ
   → Produto foi deletado ou nome está incorreto

❌ Erro ao executar baixa de estoque: [stack trace]
   → Problema técnico, verificar código

❌ Não foi possível adquirir lock: [timeout]
   → Possível problema de performance ou deadlock
```

### ⚠️ ESTES são validações (OK):

```
⚠️ Transição bloqueada [qualquer ID]: qualquer motivo
   → Sistema protegendo dados

⚠️ Validação de estoque falhou: Estoque insuficiente
   → Sistema prevenindo estoque negativo

⚠️ Operação já executada anteriormente
   → Sistema prevenindo duplicação
```

---

## 🔧 Dicas de Diagnóstico

### Se aparecerem MUITAS mensagens de validação:
1. **Verificar se há testes sendo executados** automaticamente
2. **Verificar se usuário está clicando múltiplas vezes** em botões
3. **Verificar se há script tentando processar pedidos** em lote

### Se aparecerem mensagens de estoque insuficiente frequentemente:
1. **Revisar processo de reposição** de estoque
2. **Configurar alertas de estoque baixo** (futuro)
3. **Considerar aumentar estoque de segurança**

### Se aparecerem mensagens de transição bloqueada:
1. **Educar usuários** sobre fluxo correto de status
2. **Revisar se status dos pedidos** está correto
3. **Usar histórico de status** para entender o fluxo

---

## 📊 Estatísticas de Transições

Para ver estatísticas de transições de status, use o console:

```javascript
// No console do navegador
import { getTransitionStats } from './utils/statusTransitionValidation';
console.log(getTransitionStats());

// Resultado exemplo:
{
  total: 150,
  successful: 142,
  blocked: 8,
  blockedPercentage: 5.33
}
```

---

## ✅ Resumo

### O QUE FOI CORRIGIDO:
1. ✅ **Removida duplicação de logs** de transição bloqueada
2. ✅ **Mudado console.error() → console.warn()** para validações
3. ✅ **Simplificado formato** dos logs
4. ✅ **Adicionado contexto** (ID do pedido) em todos os logs

### COMPORTAMENTO ESPERADO:
- ⚠️ Avisos de validação = **Sistema funcionando**
- ❌ Erros técnicos = **Investigar**
- ✅ Sucesso = **Tudo certo**

### NÍVEL DE LOGS NO CONSOLE:
- **Desenvolvimento:** Ver todos os logs (ajuda debug)
- **Produção:** Apenas erros e avisos críticos
- **Usuário final:** Apenas toasts na UI (sem console)

---

## 🎓 Conclusão

As mensagens que você está vendo são na maioria **validações funcionando corretamente**:

1. ✅ **Transições bloqueadas** → Sistema impedindo operações inválidas
2. ✅ **Estoque insuficiente** → Sistema protegendo contra estoque negativo
3. ✅ **Operações duplicadas** → Sistema garantindo idempotência

**Isso é um sinal de que o sistema está PROTEGENDO seus dados!** 🛡️

Se você não quer ver esses logs durante uso normal, eles podem ser suprimidos em produção mantendo apenas os toasts na UI para feedback ao usuário.
