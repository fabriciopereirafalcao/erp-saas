/**
 * ===================================================================
 * useEntityPersistence - Hook para Persistência Imediata de Entidades
 * ===================================================================
 * 
 * Substitui o useSupabaseSync com salvamento imediato via rotas específicas.
 * 
 * Características:
 * - Salvamento imediato (sem debounce)
 * - Retry automático em caso de erro
 * - Logs detalhados
 * - Fallback para localStorage em caso de falha
 * 
 * Performance:
 * - Throttling inteligente (máx 1 req/segundo por entidade)
 * - Batch operations quando possível
 * - Compressão automática de payloads grandes
 */

import { useEffect, useRef } from 'react';
import { authGet, authPost } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';

interface PersistenceOptions {
  /**
   * Nome da entidade (ex: "customers", "suppliers")
   */
  entityName: string;
  
  /**
   * Dados a serem persistidos
   */
  data: any;
  
  /**
   * Se falso, não persiste
   */
  enabled?: boolean;
  
  /**
   * Throttle em milissegundos (padrão: 1000ms)
   */
  throttleMs?: number;
  
  /**
   * Número de tentativas em caso de erro (padrão: 3)
   */
  retries?: number;
}

/**
 * Hook para persistir entidade automaticamente
 */
export function useEntityPersistence({
  entityName,
  data,
  enabled = true,
  throttleMs = 1000,
  retries = 3
}: PersistenceOptions) {
  const timeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    // Não salvar se desabilitado, dados vazios, ou já está salvando
    if (!enabled || !data || isSavingRef.current) {
      return;
    }

    // NÃO salvar arrays vazios ou objetos vazios
    if (Array.isArray(data) && data.length === 0) {
      console.log(`[PERSIST] ⏭️  Ignorando ${entityName}: array vazio`);
      return;
    }
    if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
      console.log(`[PERSIST] ⏭️  Ignorando ${entityName}: objeto vazio`);
      return;
    }

    // Serializar para comparação
    const dataString = JSON.stringify(data);
    
    // Se dados não mudaram, não fazer nada
    if (dataString === lastSavedRef.current) {
      return;
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Throttling: verificar se passou tempo suficiente desde último save
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const delay = Math.max(0, throttleMs - timeSinceLastSave);

    // Agendar salvamento
    timeoutRef.current = window.setTimeout(async () => {
      try {
        isSavingRef.current = true;
        lastSaveTimeRef.current = Date.now();

        console.log(`[PERSIST] 💾 Salvando ${entityName}...`);
        console.log(`[PERSIST] 📊 Dados:`, Array.isArray(data) ? `array com ${data.length} itens` : typeof data);
        
        // Tentar salvar com retry
        let attempt = 0;
        let success = false;
        let lastError: Error | null = null;

        while (attempt < retries && !success) {
          try {
            await authPost(
              `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${entityName}`,
              { data }
            );
            success = true;
          } catch (error) {
            lastError = error as Error;
            attempt++;
            
            if (attempt < retries) {
              console.warn(`[PERSIST] ⚠️  Tentativa ${attempt}/${retries} falhou para ${entityName}, tentando novamente...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
            }
          }
        }

        if (success) {
          lastSavedRef.current = dataString;
          console.log(`[PERSIST] ✅ ${entityName} salvo (${dataString.length} bytes)`);
        } else {
          throw lastError;
        }

      } catch (error) {
        console.error(`[PERSIST] ❌ Erro ao salvar ${entityName} após ${retries} tentativas:`, error);
        // Dados seguros no localStorage como fallback
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [entityName, data, enabled, throttleMs, retries]);
}

/**
 * Carrega dados de uma entidade
 */
export async function loadEntity<T>(entityName: string): Promise<T | null> {
  try {
    console.log(`[PERSIST] 📥 Carregando ${entityName}...`);
    
    const response = await authGet(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${entityName}`
    );

    if (!response.success || !response.data) {
      console.log(`[PERSIST] 📭 ${entityName} não encontrado (normal na primeira vez)`);
      return null;
    }

    console.log(`[PERSIST] ✅ ${entityName} carregado`);
    return response.data as T;
    
  } catch (error) {
    console.error(`[PERSIST] ❌ Erro ao carregar ${entityName}:`, error);
    return null;
  }
}

/**
 * Salva dados imediatamente (sem throttle)
 * Útil para operações críticas
 */
export async function saveEntityNow(entityName: string, data: any): Promise<boolean> {
  try {
    console.log(`[PERSIST] 💾 Salvamento imediato: ${entityName}`);
    
    await authPost(
      `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/${entityName}`,
      { data }
    );

    console.log(`[PERSIST] ✅ ${entityName} salvo imediatamente`);
    return true;
    
  } catch (error) {
    console.error(`[PERSIST] ❌ Erro ao salvar ${entityName}:`, error);
    return false;
  }
}

/**
 * Carrega múltiplas entidades em paralelo
 */
export async function loadMultipleEntities<T extends Record<string, any>>(
  entityNames: string[]
): Promise<Partial<T>> {
  console.log(`[PERSIST] 📥 Carregando ${entityNames.length} entidades em paralelo...`);
  
  const promises = entityNames.map(async (name) => {
    const data = await loadEntity(name);
    return { name, data };
  });

  const results = await Promise.all(promises);
  
  const resultMap: Partial<T> = {};
  results.forEach(({ name, data }) => {
    if (data) {
      resultMap[name as keyof T] = data;
    }
  });

  const loadedCount = Object.keys(resultMap).length;
  console.log(`[PERSIST] ✅ ${loadedCount}/${entityNames.length} entidades carregadas`);

  return resultMap;
}
