-- Enums
DO $$ BEGIN
  CREATE TYPE public.rrhh_periodo_tipo AS ENUM ('quincena_1','quincena_2','mes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrhh_periodo_estado AS ENUM ('abierto','revision','cerrado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rrhh_novedad_tipo AS ENUM (
    'inasistencia','enfermedad','art','vacaciones','licencia','horas_extras',
    'feriado_trabajado','premio','adelanto','alta','baja','cambio_sueldo','otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columnas nuevas en personal (todas nullable)
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS fecha_alta date,
  ADD COLUMN IF NOT EXISTS fecha_baja date,
  ADD COLUMN IF NOT EXISTS puesto text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS estado_laboral text,
  ADD COLUMN IF NOT EXISTS observaciones text;

-- Periodos
CREATE TABLE IF NOT EXISTS public.rrhh_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.rrhh_periodo_tipo NOT NULL,
  mes integer NOT NULL,
  anio integer NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  estado public.rrhh_periodo_estado NOT NULL DEFAULT 'abierto',
  horas_normales numeric(10,2) NOT NULL DEFAULT 0,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, mes, anio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_periodos TO authenticated;
GRANT ALL ON public.rrhh_periodos TO service_role;
ALTER TABLE public.rrhh_periodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rrhh_periodos" ON public.rrhh_periodos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_upd_rrhh_periodos BEFORE UPDATE ON public.rrhh_periodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Novedades
CREATE TABLE IF NOT EXISTS public.rrhh_novedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid REFERENCES public.rrhh_periodos(id) ON DELETE SET NULL,
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  tipo public.rrhh_novedad_tipo NOT NULL,
  fecha date,
  fecha_desde date,
  fecha_hasta date,
  horas numeric(10,2),
  dias numeric(10,2),
  monto numeric(14,2),
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_novedades TO authenticated;
GRANT ALL ON public.rrhh_novedades TO service_role;
ALTER TABLE public.rrhh_novedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rrhh_novedades" ON public.rrhh_novedades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_upd_rrhh_novedades BEFORE UPDATE ON public.rrhh_novedades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_rrhh_novedades_periodo ON public.rrhh_novedades(periodo_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_novedades_personal ON public.rrhh_novedades(personal_id);

-- Jornada habitual (una sola fila de config)
CREATE TABLE IF NOT EXISTS public.rrhh_jornada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lunes numeric(5,2) NOT NULL DEFAULT 8,
  martes numeric(5,2) NOT NULL DEFAULT 8,
  miercoles numeric(5,2) NOT NULL DEFAULT 8,
  jueves numeric(5,2) NOT NULL DEFAULT 8,
  viernes numeric(5,2) NOT NULL DEFAULT 8,
  sabado numeric(5,2) NOT NULL DEFAULT 4,
  domingo numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_jornada_config TO authenticated;
GRANT ALL ON public.rrhh_jornada_config TO service_role;
ALTER TABLE public.rrhh_jornada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rrhh_jornada_config" ON public.rrhh_jornada_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_upd_rrhh_jornada BEFORE UPDATE ON public.rrhh_jornada_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feriados
CREATE TABLE IF NOT EXISTS public.rrhh_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL UNIQUE,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_feriados TO authenticated;
GRANT ALL ON public.rrhh_feriados TO service_role;
ALTER TABLE public.rrhh_feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rrhh_feriados" ON public.rrhh_feriados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Historial de sueldos
CREATE TABLE IF NOT EXISTS public.rrhh_sueldos_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  vigencia_desde date NOT NULL,
  sueldo_acordado numeric(14,2) NOT NULL DEFAULT 0,
  sueldo_registrado numeric(14,2) NOT NULL DEFAULT 0,
  modalidad text NOT NULL DEFAULT 'mensual',
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_sueldos_historial TO authenticated;
GRANT ALL ON public.rrhh_sueldos_historial TO service_role;
ALTER TABLE public.rrhh_sueldos_historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rrhh_sueldos_historial" ON public.rrhh_sueldos_historial
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_upd_rrhh_sueldos BEFORE UPDATE ON public.rrhh_sueldos_historial
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_rrhh_sueldos_personal ON public.rrhh_sueldos_historial(personal_id, vigencia_desde DESC);