# 🧪 Guia de Testes - Sistema de Convites

## 📋 Pré-requisitos
- Sistema rodando localmente ou em produção
- Backend Supabase configurado
- Navegador com suporte a múltiplas abas/janelas

---

## 🎯 Cenário 1: Fluxo Completo (Signup → Convite → Aceite)

### **Passo 1: Criar Primeiro Usuário (Owner)**

1. **Acesse a aplicação**
   ```
   http://localhost:5173 (ou sua URL)
   ```

2. **Tela inicial → Clique em "Criar Conta"**

3. **Preencha o formulário**:
   - **Email**: `owner@empresa.com`
   - **Senha**: `senha123`
   - **Nome**: `João Silva`
   - **Nome da Empresa**: `Minha Empresa LTDA`

4. **Clique em "Criar Conta"**

5. **✅ Verificações**:
   - Sistema deve redirecionar para o dashboard
   - Usuário deve estar logado
   - No menu lateral, deve ter acesso a "Usuários e Permissões"

---

### **Passo 2: Convidar Novo Usuário**

1. **No menu lateral → Clique em "Usuários e Permissões"**

2. **Na tela de usuários → Clique em "Convidar Usuário"**

3. **No modal que abre, preencha**:
   - **Email**: `maria@empresa.com`
   - **Nível de Permissão**: Selecione "Gerente"

4. **Clique em "Criar Convite"**

5. **✅ Verificações**:
   - Modal deve mudar para tela de sucesso
   - Deve exibir um link de convite longo (com token UUID)
   - Exemplo: `https://app.com/?token=abc123-xyz789-...`

6. **Copie o link**:
   - Clique no botão de copiar (ícone de "Copy")
   - OU selecione todo o texto e copie manualmente

7. **Guarde o link** (vamos usar no próximo passo)

---

### **Passo 3: Aceitar Convite**

1. **Abra uma janela anônima/privada do navegador**
   - Chrome: `Ctrl + Shift + N` (Windows) ou `Cmd + Shift + N` (Mac)
   - Firefox: `Ctrl + Shift + P` (Windows) ou `Cmd + Shift + P` (Mac)

2. **Cole o link copiado na barra de endereços**
   ```
   https://app.com/?token=abc123-xyz789-...
   ```

3. **Pressione Enter**

4. **✅ Verificações**:
   - Sistema deve detectar o token automaticamente
   - Deve exibir tela de "Aceitar Convite"
   - Tela deve ter campos: Nome e Senha

5. **Preencha o formulário**:
   - **Nome Completo**: `Maria Santos`
   - **Senha**: `senha123`
   - **Confirmar Senha**: `senha123`

6. **Clique em "Criar Minha Conta"**

7. **✅ Verificações**:
   - Sistema deve criar a conta
   - Deve exibir tela de sucesso verde
   - Mensagem: "Conta criada com sucesso!"
   - Deve exibir o email: `maria@empresa.com`
   - Após 3 segundos, deve redirecionar para login

8. **Faça login com a nova conta**:
   - Email: `maria@empresa.com`
   - Senha: `senha123`

9. **✅ Verificações finais**:
   - Usuário deve estar logado
   - No perfil, deve mostrar role = "Gerente"
   - Deve ter acesso limitado conforme permissões de Gerente

---

## 🧪 Cenário 2: Testes de Validação

### **Teste 2.1: Token Inválido**

1. **Acesse manualmente uma URL com token falso**:
   ```
   https://app.com/?token=token-invalido-123
   ```

2. **✅ Deve exibir**:
   - Tela de erro vermelha
   - Mensagem: "Convite inválido ou expirado"
   - Sugestão para solicitar novo convite

---

### **Teste 2.2: Senha Muito Curta**

1. Acesse um link válido de convite
2. Preencha nome
3. Digite senha com menos de 6 caracteres (ex: `12345`)
4. **✅ Deve exibir**:
   - Aviso em amarelo abaixo do campo
   - "A senha deve ter pelo menos 6 caracteres"
   - Botão "Criar Conta" desabilitado

---

### **Teste 2.3: Senhas Diferentes**

1. Acesse um link válido de convite
2. Preencha:
   - **Senha**: `senha123`
   - **Confirmar Senha**: `senha456` (diferente)
3. **✅ Deve exibir**:
   - Erro em vermelho abaixo do campo
   - "As senhas não coincidem"
   - Botão "Criar Conta" desabilitado

---

### **Teste 2.4: Email Já Cadastrado**

1. Tente convidar um email que já existe
   - Exemplo: `owner@empresa.com` (já cadastrado)
2. **✅ Deve exibir erro**:
   - "Este email já está cadastrado na empresa"

---

## 🔍 Cenário 3: Verificações no Backend

### **Verificar Convite no KV Store**

1. **Acesse o Supabase Dashboard**
2. **Na aba de Functions, veja os logs**
3. **Procure por**:
   ```
   invite:abc123-xyz789-...
   ```
4. **✅ Deve conter**:
   - email
   - role
   - company_id
   - expires_at (7 dias após criação)
   - status: "pending"

---

### **Verificar Usuário Criado na Tabela `users`**

1. **Supabase Dashboard → Table Editor → users**
2. **Busque por email**: `maria@empresa.com`
3. **✅ Verificações**:
   - `id`: UUID válido
   - `email`: maria@empresa.com
   - `name`: Maria Santos
   - `company_id`: Mesmo da empresa do owner
   - `role`: manager
   - `created_at`: Timestamp de agora

---

### **Verificar Autenticação no Supabase Auth**

1. **Supabase Dashboard → Authentication → Users**
2. **Busque por**: `maria@empresa.com`
3. **✅ Verificações**:
   - Usuário existe no Auth
   - Email confirmado: true
   - Metadata contém: `{ name: "Maria Santos" }`

---

## 🎨 Cenário 4: Interface de Gerenciamento

### **Visualizar Usuários da Empresa**

1. **Como Owner, vá em "Usuários e Permissões"**
2. **✅ Deve listar**:
   - João Silva (Owner)
   - Maria Santos (Gerente)
3. **✅ Estatísticas**:
   - Total: 2 usuários
   - Ativos: 2
   - Inativos: 0

---

### **Alterar Role de Usuário** (Apenas Owner)

1. **Na lista de usuários, clique nos 3 pontos de Maria**
2. **Selecione "Editar"**
3. **Altere a role para "Administrador"**
4. **Salve**
5. **✅ Deve atualizar no backend**

---

### **Excluir Usuário** (Apenas Owner)

1. **Na lista, clique nos 3 pontos de Maria**
2. **Selecione "Excluir"**
3. **Confirme**
4. **✅ Verificações**:
   - Usuário removido da lista
   - Removido da tabela `users`
   - Removido do Supabase Auth

---

## 📊 Checklist de Testes Completo

### ✅ **Funcionalidades Básicas**
- [ ] Signup cria owner automaticamente
- [ ] Owner pode acessar "Usuários e Permissões"
- [ ] Botão "Convidar Usuário" abre modal
- [ ] Modal permite selecionar email e role
- [ ] Sistema gera link de convite com token
- [ ] Link pode ser copiado

### ✅ **Aceite de Convite**
- [ ] Link com token redireciona para AcceptInvite
- [ ] Formulário aceita nome e senha
- [ ] Validação de senha (mínimo 6 chars)
- [ ] Validação de confirmação de senha
- [ ] Botão desabilitado se validações falharem
- [ ] Criação de conta funciona
- [ ] Tela de sucesso aparece
- [ ] Redirecionamento após 3 segundos

### ✅ **Validações de Erro**
- [ ] Token inválido exibe erro
- [ ] Token expirado exibe erro
- [ ] Email duplicado exibe erro
- [ ] Senha curta exibe aviso
- [ ] Senhas diferentes exibe erro
- [ ] Nome vazio exibe erro

### ✅ **Permissões**
- [ ] Owner pode convidar usuários
- [ ] Admin pode convidar usuários
- [ ] Manager NÃO pode convidar
- [ ] User NÃO pode convidar
- [ ] Apenas Owner pode alterar roles
- [ ] Apenas Owner pode excluir usuários

### ✅ **Persistência**
- [ ] Convite salvo no KV store
- [ ] Usuário criado na tabela users
- [ ] Usuário criado no Supabase Auth
- [ ] Company_id correto vinculado
- [ ] Role atribuída corretamente

---

## 🐛 Problemas Comuns

### **Problema: "Token não encontrado"**
**Solução**: Verifique se copiou o link completo, incluindo `?token=...`

### **Problema: "Convite expirado"**
**Solução**: Convites expiram em 7 dias. Solicite um novo convite.

### **Problema: "Email já cadastrado"**
**Solução**: Use outro email ou faça login com a conta existente.

### **Problema: "Não autorizado"**
**Solução**: Apenas Owner e Admin podem convidar. Verifique seu nível de permissão.

### **Problema: Link não funciona**
**Solução**: 
1. Verifique se o backend está rodando
2. Verifique as variáveis de ambiente do Supabase
3. Veja os logs do servidor para erros

---

## 🎉 Teste de Sucesso

Se todos os testes acima passarem, seu sistema está **100% funcional**! 🚀

**Próximo passo**: Configurar envio automático de emails para automatizar o envio de convites.
