
-- Enums
CREATE TYPE public.liquidacion_modalidad AS ENUM ('mensual', 'quincenal', 'ambas');
CREATE TYPE public.liquidacion_periodo AS ENUM ('quincena_1', 'quincena_2', 'mes');
CREATE TYPE public.liquidacion_estado AS ENUM ('borrador', 'cerrada', 'pagada');
CREATE TYPE public.adelanto_estado AS ENUM ('pendiente', 'aplicado', 'cancelado');
CREATE TYPE public.prestamo_estado AS ENUM ('activo', 'saldado', 'cancelado');
CREATE TYPE public.cuota_estado AS ENUM ('pendiente', 'aplicada');

-- 1) liquidacion_config_personal
CREATE TABLE public.liquidacion_config_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL UNIQUE REFERENCES public.personal(id) ON DELETE CASCADE,
  modalidad public.liquidacion_modalidad NOT NULL DEFAULT 'mensual',
  sueldo_blanco numeric NOT NULL DEFAULT 0,
  sueldo_negro numeric NOT NULL DEFAULT 0,
  monto_banco_fijo numeric NOT NULL DEFAULT 0,
  resto_efectivo boolean NOT NULL DEFAULT true,
  presentismo_monto numeric NOT NULL DEFAULT 0,
  presentismo_porcentaje numeric NOT NULL DEFAULT 0,
  embargo boolean NOT NULL DEFAULT false,
  embargo_nota text,
  cbu text,
  banco text,
  numero_cuenta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidacion_config_personal TO authenticated;
GRANT ALL ON public.liquidacion_config_personal TO service_role;
ALTER TABLE public.liquidacion_config_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_liq_config" ON public.liquidacion_config_personal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_liq_config BEFORE UPDATE ON public.liquidacion_config_personal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) liquidaciones
CREATE TABLE public.liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo public.liquidacion_periodo NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio integer NOT NULL CHECK (anio BETWEEN 2020 AND 2100),
  estado public.liquidacion_estado NOT NULL DEFAULT 'borrador',
  fecha_pago date,
  total_blanco numeric NOT NULL DEFAULT 0,
  total_negro numeric NOT NULL DEFAULT 0,
  total_banco numeric NOT NULL DEFAULT 0,
  total_efectivo numeric NOT NULL DEFAULT 0,
  total_neto numeric NOT NULL DEFAULT 0,
  observaciones text,
  cerrada_at timestamptz,
  pagada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo, mes, anio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidaciones TO authenticated;
GRANT ALL ON public.liquidaciones TO service_role;
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_liquidaciones" ON public.liquidaciones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_liquidaciones BEFORE UPDATE ON public.liquidaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) liquidacion_items
CREATE TABLE public.liquidacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE RESTRICT,
  bruto_blanco numeric NOT NULL DEFAULT 0,
  bruto_negro numeric NOT NULL DEFAULT 0,
  dias_falta numeric NOT NULL DEFAULT 0,
  dias_licencia numeric NOT NULL DEFAULT 0,
  horas_extras_50 numeric NOT NULL DEFAULT 0,
  horas_extras_100 numeric NOT NULL DEFAULT 0,
  importe_he numeric NOT NULL DEFAULT 0,
  presentismo numeric NOT NULL DEFAULT 0,
  adelantos numeric NOT NULL DEFAULT 0,
  cuota_prestamo numeric NOT NULL DEFAULT 0,
  otros_descuentos numeric NOT NULL DEFAULT 0,
  otros_adicionales numeric NOT NULL DEFAULT 0,
  neto_blanco numeric NOT NULL DEFAULT 0,
  neto_negro numeric NOT NULL DEFAULT 0,
  neto_total numeric NOT NULL DEFAULT 0,
  monto_banco numeric NOT NULL DEFAULT 0,
  monto_efectivo numeric NOT NULL DEFAULT 0,
  embargo boolean NOT NULL DEFAULT false,
  cbu_snapshot text,
  banco_snapshot text,
  numero_cuenta_snapshot text,
  pagado boolean NOT NULL DEFAULT false,
  pagado_at timestamptz,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liquidacion_id, personal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidacion_items TO authenticated;
GRANT ALL ON public.liquidacion_items TO service_role;
ALTER TABLE public.liquidacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_liq_items" ON public.liquidacion_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_liq_items BEFORE UPDATE ON public.liquidacion_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_liq_items_liq ON public.liquidacion_items(liquidacion_id);
CREATE INDEX idx_liq_items_personal ON public.liquidacion_items(personal_id);

-- 4) adelantos_personal
CREATE TABLE public.adelantos_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto numeric NOT NULL CHECK (monto > 0),
  motivo text,
  estado public.adelanto_estado NOT NULL DEFAULT 'pendiente',
  liquidacion_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  aplicado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adelantos_personal TO authenticated;
GRANT ALL ON public.adelantos_personal TO service_role;
ALTER TABLE public.adelantos_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_adelantos" ON public.adelantos_personal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_adelantos BEFORE UPDATE ON public.adelantos_personal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_adelantos_personal ON public.adelantos_personal(personal_id, estado);

-- 5) prestamos_personal
CREATE TABLE public.prestamos_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto_total numeric NOT NULL CHECK (monto_total > 0),
  cantidad_cuotas integer NOT NULL CHECK (cantidad_cuotas > 0),
  monto_cuota numeric NOT NULL CHECK (monto_cuota > 0),
  motivo text,
  estado public.prestamo_estado NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestamos_personal TO authenticated;
GRANT ALL ON public.prestamos_personal TO service_role;
ALTER TABLE public.prestamos_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_prestamos" ON public.prestamos_personal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_prestamos BEFORE UPDATE ON public.prestamos_personal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prestamos_personal ON public.prestamos_personal(personal_id, estado);

-- 6) prestamo_cuotas
CREATE TABLE public.prestamo_cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL REFERENCES public.prestamos_personal(id) ON DELETE CASCADE,
  numero_cuota integer NOT NULL,
  monto numeric NOT NULL,
  estado public.cuota_estado NOT NULL DEFAULT 'pendiente',
  liquidacion_id uuid REFERENCES public.liquidaciones(id) ON DELETE SET NULL,
  aplicada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prestamo_id, numero_cuota)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestamo_cuotas TO authenticated;
GRANT ALL ON public.prestamo_cuotas TO service_role;
ALTER TABLE public.prestamo_cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_prestamo_cuotas" ON public.prestamo_cuotas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_upd_prestamo_cuotas BEFORE UPDATE ON public.prestamo_cuotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_prestamo_cuotas_prestamo ON public.prestamo_cuotas(prestamo_id, estado);
