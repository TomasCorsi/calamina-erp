import { useEffect, useRef } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { hasAnyParteDiarioDraft } from '@/hooks/useFormDraftPersistence';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Wifi } from 'lucide-react';

export function UpdatePrompt() {
  const {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
    dismissOfflineReady,
  } = useServiceWorker();

  // Si hay borrador del parte diario, NO auto-actualizamos (mostramos banner).
  const hasDraft = needRefresh ? hasAnyParteDiarioDraft() : false;

  // Auto-actualización silenciosa cuando no hay borrador en curso.
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (!needRefresh || hasDraft || triggeredRef.current) return;
    triggeredRef.current = true;

    // Esperar un momento de inactividad (cambio de visibilidad o pequeño delay)
    // para no interrumpir un toque en curso.
    const apply = () => updateServiceWorker();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        apply();
      }
    };

    // Aplicar tras 2s si la pestaña está visible y el usuario no está escribiendo
    const timer = window.setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable);
      if (!isTyping) apply();
      else document.addEventListener('visibilitychange', onVisible, { once: true });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [needRefresh, hasDraft, updateServiceWorker]);

  if (needRefresh && hasDraft) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                Nueva versión disponible
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tenés un parte diario sin guardar. Guardalo y luego actualizá para obtener las últimas mejoras.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={updateServiceWorker}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar ahora
                </Button>
                <Button
                  onClick={dismissUpdate}
                  variant="ghost"
                  size="sm"
                >
                  Más tarde
                </Button>
              </div>
            </div>
            <button
              onClick={dismissUpdate}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-green-500/10 rounded-full">
              <Wifi className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                App lista para uso offline
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                La aplicación está instalada y disponible sin conexión a internet.
              </p>
            </div>
            <button
              onClick={dismissOfflineReady}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
