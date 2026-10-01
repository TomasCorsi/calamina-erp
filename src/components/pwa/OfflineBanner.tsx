import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { pendingCount, syncPendingPartes, isSyncing } = useOfflineQueue();
  const queryClient = useQueryClient();
  const [syncedCount, setSyncedCount] = useState(0);
  const [showSynced, setShowSynced] = useState(false);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && pendingCount > 0) {
      syncPendingPartes().then((count) => {
        if (count > 0) {
          setSyncedCount(count);
          setShowSynced(true);
          // Invalidate queries so the UI refreshes with new data
          queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
          queryClient.invalidateQueries({ queryKey: ['parte_hoy'] });
          toast.success(`${count} parte${count > 1 ? 's' : ''} sincronizado${count > 1 ? 's' : ''} correctamente ✓`);
          setTimeout(() => setShowSynced(false), 4000);
        }
      });
    }
  }, [wasOffline, isOnline, pendingCount, syncPendingPartes, queryClient]);

  // Don't render anything when online and nothing to show
  if (isOnline && !isSyncing && !showSynced) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-300"
      style={{
        background: isOnline
          ? showSynced
            ? 'hsl(var(--primary))'
            : 'hsl(var(--primary))'
          : 'hsl(var(--destructive))',
        color: 'hsl(var(--primary-foreground))',
      }}
    >
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Sin conexión
            {pendingCount > 0
              ? ` — ${pendingCount} parte${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de sincronización`
              : ' — Los partes se guardarán localmente'}
          </span>
        </>
      )}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
          <span>Sincronizando partes pendientes...</span>
        </>
      )}
      {isOnline && showSynced && !isSyncing && (
        <>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncedCount} parte{syncedCount > 1 ? 's' : ''} sincronizado{syncedCount > 1 ? 's' : ''} ✓</span>
        </>
      )}
    </div>
  );
}
