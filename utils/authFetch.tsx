/**
 * Utilitário para fazer requisições autenticadas com tratamento automático de erro 401
 */

import { supabase } from './supabase/client';
import { toast } from 'sonner';

/**
 * Logout e limpeza de sessão
 */
export const handleUnauthorized = async () => {
  // Verificar se realmente há uma sessão ativa antes de fazer logout
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Se não há sessão, não precisa fazer logout nem mostrar toast
    console.log('⚠️ Tentativa de acesso sem autenticação');
    return;
  }
  
  console.warn('🚨 Erro 401 detectado - Fazendo logout...');
  
  // IMPORTANTE: NÃO limpar localStorage completo (dados do ERP estão lá)
  // Apenas limpar tokens de autenticação
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('token') ||
      key.includes('session')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Limpar sessionStorage (não tem dados críticos)
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
      // Não mostrar erro nem fazer logout se não há token (usuário não logado)
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
    
    // Verificar se recebeu erro 500
    if (response.status === 500) {
      console.error('❌ Erro 500 recebido na requisição:', url);
      
      // Tentar obter mensagem de erro do backend
      let errorMessage = 'Ocorreu um erro no servidor. Por favor, tente novamente.';
      try {
        const errorData = await response.clone().json();
        if (errorData.error) {
          // Usar mensagem do backend, mas sem expor detalhes técnicos
          errorMessage = errorData.error.includes('Erro interno:') 
            ? 'Ocorreu um erro no servidor. Por favor, tente novamente.'
            : errorData.error;
        }
      } catch {
        // Se não conseguir parsear JSON, usar mensagem padrão
      }
      
      // Mostrar toast com erro amigável
      toast.error('Erro no servidor', {
        description: errorMessage,
        duration: 5000,
      });
      
      throw new Error(errorMessage);
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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      // Se não conseguir parsear JSON, pode ser HTML (erro 404, 500, etc)
      const text = await response.text();
      console.error('❌ Erro ao parsear resposta:', text.substring(0, 200));
      throw new Error(`Erro ${response.status}: Resposta inválida do servidor`);
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  try {
    return await response.json();
  } catch (parseError) {
    console.error('❌ Erro ao parsear resposta JSON:', parseError);
    throw new Error('Resposta inválida do servidor');
  }
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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.error('❌ Erro ao parsear resposta:', text.substring(0, 200));
      throw new Error(`Erro ${response.status}: Resposta inválida do servidor`);
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  try {
    return await response.json();
  } catch (parseError) {
    console.error('❌ Erro ao parsear resposta JSON:', parseError);
    throw new Error('Resposta inválida do servidor');
  }
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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.error('❌ Erro ao parsear resposta:', text.substring(0, 200));
      throw new Error(`Erro ${response.status}: Resposta inválida do servidor`);
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  try {
    return await response.json();
  } catch (parseError) {
    console.error('❌ Erro ao parsear resposta JSON:', parseError);
    throw new Error('Resposta inválida do servidor');
  }
};

/**
 * Helper para fazer requisições DELETE autenticadas
 */
export const authDelete = async (url: string): Promise<any> => {
  const response = await authFetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.error('❌ Erro ao parsear resposta:', text.substring(0, 200));
      throw new Error(`Erro ${response.status}: Resposta inválida do servidor`);
    }
    throw new Error(errorData.error || `Erro ${response.status}`);
  }
  
  try {
    return await response.json();
  } catch (parseError) {
    console.error('❌ Erro ao parsear resposta JSON:', parseError);
    throw new Error('Resposta inválida do servidor');
  }
};
