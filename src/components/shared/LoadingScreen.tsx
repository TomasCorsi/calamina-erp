import logoFull from "@/assets/logo-full.png";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo with pulse animation */}
        <div className="animate-pulse">
          <img 
            src={logoFull} 
            alt="Calamina Sur - Movimientos de Suelo" 
            className="w-48 h-auto"
          />
        </div>
        
        {/* Loading bar */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-loading-bar" />
        </div>
        
        {/* Loading text */}
        <p className="text-sm text-muted-foreground animate-pulse">
          Cargando...
        </p>
      </div>
    </div>
  );
}
