import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, CheckCircle2 } from 'lucide-react';

interface SyncStatusProps {
  lastSyncTime?: Date;
  isSyncing?: boolean;
  hasError?: boolean;
}

/**
 * Componente visual que mostra status de sincronização com Supabase
 * Aparece discretamente no canto inferior direito
 */
export function SyncStatus({ lastSyncTime, isSyncing, hasError }: SyncStatusProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Mostrar temporariamente quando houver mudança
    if (isSyncing || hasError) {
      setShow(true);
      
      // Esconder após 3 segundos se não estiver mais sincronizando
      const timer = setTimeout(() => {
        if (!isSyncing) {
          setShow(false);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isSyncing, hasError]);

  // Não mostrar se não há atividade
  if (!show && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
        transition-all duration-300
        ${hasError 
          ? 'bg-red-500 text-white' 
          : isSyncing 
            ? 'bg-blue-500 text-white'
            : 'bg-green-500 text-white'
        }
      `}>
        {hasError ? (
          <>
            <CloudOff className="w-4 h-4" />
            <span className="text-sm">Erro ao sincronizar</span>
          </>
        ) : isSyncing ? (
          <>
            <Cloud className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Sincronizando...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Sincronizado</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Hook global para gerenciar status de sincronização
 */
export function useSyncStatusStore() {
  const [syncStatus, setSyncStatus] = useState<{
    isSyncing: boolean;
    hasError: boolean;
    lastSyncTime?: Date;
  }>({
    isSyncing: false,
    hasError: false,
  });

  const startSync = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true, hasError: false }));
  };

  const completeSync = () => {
    setSyncStatus({
      isSyncing: false,
      hasError: false,
      lastSyncTime: new Date(),
    });
  };

  const errorSync = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: false, hasError: true }));
  };

  return {
    syncStatus,
    startSync,
    completeSync,
    errorSync,
  };
}
