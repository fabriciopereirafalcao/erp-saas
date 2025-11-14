import { projectId, publicAnonKey } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88`;

// Interface para os dados do usuário
export interface User {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: 'owner' | 'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer';
  created_at: string;
}

// Interface para convites
export interface Invite {
  email: string;
  role: 'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer';
  token: string;
  expires_at: string;
  invite_link: string;
  email_sent?: boolean; // Indica se o email foi enviado automaticamente
}

// Listar todos os usuários da empresa
export async function listUsers(accessToken: string): Promise<User[]> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar usuários');
  }

  const data = await response.json();
  return data.users;
}

// Convidar novo usuário
export async function inviteUser(
  accessToken: string,
  email: string,
  role: 'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer'
): Promise<Invite> {
  const response = await fetch(`${API_URL}/users/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao convidar usuário');
  }

  const data = await response.json();
  return data.invite;
}

// Aceitar convite
export async function acceptInvite(
  token: string,
  name: string,
  password: string
): Promise<{ success: boolean; user: User }> {
  const response = await fetch(`${API_URL}/users/accept-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, name, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aceitar convite');
  }

  return await response.json();
}

// Excluir usuário (apenas owner)
export async function deleteUser(
  accessToken: string,
  userId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao excluir usuário');
  }
}

// Alterar role de usuário (apenas owner)
export async function updateUserRole(
  accessToken: string,
  userId: string,
  role: 'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer'
): Promise<void> {
  const response = await fetch(`${API_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar role');
  }
}

// Mapear nome amigável das roles
export function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    'owner': 'Proprietário',
    'admin': 'Administrador',
    'manager': 'Gerente',
    'salesperson': 'Vendedor',
    'buyer': 'Comprador',
    'financial': 'Financeiro',
    'viewer': 'Visualizador',
  };
  return roleNames[role] || role;
}

// Mapear cor do badge da role
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    'owner': 'bg-purple-100 text-purple-700 border-purple-200',
    'admin': 'bg-blue-100 text-blue-700 border-blue-200',
    'manager': 'bg-green-100 text-green-700 border-green-200',
    'salesperson': 'bg-red-100 text-red-700 border-red-200',
    'buyer': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'financial': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'viewer': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return roleColors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
}