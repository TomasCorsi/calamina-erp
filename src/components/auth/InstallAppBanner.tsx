import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, ArrowRight } from 'lucide-react';

const InstallAppBanner = () => {
  const [isPWA, setIsPWA] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    // Check if app is running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsPWA(isStandalone || isIOSStandalone);
  }, []);

  // Don't show banner if already installed as PWA
  if (isPWA) return null;

  return (
    <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            Instala la app en tu celular
          </p>
          <p className="text-xs text-muted-foreground">
            Acceso rápido desde tu pantalla de inicio
          </p>
          <Link 
            to="/install" 
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium mt-2"
          >
            Cómo instalar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InstallAppBanner;
