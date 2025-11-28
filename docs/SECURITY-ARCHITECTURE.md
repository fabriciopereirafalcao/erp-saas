# 🛡️ Arquitetura de Segurança - ERP System

## 📋 Visão Geral

Este documento descreve a arquitetura de segurança implementada no sistema ERP, focando em autenticação, autorização e proteção contra ataques comuns.

---

## 🔐 Camadas de Segurança

### **1. Frontend (UX Rápida + Cache Inteligente)**

#### ✅ O que o Frontend FAZ:
- Cache instantâneo do perfil do usuário
- Validação de formulários
- Feedback visual de estados (loading, errors)
- Armazenamento seguro de tokens JWT
- Revalidação periódica em background

#### ❌ O que o Frontend NÃO FAZ:
- **Decisões de segurança críticas**
- **Validação final de permissões**
- **Proteção contra manipulação de dados**

> ⚠️ **IMPORTANTE**: O localStorage pode ser manipulado pelo usuário. Nunca confie apenas nos dados do frontend!

---

### **2. Backend (Segurança Real)**

#### ✅ TODA validação de segurança DEVE estar no backend:

1. **Validação de Token JWT**
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser(token);
   ```

2. **Busca de Perfil Real do Banco**
   ```typescript
   const { data: profile } = await supabase
     .from('users')
     .select('*')
     .eq('id', user.id)
     .single();
   ```

3. **Validação de Permissões (Role-Based Access Control)**
   ```typescript
   if (!['owner', 'admin'].includes(profile.role)) {
     return c.json({ error: 'Forbidden' }, 403);
   }
   ```

4. **Isolamento Multi-Tenant**
   ```typescript
   if (profile.company_id !== requestedCompanyId) {
     return c.json({ error: 'Access denied' }, 403);
   }
   ```

---

## 🔄 Fluxo de Autenticação Seguro

### **Login**

```
1. Usuário insere credenciais
   ↓
2. Frontend envia para Supabase Auth
   ↓
3. Supabase valida e retorna JWT
   ↓
4. Frontend salva token no localStorage
   ↓
5. Frontend busca perfil do banco
   ↓
6. Perfil armazenado em cache (localStorage)
   ↓
7. Sistema pronto para uso
```

### **Requisições Subsequentes**

```
1. Frontend carrega perfil do CACHE (instantâneo)
   ↓
2. Em BACKGROUND: Valida com Supabase
   ↓
3. Se dados mudaram → Atualiza cache
   ↓
4. Se token expirou → Faz logout
   ↓
5. A cada 5 min → Revalida automaticamente
```

### **Requisições API**

```
1. Frontend envia JWT no header Authorization
   ↓
2. Backend valida JWT com Supabase Auth
   ↓
3. Backend busca perfil REAL do banco
   ↓
4. Backend valida role/permissions
   ↓
5. Backend valida company_id (multi-tenant)
   ↓
6. Se tudo OK → Processa requisição
   ↓
7. Se falhar → Retorna 401/403
```

---

## 🛡️ Proteções Implementadas

### **1. Contra Manipulação de localStorage**

❌ **Ataque:**
```javascript
// Usuário tenta se promover a owner
const profile = JSON.parse(localStorage.getItem('erp_system_auth_profile'));
profile.role = 'owner';
localStorage.setItem('erp_system_auth_profile', JSON.stringify(profile));
```

✅ **Proteção:**
```typescript
// Backend SEMPRE busca role do banco, não confia no frontend
const { data: profile } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile.role !== 'owner') {
  return c.json({ error: 'Forbidden' }, 403);
}
```

---

### **2. Contra Cross-Tenant Access**

❌ **Ataque:**
```javascript
// Usuário tenta acessar dados de outra empresa
fetch('/api/companies/outra-empresa-id/customers', {
  headers: { 'Authorization': 'Bearer meu-token' }
});
```

✅ **Proteção:**
```typescript
// Backend valida se company_id do token bate com company_id da rota
const user = await authenticateUser(token);
const requestedCompanyId = c.req.param('companyId');

if (user.company_id !== requestedCompanyId) {
  return c.json({ error: 'Access denied' }, 403);
}
```

---

### **3. Contra Token Expirado**

❌ **Problema:**
```
Token expira → Usuário parece logado → Todas as chamadas falham
```

✅ **Proteção:**
```typescript
// Revalidação periódica a cada 5 minutos
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && user) {
    await signOut(); // Logout automático
  }
}, 5 * 60 * 1000);
```

---

### **4. Contra Acesso Após Revogação**

❌ **Problema:**
```
Admin revoga acesso → Cache do usuário ainda válido → Acesso continua
```

✅ **Proteção:**
```typescript
// 1. Revalidação periódica detecta mudança
await loadUserProfile(userId, true); // A cada 5 min

// 2. Backend SEMPRE valida is_active
if (!profile.is_active) {
  return c.json({ error: 'Account disabled' }, 403);
}
```

---

## 📚 Como Usar os Middlewares

### **Importar Middlewares**

```typescript
import { 
  requireAuth,           // Requer token válido
  requireRole,           // Requer role específica
  requireCompanyAccess   // Requer acesso à empresa
} from './auth-middleware.ts';
```

### **Exemplos Práticos**

#### **Rota Protegida Simples**
```typescript
app.get('/make-server-686b5e88/profile', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

#### **Rota com Restrição de Role**
```typescript
app.delete('/make-server-686b5e88/users/:id', 
  requireAuth, 
  requireRole(['owner', 'admin']), 
  async (c) => {
    // Apenas owner e admin podem deletar
    const userId = c.req.param('id');
    return c.json({ message: 'User deleted' });
  }
);
```

#### **Rota Multi-Tenant**
```typescript
app.get('/make-server-686b5e88/companies/:companyId/customers',
  requireAuth,
  requireCompanyAccess,
  async (c) => {
    const user = c.get('user');
    // Usuário só vê clientes da própria empresa
    return c.json({ customers: [] });
  }
);
```

#### **Rota Combinada (Role + Multi-Tenant)**
```typescript
app.post('/make-server-686b5e88/companies/:companyId/settings',
  requireAuth,
  requireCompanyAccess,
  requireRole(['owner', 'admin']),
  async (c) => {
    // Apenas owner/admin da PRÓPRIA empresa
    return c.json({ message: 'Settings updated' });
  }
);
```

---

## 🔑 Hierarquia de Permissões

### **Roles Disponíveis** (do maior para o menor privilégio)

1. **owner** (Proprietário)
   - Acesso total ao sistema
   - Gerencia usuários e configurações
   - Visualiza e edita tudo

2. **admin** (Administrador)
   - Gerencia dados e configurações
   - Não pode alterar configurações críticas da empresa
   - Visualiza e edita quase tudo

3. **manager** (Gerente)
   - Gerencia operações diárias
   - Acesso a relatórios e análises
   - Edita dados operacionais

4. **operator** (Operador)
   - Executa operações do dia-a-dia
   - Cadastra clientes, produtos, vendas
   - Visualiza dados relevantes

5. **viewer** (Visualizador)
   - Apenas visualização
   - Não pode editar nada
   - Útil para auditoria

---

## 🎯 Checklist de Segurança para Novas Features

Ao adicionar uma nova rota no backend:

- [ ] **Token JWT é validado?**
- [ ] **Perfil é buscado do BANCO (não do frontend)?**
- [ ] **Role/permissões são validadas?**
- [ ] **company_id é verificado (multi-tenant)?**
- [ ] **Dados sensíveis são protegidos?**
- [ ] **Erros retornam status HTTP correto (401/403)?**
- [ ] **Logs de segurança estão implementados?**
- [ ] **Input é validado e sanitizado?**

---

## 🚨 Red Flags (Sinais de Alerta)

### ❌ NUNCA faça isso:

```typescript
// ❌ Confiar em dados do frontend
const { role } = await c.req.json();
if (role === 'owner') { ... }

// ❌ Usar company_id do body/query
const { companyId } = await c.req.json();
const data = await getCompanyData(companyId);

// ❌ Validar apenas no frontend
// Frontend: if (user.role !== 'owner') return;
// Backend: (sem validação)

// ❌ Expor dados de outras empresas
SELECT * FROM customers; // Sem WHERE company_id = ...
```

### ✅ SEMPRE faça isso:

```typescript
// ✅ Buscar role do banco
const user = await authenticateUser(token);
if (user.role !== 'owner') { ... }

// ✅ Usar company_id do token validado
const user = c.get('user');
const data = await getCompanyData(user.company_id);

// ✅ Validar no backend
const user = c.get('user');
if (!['owner', 'admin'].includes(user.role)) {
  return c.json({ error: 'Forbidden' }, 403);
}

// ✅ Isolar dados por empresa
SELECT * FROM customers WHERE company_id = $1;
```

---

## 📊 Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ⚡ Cache instantâneo (localStorage)             │   │
│  │  🔄 Revalidação periódica (5 min)                │   │
│  │  🎨 UX otimizada                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ⚠️  NÃO CONFIAR: Pode ser manipulado                   │
└─────────────────────────────────────────────────────────┘
                           ↓
                      JWT Token
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. ✅ Validar JWT (Supabase Auth)               │   │
│  │  2. ✅ Buscar perfil REAL (banco)                │   │
│  │  3. ✅ Validar role/permissions                  │   │
│  │  4. ✅ Validar company_id (multi-tenant)         │   │
│  │  5. ✅ Processar requisição                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  🛡️  FONTE DA VERDADE: Todas as decisões aqui          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Conclusão

- **Frontend**: Performance e UX (cache instantâneo)
- **Backend**: Segurança e validação (fonte da verdade)
- **Híbrido**: Melhor dos dois mundos

> "Nunca confie no cliente. Sempre valide no servidor."
> — Todo desenvolvedor de segurança

---

**Arquivo**: `/docs/SECURITY-ARCHITECTURE.md`  
**Versão**: 1.0  
**Data**: 2024-11-28
