import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, Home } from 'lucide-react';

export default function NoAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
            <CardDescription className="text-muted-foreground">
              No tienes permisos para acceder a esta sección
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Si crees que deberías tener acceso, contacta al administrador del sistema.
          </p>
          <Button asChild className="w-full">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
