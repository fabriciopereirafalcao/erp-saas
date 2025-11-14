# Sistema de Hierarquia de Permissões e Convites

## 📋 Visão Geral

Sistema completo de gerenciamento de usuários implementado para o ERP SaaS, com hierarquia de permissões e sistema de convites por email.

## 🎯 Hierarquia de Roles

### 1. **Owner (Proprietário da Conta)**
- **Atribuição**: Automática para quem cria a conta (signup inicial)
- **Permissões exclusivas**:
  - ✅ Gerenciar TODOS os usuários (criar, editar, excluir)
  - ✅ Alterar roles de outros usuários
  - ✅ Gerenciar assinaturas e billing
  - ✅ Excluir a empresa completa
  - ✅ Conectar integrações
  - ✅ Todas as permissões de Admin +
- **Restrições**: 
  - Não pode deletar a si mesmo pelo endpoint padrão
  - Não pode alterar sua própria role
  - Não pode ter sua role alterada por outros

### 2. **Admin (Administrador)**
- **Atribuição**: Definida pelo Owner via convite
- **Permissões**:
  - ✅ Convidar novos usuários
  - ✅ Visualizar todos os usuários
  - ✅ Acesso completo a todos os módulos do sistema
  - ❌ NÃO pode alterar roles
  - ❌ NÃO pode excluir usuários
  - ❌ NÃO pode gerenciar billing
  - ❌ NÃO pode excluir a empresa

### 3. **Manager (Gerente)**
- **Atribuição**: Definida pelo Owner via convite
- **Permissões**:
  - ✅ Acesso a operações e relatórios
  - ✅ Poder de aprovação em módulos específicos
  - ✅ Visualizar usuários (sem editar)
  - ❌ NÃO pode convidar usuários
  - ❌ NÃO pode alterar configurações críticas

### 4. **User (Usuário Padrão)**
- **Atribuição**: Definida pelo Owner/Admin via convite
- **Permissões**:
  - ✅ Acesso aos módulos conforme perfil atribuído
  - ❌ NÃO pode ver configurações de usuários
  - ❌ NÃO pode convidar outros usuários

## 🔄 Fluxo de Adesão de Usuários

### Cadastro Inicial (Signup)
```
1. Usuário acessa a tela de cadastro
2. Preenche:
   - Email
   - Senha
   - Nome
   - Nome da Empresa
3. Sistema cria automaticamente:
   - Conta no Supabase Auth
   - Registro na tabela 'companies' (status: trial, 14 dias)
   - Registro na tabela 'users' com role = 'owner'
4. Usuário recebe acesso imediato como OWNER
```

### Convite de Novos Usuários
```
1. Owner/Admin → Acessa "Gerenciar Usuários"
2. Clica em "Convidar Usuário"
3. Preenche:
   - Email do convidado
   - Role desejada (admin, manager, user)
4. Sistema:
   - Gera token único (UUID)
   - Salva convite no KV store
   - Define validade de 7 dias
   - TODO: Envia email com link de convite
5. Convidado recebe email com link:
   - https://app.com/accept-invite?token=<UUID>
6. Convidado acessa o link e preenche:
   - Nome completo
   - Senha
7. Sistema cria:
   - Conta no Supabase Auth
   - Registro na tabela 'users' vinculado à empresa do convidante
   - Role conforme selecionada no convite
8. Convidado já entra logado na empresa
```

## 🔐 Endpoints de Backend Implementados

### 1. GET `/make-server-686b5e88/users`
**Permissão**: Owner ou Admin
**Descrição**: Lista todos os usuários da empresa
**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@email.com",
      "name": "Nome do Usuário",
      "role": "admin",
      "company_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. POST `/make-server-686b5e88/users/invite`
**Permissão**: Owner ou Admin
**Descrição**: Cria convite para novo usuário
**Body**:
```json
{
  "email": "novo@usuario.com",
  "role": "manager"
}
```
**Response**:
```json
{
  "success": true,
  "invite": {
    "email": "novo@usuario.com",
    "role": "manager",
    "token": "uuid-do-convite",
    "expires_at": "2024-01-08T00:00:00Z",
    "invite_link": "https://app.com/accept-invite?token=uuid"
  }
}
```

### 3. POST `/make-server-686b5e88/users/accept-invite`
**Permissão**: Pública (com token válido)
**Descrição**: Aceita convite e cria conta
**Body**:
```json
{
  "token": "uuid-do-convite",
  "name": "Nome Completo",
  "password": "senha-segura"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "novo@usuario.com",
    "name": "Nome Completo",
    "role": "manager"
  }
}
```

### 4. DELETE `/make-server-686b5e88/users/:userId`
**Permissão**: Apenas Owner
**Descrição**: Exclui usuário da empresa
**Restrições**:
- Não pode excluir a si mesmo
- Não pode excluir outro owner
- Usuário deve pertencer à mesma empresa

### 5. PATCH `/make-server-686b5e88/users/:userId/role`
**Permissão**: Apenas Owner
**Descrição**: Altera a role de um usuário
**Body**:
```json
{
  "role": "admin"
}
```
**Restrições**:
- Não pode alterar role de owner
- Roles válidas: admin, manager, user

## 📊 Tabelas do Banco de Dados

### Tabela: `companies`
```sql
- id (uuid)
- name (text)
- plan (text): trial | basic | professional | enterprise
- status (text): active | suspended | trial | cancelled
- trial_ends_at (timestamp)
- created_at (timestamp)
```

### Tabela: `users`
```sql
- id (uuid) - referência ao auth.users
- email (text)
- name (text)
- company_id (uuid) - FK para companies
- role (text): owner | admin | manager | user
- created_at (timestamp)
```

### KV Store: `invite:<token>`
```json
{
  "email": "convidado@email.com",
  "role": "manager",
  "company_id": "uuid",
  "company_name": "Nome da Empresa",
  "invited_by": "uuid-do-convidante",
  "invited_by_name": "Nome do Convidante",
  "created_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-01-08T00:00:00Z",
  "status": "pending" | "accepted"
}
```

## ✅ Status de Implementação

### ✅ Implementado
- [x] Signup automático com role = owner
- [x] Endpoint de listagem de usuários
- [x] Endpoint de criação de convites
- [x] Endpoint de aceite de convites
- [x] Endpoint de exclusão de usuários (apenas owner)
- [x] Endpoint de alteração de roles (apenas owner)
- [x] Validações de permissões em todos os endpoints
- [x] Rollback de transações em caso de erro
- [x] Sistema de expiração de convites (7 dias)
- [x] Armazenamento de convites no KV store

### 🚧 Pendente
- [ ] Integrar frontend do UsersPermissions com backend
- [ ] Criar componente de aceite de convite (AcceptInvite.tsx)
- [ ] Implementar envio real de emails
- [ ] Adicionar interface para reenviar convites
- [ ] Criar histórico de convites enviados
- [ ] Implementar busca e filtros de usuários no frontend
- [ ] Adicionar avatar/foto de perfil dos usuários

### 📋 TODO: Próximos Passos

1. **Frontend - Integração do UsersPermissions**
   - Consumir endpoint GET /users ao carregar o componente
   - Implementar função de convidar usuário
   - Mostrar lista de convites pendentes
   - Adicionar botão de copiar link de convite

2. **Componente AcceptInvite**
   - Criar rota /accept-invite no App.tsx
   - Ler token da URL (query params)
   - Validar token no backend
   - Mostrar formulário de cadastro (nome + senha)
   - Redirecionar para dashboard após aceite

3. **Envio de Emails**
   - Configurar serviço de email (SendGrid, AWS SES, etc)
   - Criar templates de email para convites
   - Adicionar link de convite no email
   - Implementar retry em caso de falha

4. **Melhorias de UX**
   - Notificar owner quando convite é aceito
   - Mostrar status do convite (pendente, aceito, expirado)
   - Permitir reenvio de convites
   - Adicionar confirmação visual ao convidar

## 🔒 Segurança Implementada

- ✅ Todas as rotas protegidas com autenticação
- ✅ Validação de roles em cada endpoint
- ✅ Uso de SERVICE_ROLE_KEY apenas no backend
- ✅ Verificação de pertencimento à mesma empresa
- ✅ Tokens únicos (UUID) para convites
- ✅ Expiração automática de convites (7 dias)
- ✅ Rollback de transações em caso de erro
- ✅ Proteção contra exclusão de owners
- ✅ Proteção contra alteração de role de owners

## 📝 Notas Importantes

1. **Owner é imutável**: O primeiro usuário (owner) não pode ter sua role alterada ou ser excluído por outros usuários.

2. **Hierarquia rígida**: Apenas owner pode alterar roles e excluir usuários. Admin pode apenas convidar.

3. **Um owner por empresa**: Cada empresa tem apenas um owner (o criador da conta).

4. **Convites temporários**: Convites expiram em 7 dias e não podem ser reutilizados.

5. **Email único**: Não é possível convidar um email que já está cadastrado na empresa.

6. **Transações atômicas**: Todas as operações fazem rollback em caso de erro parcial.
