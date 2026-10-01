-- =============================================
-- CALAMINA SUR - FULL DATABASE SCHEMA
-- =============================================

-- =============================================
-- 1. CLIENTES
-- =============================================
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  razon_social TEXT,
  cuit TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  localidad TEXT NOT NULL,
  provincia TEXT NOT NULL,
  contacto_principal TEXT NOT NULL,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage clientes"
ON public.clientes FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view clientes"
ON public.clientes FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 2. PERSONAL
-- =============================================
CREATE TYPE public.rol_personal AS ENUM ('administrador', 'supervisor', 'capataz', 'maquinista', 'chofer', 'administrativo', 'auditor');

CREATE TABLE public.personal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  rol rol_personal NOT NULL,
  email TEXT,
  telefono TEXT NOT NULL,
  fecha_ingreso DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  licencia TEXT,
  vencimiento_licencia DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage personal"
ON public.personal FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view personal"
ON public.personal FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 3. MAQUINARIAS
-- =============================================
CREATE TYPE public.tipo_maquinaria AS ENUM ('excavadora', 'cargadora', 'camion_articulado', 'topadora', 'rodillo', 'retroexcavadora', 'motoniveladora');
CREATE TYPE public.estado_maquinaria AS ENUM ('operativa', 'mantenimiento', 'inactiva', 'en_uso');

CREATE TABLE public.maquinarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo tipo_maquinaria NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  patente TEXT,
  estado estado_maquinaria NOT NULL DEFAULT 'operativa',
  ubicacion_actual TEXT NOT NULL,
  horas_acumuladas NUMERIC(10,2) NOT NULL DEFAULT 0,
  proximo_service NUMERIC(10,2) NOT NULL,
  operador_asignado_id UUID REFERENCES public.personal(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maquinarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage maquinarias"
ON public.maquinarias FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view maquinarias"
ON public.maquinarias FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 4. OBRAS
-- =============================================
CREATE TYPE public.estado_obra AS ENUM ('activa', 'pendiente', 'finalizada', 'pausada');

CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  ubicacion TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estado estado_obra NOT NULL DEFAULT 'pendiente',
  fecha_inicio DATE NOT NULL,
  fecha_fin_estimada DATE,
  fecha_fin_real DATE,
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  responsable_id UUID REFERENCES public.personal(id),
  presupuesto NUMERIC(15,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage obras"
ON public.obras FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view obras"
ON public.obras FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 5. COTIZACIONES
-- =============================================
CREATE TYPE public.estado_cotizacion AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida');

CREATE TABLE public.cotizaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  descripcion TEXT NOT NULL,
  estado estado_cotizacion NOT NULL DEFAULT 'borrador',
  fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  responsable TEXT NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage cotizaciones"
ON public.cotizaciones FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

-- =============================================
-- 6. COTIZACION ITEMS
-- =============================================
CREATE TABLE public.cotizacion_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  precio_unitario NUMERIC(15,2) NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cotizacion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage cotizacion_items"
ON public.cotizacion_items FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

-- =============================================
-- 7. VIAJES
-- =============================================
CREATE TYPE public.estado_viaje AS ENUM ('programado', 'en_curso', 'completado', 'cancelado');

CREATE TABLE public.viajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  chofer_id UUID NOT NULL REFERENCES public.personal(id),
  camion_id UUID NOT NULL REFERENCES public.maquinarias(id),
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  material TEXT NOT NULL,
  volumen NUMERIC(10,2) NOT NULL,
  estado estado_viaje NOT NULL DEFAULT 'programado',
  hora_inicio TIME,
  hora_fin TIME,
  km_recorridos NUMERIC(10,2),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage viajes"
ON public.viajes FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view viajes"
ON public.viajes FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 8. REMITOS
-- =============================================
CREATE TABLE public.remitos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  viaje_id UUID REFERENCES public.viajes(id),
  fecha DATE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  material TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  unidad TEXT NOT NULL,
  recibido_por TEXT NOT NULL,
  firmado BOOLEAN NOT NULL DEFAULT false,
  evidencia_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage remitos"
ON public.remitos FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view remitos"
ON public.remitos FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 9. CARGAS DE COMBUSTIBLE
-- =============================================
CREATE TABLE public.cargas_combustible (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  maquinaria_id UUID NOT NULL REFERENCES public.maquinarias(id),
  litros NUMERIC(10,2) NOT NULL,
  precio_litro NUMERIC(10,2) NOT NULL,
  costo_total NUMERIC(15,2) NOT NULL,
  horas_maquina NUMERIC(10,2) NOT NULL,
  estacion TEXT NOT NULL,
  operador TEXT NOT NULL,
  comprobante TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cargas_combustible ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage cargas_combustible"
ON public.cargas_combustible FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view cargas_combustible"
ON public.cargas_combustible FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 10. MANTENIMIENTOS
-- =============================================
CREATE TYPE public.tipo_mantenimiento AS ENUM ('preventivo', 'correctivo', 'emergencia');
CREATE TYPE public.estado_mantenimiento AS ENUM ('programado', 'en_proceso', 'completado');

CREATE TABLE public.mantenimientos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  maquinaria_id UUID NOT NULL REFERENCES public.maquinarias(id),
  tipo tipo_mantenimiento NOT NULL,
  descripcion TEXT NOT NULL,
  repuestos TEXT,
  costo_repuestos NUMERIC(15,2) NOT NULL DEFAULT 0,
  costo_mano_obra NUMERIC(15,2) NOT NULL DEFAULT 0,
  costo_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  horas_maquina NUMERIC(10,2) NOT NULL,
  tecnico TEXT NOT NULL,
  estado estado_mantenimiento NOT NULL DEFAULT 'programado',
  proximo_mantenimiento DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage mantenimientos"
ON public.mantenimientos FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view mantenimientos"
ON public.mantenimientos FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 11. STOCK ITEMS
-- =============================================
CREATE TYPE public.categoria_stock AS ENUM ('material', 'repuesto', 'herramienta', 'consumible');

CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria categoria_stock NOT NULL,
  unidad TEXT NOT NULL,
  stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(10,2) NOT NULL,
  stock_maximo NUMERIC(10,2),
  ubicacion TEXT NOT NULL,
  precio_unitario NUMERIC(15,2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage stock_items"
ON public.stock_items FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view stock_items"
ON public.stock_items FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 12. MOVIMIENTOS DE STOCK
-- =============================================
CREATE TYPE public.tipo_movimiento_stock AS ENUM ('entrada', 'salida', 'ajuste');

CREATE TABLE public.movimientos_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES public.stock_items(id),
  tipo tipo_movimiento_stock NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL,
  stock_anterior NUMERIC(10,2) NOT NULL,
  stock_nuevo NUMERIC(10,2) NOT NULL,
  obra_id UUID REFERENCES public.obras(id),
  motivo TEXT NOT NULL,
  responsable_id UUID NOT NULL REFERENCES public.personal(id),
  comprobante TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage movimientos_stock"
ON public.movimientos_stock FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view movimientos_stock"
ON public.movimientos_stock FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 13. REGISTROS DE PRESENTISMO (HORAS HOMBRE)
-- =============================================
CREATE TYPE public.estado_presentismo AS ENUM ('presente', 'ausente', 'licencia', 'vacaciones', 'enfermedad');

CREATE TABLE public.registros_hh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  persona_id UUID NOT NULL REFERENCES public.personal(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  capataz_id UUID NOT NULL REFERENCES public.personal(id),
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  horas_normales NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_extra NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_totales NUMERIC(5,2) NOT NULL DEFAULT 0,
  tarea TEXT NOT NULL,
  estado estado_presentismo NOT NULL DEFAULT 'presente',
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_hh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage registros_hh"
ON public.registros_hh FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view registros_hh"
ON public.registros_hh FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- 14. HORAS MÁQUINA
-- =============================================
CREATE TABLE public.horas_maquina (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  maquinaria_id UUID NOT NULL REFERENCES public.maquinarias(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  operador_id UUID NOT NULL REFERENCES public.personal(id),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  horas_trabajadas NUMERIC(5,2) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.horas_maquina ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage horas_maquina"
ON public.horas_maquina FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view horas_maquina"
ON public.horas_maquina FOR SELECT
USING (public.has_role(auth.uid(), 'maquinista'));

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personal_updated_at BEFORE UPDATE ON public.personal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maquinarias_updated_at BEFORE UPDATE ON public.maquinarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cotizaciones_updated_at BEFORE UPDATE ON public.cotizaciones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_viajes_updated_at BEFORE UPDATE ON public.viajes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_remitos_updated_at BEFORE UPDATE ON public.remitos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cargas_combustible_updated_at BEFORE UPDATE ON public.cargas_combustible FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mantenimientos_updated_at BEFORE UPDATE ON public.mantenimientos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registros_hh_updated_at BEFORE UPDATE ON public.registros_hh FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_horas_maquina_updated_at BEFORE UPDATE ON public.horas_maquina FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();