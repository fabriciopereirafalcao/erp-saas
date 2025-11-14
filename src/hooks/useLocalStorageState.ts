import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { saveToStorage, loadFromStorage } from '../utils/localStorage';

/**
 * Hook personalizado que sincroniza automaticamente o estado com localStorage
 * Similar ao useState, mas com persistência automática
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Carrega o valor inicial do localStorage ou usa o valor padrão
  const [storedValue, setStoredValue] = useState<T>(() => {
    return loadFromStorage(key, initialValue);
  });

  // Atualiza localStorage sempre que o valor mudar
  useEffect(() => {
    saveToStorage(key, storedValue);
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
