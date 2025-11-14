# ⚡ Guia Rápido: Adicionar Estoque ao Produto

## 🎯 Objetivo
Resolver o erro **"Estoque insuficiente! Disponível: 90, Solicitado: 200"**

---

## 📋 Passo a Passo (5 passos)

### **1️⃣ Abrir Inventário**
```
Menu Lateral → Inventário
```

### **2️⃣ Encontrar o Produto**
Localizar na tabela o produto que precisa de mais estoque.

Exemplo:
- Arroz 5kg (90 unidades) ← Este aqui!

### **3️⃣ Clicar em Editar**
Clicar no ícone ✏️ na coluna "Ações"

### **4️⃣ Aumentar o Estoque**
No campo "Estoque Atual", mudar de:
```
Estoque Atual: 90
```
Para:
```
Estoque Atual: 500
```

### **5️⃣ Salvar**
Clicar em **"Salvar Alterações"**

---

## ✅ Pronto!

Agora você pode criar o pedido de 200 unidades sem problemas.

---

## 💡 Dicas

**Quanto estoque adicionar?**
- Para pedido de 200 unidades → Adicionar pelo menos 200
- Recomendado: 500 unidades (margem de segurança)

**O estoque é baixado quando?**
- ✅ Apenas ao avançar pedido para status **"Enviado"**
- ❌ **NÃO** é baixado ao criar o pedido

**Posso criar pedido sem estoque?**
- Sim, usando **Modo Excepcional** (checkbox no formulário)
- ⚠️ Use apenas para casos especiais

---

## 🔍 Verificação

Após adicionar estoque, na tabela de inventário deve aparecer:

```
| Produto      | Estoque Atual | Status |
|--------------|---------------|--------|
| Arroz 5kg    | 500 ✓         | Ativo  |
```

Agora pode criar o pedido! 🚀
