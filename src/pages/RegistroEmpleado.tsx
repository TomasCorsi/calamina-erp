import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoFull from '@/assets/logo-full.png';
import authBackground from '@/assets/auth-background.webp';
import InstallAppBanner from '@/components/auth/InstallAppBanner';

const RegistroEmpleado = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    legajo: "",
    email: "",
    telefono: "",
    password: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Validar disponibilidad sin exponer datos de personal
      const { data: legajoDisponible, error: searchError } = await supabase
        .rpc('is_personal_legajo_available', {
          p_legajo: formData.legajo.trim(),
        });

      if (searchError) throw searchError;

      if (!legajoDisponible) {
        setError("Legajo no válido o no disponible. Contacte al administrador.");
        setLoading(false);
        return;
      }

      // 2. Crear usuario en auth.users
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            nombre_completo: formData.nombreCompleto.trim(),
            legajo: formData.legajo.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError("Este email ya está registrado. Use 'Iniciar Sesión'.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Error al crear la cuenta. Intente nuevamente.");
        setLoading(false);
        return;
      }

      // 3. Vincular usando la función segura RPC
      const { data: linkResult, error: linkError } = await supabase
        .rpc('link_personal_to_user', {
          p_legajo: formData.legajo.trim(),
          p_user_id: authData.user.id
        });

      const linkedPersonalRole = linkResult?.[0]?.success ? linkResult[0].rol : null;

      if (linkError) {
        console.error('Error linking user to personal:', linkError);
        // No falla el registro, el admin puede vincular manualmente
      } else if (linkResult && linkResult.length > 0 && !linkResult[0].success) {
        console.error('Link failed:', linkResult[0].error_message);
      }

      // 4. Asignar rol en user_roles según el rol del personal
      // El rol proviene de la RPC autenticada de vinculación, no del lookup público.
      if (linkedPersonalRole) {
        const appRole = mapPersonalRolToAppRole(linkedPersonalRole);

        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: authData.user.id,
            role: appRole,
          }, {
            onConflict: 'user_id',
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          // No falla el registro
        }
      }

      setSuccess(true);
      toast.success('Cuenta creada exitosamente');
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError('Error al registrar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Mapear rol de personal a app_role
  const mapPersonalRolToAppRole = (rolPersonal: string): 'admin' | 'capataz' | 'maquinista' | 'ayudante' => {
    switch (rolPersonal) {
      case 'capataz':
        return 'capataz';
      case 'administrativo':
        return 'admin';
      case 'ayudante':
        return 'ayudante';
      default:
        // maquinista, chofer, mecanico, sereno, topografo -> maquinista
        return 'maquinista';
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">¡Registro Exitoso!</h2>
            <p className="text-muted-foreground">
              Tu cuenta ha sido creada. Redirigiendo al inicio de sesión...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Mobile-only blurred background */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${authBackground})` }}
      >
        <div className="absolute inset-0 backdrop-blur-sm bg-background/70" />
      </div>
      
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logoFull} alt="Calamina Sur" className="h-20 w-auto" width={80} height={80} fetchPriority="high" />
          </div>
          <div>
            <CardTitle className="text-2xl">Registro de Empleado</CardTitle>
            <CardDescription className="mt-2">
              Ingrese su legajo para crear su cuenta
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombreCompleto" className="text-base">
                Nombre Completo
              </Label>
              <Input
                id="nombreCompleto"
                type="text"
                placeholder="Juan Pérez"
                value={formData.nombreCompleto}
                onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                className="h-14 text-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legajo" className="text-base">
                Legajo
              </Label>
              <Input
                id="legajo"
                type="text"
                placeholder="Ej: 12345"
                value={formData.legajo}
                onChange={(e) => handleChange('legajo', e.target.value)}
                className="h-14 text-lg"
                required
              />
              <p className="text-xs text-muted-foreground">
                Debe coincidir con el legajo registrado por el administrador
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="h-14 text-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-base">
                Teléfono
              </Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="Ej: 11-1234-5678"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="h-14 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="h-14 text-lg pr-12"
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? "Registrando..." : "Registrarme"}
            </Button>

            <div className="text-center">
              <span className="text-muted-foreground">¿Ya tiene cuenta? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Iniciar Sesión
              </Link>
            </div>
          </form>
          <InstallAppBanner />
        </CardContent>
      </Card>
    </main>
  );
};

export default RegistroEmpleado;
