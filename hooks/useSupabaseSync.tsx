import { useEffect, useRef } from 'react';
import { authGet } from '../utils/authFetch';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Hook para sincronização automática com Supabase
 * 
 * Estratégia:
 * - Salva no Supabase com debounce de 2 segundos
 * - Evita loops infinitos usando comparação de referência
 * - Loga erros sem travar a aplicação
 * 
 * @param key - Chave única para identificar os dados (ex: "customers", "inventory")
 * @param data - Dados a serem sincronizados
 * @param enabled - Se false, não sincroniza (útil durante carregamento inicial)
 */
export function useSupabaseSync(
  key: string,
  data: any,
  enabled: boolean = true
) {
  const timeoutRef = useRef<number | null>(null);
  const lastSyncedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  useEffect(() => {
    // Não sincronizar se:
    // - Sincronização desabilitada
    // - Dados vazios/null/undefined
    // - Já está salvando
    if (!enabled || !data || isSavingRef.current) {
      return;
    }

    // Serializar dados para comparação
    const dataString = JSON.stringify(data);
    
    // Se dados não mudaram, não fazer nada
    if (dataString === lastSyncedRef.current) {
      return;
    }

    // Limpar timeout anterior (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar salvamento após 2 segundos
    timeoutRef.current = window.setTimeout(async () => {
      try {
        isSavingRef.current = true;
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${key}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ data }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao sincronizar');
        }

        const result = await response.json();
        
        // Atualizar referência de último sync bem-sucedido
        lastSyncedRef.current = dataString;
        
        console.log(`[SYNC] ✅ ${key} sincronizado (${dataString.length} bytes)`);
        
      } catch (error) {
        console.error(`[SYNC] ❌ Erro ao sincronizar ${key}:`, error);
        // Não mostrar toast para não incomodar o usuário
        // Os dados estão seguros no localStorage
      } finally {
        isSavingRef.current = false;
      }
    }, 2000);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, enabled]);
}

/**
 * Carrega dados do Supabase
 * 
 * @param key - Chave dos dados
 * @returns Dados carregados ou null
 */
export async function loadFromSupabase<T>(key: string): Promise<T | null> {
  try {
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${key}`
    );

    if (!response.success) {
      console.warn(`[SYNC] ⚠️ Dados não encontrados no Supabase: ${key}`);
      return null;
    }

    console.log(`[SYNC] 📥 Carregado do Supabase: ${key}`);
    return response.data as T;
    
  } catch (error) {
    console.error(`[SYNC] ❌ Erro ao carregar ${key}:`, error);
    return null;
  }
}

/**
 * Salva dados no Supabase imediatamente (sem debounce)
 * Útil para operações críticas como logout
 * 
 * @param key - Chave dos dados
 * @param data - Dados a salvar
 */
export async function saveToSupabaseNow(key: string, data: any): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ data }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao salvar');
    }

    console.log(`[SYNC] 💾 Salvo imediatamente: ${key}`);
    return true;
    
  } catch (error) {
    console.error(`[SYNC] ❌ Erro ao salvar ${key}:`, error);
    return false;
  }
}

/**
 * Remove dados do Supabase
 * 
 * @param key - Chave dos dados
 */
export async function deleteFromSupabase(key: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${key}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao deletar');
    }

    console.log(`[SYNC] 🗑️ Removido do Supabase: ${key}`);
    return true;
    
  } catch (error) {
    console.error(`[SYNC] ❌ Erro ao remover ${key}:`, error);
    return false;
  }
}
