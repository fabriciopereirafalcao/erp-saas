# 📧 Configuração do Modo de Teste - Resend

## 🎯 Visão Geral

O sistema de envio de emails via Resend agora suporta **modo configurável** através de variáveis de ambiente, permitindo controlar se emails devem ser enviados para destinatários reais ou redirecionados para um email de teste.

---

## 🔧 Variáveis de Ambiente

### **1. EMAIL_TEST_MODE**

**Tipo**: `string` (aceita apenas `'true'` ou qualquer outro valor)

**Valores possíveis**:
- `'true'` → Ativa modo de teste (emails redirecionados)
- Qualquer outro valor ou não configurado → Modo produção (comportamento padrão)

**Comportamento**:
```typescript
EMAIL_TEST_MODE = 'true'  → 🧪 MODO DE TESTE
EMAIL_TEST_MODE = 'false' → 🚀 PRODUÇÃO
EMAIL_TEST_MODE = (vazio) → 🚀 PRODUÇÃO (padrão)
```

---

### **2. TEST_EMAIL**

**Tipo**: `string` (endereço de email válido)

**Valor padrão**: `fabriciopereirafalcao@gmail.com`

**Quando é usado**:
- Apenas quando `EMAIL_TEST_MODE='true'`
- Todos os emails serão redirecionados para este endereço

**Exemplo**:
```bash
TEST_EMAIL=seu-email@example.com
```

---

## 🚀 Como Configurar

### **OPÇÃO 1: Supabase CLI (Recomendado para Produção)**

```bash
# Para ATIVAR modo de teste (desenvolvimento/staging)
supabase secrets set EMAIL_TEST_MODE=true --project-ref [project-id]
supabase secrets set TEST_EMAIL=seu-email@example.com --project-ref [project-id]

# Para DESATIVAR modo de teste (produção)
supabase secrets unset EMAIL_TEST_MODE --project-ref [project-id]
# ou
supabase secrets set EMAIL_TEST_MODE=false --project-ref [project-id]
```

---

### **OPÇÃO 2: Supabase Dashboard**

1. Acesse: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Manage secrets**
4. Adicione as secrets:

| Name | Value | Quando usar |
|------|-------|-------------|
| `EMAIL_TEST_MODE` | `true` | Desenvolvimento/Staging |
| `TEST_EMAIL` | `seu@email.com` | Desenvolvimento/Staging |

5. Clique em **Save**

**Para produção**: Delete ou altere `EMAIL_TEST_MODE` para `false`

---

### **OPÇÃO 3: Figma Make (Desenvolvimento Local)**

No Figma Make, use o tool `create_supabase_secret`:

```typescript
// Isto será executado automaticamente se necessário
create_supabase_secret({ secretName: 'EMAIL_TEST_MODE' });
create_supabase_secret({ secretName: 'TEST_EMAIL' });
```

---

## 📊 Cenários de Uso

### **🧪 CENÁRIO 1: Desenvolvimento Local**

**Objetivo**: Testar sistema de convites sem enviar emails reais

**Configuração**:
```bash
EMAIL_TEST_MODE=true
TEST_EMAIL=voce@seuemail.com
RESEND_API_KEY=re_xxxxx
```

**Resultado**:
```
Owner convida: maria@empresa.com
  ↓
✅ Email enviado para: voce@seuemail.com
✅ Assunto: [TESTE para maria@empresa.com] Você foi convidado...
✅ Banner de aviso aparece no topo do email
```

---

### **🎯 CENÁRIO 2: Staging/Homologação**

**Objetivo**: Testes com cliente sem enviar emails para usuários finais

**Configuração**:
```bash
EMAIL_TEST_MODE=true
TEST_EMAIL=qa-team@empresa.com
RESEND_API_KEY=re_xxxxx
```

**Resultado**:
- Todos os emails vão para `qa-team@empresa.com`
- Equipe de QA pode validar templates
- Nenhum email real é enviado

---

### **🚀 CENÁRIO 3: Produção**

**Objetivo**: Sistema real, emails para destinatários reais

**Configuração**:
```bash
# EMAIL_TEST_MODE não configurado (ou false)
RESEND_API_KEY=re_xxxxx
```

**Resultado**:
```
Owner convida: maria@empresa.com
  ↓
✅ Email enviado para: maria@empresa.com (REAL!)
✅ Assunto: Você foi convidado para [Nome da Empresa]
✅ Sem banner de teste
```

---

## 🔍 Como Identificar o Modo Atual

### **1. Logs do Backend**

Quando a Edge Function inicia, ela mostra:

```bash
# MODO PRODUÇÃO:
📧 Email Service Inicializado:
   → Modo de Teste: 🚀 PRODUÇÃO

# MODO TESTE:
📧 Email Service Inicializado:
   → Modo de Teste: 🧪 ATIVO
   → Emails redirecionados para: seu@email.com
   ⚠️  ATENÇÃO: Modo de teste ativo! Desative em produção!
```

**Como ver logs**:
```bash
# Via Supabase CLI
supabase functions logs --project-ref [project-id]

# Ou no Supabase Dashboard → Edge Functions → Logs
```

---

### **2. No Email Recebido**

**Modo de Teste**:
```
┌──────────────────────────────────────┐
│ ⚠️ MODO DE TESTE DO RESEND          │
│                                      │
│ Este email deveria ter sido enviado │
│ para: maria@empresa.com              │
│ Mas foi redirecionado para você.     │
└──────────────────────────────────────┘

[Conteúdo normal do email...]
```

**Modo Produção**:
- Sem banner amarelo
- Conteúdo limpo e profissional

---

### **3. No Assunto do Email**

**Modo de Teste**:
```
[TESTE para maria@empresa.com] Você foi convidado para Empresa ABC
```

**Modo Produção**:
```
Você foi convidado para Empresa ABC
```

---

## ⚠️ Avisos Importantes

### **🔴 NUNCA deixe modo de teste ativo em PRODUÇÃO!**

```bash
# ❌ ERRADO - Produção com modo teste
EMAIL_TEST_MODE=true  # Nenhum email chegará aos usuários!

# ✅ CORRETO - Produção sem modo teste
# (não configurar EMAIL_TEST_MODE ou setar como false)
```

---

### **🟡 Validar antes de deploy**

**Checklist antes de deploy em produção**:
- [ ] `EMAIL_TEST_MODE` está **removido** ou `false`
- [ ] `RESEND_API_KEY` está configurado
- [ ] Testar envio de convite real
- [ ] Confirmar que email chega ao destinatário correto

---

### **🟢 Usar modo teste em ambientes não-produção**

**Ambientes que DEVEM usar modo teste**:
- ✅ Local (localhost)
- ✅ Desenvolvimento
- ✅ Staging
- ✅ Homologação
- ✅ QA/Testes

**Ambientes que NÃO DEVEM usar modo teste**:
- ❌ Produção
- ❌ Demo para clientes reais
- ❌ Beta público

---

## 🧪 Como Testar

### **Teste 1: Validar Modo Teste**

```bash
# 1. Configurar modo teste
supabase secrets set EMAIL_TEST_MODE=true --project-ref [id]
supabase secrets set TEST_EMAIL=voce@email.com --project-ref [id]

# 2. Deploy
supabase functions deploy make-server-686b5e88 --project-ref [id]

# 3. Criar convite
# No sistema, vá em "Usuários e Permissões" → "Convidar Usuário"
# Email: qualquer@email.com

# 4. Verificar
# Email deve chegar em voce@email.com (não qualquer@email.com)
# Assunto deve ter prefixo [TESTE para qualquer@email.com]
```

---

### **Teste 2: Validar Modo Produção**

```bash
# 1. Remover modo teste
supabase secrets unset EMAIL_TEST_MODE --project-ref [id]

# 2. Deploy
supabase functions deploy make-server-686b5e88 --project-ref [id]

# 3. Criar convite
# Email: seu-email-real@example.com

# 4. Verificar
# Email deve chegar em seu-email-real@example.com
# Assunto NÃO deve ter prefixo [TESTE]
# Sem banner amarelo no topo
```

---

## 📋 Troubleshooting

### **Problema: Email não chega**

**Sintoma**: Convite criado, mas nenhum email recebido

**Checklist**:
1. ✅ Verificar `RESEND_API_KEY` está configurado
2. ✅ Verificar se `EMAIL_TEST_MODE=true` (emails vão para outro lugar)
3. ✅ Checar pasta de spam
4. ✅ Ver logs do Supabase Functions
5. ✅ Verificar dashboard do Resend (https://resend.com/emails)

---

### **Problema: Email vai para lugar errado**

**Sintoma**: Email deveria ir para maria@email.com mas vai para outro

**Causa provável**: `EMAIL_TEST_MODE=true` ativo

**Solução**:
```bash
# Verificar configuração atual
supabase secrets list --project-ref [id]

# Se aparecer EMAIL_TEST_MODE=true, remover:
supabase secrets unset EMAIL_TEST_MODE --project-ref [id]

# Redeploy
supabase functions deploy make-server-686b5e88 --project-ref [id]
```

---

### **Problema: Assunto com [TESTE] em produção**

**Sintoma**: Emails reais chegam com `[TESTE para...]` no assunto

**Causa**: `EMAIL_TEST_MODE=true` ainda ativo

**Solução**: Mesma do problema anterior

---

## 🔐 Segurança

### **Boas Práticas**:

1. ✅ **Nunca commite secrets no código**
   ```bash
   # ❌ NUNCA faça:
   const EMAIL_TEST_MODE = 'true'; // hardcoded
   
   # ✅ SEMPRE use:
   const EMAIL_TEST_MODE = Deno.env.get('EMAIL_TEST_MODE');
   ```

2. ✅ **Use ambientes separados**
   - Projeto Supabase para DEV
   - Projeto Supabase para STAGING  
   - Projeto Supabase para PROD

3. ✅ **Documente configuração**
   - Mantenha README atualizado
   - Liste todas as env vars necessárias

---

## 📊 Resumo Rápido

| Ambiente | EMAIL_TEST_MODE | TEST_EMAIL | Comportamento |
|----------|----------------|------------|---------------|
| **Local** | `true` | `voce@email.com` | Redireciona para você |
| **Staging** | `true` | `qa@empresa.com` | Redireciona para QA |
| **Produção** | (não configurado) | (não usado) | Emails reais |

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] `EMAIL_TEST_MODE` removido ou `false`
- [ ] `TEST_EMAIL` removido (não será usado)
- [ ] `RESEND_API_KEY` configurado
- [ ] Teste de envio realizado
- [ ] Email chegou ao destinatário correto
- [ ] Sem prefixo [TESTE] no assunto
- [ ] Sem banner amarelo no email
- [ ] Logs mostram "🚀 PRODUÇÃO"

---

**Configuração concluída! Sistema pronto para uso controlado.** 📧✨

**Última atualização**: Dezembro 2024  
**Versão**: 2.0.0 - Modo Configurável
