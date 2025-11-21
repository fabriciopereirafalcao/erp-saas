# 💻 Exemplos de Código - Sistema de Convites

## 📚 Índice
1. [Convidar Usuário](#1-convidar-usuário)
2. [Listar Usuários](#2-listar-usuários)
3. [Aceitar Convite](#3-aceitar-convite)
4. [Alterar Role](#4-alterar-role)
5. [Excluir Usuário](#5-excluir-usuário)
6. [Componente Customizado](#6-componente-customizado)

---

## 1. Convidar Usuário

### **Usando o componente InviteUserDialog**

```tsx
import { useState } from 'react';
import { InviteUserDialog } from './components/InviteUserDialog';
import { Button } from './components/ui/button';

function MyComponent() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <Button onClick={() => setShowInvite(true)}>
        Convidar Usuário
      </Button>

      <InviteUserDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        onSuccess={() => {
          console.log('Convite criado com sucesso!');
          // Recarregar lista de usuários, etc
        }}
      />
    </>
  );
}
```

### **Usando a função diretamente**

```typescript
import { inviteUser } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

async function sendInvite() {
  try {
    // Obter token de autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('Usuário não está logado');
      return;
    }

    // Enviar convite
    const invite = await inviteUser(
      session.access_token,
      'novousuario@email.com',
      'manager' // ou 'admin', 'user'
    );

    console.log('Convite criado!');
    console.log('Link:', invite.invite_link);
    console.log('Expira em:', invite.expires_at);

    // Copiar para clipboard
    navigator.clipboard.writeText(invite.invite_link);
    alert('Link copiado!');

  } catch (error) {
    console.error('Erro ao convidar:', error.message);
  }
}
```

---

## 2. Listar Usuários

### **Exemplo básico**

```typescript
import { useState, useEffect } from 'react';
import { listUsers, User } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('Não autorizado');
        return;
      }

      const usersList = await listUsers(session.access_token);
      setUsers(usersList);
      console.log(`${usersList.length} usuários encontrados`);

    } catch (error) {
      console.error('Erro ao listar:', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Usuários da Empresa ({users.length})</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email} ({user.role})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### **Com filtros e formatação**

```typescript
import { getRoleName, getRoleColor } from './utils/userManagement';

function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(filter.toLowerCase()) ||
    user.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar usuário..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Permissão</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span className={getRoleColor(user.role)}>
                  {getRoleName(user.role)}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 3. Aceitar Convite

### **Usando o componente AcceptInvite**

```tsx
import { AcceptInvite } from './components/AcceptInvite';

function App() {
  // No App.tsx, isso já está implementado automaticamente
  // quando há um token na URL
  
  return (
    <AcceptInvite 
      onSuccess={() => {
        // Redirecionar para login ou dashboard
        window.location.href = '/';
      }} 
    />
  );
}
```

### **Usando a função diretamente**

```typescript
import { acceptInvite } from './utils/userManagement';

async function handleAcceptInvite(token: string, name: string, password: string) {
  try {
    const result = await acceptInvite(token, name, password);

    console.log('Conta criada!');
    console.log('Usuário:', result.user);
    console.log('Email:', result.user.email);
    console.log('Role:', result.user.role);

    // Redirecionar para login
    window.location.href = '/login';

  } catch (error) {
    console.error('Erro ao aceitar convite:', error.message);
    
    // Tratar erros específicos
    if (error.message.includes('expirado')) {
      alert('Este convite expirou. Solicite um novo.');
    } else if (error.message.includes('já')) {
      alert('Este email já possui conta. Faça login.');
    } else {
      alert('Erro ao criar conta. Tente novamente.');
    }
  }
}

// Uso
handleAcceptInvite('token-da-url', 'João Silva', 'senha123');
```

### **Ler token da URL**

```typescript
function getTokenFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Uso
const token = getTokenFromURL();
if (token) {
  console.log('Token encontrado:', token);
} else {
  console.log('Nenhum token na URL');
}
```

---

## 4. Alterar Role

### **Exemplo básico**

```typescript
import { updateUserRole } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

async function changeUserRole(userId: string, newRole: 'admin' | 'manager' | 'user') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Não autorizado');
    }

    await updateUserRole(session.access_token, userId, newRole);
    
    console.log('Role atualizada com sucesso!');
    alert(`Usuário agora é ${newRole}`);

  } catch (error) {
    console.error('Erro ao alterar role:', error.message);
    
    if (error.message.includes('proprietário')) {
      alert('Apenas o proprietário pode alterar permissões');
    }
  }
}

// Uso
changeUserRole('user-id-123', 'admin');
```

### **Com dropdown de seleção**

```tsx
import { Select } from './components/ui/select';
import { updateUserRole } from './utils/userManagement';

function RoleSelector({ user }: { user: User }) {
  const [role, setRole] = useState(user.role);

  async function handleChangeRole(newRole: string) {
    const confirmed = confirm(`Alterar permissão para ${newRole}?`);
    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserRole(session.access_token, user.id, newRole);
      setRole(newRole);
      alert('Permissão atualizada!');
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  }

  return (
    <Select value={role} onValueChange={handleChangeRole}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">Usuário</SelectItem>
        <SelectItem value="manager">Gerente</SelectItem>
        <SelectItem value="admin">Administrador</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

## 5. Excluir Usuário

### **Exemplo básico**

```typescript
import { deleteUser } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

async function removeUser(userId: string, userName: string) {
  const confirmed = confirm(`Tem certeza que deseja excluir ${userName}?`);
  if (!confirmed) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Não autorizado');
    }

    await deleteUser(session.access_token, userId);
    
    console.log('Usuário excluído com sucesso');
    alert(`${userName} foi removido`);

    // Recarregar lista de usuários
    window.location.reload();

  } catch (error) {
    console.error('Erro ao excluir:', error.message);
    
    if (error.message.includes('proprietário')) {
      alert('Apenas o proprietário pode excluir usuários');
    } else if (error.message.includes('si mesmo')) {
      alert('Você não pode excluir sua própria conta');
    }
  }
}

// Uso
removeUser('user-id-123', 'João Silva');
```

### **Com botão de confirmação dupla**

```tsx
import { useState } from 'react';
import { Button } from './components/ui/button';
import { Trash2 } from 'lucide-react';

function DeleteUserButton({ userId, userName }: { userId: string, userName: string }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await deleteUser(session.access_token, userId);
      alert('Usuário excluído!');
      window.location.reload();
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  }

  return (
    <Button
      onClick={handleDelete}
      variant={confirming ? 'destructive' : 'ghost'}
      size="sm"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {confirming ? 'Confirmar?' : 'Excluir'}
    </Button>
  );
}
```

---

## 6. Componente Customizado

### **Modal de convite personalizado**

```tsx
import { useState } from 'react';
import { Dialog } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { inviteUser } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

function CustomInviteModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleInvite() {
    if (!email) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const invite = await inviteUser(session.access_token, email, role);
      
      setInviteLink(invite.invite_link);
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Link copiado!');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {!inviteLink ? (
        <div className="p-6">
          <h2>Convidar Usuário</h2>
          
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <select value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="user">Usuário</option>
            <option value="manager">Gerente</option>
            <option value="admin">Admin</option>
          </select>

          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Enviando...' : 'Criar Convite'}
          </Button>
        </div>
      ) : (
        <div className="p-6">
          <h2>Convite Criado!</h2>
          <p>Email: {email}</p>
          <Input value={inviteLink} readOnly />
          <Button onClick={copyLink}>Copiar Link</Button>
        </div>
      )}
    </Dialog>
  );
}
```

### **Hook customizado para gerenciar usuários**

```typescript
import { useState, useEffect } from 'react';
import { listUsers, inviteUser, User } from './utils/userManagement';
import { supabase } from './utils/supabase/client';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const usersList = await listUsers(session.access_token);
      setUsers(usersList);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function invite(email: string, role: 'admin' | 'manager' | 'user') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const result = await inviteUser(session.access_token, email, role);
      await loadUsers(); // Recarregar lista
      return result;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    reload: loadUsers,
    invite,
  };
}

// Uso do hook
function MyComponent() {
  const { users, loading, error, invite } = useUsers();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <p>{users.length} usuários</p>
      <button onClick={() => invite('novo@email.com', 'manager')}>
        Convidar
      </button>
    </div>
  );
}
```

---

## 🎯 Dicas de Boas Práticas

### 1. **Sempre validar autenticação**
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  console.error('Usuário não autenticado');
  return;
}
```

### 2. **Tratar erros específicos**
```typescript
try {
  // código
} catch (error: any) {
  if (error.message.includes('expirado')) {
    // Convite expirado
  } else if (error.message.includes('já')) {
    // Email duplicado
  } else {
    // Erro genérico
  }
}
```

### 3. **Usar feedback visual**
```typescript
// Toast de sucesso
toast.success('Convite criado!');

// Toast de erro
toast.error('Erro ao convidar', {
  description: error.message
});
```

### 4. **Copiar links automaticamente**
```typescript
navigator.clipboard.writeText(inviteLink);
toast.success('Link copiado para clipboard!');
```

### 5. **Recarregar dados após mudanças**
```typescript
async function afterDelete() {
  await loadUsers(); // Recarregar lista
  toast.success('Usuário excluído');
}
```

---

## 📚 Recursos Adicionais

- **Documentação completa**: `/docs/USER_PERMISSIONS_SYSTEM.md`
- **Guia de testes**: `/docs/TESTING_GUIDE.md`
- **API reference**: `/utils/userManagement.ts`

---

**Happy Coding!** 🚀
