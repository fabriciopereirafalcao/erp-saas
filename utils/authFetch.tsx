/**
 * Utilitário para fazer requisições autenticadas com tratamento automático de erro 401
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';
import { toast } from 'sonner';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Logout e limpeza de sessão
 */
export const handleUnauthorized = async () => {
  console.warn('🚨 Erro 401 detectado - Fazendo logout...');
  
  // Limpar localStorage e sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Fazer logout no Supabase
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Erro ao fazer signOut:', error);
  }
  
  // Mostrar toast informativo
  toast.error('Sessão expirada', {
    description: 'Por favor, faça login novamente.',
    duration: 3000,
  });
  
  // Redirecionar para a página de login após 1 segundo
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
};

/**
 * Verificar se o usuário está autenticado
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  } catch {
    return false;
  }
};

/**
 * Obter o token de acesso atual
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
};

/**
 * Fetch autenticado com tratamento automático de erro 401
 * 
 * @param url - URL da requisição
 * @param options - Opções do fetch (método, body, headers adicionais, etc)
 * @returns Promise com a resposta
 */
export const authFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    // Obter token de acesso
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      console.error('❌ Token de acesso não encontrado');
      await handleUnauthorized();
      throw new Error('Não autenticado');
    }
    
    // Fazer requisição com o token
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Verificar se recebeu erro 401
    if (response.status === 401) {
      console.error('❌ Erro 401 recebido na requisição:', url);
      await handleUnauthorized();
      throw new Error('Não autorizado');
    }
    
    return response;
    
  } catch (error: any) {
    // Se for erro de rede ou outro erro, propagar
    if (error.message !== 'Não autorizado' && error.message !== 'Não autenticado') {
      console.error('❌ Erro na requisição autenticada:', error);
    }
    throw error;
  }
};

/**
 * Helper para fazer requisições GET autenticadas
 */
export const authGet = async (url: string): Promise<any> => {
  const response = await authFetch(url, { method: 'GET' });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};

/**
 * Helper para fazer requisições POST autenticadas
 */
export const authPost = async (url: string, body: any): Promise<any> => {
  const response = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};

/**
 * Helper para fazer requisições PATCH autenticadas
 */
export const authPatch = async (url: string, body: any): Promise<any> => {
  const response = await authFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};

/**
 * Helper para fazer requisições DELETE autenticadas
 */
export const authDelete = async (url: string): Promise<any> => {
  const response = await authFetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  return response.json();
};
