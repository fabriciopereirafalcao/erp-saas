# 🔑 Como Configurar sua API Key do Resend

## ✅ Você está aqui: Já criou a API key no Resend

Ótimo! Agora vamos configurá-la no sistema em **3 passos simples**:

---

## 📝 Passo 1: Copiar sua API Key

1. Você deve ter recebido uma API key que começa com `re_`
2. **Exemplo**: `re_AbCdEfGh12345678_XXXXXXXXXXXXXXXX`
3. Se perdeu, gere uma nova em [resend.com/api-keys](https://resend.com/api-keys)

⚠️ **IMPORTANTE**: A API key só aparece UMA VEZ ao criar. Guarde em local seguro!

---

## ⚙️ Passo 2: Configurar no Sistema

Você tem **3 opções** para configurar. Escolha a mais fácil para você:

### **Opção A: Via Interface Visual** (Mais Fácil) ✅

1. **Abra o sistema ERP**
2. Vá em **"Configurações"** ou **"Email Settings"**
3. Cole sua API key no campo indicado
4. Clique em **"Salvar Configuração"**
5. ✅ Pronto!

---

### **Opção B: Via Supabase Dashboard**

1. Acesse: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em: **Settings** → **Edge Functions** → **Secrets**
4. Clique em **"Add Secret"**
5. Preencha:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Cole sua API key (ex: `re_xxxxx...`)
6. Clique em **"Save"**
7. ✅ Pronto!

---

### **Opção C: Via Console do Navegador** (Desenvolvimento)

1. Abra o sistema ERP no navegador
2. Pressione `F12` para abrir DevTools
3. Vá na aba **Console**
4. Cole e execute:
   ```javascript
   Deno.env.set('RESEND_API_KEY', 're_SUA_API_KEY_AQUI');
   ```
5. Substitua `re_SUA_API_KEY_AQUI` pela sua API key real
6. Pressione `Enter`
7. ✅ Pronto!

---

## 🧪 Passo 3: Testar se Funcionou

### **Teste Rápido**

1. Faça login como **Owner**
2. Vá em **"Usuários e Permissões"**
3. Clique em **"Convidar Usuário"**
4. Preencha:
   - **Email**: Seu email pessoal
   - **Permissão**: Gerente
5. Clique em **"Criar Convite"**

### **Resultado Esperado** ✅

Se o email estiver configurado, você verá:

```
✅ Convite criado e email enviado!
📧 Um convite foi enviado automaticamente para seu@email.com

[Link de convite] [📋 Copiar]

✅ Próximos passos:
  • O usuário receberá o email em alguns minutos
  • Ele criará nome e senha ao acessar o link
  • Após criar a conta, já entrará logado na empresa
```

### **Verifique seu Email**

1. Aguarde 1-2 minutos
2. Verifique sua caixa de entrada
3. **Assunto**: "Você foi convidado para [Nome da Empresa]"
4. Verifique também **pasta de spam/lixo eletrônico**

---

## ❌ Se NÃO Funcionou

### **Erro: "Serviço de email não configurado"**

**Significa que**: A API key não foi salva corretamente

**Solução**:
1. Verifique se copiou a API key completa
2. Confirme que a key começa com `re_`
3. Tente outra opção de configuração (A, B ou C acima)
4. Aguarde 1 minuto e tente novamente

---

### **Erro: "API key inválida"**

**Significa que**: A API key está incorreta ou expirou

**Solução**:
1. Acesse [resend.com/api-keys](https://resend.com/api-keys)
2. **Delete** a API key antiga
3. **Crie uma nova** API key
4. Copie a nova key
5. Configure novamente (Passo 2)

---

### **Email não chegou**

**Checklist**:
- ✅ Aguardou 2-3 minutos?
- ✅ Verificou pasta de **spam**?
- ✅ Email digitado está correto?
- ✅ Tentou com outro email?

**Ainda não chegou?**
1. Vá em [resend.com/emails](https://resend.com/emails)
2. Veja se o email aparece como "Delivered"
3. Se aparece como "Failed", veja o motivo

---

## 📊 Verificar Status

### **Pelo Sistema**

1. Vá em **"Configurações de Email"**
2. Veja o status:
   - ✅ **Verde**: Email Configurado
   - ⚠️ **Amarelo**: Email Não Configurado

### **Pelo Resend Dashboard**

1. Acesse [resend.com/emails](https://resend.com/emails)
2. Veja lista de emails enviados
3. Status possíveis:
   - ✅ **Delivered**: Entregue com sucesso
   - 🔄 **Pending**: Enviando
   - ❌ **Failed**: Falhou (veja motivo)

---

## 🎉 Sucesso!

Se o email chegou, está tudo funcionando! 🚀

### **O que acontece agora:**

✅ Quando você convidar um usuário, o sistema automaticamente:
1. Cria um token único
2. Envia email profissional
3. Usuário recebe email na caixa de entrada
4. Clica no botão "Aceitar Convite"
5. Cria nome e senha
6. Já entra logado no sistema!

### **Benefícios:**

- ✅ **Zero trabalho manual**: Email enviado automaticamente
- ✅ **Design profissional**: Template moderno e responsivo
- ✅ **Alta taxa de entrega**: Raramente vai para spam
- ✅ **Rastreamento**: Veja quem abriu, clicou, etc
- ✅ **Free tier generoso**: 100 emails/dia, 3.000/mês

---

## 💡 Dicas

### **1. Teste primeiro com seu próprio email**
Antes de convidar alguém, teste enviando para você mesmo.

### **2. Verifique a pasta de spam**
Às vezes o primeiro email pode cair no spam. Marque como "não spam".

### **3. Domínio próprio (opcional)**
Para melhor deliverability, configure um domínio próprio no Resend:
- Vá em [resend.com/domains](https://resend.com/domains)
- Adicione seu domínio
- Configure DNS conforme instruções
- Emails virão de `@seudominio.com.br`

### **4. Monitore uso**
- Free tier: 100 emails/dia, 3.000/mês
- Veja uso em [resend.com/usage](https://resend.com/usage)
- Upgrade se necessário

---

## 🆘 Precisa de Ajuda?

### **Documentação Completa**
- 📄 `/docs/EMAIL_SETUP_GUIDE.md` - Guia detalhado
- 📄 `/docs/EMAIL_INTEGRATION_COMPLETE.md` - Documentação técnica

### **Suporte Resend**
- 📧 Email: support@resend.com
- 💬 Discord: [resend.com/discord](https://resend.com/discord)
- 📚 Docs: [resend.com/docs](https://resend.com/docs)

---

## ✅ Checklist Final

Antes de convidar usuários reais:

- [ ] API key configurada
- [ ] Teste enviado com sucesso
- [ ] Email recebido (não spam)
- [ ] Template está bonito
- [ ] Link funciona corretamente
- [ ] Aceitar convite funciona
- [ ] Pronto para produção! 🚀

---

**Configuração completa!** 🎉  
Agora você pode convidar usuários e o email será enviado automaticamente!
