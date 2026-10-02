import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Bell,
  Shield,
  Database,
  Globe,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { UserManagement } from "@/components/configuracion/UserManagement";

export default function Configuracion() {
  const [settings, setSettings] = useState({
    empresa: "Calamina Sur",
    cuit: "30-12345678-9",
    direccion: "Av. Roca 500, Trelew, Chubut",
    telefono: "0280-4421234",
    email: "admin@calaminasur.com",
    moneda: "ARS",
    zona_horaria: "America/Argentina/Buenos_Aires",
    notificaciones_email: true,
    notificaciones_push: false,
    alertas_mantenimiento: true,
    alertas_combustible: true,
    backup_automatico: true,
    autenticacion_2fa: false,
  });

  const handleSave = () => {
    toast.success("Configuración guardada correctamente");
  };

  return (
    <MainLayout title="Configuración" subtitle="Ajustes del sistema">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos de la Empresa */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Datos de la Empresa
            </CardTitle>
            <CardDescription>Información general de la empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empresa">Nombre de la Empresa</Label>
              <Input
                id="empresa"
                value={settings.empresa}
                onChange={(e) => setSettings({ ...settings, empresa: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={settings.cuit}
                onChange={(e) => setSettings({ ...settings, cuit: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={settings.direccion}
                onChange={(e) => setSettings({ ...settings, direccion: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={settings.telefono}
                  onChange={(e) => setSettings({ ...settings, telefono: e.target.value })}
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="bg-muted border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferencias Regionales */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Preferencias Regionales
            </CardTitle>
            <CardDescription>Configuración de idioma y zona horaria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select
                value={settings.moneda}
                onValueChange={(value) => setSettings({ ...settings, moneda: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                  <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zona_horaria">Zona Horaria</Label>
              <Select
                value={settings.zona_horaria}
                onValueChange={(value) => setSettings({ ...settings, zona_horaria: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</SelectItem>
                  <SelectItem value="America/Santiago">Chile (GMT-4)</SelectItem>
                  <SelectItem value="America/Montevideo">Uruguay (GMT-3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificaciones
            </CardTitle>
            <CardDescription>Configura cómo recibirás las alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Notificaciones por Email</Label>
                <p className="text-sm text-muted-foreground">Recibir alertas en tu correo</p>
              </div>
              <Switch
                checked={settings.notificaciones_email}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notificaciones_email: checked })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Alertas de Mantenimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando se acerque un service
                </p>
              </div>
              <Switch
                checked={settings.alertas_mantenimiento}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, alertas_mantenimiento: checked })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Alertas de Combustible</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar consumos inusuales
                </p>
              </div>
              <Switch
                checked={settings.alertas_combustible}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, alertas_combustible: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Seguridad y Datos */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Seguridad y Datos
            </CardTitle>
            <CardDescription>Configuración de seguridad del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Autenticación en dos pasos</Label>
                <p className="text-sm text-muted-foreground">Mayor seguridad para tu cuenta</p>
              </div>
              <Switch
                checked={settings.autenticacion_2fa}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autenticacion_2fa: checked })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Respaldo diario de la base de datos
                </p>
              </div>
              <Switch
                checked={settings.backup_automatico}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, backup_automatico: checked })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                disabled
                title="El backup se habilitará cuando exista una implementación v2 segura"
              >
                <Database className="w-4 h-4 mr-2" />
                Exportar Datos (pendiente de adaptación)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <UserManagement />
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>
    </MainLayout>
  );
}
