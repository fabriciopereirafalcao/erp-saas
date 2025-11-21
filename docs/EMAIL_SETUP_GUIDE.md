# 📧 Guia de Configuração - Serviço de Email (Resend)

## 🎯 Visão Geral

O sistema está configurado para enviar emails automaticamente usando **Resend**, um serviço moderno de envio de emails com API simples e generoso free tier.

### ✨ Características do Resend:
- ✅ **Free Tier**: 100 emails/dia, 3.000 emails/mês
- ✅ **API Simples**: RESTful e fácil de usar
- ✅ **HTML Rico**: Suporte completo a templates HTML
- ✅ **Boa Deliverability**: Alta taxa de entrega
- ✅ **Sem setup complexo**: Apenas uma API key

---

## 📋 Passo a Passo de Configuração

### **1. Criar Conta no Resend**

1. Acesse: [https://resend.com](https://resend.com)
2. Clique em **"Get Started"** ou **"Sign Up"**
3. Escolha uma das opções:
   - Cadastro com email e senha
   - Login com GitHub
   - Login com Google

4. **Complete o cadastro** preenchendo:
   - Nome completo
   - Email
   - Senha (se não usar OAuth)

5. **Confirme seu email** (verifique a caixa de entrada)

---

### **2. Obter API Key**

1. **Após login**, você será redirecionado para o Dashboard
2. No menu lateral, clique em **"API Keys"**
3. Clique no botão **"Create API Key"**

4. **Configure a API Key**:
   - **Name**: `ERP System` (ou qualquer nome descritivo)
   - **Permission**: Deixe como `Full access` (padrão)
   
5. Clique em **"Add"**

6. **⚠️ IMPORTANTE**: A API key será exibida **apenas uma vez**!
   ```
   re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
   - **Copie agora** e guarde em local seguro
   - Se perder, precisará gerar uma nova

---

### **3. Configurar no Sistema**

#### **Opção A: Via Interface do Figma Make** (Recomendado)

1. Quando você criar um convite pela primeira vez, o sistema solicitará a API key automaticamente
2. Cole a API key do Resend quando solicitado
3. Pronto! O sistema salvará a key de forma segura

#### **Opção B: Via Supabase Dashboard**

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** → **Edge Functions** → **Manage secrets**
3. Adicione uma nova secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Sua API key (ex: `re_XXXXX...`)
4. Clique em **"Save"**

#### **Opção C: Via Console do Navegador** (Dev apenas)

```javascript
// No console do navegador:
localStorage.setItem('RESEND_API_KEY', 're_XXXXX...');
```

---

### **4. Testar Configuração**

#### **Teste Rápido: Criar um Convite**

1. Faça login no sistema como **Owner**
2. Vá em **"Usuários e Permissões"**
3. Clique em **"Convidar Usuário"**
4. Preencha:
   - **Email**: Seu email pessoal
   - **Nível**: Gerente
5. Clique em **"Criar Convite"**

6. **Verifique**:
   - Se email estiver configurado: "Email enviado!"
   - Se não: "Convite criado, copie o link"

7. **Verifique sua caixa de entrada**:
   - O email deve chegar em 1-2 minutos
   - Assunto: "Você foi convidado para [Nome da Empresa]"
   - Verifique também a pasta de spam/lixo eletrônico

---

## 📧 Template de Email

O sistema envia um email profissional com:

### **Visual**
- ✅ Design responsivo (funciona em mobile/desktop)
- ✅ Header com gradiente azul
- ✅ Ícone de boas-vindas (🎉)
- ✅ Box de informações destacado
- ✅ Botão CTA grande e visível
- ✅ Aviso de expiração (7 dias)
- ✅ Link alternativo (caso botão não funcione)
- ✅ Footer com informações

### **Conteúdo**
- Nome de quem está convidando
- Nome da empresa
- Email do convidado
- Nível de permissão
- Data de expiração
- Link único de convite

### **Exemplo Visual**

```
┌─────────────────────────────────────┐
│   🎉 Você foi convidado!            │ (Header azul)
├─────────────────────────────────────┤
│                                     │
│   Olá! 👋                           │
│                                     │
│   João Silva convidou você para     │
│   fazer parte da equipe             │
│   Minha Empresa LTDA.              │
│                                     │
│   ┌───────────────────────────┐   │
│   │ Detalhes do Convite       │   │
│   │                           │   │
│   │ 📧 Email: maria@email.com │   │
│   │ 👤 Gerente                │   │
│   │ 🏢 Minha Empresa LTDA    │   │
│   │ ⏰ Expira em: 14/11/2024  │   │
│   └───────────────────────────┘   │
│                                     │
│     [ Aceitar Convite ]            │ (Botão)
│                                     │
│   ⚠️ Importante: Expira em 7 dias  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Configurações Avançadas

### **Customizar Email de Origem**

Por padrão, emails são enviados de:
```
Sistema ERP <onboarding@resend.dev>
```

Para customizar (requer domínio verificado):

1. **No Resend Dashboard**:
   - Vá em **"Domains"**
   - Clique em **"Add Domain"**
   - Digite seu domínio: `seuemp.com.br`
   - Configure registros DNS conforme instruções

2. **No código** (`/supabase/functions/server/emailService.tsx`):
   ```typescript
   from: `${companyName} <noreply@seuemp.com.br>`
   ```

---

### **Limites do Free Tier**

| Métrica | Limite | Observação |
|---------|--------|------------|
| Emails/dia | 100 | Suficiente para ~100 convites |
| Emails/mês | 3.000 | Resetado todo dia 1 |
| Rate limit | 10/segundo | Muito difícil atingir |
| Tamanho email | 40MB | Nossos emails: ~50KB |

**💡 Dica**: Para empresas grandes, considere upgrade:
- **Pro Plan**: $20/mês → 50.000 emails/mês
- **Business**: $80/mês → 100.000 emails/mês

---

### **Monitorar Emails Enviados**

1. **Resend Dashboard** → **"Emails"**
2. Veja lista de todos os emails:
   - ✅ Delivered (entregue)
   - 🔄 Pending (enviando)
   - ❌ Failed (falhou)
   - 📖 Opened (aberto)
   - 🔗 Clicked (clicou)

---

## ❓ Troubleshooting

### **Problema: "Serviço de email não configurado"**

**Sintoma**: Ao criar convite, mensagem aparece dizendo que email não foi enviado.

**Soluções**:
1. Verifique se a API key foi configurada corretamente
2. No Supabase Dashboard → Edge Functions → Secrets
3. Procure por `RESEND_API_KEY`
4. Se não existir, adicione conforme passo 3

---

### **Problema: "API key inválida"**

**Sintoma**: Erro 401 ao enviar email.

**Soluções**:
1. Verifique se copiou a API key completa
2. A key deve começar com `re_`
3. Gere uma nova API key no Resend
4. Atualize no Supabase

---

### **Problema: Email não chegou**

**Sintomas**: Convite criado, mas email não aparece na caixa de entrada.

**Checklist**:
- ✅ Verifique pasta de **spam/lixo eletrônico**
- ✅ Aguarde 2-3 minutos (pode ter delay)
- ✅ Verifique logs no Resend Dashboard
- ✅ Confirme que o email está correto
- ✅ Tente com outro email de teste

---

### **Problema: Limite excedido**

**Sintoma**: `Error 429 - Rate limit exceeded`

**Soluções**:
1. Você atingiu o limite do free tier (100/dia)
2. Aguarde até o próximo dia
3. Ou faça upgrade do plano no Resend

---

### **Problema: Email vai para spam**

**Causas comuns**:
- Domínio não verificado (usando `@resend.dev`)
- Email sem SPF/DKIM configurado
- Conteúdo flagrado como spam

**Soluções**:
1. **Verificar domínio próprio** no Resend
2. Configurar **SPF, DKIM e DMARC**
3. Pedir destinatários marcarem como "não spam"
4. Evitar palavras suspeitas no assunto

---

## 🎨 Customizar Template

Para editar o template de email:

1. Abra `/supabase/functions/server/emailTemplates.tsx`
2. Edite a função `inviteEmailTemplate`
3. Modifique HTML conforme necessário
4. **Teste** enviando um convite

**Dicas de customização**:
```typescript
// Mudar cores
background: linear-gradient(135deg, #1e3a5f 0%, #2c4f7c 100%);
// Para:
background: linear-gradient(135deg, #10b981 0%, #059669 100%);

// Mudar textos
🎉 Você foi convidado!
// Para:
🚀 Junte-se à nossa equipe!

// Adicionar logo
<img src="https://seusite.com/logo.png" alt="Logo" />
```

---

## 📊 Estatísticas de Email

### **Métricas Importantes**

O Resend rastreia automaticamente:

- **Delivered**: Emails entregues com sucesso
- **Opened**: Emails abertos pelo destinatário
- **Clicked**: Links clicados no email
- **Bounced**: Emails rejeitados (email inválido)
- **Complained**: Marcado como spam

**Ver estatísticas**:
1. Resend Dashboard → **"Analytics"**
2. Escolha período (hoje, semana, mês)
3. Veja gráficos e números

---

## 🔐 Segurança

### **Boas Práticas**

1. ✅ **Nunca compartilhe** sua API key
2. ✅ **Não commite** a key no código
3. ✅ **Use environment variables** sempre
4. ✅ **Rotacione keys** a cada 6 meses
5. ✅ **Monitor logs** para atividade suspeita

### **Se a API Key Vazar**

1. **Imediatamente** revogue a key no Resend
2. Gere uma nova API key
3. Atualize no Supabase
4. Revise logs de emails enviados
5. Mude senha do Resend

---

## 🆘 Suporte

### **Documentação Oficial**
- Resend Docs: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference

### **Comunidade**
- Discord: https://resend.com/discord
- GitHub: https://github.com/resendlabs/resend-node

### **Contato**
- Email: support@resend.com
- Twitter: @resend

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] API key do Resend configurada
- [ ] Teste de envio realizado com sucesso
- [ ] Email chegou na caixa de entrada (não spam)
- [ ] Template personalizado (opcional)
- [ ] Domínio próprio configurado (recomendado)
- [ ] SPF/DKIM configurados (recomendado)
- [ ] Monitoramento de logs ativado
- [ ] Plano adequado ao volume (free ou pago)

---

**Sistema de email pronto para produção!** 📧✨

**Última atualização**: Novembro 2024  
**Versão**: 1.0.0
