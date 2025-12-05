# 🔧 Configuração do Stripe - Guia Completo

## 📋 Visão Geral

Este documento descreve como configurar completamente a integração com Stripe no META ERP.

---

## ✅ Etapa 1: Criar Conta no Stripe

1. Acesse: https://dashboard.stripe.com/register
2. Crie sua conta (use modo **Test** para desenvolvimento)
3. Confirme seu email

---

## 🔑 Etapa 2: Obter API Keys

### 2.1 Secret Key (Backend)

1. Acesse: https://dashboard.stripe.com/test/apikeys
2. Na seção **"Secret key"**, clique em **"Reveal test key"**
3. Copie a chave que começa com `sk_test_...`
4. ✅ **Já configurada** - Você já inseriu via modal do Figma Make

### 2.2 Webhook Secret (para produção)

**IMPORTANTE:** Configure o webhook secret para validar eventos do Stripe.

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Clique em **"Add endpoint"**
3. Cole a URL do seu webhook:
   ```
   https://[SEU_PROJECT_ID].supabase.co/functions/v1/make-server-686b5e88/stripe/webhook
   ```
4. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique em **"Add endpoint"**
6. Copie o **"Signing secret"** (começa com `whsec_...`)
7. Configure no Supabase:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 💰 Etapa 3: Criar Produtos e Preços

Você precisa criar produtos no Stripe Dashboard para cada plano:

### 3.1 Criar Produtos

1. Acesse: https://dashboard.stripe.com/test/products
2. Clique em **"+ Add product"**
3. Crie os seguintes produtos:

#### **Plano Básico**
- Nome: `META ERP - Básico`
- Descrição: `Plano básico com até 3 usuários, 200 produtos e 50 NF-es`
- Preços:
  - **Mensal**: R$ 49,90/mês
  - **Anual**: R$ 499,00/ano (economize 16%)

#### **Plano Intermediário**
- Nome: `META ERP - Intermediário`
- Descrição: `Plano intermediário com até 10 usuários, 1.000 produtos e 250 NF-es`
- Preços:
  - **Mensal**: R$ 99,90/mês
  - **Anual**: R$ 999,00/ano (economize 16%)

#### **Plano Avançado**
- Nome: `META ERP - Avançado`
- Descrição: `Plano avançado com até 50 usuários, 10.000 produtos e 2.000 NF-es`
- Preços:
  - **Mensal**: R$ 199,90/mês
  - **Anual**: R$ 1.999,00/ano (economize 16%)

#### **Plano Ilimitado**
- Nome: `META ERP - Ilimitado`
- Descrição: `Plano ilimitado para grandes empresas`
- Preços:
  - **Mensal**: R$ 399,90/mês
  - **Anual**: R$ 3.999,00/ano (economize 16%)

### 3.2 Copiar IDs dos Preços

Após criar cada preço, copie o **Price ID** (começa com `price_...`) e atualize o arquivo `/supabase/functions/server/stripe.tsx`:

```typescript
const PRICE_CONFIG = {
  basico: {
    monthly: "price_1AbCdEfGhIjKlMnO", // ← Cole o ID real aqui
    yearly: "price_1XyZaBcDeFgHiJkL",
  },
  intermediario: {
    monthly: "price_1MnOpQrStUvWxYzA",
    yearly: "price_1BcDeFgHiJkLmNoP",
  },
  avancado: {
    monthly: "price_1QrStUvWxYzAbCdE",
    yearly: "price_1FgHiJkLmNoPqRsT",
  },
  ilimitado: {
    monthly: "price_1UvWxYzAbCdEfGhI",
    yearly: "price_1JkLmNoPqRsTuVwX",
  },
};
```

---

## 🧪 Etapa 4: Testar a Integração

### 4.1 Testar Checkout

1. No frontend, clique em **"Alterar Plano"**
2. Selecione um plano e ciclo de cobrança
3. Clique em **"Fazer Upgrade"**
4. Use o cartão de teste do Stripe:
   - **Número**: `4242 4242 4242 4242`
   - **Validade**: Qualquer data futura
   - **CVC**: Qualquer 3 dígitos
   - **CEP**: Qualquer código

### 4.2 Testar Webhooks (Local)

Use o Stripe CLI para testar webhooks localmente:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escutar eventos
stripe listen --forward-to http://localhost:54321/functions/v1/make-server-686b5e88/stripe/webhook
```

---

## 🔒 Etapa 5: Modo Produção

Quando estiver pronto para produção:

1. Acesse: https://dashboard.stripe.com/apikeys (modo **Live**)
2. Copie a **Live Secret Key** (começa com `sk_live_...`)
3. Atualize a variável de ambiente:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   ```
4. Configure o webhook no modo Live
5. Atualize os preços para os IDs de produção

---

## 📊 Rotas Disponíveis

### Backend (já implementado)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/stripe/create-checkout-session` | Criar sessão de checkout |
| POST | `/stripe/create-portal-session` | Abrir portal do cliente |
| POST | `/stripe/webhook` | Receber eventos do Stripe |
| GET | `/stripe/payment-methods` | Listar métodos de pagamento |

---

## 🎯 Próximos Passos

Agora você precisa:

1. ✅ **Backend implementado** - Rotas Stripe criadas
2. ⏭️ **Frontend** - Criar UI de checkout com Stripe Elements
3. ⏭️ **Integração** - Conectar botões de upgrade ao backend
4. ⏭️ **Testes** - Validar fluxo completo end-to-end

---

## 🆘 Troubleshooting

### Erro: "Price ID não encontrado"
- Verifique se você atualizou os `PRICE_CONFIG` com os IDs reais do Stripe

### Erro: "Webhook signature invalid"
- Configure o `STRIPE_WEBHOOK_SECRET` corretamente
- Em desenvolvimento, o sistema aceita sem verificação (com warning)

### Erro: "Customer not found"
- O usuário precisa fazer pelo menos 1 checkout para criar o customer ID
- O sistema cria automaticamente no primeiro checkout

---

## 📚 Documentação Oficial

- [Stripe Docs](https://stripe.com/docs)
- [Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Webhooks](https://stripe.com/docs/webhooks)

---

**✅ Configuração do Backend Concluída!**  
Agora vamos para a Fase 2: Implementar o Frontend de Checkout.
