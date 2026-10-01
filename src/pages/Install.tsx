import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Smartphone, 
  Download, 
  Share, 
  MoreVertical, 
  Plus, 
  CheckCircle2,
  Truck,
  Wifi,
  Zap,
  Shield,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Wifi,
      title: "Funciona Offline",
      description: "Accede a la información incluso sin conexión a internet"
    },
    {
      icon: Zap,
      title: "Acceso Rápido",
      description: "Inicia la app directamente desde tu pantalla de inicio"
    },
    {
      icon: Shield,
      title: "Datos Seguros",
      description: "Toda tu información está protegida y sincronizada"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Calamina Sur</h1>
            <p className="text-xs text-muted-foreground">Gestión de Obras</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Main Card */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">
              {isInstalled ? "¡App Instalada!" : "Instalar Aplicación"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isInstalled 
                ? "Ya puedes acceder desde tu pantalla de inicio"
                : "Instala la app en tu dispositivo para una mejor experiencia"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">
                  La aplicación está instalada correctamente. Cierra el navegador y ábrela desde tu pantalla de inicio.
                </p>
                <Link to="/">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Ir al Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : deferredPrompt ? (
              <Button 
                onClick={handleInstall} 
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base"
              >
                <Download className="w-5 h-5 mr-2" />
                Instalar Ahora
              </Button>
            ) : (
              <div className="space-y-4">
                {isIOS ? (
                  /* iOS Instructions */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Sigue estos pasos para instalar la app en tu iPhone o iPad:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Toca el botón Compartir</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Share className="w-4 h-4" /> en la barra de Safari
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Desplázate y selecciona</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Plus className="w-4 h-4" /> "Añadir a pantalla de inicio"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Confirma tocando "Añadir"</p>
                          <p className="text-sm text-muted-foreground">
                            ¡Listo! La app aparecerá en tu inicio
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Android/Desktop Instructions */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Sigue estos pasos para instalar la app:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Abre el menú del navegador</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MoreVertical className="w-4 h-4" /> (tres puntos verticales)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Selecciona "Instalar app"</p>
                          <p className="text-sm text-muted-foreground">
                            o "Añadir a pantalla de inicio"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Confirma la instalación</p>
                          <p className="text-sm text-muted-foreground">
                            ¡Listo! La app aparecerá en tu inicio
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold text-foreground">Ventajas de la App</h2>
          {features.map((feature, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skip link */}
        <div className="text-center pt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Continuar en el navegador →
          </Link>
        </div>
      </main>
    </div>
  );
}