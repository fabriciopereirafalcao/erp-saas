# 🚀 Guia de Configuração do Supabase

Este arquivo contém as instruções passo a passo para configurar o Supabase e ativar o sistema de autenticação e banco de dados do ERP.

## 📋 Pré-requisitos

Nenhum! Tudo é gratuito para começar.

---

## PASSO 1: Criar Conta no Supabase

1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Faça login com GitHub, Google ou email
4. É GRÁTIS até 500MB de dados e 50.000 usuários mensais

---

## PASSO 2: Criar Projeto

1. No dashboard do Supabase, clique em "New Project"
2. Preencha:
   - **Name:** ERP Sistema (ou qualquer nome)
   - **Database Password:** Crie uma senha forte (anote!)
   - **Region:** South America (São Paulo) - melhor latência para Brasil
   - **Pricing Plan:** Free (grátis)
3. Clique em "Create new project"
4. Aguarde ~2 minutos para o projeto ser criado

---

## PASSO 3: Obter Credenciais

✅ **ATENÇÃO: Já configurado no Figma Make!**

As credenciais do Supabase já estão configuradas no arquivo `/utils/supabase/info.tsx`:
- **Project ID**: bhykkiladzxjwnzkpdwu
- **URL**: https://bhykkiladzxjwnzkpdwu.supabase.co
- **Anon Key**: Já configurada

⚠️ **Você NÃO precisa configurar variáveis de ambiente manualmente!**

O sistema já está conectado ao projeto Supabase do Figma Make.

---

## PASSO 4: ~~Configurar Variáveis de Ambiente~~ (JÁ FEITO)

✅ **Este passo já foi concluído automaticamente!**

O Figma Make já tem as credenciais configuradas no arquivo `/utils/supabase/info.tsx`.

Você pode pular para o Passo 5.

---

## PASSO 5: Executar Migração do Banco de Dados

Você tem 2 opções:

### Opção A: Via SQL Editor (RECOMENDADO - Mais Fácil)

1. No Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em "+ New query"
3. Copie TODO o conteúdo do arquivo `/supabase/migrations/001_initial_schema.sql`
4. Cole no editor
5. Clique em "Run" (ou pressione Ctrl/Cmd + Enter)
6. Aguarde a confirmação "Success. No rows returned"

✅ Pronto! Seu banco está configurado!

### Opção B: Via Supabase CLI (Avançado)

Se você preferir usar a linha de comando:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_ID

# Executar migração
supabase db push
```

---

## PASSO 6: Verificar Instalação

1. No Supabase, vá em **Table Editor** (menu lateral)
2. Você deve ver as seguintes tabelas:
   - ✅ companies
   - ✅ users
   - ✅ products
   - ✅ customers
   - ✅ suppliers
   - ✅ sales_orders
   - ✅ sales_order_items
   - ✅ purchase_orders
   - ✅ purchase_order_items
   - ✅ financial_transactions
   - ✅ accounts_receivable
   - ✅ accounts_payable
   - ✅ stock_movements
   - ✅ audit_logs

Se todas as tabelas estiverem lá, **SUCESSO!** 🎉

---

## PASSO 7: Configurar Email (Opcional mas Recomendado)

Por padrão, o Supabase usa emails de desenvolvimento. Para produção:

1. Vá em **Authentication** > **Email Templates**
2. Personalize os templates de:
   - Confirmação de email
   - Recuperação de senha
   - Convite de usuário

3. Para usar seu próprio servidor SMTP:
   - Vá em **Settings** > **Auth**
   - Configure SMTP Settings com:
     - SendGrid (100 emails/dia grátis)
     - Mailgun
     - Gmail
     - Outro provedor

---

## PASSO 8: Testar Autenticação

1. Execute o projeto no Figma Make
2. Você verá a tela de login
3. Clique em "Criar conta grátis"
4. Preencha os dados:
   - Nome: Teste Silva
   - Empresa: Empresa Teste
   - Email: seu@email.com
   - Senha: teste123
5. Clique em "Criar conta"

Se tudo der certo:
- ✅ Conta criada
- ✅ Empresa configurada
- ✅ Trial de 14 dias ativado
- ✅ Você é redirecionado para o sistema

---

## 🔒 SEGURANÇA

### Row Level Security (RLS)

✅ Já configurado automaticamente!

O RLS garante que:
- Cada empresa só vê seus próprios dados
- Usuários não podem acessar dados de outras empresas
- Isolamento total entre tenants

### Políticas de Segurança

Todas as tabelas têm políticas RLS que:
1. Permitem SELECT/INSERT/UPDATE/DELETE apenas para a empresa do usuário
2. Validam company_id automaticamente
3. Previnem SQL injection e acesso não autorizado

---

## 📊 MONITORAMENTO

No Supabase Dashboard você pode monitorar:

1. **Database** > **Database Usage**
   - Espaço usado
   - Número de conexões
   - Performance

2. **Authentication** > **Users**
   - Usuários cadastrados
   - Últimos logins
   - Emails confirmados

3. **Logs** (menu lateral)
   - Queries SQL
   - Erros de autenticação
   - API calls

---

## 💰 LIMITES DO PLANO GRÁTIS

✅ Suficiente para desenvolvimento e MVP:

- 500 MB de banco de dados
- 1 GB de armazenamento de arquivos
- 50.000 usuários mensais ativos
- 2 GB de transferência de dados
- Social OAuth providers
- 7 dias de backup

**Quando escalar:** Upgrade para Pro ($25/mês) quando:
- Ultrapassar 500 MB
- Precisar de mais de 7 dias de backup
- Quiser suporte prioritário

---

## 🐛 TROUBLESHOOTING

### Erro: "fetch failed" ou "connection refused"

**Solução**: Verifique se as variáveis de ambiente estão corretas no `.env.local`

### Erro: "JWT expired" ou "Invalid token"

**Solução**: 
1. Vá no Supabase Dashboard
2. Settings > Auth
3. Verifique JWT expiry (padrão: 1 hora)
4. Faça logout e login novamente

### Erro: "new row violates row-level security policy"

**Solução**: 
1. Verifique se o RLS está configurado corretamente
2. Execute novamente a migration `/supabase/migrations/001_initial_schema.sql`

### Tabelas não aparecem

**Solução**:
1. Verifique se a migração foi executada sem erros
2. No SQL Editor, execute: `SELECT * FROM companies;`
3. Se der erro, execute novamente o script de migração

---

## 📞 SUPORTE

**Documentação Oficial**: https://supabase.com/docs

**Discord da Supabase**: https://discord.supabase.com

**GitHub Issues**: https://github.com/supabase/supabase/issues

---

## ✅ CHECKLIST FINAL

Antes de começar a usar o sistema, confirme:

- [ ] Conta Supabase criada
- [ ] Projeto criado (região: South America)
- [ ] Credenciais (URL + anon key) copiadas
- [ ] Variáveis de ambiente configuradas no `.env.local`
- [ ] Migração SQL executada com sucesso
- [ ] Todas as 14 tabelas criadas
- [ ] Primeiro usuário registrado com sucesso
- [ ] Login funcionando
- [ ] Empresa criada automaticamente

🎉 **PARABÉNS!** Seu ERP SaaS está configurado e pronto para usar!

---

## 🚀 PRÓXIMOS PASSOS

Agora que a autenticação está funcionando, os próximos passos são:

1. ✅ Migrar dados do localStorage para Supabase
2. ✅ Implementar hooks para buscar dados do banco
3. ✅ Adicionar loading states
4. ✅ Implementar cache com React Query
5. ✅ Adicionar tratamento de erros robusto

Tudo isso já está no roadmap da Fase 1! 🎯