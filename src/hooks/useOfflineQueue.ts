import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ParteDiarioInsert } from './useParteDiario';

const QUEUE_KEY = 'offline_partes_queue';

export interface OfflinePartePending {
  tempId: string;
  data: ParteDiarioInsert;
  enqueuedAt: number;
  attempts: number;
}

function loadQueue(): OfflinePartePending[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflinePartePending[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save offline queue:', e);
  }
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflinePartePending[]>(loadQueue);
  const [isSyncing, setIsSyncing] = useState(false);

  // Keep state in sync with localStorage
  const updateQueue = useCallback((updater: (q: OfflinePartePending[]) => OfflinePartePending[]) => {
    setQueue(prev => {
      const next = updater(prev);
      saveQueue(next);
      return next;
    });
  }, []);

  const enqueueOfflineParte = useCallback((data: ParteDiarioInsert) => {
    const item: OfflinePartePending = {
      tempId: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      data,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    updateQueue(q => [...q, item]);
    toast.success('Parte guardado localmente — se sincronizará cuando haya conexión', {
      duration: 5000,
    });
    return item.tempId;
  }, [updateQueue]);

  const syncPendingPartes = useCallback(async (): Promise<number> => {
    const current = loadQueue();
    if (current.length === 0) return 0;

    setIsSyncing(true);
    let synced = 0;
    const failed: OfflinePartePending[] = [];

    for (const item of current) {
      try {
        const { error } = await supabase
          .from('partes_diarios')
          .insert(item.data)
          .select()
          .single();

        if (error) throw error;
        synced++;
      } catch (e) {
        console.error('Failed to sync offline parte:', e);
        failed.push({ ...item, attempts: item.attempts + 1 });
      }
    }

    // Remove max-retried items (3+) to avoid infinite loop
    const retryable = failed.filter(f => f.attempts < 3);
    saveQueue(retryable);
    setQueue(retryable);
    setIsSyncing(false);

    return synced;
  }, []);

  // Listen for queue changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === QUEUE_KEY) {
        setQueue(loadQueue());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return {
    queue,
    pendingCount: queue.length,
    enqueueOfflineParte,
    syncPendingPartes,
    isSyncing,
  };
}
