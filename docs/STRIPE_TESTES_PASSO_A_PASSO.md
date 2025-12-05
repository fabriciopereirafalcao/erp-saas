# 🧪 STRIPE - GUIA DE TESTES COMPLETO

## 🎯 Objetivo

Testar o fluxo completo de checkout do Stripe e verificar se os webhooks estão funcionando corretamente.

---

## 📋 PRÉ-REQUISITOS

### ✅ Verificações Iniciais

- [x] Build do Vercel passou ✅
- [x] App deployado em produção ✅
- [x] `STRIPE_WEBHOOK_SECRET` configurado ✅
- [x] Webhook endpoint retorna 200 OK ✅

### 🔑 Dados para Testes

**Cartão de Teste Stripe:**
```
Número: 4242 4242 4242 4242
Validade: 12/34 (qualquer data futura)
CVC: 123
Nome: Teste User
```

**Email:** Use qualquer email válido (ex: teste@example.com)

---

## 🚀 TESTE 1: Página de Teste do Stripe

### Passo 1.1: Acessar a página
```
https://seu-app.vercel.app/#stripeTest
```

### Passo 1.2: Verificar elementos
- [ ] Página carrega sem erros
- [ ] 3 cards de planos exibidos:
  - **Basic** - $29/mês
  - **Business** - $79/mês  
  - **Enterprise** - $199/mês
- [ ] Botões "Assinar Agora" visíveis e funcionais

### ✅ Resultado Esperado
Página exibe corretamente com todos os elementos

### ❌ Se Falhar
1. Abra DevTools Console (`F12`)
2. Procure por erros em vermelho
3. Copie e me envie os erros

---

## 💳 TESTE 2: Criar Checkout Session

### Passo 2.1: Iniciar checkout
1. Clique em **"Assinar Agora"** no plano **Basic** ($29/mês)
2. Aguarde o redirecionamento

### Passo 2.2: Verificar redirecionamento
- [ ] Redireciona para `checkout.stripe.com`
- [ ] URL contém parâmetro `?session_id=cs_test_...`
- [ ] Formulário do Stripe carrega

### Passo 2.3: Verificar dados exibidos
No Stripe Checkout, confirme:
- [ ] Nome do produto: **"Basic Plan - Monthly"**
- [ ] Preço: **$29.00 / month**
- [ ] Tipo: Subscription (recorrente)

### ✅ Resultado Esperado
Checkout do Stripe carrega com dados corretos

### ❌ Se Falhar
**Erro comum:** "No such price: price_xxxxx"
- Significa que o `priceId` no código não existe no Stripe
- Verifique o Dashboard do Stripe se os produtos foram criados
- Veja o arquivo `STRIPE_DASHBOARD_CONFIG.md` para instruções

---

## 📝 TESTE 3: Preencher Formulário de Pagamento

### Passo 3.1: Preencher dados

```
┌─────────────────────────────────────┐
│ Email                               │
│ teste@example.com                   │
├─────────────────────────────────────┤
│ Card information                    │
│ 4242 4242 4242 4242                 │
│ 12/34    123                        │
├─────────────────────────────────────┤
│ Cardholder name                     │
│ Teste User                          │
└─────────────────────────────────────┘
```

### Passo 3.2: Submeter pagamento
1. Clique em **"Subscribe"** ou **"Assinar"**
2. Aguarde processamento (2-5 segundos)

### ✅ Resultado Esperado
- Loading spinner aparece
- Pagamento é processado
- Redireciona para tela de sucesso

### ❌ Se Falhar
**Possíveis erros:**
- **"Card declined"** → Use o cartão 4242... (não outro)
- **"Invalid API key"** → Verifique `STRIPE_SECRET_KEY` no Supabase
- **"Network error"** → Problema de conexão, tente novamente

---

## ✅ TESTE 4: Verificar Tela de Sucesso

### Passo 4.1: Aguardar redirecionamento
Após pagamento aprovado, você deve ser redirecionado para:
```
https://seu-app.vercel.app?checkout=success
```

### Passo 4.2: Verificar elementos na tela
- [ ] Ícone de sucesso (✓) verde
- [ ] Título: **"Assinatura Ativada com Sucesso!"**
- [ ] Mensagem explicativa
- [ ] Botão **"Ir para Dashboard"**

### Passo 4.3: Verificar console do navegador
Abra DevTools (F12) → Console:
- [ ] Sem erros em vermelho
- [ ] Possíveis logs informativos em azul (OK)

### ✅ Resultado Esperado
Tela de sucesso exibida corretamente

---

## 🔔 TESTE 5: Verificar Webhook (CRÍTICO!)

Este é o teste mais importante! Vamos verificar se o webhook foi recebido e processado.

### Método A: Logs do Supabase Edge Functions

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **"Edge Functions"** no menu lateral
4. Clique em **"make-server-686b5e88"**
5. Clique em **"Logs"** (aba superior)
6. Procure por logs recentes (últimos 5 minutos)

**Logs esperados:**
```
✅ Stripe Webhook recebido: checkout.session.completed
🎉 Checkout completed successfully
✅ Assinatura criada/atualizada: sub_xxxxxxxxxxxxx
Customer: cus_xxxxxxxxxxxxx
Plan: price_xxxxxxxxxxxxx (Basic)
```

### Método B: Verificar no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com
2. Vá em **"Developers"** → **"Webhooks"**
3. Clique no seu webhook endpoint
4. Veja a aba **"Recent deliveries"**

**Verifique:**
- [ ] Status: **200 OK** (verde)
- [ ] Event: `checkout.session.completed`
- [ ] Response body contém: `"received": true`

### ✅ Resultado Esperado
- Webhook recebido com sucesso
- Status 200 OK
- Logs no Supabase mostram processamento

### ❌ Se Falhar
**Status 4xx ou 5xx:**
1. Clique no evento falhado
2. Veja a aba **"Response"**
3. Copie o erro completo
4. Me envie para análise

**Webhook não aparece:**
- Significa que o Stripe não conseguiu enviar
- Verifique se o endpoint está correto no Stripe Dashboard
- URL esperada: `https://wnvijmacgzfnwfqbvkrq.supabase.co/functions/v1/make-server-686b5e88/stripe/webhook`

---

## 💾 TESTE 6: Verificar Dados no Banco

Agora vamos confirmar se a assinatura foi salva no banco de dados.

### Passo 6.1: Acessar tela de debug
```
https://seu-app.vercel.app/#subscriptionDebug
```

> **Nota:** Esta tela só funciona em desenvolvimento local ou se você tiver acesso ao projeto no Figma Make.

### Passo 6.2: Verificar dados exibidos

**Se assinatura foi criada com sucesso:**
```
✅ Status da Assinatura: Ativa

Customer ID: cus_xxxxxxxxxxxxx
Subscription ID: sub_xxxxxxxxxxxxx
Plano: basico (ou basic, dependendo do mapeamento)
Status: active
```

**Se assinatura NÃO foi criada:**
```
⚠️ Status da Assinatura: Não Encontrada

Nenhuma assinatura encontrada para este usuário
Complete um checkout para criar uma assinatura
```

### Passo 6.3: Verificar dados brutos
1. Clique em **"Ver dados brutos (JSON)"**
2. Verifique se os campos estão preenchidos:
   - `stripeCustomerId` ✅
   - `stripeSubscriptionId` ✅
   - `planId` ✅
   - `status: "active"` ✅

### ✅ Resultado Esperado
Assinatura salva com todos os dados do Stripe

### ❌ Se Não Encontrar Assinatura
Significa que o webhook não salvou os dados. Possíveis causas:
1. Webhook não foi recebido (volte ao Teste 5)
2. Erro no processamento do webhook (veja logs)
3. Erro ao salvar no KV store (veja logs do Edge Function)

---

## 🔍 TESTE 7: Verificar no Stripe Dashboard

### Passo 7.1: Acessar Dashboard do Stripe
```
https://dashboard.stripe.com/test/customers
```

### Passo 7.2: Encontrar o cliente
1. Procure pelo email usado no checkout (ex: teste@example.com)
2. Clique no cliente

### Passo 7.3: Verificar assinatura
- [ ] Cliente tem 1 assinatura ativa
- [ ] Plano: **Basic Plan - Monthly**
- [ ] Status: **Active**
- [ ] Próxima cobrança: data futura (1 mês)
- [ ] Valor: **$29.00**

### ✅ Resultado Esperado
Cliente e assinatura criados corretamente no Stripe

---

## 📊 CHECKLIST FINAL

### Fluxo Completo
- [ ] **Teste 1:** Página de teste carrega ✅
- [ ] **Teste 2:** Checkout session criado ✅
- [ ] **Teste 3:** Pagamento processado ✅
- [ ] **Teste 4:** Tela de sucesso exibida ✅
- [ ] **Teste 5:** Webhook recebido (200 OK) ✅
- [ ] **Teste 6:** Dados salvos no banco ✅
- [ ] **Teste 7:** Assinatura no Stripe Dashboard ✅

### Dados Verificados
- [ ] `stripeCustomerId` salvo ✅
- [ ] `stripeSubscriptionId` salvo ✅
- [ ] `planId` correto ✅
- [ ] `status: "active"` ✅
- [ ] `billingCycle` correto ✅

---

## 🎉 SUCESSO!

Se todos os testes passaram, parabéns! 🎊

**Sua integração Stripe está 100% funcional:**
- ✅ Checkout funcionando
- ✅ Webhooks processando
- ✅ Dados persistindo
- ✅ Assinaturas sendo criadas

### 🚀 Próximos Passos

1. **Testar outros planos:** Repita o fluxo com Business e Enterprise
2. **Testar atualização:** Faça upgrade/downgrade de plano
3. **Testar cancelamento:** Cancele uma assinatura
4. **Testar renovação:** Aguarde webhook de renovação
5. **Modo produção:** Configure webhook em produção (não teste)

---

## ❌ TROUBLESHOOTING

### Problema: Checkout não redireciona
**Solução:**
- Verifique se `STRIPE_SECRET_KEY` está configurado
- Veja logs do Edge Function
- Tente novamente com outro plano

### Problema: Webhook retorna erro 500
**Solução:**
1. Veja logs do Edge Function
2. Procure por stack trace
3. Me envie o erro completo

### Problema: Dados não salvam no banco
**Solução:**
- Verifique se webhook foi recebido (Teste 5)
- Veja logs: `Erro ao salvar assinatura no KV store`
- Verifique permissões do KV store

### Problema: "No such price"
**Solução:**
- Vá no Stripe Dashboard → Products
- Verifique se os produtos foram criados
- Copie os `priceId` corretos
- Atualize o código em `StripeTestPage.tsx`

---

## 📞 SUPORTE

Se algum teste falhar:

1. **Copie os logs completos**
   - Console do navegador (F12)
   - Logs do Edge Function
   - Response do webhook no Stripe

2. **Tire screenshots**
   - Tela de erro
   - Stripe Dashboard
   - Logs do Supabase

3. **Me envie:**
   - Qual teste falhou
   - Erro completo
   - Screenshots

Vou te ajudar a resolver! 💪

---

**Boa sorte com os testes!** 🚀
