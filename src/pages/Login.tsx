import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import logoFull from '@/assets/logo-full.png';
import authBackground from '@/assets/auth-background.webp';
import InstallAppBanner from '@/components/auth/InstallAppBanner';

export default function Login() {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      // Error handled in signIn
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative overflow-hidden">
      {/* Mobile-only blurred background */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${authBackground})` }}
      >
        <div className="absolute inset-0 backdrop-blur-sm bg-background/70" />
      </div>
      
      <Card className="w-full max-w-md shadow-xl border-border/50 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logoFull} alt="Calamina Sur" className="h-20 w-auto" width={80} height={80} fetchPriority="high" />
          </div>
          <div>
            <CardDescription className="text-muted-foreground">
              Ingresa tus credenciales para acceder
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link to="/olvide-contrasena" className="text-sm text-red-600 hover:underline hover:text-red-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Iniciar Sesión
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              ¿Recibiste una invitación?{' '}
              <Link to="/aceptar-invitacion" className="text-primary hover:underline font-medium">
                Activar cuenta
              </Link>
            </p>
          </CardFooter>
        </form>
        <InstallAppBanner />
      </Card>
    </main>
  );
}
