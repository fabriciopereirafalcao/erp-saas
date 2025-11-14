/**
 * Utilitários para gerenciar estados de loading em operações assíncronas
 * MED-003: Feedback Insuficiente em Operações
 */

import { useState, useCallback } from "react";

export interface LoadingState {
  [key: string]: boolean;
}

/**
 * Hook para gerenciar múltiplos estados de loading
 * 
 * @example
 * const { loadingStates, setLoading, isLoading } = useLoadingStates();
 * 
 * const handleSave = async () => {
 *   setLoading('save', true);
 *   try {
 *     await saveData();
 *   } finally {
 *     setLoading('save', false);
 *   }
 * };
 */
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(val => val === true);
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading
  };
}

/**
 * Wrapper para operações assíncronas com loading automático
 * 
 * @example
 * const execute = useAsyncOperation();
 * 
 * const handleClick = () => {
 *   execute('saveCustomer', async () => {
 *     await saveCustomer(data);
 *     toast.success('Cliente salvo!');
 *   });
 * };
 */
export function useAsyncOperation() {
  const { setLoading } = useLoadingStates();

  const execute = useCallback(async <T,>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      finally?: () => void;
    }
  ): Promise<T | undefined> => {
    setLoading(key, true);
    try {
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    } finally {
      setLoading(key, false);
      options?.finally?.();
    }
  }, [setLoading]);

  return execute;
}

/**
 * Componente de feedback de processamento
 */
export interface ProcessingFeedback {
  show: boolean;
  message: string;
  progress?: number;
}

export const createProcessingFeedback = (message: string, progress?: number): ProcessingFeedback => ({
  show: true,
  message,
  progress
});

export const hideProcessingFeedback = (): ProcessingFeedback => ({
  show: false,
  message: '',
  progress: undefined
});
