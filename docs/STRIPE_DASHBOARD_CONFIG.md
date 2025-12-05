# 🎯 Stripe Dashboard - Configuração Completa (Passo-a-Passo)

## 📌 Objetivo

Configurar **4 produtos** e **8 preços** no Stripe para integração com o META ERP.

---

## 🚀 PASSO 1: Acessar o Stripe Dashboard

1. Acesse: **https://dashboard.stripe.com/test/products**
2. Certifique-se de estar no modo **"Test"** (canto superior direito)
   ```
   ┌─────────────────────────────────────┐
   │  🟢 Viewing test data               │
   └─────────────────────────────────────┘
   ```

---

## 💎 PASSO 2: Criar Plano BÁSICO

### 2.1 - Criar Produto

1. Clique no botão **"+ Add product"** (canto superior direito)
2. Preencha os campos:

```
┌─────────────────────────────────────────────────────────┐
│ Name *                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ META ERP - Plano Básico                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Description (optional)                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • Até 3 usuários                                    │ │
│ │ • Até 200 produtos                                  │ │
│ │ • Até 50 clientes/fornecedores                      │ │
│ │ • Até 100 NF-es/mês                                 │ │
│ │ • Suporte por email                                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 - Criar Preço MENSAL

Na mesma tela:

```
┌─────────────────────────────────────────────────────────┐
│ Pricing model                                            │
│ ○ Standard pricing  ⦿ Custom pricing                    │
│                                                          │
│ Price *                                                  │
│ ┌──────┐  ┌────────────────────────────────────────┐   │
│ │ BRL  │  │ 49.90                                  │   │
│ └──────┘  └────────────────────────────────────────┘   │
│                                                          │
│ Billing period                                           │
│ ○ One time  ⦿ Recurring                                 │
│                                                          │
│ ┌──────────────────┐                                    │
│ │ Monthly          │  ▼                                 │
│ └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

3. Clique em **"Add product"** (canto inferior direito)

### 2.3 - Copiar Price ID Mensal

Após salvar, você verá a tela do produto:

```
┌─────────────────────────────────────────────────────────┐
│ META ERP - Plano Básico                                  │
│                                                          │
│ PRICES                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ R$49.90 / month                                     │ │
│ │ price_1AbCdEfGhIjKlMnO123456789  ← COPIE ESTE ID!   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**📋 ANOTE AQUI:**
```
Básico Mensal: price_____________________________
```

### 2.4 - Adicionar Preço ANUAL

1. Na mesma tela do produto, clique em **"+ Add another price"**
2. Preencha:

```
┌─────────────────────────────────────────────────────────┐
│ Price *                                                  │
│ ┌──────┐  ┌────────────────────────────────────────┐   │
│ │ BRL  │  │ 499.00                                 │   │
│ └──────┘  └────────────────────────────────────────┘   │
│                                                          │
│ Billing period                                           │
│ ○ Monthly  ⦿ Yearly                                     │
│                                                          │
│ Description (optional)                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Economize 16% com o plano anual!                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

3. Clique em **"Add price"**

**📋 ANOTE AQUI:**
```
Básico Anual: price_____________________________
```

---

## 🌟 PASSO 3: Criar Plano INTERMEDIÁRIO

Repita o processo completo:

### 3.1 - Produto Intermediário

```
Name: META ERP - Plano Intermediário

Description:
• Até 10 usuários
• Até 1.000 produtos
• Até 200 clientes/fornecedores
• Até 500 NF-es/mês
• Suporte prioritário por email
```

### 3.2 - Preços

**Mensal:**
```
Preço: R$ 99.90
Período: Monthly
```

**📋 ANOTE:** `price_____________________________`

**Anual:**
```
Preço: R$ 999.00
Período: Yearly
Descrição: Economize 16% com o plano anual!
```

**📋 ANOTE:** `price_____________________________`

---

## 🚀 PASSO 4: Criar Plano AVANÇADO

### 4.1 - Produto Avançado

```
Name: META ERP - Plano Avançado

Description:
• Até 50 usuários
• Até 10.000 produtos
• Até 1.000 clientes/fornecedores
• Até 2.500 NF-es/mês
• Suporte prioritário (email + chat)
• Treinamento inicial incluso
```

### 4.2 - Preços

**Mensal:**
```
Preço: R$ 199.90
Período: Monthly
```

**📋 ANOTE:** `price_____________________________`

**Anual:**
```
Preço: R$ 1999.00
Período: Yearly
Descrição: Economize 16% com o plano anual!
```

**📋 ANOTE:** `price_____________________________`

---

## 💼 PASSO 5: Criar Plano ILIMITADO

### 5.1 - Produto Ilimitado

```
Name: META ERP - Plano Ilimitado

Description:
• Usuários ilimitados
• Produtos ilimitados
• Clientes/fornecedores ilimitados
• NF-es ilimitadas
• Suporte 24/7 (email + chat + telefone)
• Gerente de conta dedicado
• Treinamento completo da equipe
• Personalização de funcionalidades
```

### 5.2 - Preços

**Mensal:**
```
Preço: R$ 399.90
Período: Monthly
```

**📋 ANOTE:** `price_____________________________`

**Anual:**
```
Preço: R$ 3999.00
Período: Yearly
Descrição: Economize 16% com o plano anual!
```

**📋 ANOTE:** `price_____________________________`

---

## 📝 PASSO 6: Checklist Final

Verifique se você tem todos os 8 Price IDs:

```
✅ Básico Mensal:        price_____________________________
✅ Básico Anual:         price_____________________________
✅ Intermediário Mensal: price_____________________________
✅ Intermediário Anual:  price_____________________________
✅ Avançado Mensal:      price_____________________________
✅ Avançado Anual:       price_____________________________
✅ Ilimitado Mensal:     price_____________________________
✅ Ilimitado Anual:      price_____________________________
```

---

## 🎯 PASSO 7: Atualizar o Código

**DEPOIS** de configurar tudo no Stripe, você vai me enviar os 8 Price IDs e eu vou atualizar automaticamente o arquivo `/supabase/functions/server/stripe.tsx`.

**Formato para enviar:**

```
Básico Mensal: price_1AbCdEfGhIjKlMnO
Básico Anual: price_1XyZaBcDeFgHiJkL
Intermediário Mensal: price_1MnOpQrStUvWxYzA
Intermediário Anual: price_1BcDeFgHiJkLmNoP
Avançado Mensal: price_1QrStUvWxYzAbCdE
Avançado Anual: price_1FgHiJkLmNoPqRsT
Ilimitado Mensal: price_1UvWxYzAbCdEfGhI
Ilimitado Anual: price_1JkLmNoPqRsTuVwX
```

---

## 💡 Dicas Importantes

### ✅ Modo Test vs Live
- **SEMPRE** use modo **Test** durante desenvolvimento
- Os IDs de teste começam com `price_test_...` (alguns)
- Ao ir para produção, você vai repetir o processo no modo **Live**

### ✅ Como Copiar Price IDs
1. Acesse o produto criado
2. Na seção **"PRICES"**, clique no preço
3. Copie o ID que aparece abaixo do valor (ex: `price_1AbCd...`)

### ✅ Organização
- Mantenha os nomes consistentes: `META ERP - Plano [Nome]`
- Use descrições detalhadas (ajuda na conversão de vendas)
- Configure os preços em BRL (R$)

### ✅ Testando
Depois de configurar, você pode testar com cartões de teste:
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- CVC: qualquer 3 dígitos
- Data: qualquer data futura

---

## 🆘 Problemas Comuns

### "Não encontro o botão Add product"
- Verifique se está em: https://dashboard.stripe.com/test/products
- Certifique-se de estar no modo **Test**

### "Não aparece o Price ID"
- Depois de criar o produto, clique nele para ver a lista de preços
- O ID aparece abaixo do valor de cada preço

### "Quero editar um preço já criado"
- ⚠️ Preços no Stripe são **imutáveis**
- Para mudar, você deve criar um novo preço e arquivar o antigo
- Ou criar um novo produto do zero

---

## ✅ Quando Terminar

**Me envie os 8 Price IDs** neste formato:

```
Configurei os produtos! Aqui estão os IDs:

Básico Mensal: price_...
Básico Anual: price_...
Intermediário Mensal: price_...
Intermediário Anual: price_...
Avançado Mensal: price_...
Avançado Anual: price_...
Ilimitado Mensal: price_...
Ilimitado Anual: price_...
```

E eu vou atualizar automaticamente o código para você! 🚀

---

**📚 Documentação Oficial:**
- [Products and Prices](https://stripe.com/docs/products-prices/overview)
- [Recurring Prices](https://stripe.com/docs/billing/subscriptions/overview)

**⏱️ Tempo estimado:** 10-15 minutos

---

**Boa configuração! 🎉**  
Qualquer dúvida durante o processo, é só me chamar!
