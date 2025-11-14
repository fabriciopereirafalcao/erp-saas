# 🔧 Solução: Erro "Estoque Insuficiente"

## ❌ Erro Reportado

```
❌ Estoque insuficiente! Disponível: 90, Solicitado: 200, Reservado: 0
```

---

## 📊 Análise do Problema

O erro ocorre porque o sistema está validando o estoque **ANTES** de criar ou avançar um pedido de venda.

**Situação Atual:**
- **Estoque disponível**: 90 unidades
- **Quantidade solicitada**: 200 unidades  
- **Reservas de outros pedidos**: 0 unidades
- **Déficit**: 110 unidades faltando

**Causa Raiz:**
O produto no inventário não tem estoque suficiente para atender o pedido.

---

## ✅ Soluções Disponíveis

### **Opção 1: Adicionar Estoque ao Produto (RECOMENDADO)**

1. **Ir para o módulo "Inventário"**
   - Clicar em "Inventário" no menu lateral

2. **Localizar o produto**
   - Procurar pelo produto na listagem
   - Ex: "Arroz 5kg", "Feijão 1kg", etc.

3. **Editar o produto**
   - Clicar no botão ✏️ "Editar" na linha do produto

4. **Aumentar o estoque atual**
   - Alterar o campo "Estoque Atual" para **300** (ou mais)
   - Isso garante estoque suficiente para o pedido de 200 + margem de segurança

5. **Salvar**
   - Clicar em "Salvar Alterações"
   - Aguardar confirmação

6. **Criar o pedido novamente**
   - Voltar ao módulo "Pedidos de Venda"
   - Criar o pedido normalmente
   - O sistema agora permitirá a criação

---

### **Opção 2: Reduzir a Quantidade do Pedido**

Se você quiser manter o estoque atual de 90 unidades:

1. **Ajustar a quantidade do pedido**
   - Em vez de **200 unidades**, criar pedido com **90 unidades** ou menos

2. **Criar o pedido**
   - O sistema permitirá a criação pois há estoque disponível

---

### **Opção 3: Criar Pedido em Modo Excepcional (AVANÇADO)**

⚠️ **ATENÇÃO**: Use apenas se for um pedido especial que será atendido com estoque futuro.

Este modo permite criar pedidos mesmo sem estoque, mas requer atenção:

1. **Características do Modo Excepcional:**
   - ✅ Permite criar pedido sem estoque disponível
   - ⚠️ Pedido fica marcado como "Excepcional" permanentemente
   - ⚠️ Sistema **NÃO** baixará estoque automaticamente ao avançar status
   - ⚠️ Você deve gerenciar o estoque manualmente

2. **Como usar:**
   - Ao criar o pedido, marcar a opção **"Modo Excepcional"**
   - Sistema exibirá aviso de confirmação
   - Pedido será criado normalmente, mas com flag especial

3. **Responsabilidades:**
   - Garantir que haverá estoque no futuro
   - Gerenciar manualmente a baixa de estoque
   - Acompanhar pedidos excepcionais separadamente

---

## 📋 Passo a Passo Detalhado (Opção 1)

### **1. Acessar o Inventário**

```
Menu Lateral → Inventário
```

### **2. Localizar o Produto**

Na tabela de produtos, procurar pela linha do produto.

Exemplo:
```
| Produto      | Categoria | Estoque Atual | Estoque Mínimo | Preço Unitário |
|--------------|-----------|---------------|----------------|----------------|
| Arroz 5kg    | Grãos     | 90            | 50             | R$ 25,00       |
```

### **3. Editar o Produto**

Clicar no ícone ✏️ (Edit) na coluna "Ações"

### **4. Atualizar o Estoque**

No formulário de edição:

**Antes:**
```
Estoque Atual: 90
```

**Depois:**
```
Estoque Atual: 500
```

💡 **Dica**: Adicione um estoque confortável. No exemplo acima, 500 unidades permitem:
- Pedido de 200 unidades
- Mais 300 unidades disponíveis para outros pedidos

### **5. Salvar e Confirmar**

Clicar em **"Salvar Alterações"**

Confirmação esperada:
```
✅ Item de inventário atualizado com sucesso!
```

### **6. Verificar Estoque Atualizado**

Na tabela, verificar que o estoque foi atualizado:

```
| Produto      | Categoria | Estoque Atual | Estoque Mínimo | Preço Unitário |
|--------------|-----------|---------------|----------------|----------------|
| Arroz 5kg    | Grãos     | 500 ✓         | 50             | R$ 25,00       |
```

### **7. Criar o Pedido**

Agora você pode criar o pedido normalmente:

1. Ir para **"Pedidos de Venda"**
2. Clicar em **"+ Criar Pedido"**
3. Preencher dados:
   - Cliente: João Silva
   - Produto: Arroz 5kg
   - Quantidade: **200** ← Agora funcionará!
   - Preço: R$ 25,00
   - Total: R$ 5.000,00

4. **Salvar**

Resultado esperado:
```
✅ Pedido de venda criado com sucesso!
```

---

## 🔍 Verificação da Solução

### **Antes da Correção**

```
❌ Estoque insuficiente! Disponível: 90, Solicitado: 200, Reservado: 0
```

### **Depois da Correção**

```
✅ Estoque disponível: 500
✅ Pedido criado: PV-0001
✅ Quantidade: 200 unidades
✅ Estoque após criação: 500 (ainda disponível)
```

**Observação**: O estoque só será efetivamente baixado quando o pedido avançar para o status **"Enviado"**.

**Fluxo de Estoque:**

1. **Pedido criado (status "Processando")**
   - Estoque atual: 500
   - Estoque reservado: 200 ← Sistema "guarda" para este pedido
   - Estoque disponível para outros: 300

2. **Pedido avançado para "Enviado"**
   - Estoque atual: 300 ← Baixa efetiva
   - Estoque reservado: 0
   - Estoque disponível: 300

---

## 🛡️ Como o Sistema Protege o Estoque

### **Validações Automáticas**

O sistema implementa 3 camadas de proteção:

**1. Validação na Criação do Pedido**
```typescript
❌ Bloqueia se: disponível < solicitado
✅ Permite se: disponível >= solicitado
```

**2. Validação ao Avançar para "Enviado"**
```typescript
❌ Bloqueia se: 
  - Produto não existe
  - Estoque insuficiente
  - Já foi baixado anteriormente
✅ Permite se: todas as validações passarem
```

**3. Prevenção de Duplicação**
```typescript
✅ Sistema de locks impede múltiplas baixas simultâneas
✅ Flag `stockReduced` previne re-execução
✅ ID único de movimento rastreia cada operação
```

---

## 📊 Exemplo Prático

### **Cenário: Pedido de 200 unidades de Arroz**

**Situação Inicial:**
- Estoque: 90 unidades
- Tentativa: Criar pedido de 200 unidades
- **Resultado**: ❌ Bloqueado

**Solução:**
1. Editar produto "Arroz 5kg"
2. Alterar estoque de 90 para 500
3. Salvar

**Nova Situação:**
- Estoque: 500 unidades
- Tentativa: Criar pedido de 200 unidades
- **Resultado**: ✅ Permitido

**Após criar o pedido:**
- Estoque atual: 500
- Reservado: 200
- Disponível: 300

**Após avançar para "Enviado":**
- Estoque atual: 300
- Reservado: 0
- Disponível: 300

---

## 🚨 Avisos Importantes

### **⚠️ Não Desabilitar a Validação**

A validação de estoque é uma proteção crítica que previne:
- ❌ Vender produtos sem estoque
- ❌ Promessas impossíveis de cumprir
- ❌ Estoque negativo
- ❌ Inconsistências financeiras

**NUNCA**:
- Remover a validação do código
- Forçar bypass das verificações
- Ignorar os alertas do sistema

### **✅ Usar Modo Excepcional Conscientemente**

Use apenas quando:
- ✅ Pedido para entrega futura (estoque chegará)
- ✅ Produto sob encomenda
- ✅ Situação comercial especial aprovada

**NÃO use quando:**
- ❌ Simplesmente não quer adicionar estoque
- ❌ Tentar burlar a validação
- ❌ Pedido normal sem planejamento

---

## 🧪 Teste Rápido

### **Validar que a Solução Funcionou**

1. ✅ **Adicionar estoque**: 90 → 500
2. ✅ **Criar pedido**: 200 unidades
3. ✅ **Verificar criação**: Pedido PV-XXXX criado
4. ✅ **Avançar para "Enviado"**: Sistema baixa estoque
5. ✅ **Verificar estoque final**: 300 unidades

Se todos os passos funcionarem, problema resolvido! ✅

---

## 📞 Próximos Passos

**Agora você pode:**

1. **Adicionar estoque ao produto** (conforme instruções acima)
2. **Criar o pedido normalmente**
3. **Seguir com os testes** de marcação de transações

Se continuar tendo problemas, verifique:
- Nome do produto está correto?
- Produto existe no inventário?
- Estoque foi realmente atualizado?

---

## 📝 Resumo

| Passo | Ação | Resultado |
|-------|------|-----------|
| 1 | Ir para Inventário | ✅ |
| 2 | Editar produto | ✅ |
| 3 | Alterar estoque: 90 → 500 | ✅ |
| 4 | Salvar | ✅ |
| 5 | Criar pedido de 200 un. | ✅ Permitido |
| 6 | Avançar para "Enviado" | ✅ Estoque baixado |
| 7 | Verificar estoque: 300 | ✅ Correto |

---

**Problema resolvido! Sistema funcionando como esperado.** 🎉
