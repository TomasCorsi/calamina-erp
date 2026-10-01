CREATE TABLE public.tablero_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT 'Tablero TV',
  obra_ids uuid[] NOT NULL DEFAULT '{}',
  obra_activa uuid,
  metrica text NOT NULL DEFAULT 'm3',
  mes text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  rotacion_activa boolean NOT NULL DEFAULT true,
  rotacion_segundos integer NOT NULL DEFAULT 20,
  refresh_token integer NOT NULL DEFAULT 0,
  tv_ping_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tablero_sesiones TO authenticated;
GRANT ALL ON public.tablero_sesiones TO service_role;

ALTER TABLE public.tablero_sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gestionan sesiones de tablero"
ON public.tablero_sesiones
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_tablero_sesiones_updated_at
BEFORE UPDATE ON public.tablero_sesiones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tablero_sesiones REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tablero_sesiones;

INSERT INTO public.tablero_sesiones (nombre) VALUES ('Tablero TV');