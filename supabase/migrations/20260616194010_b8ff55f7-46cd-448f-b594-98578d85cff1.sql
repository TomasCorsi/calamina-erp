
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read app_config" ON public.app_config;
CREATE POLICY "Authenticated can read app_config"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.app_config (key, value) VALUES
  ('edge_functions_url', 'https://euytcvwhrhvtwvppvawd.supabase.co/functions/v1'),
  ('anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eXRjdndocmh2dHd2cHB2YXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzA0OTYsImV4cCI6MjA4MzU0NjQ5Nn0.optBOU7wj1oBMsXxly1qpZGcYqH1MSoVN4CZfVNv-zM')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  _function_name TEXT,
  _payload JSONB
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_base_url TEXT;
  v_anon_key TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT value INTO v_base_url FROM public.app_config WHERE key = 'edge_functions_url';
  IF v_base_url IS NULL THEN
    RAISE WARNING 'edge_functions_url not configured';
    RETURN NULL;
  END IF;

  SELECT value INTO v_anon_key FROM public.app_config WHERE key = 'anon_key';

  SELECT extensions.http_post(
    url := v_base_url || '/' || _function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon_key, '')
    ),
    body := _payload
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_edge_function failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_documento_subido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tipo TEXT;
BEGIN
  IF NEW.firmado_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.personal WHERE id = NEW.personal_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_tipo := COALESCE(NEW.tipo, 'documento');

  PERFORM public.invoke_edge_function('send-push', jsonb_build_object(
    'user_ids', jsonb_build_array(v_user_id),
    'title', 'Nuevo documento para firmar',
    'body', 'Tenés un ' || v_tipo || ' pendiente de firma.',
    'url', '/mis-documentos',
    'tag', 'doc-' || NEW.id::text
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_documento_subido ON public.empleado_documentos;
CREATE TRIGGER trg_notify_documento_subido
  AFTER INSERT ON public.empleado_documentos
  FOR EACH ROW EXECUTE FUNCTION public.notify_documento_subido();

CREATE OR REPLACE FUNCTION public.notify_observacion_maquina()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mechanic_user_ids JSONB;
  v_maquina_nombre TEXT;
BEGIN
  SELECT COALESCE(jsonb_agg(p.user_id), '[]'::jsonb)
    INTO v_mechanic_user_ids
  FROM public.personal p
  WHERE p.user_id IS NOT NULL
    AND p.rol IN ('mecanico'::public.rol_personal, 'ayudante'::public.rol_personal);

  IF v_mechanic_user_ids = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nombre, codigo, 'maquinaria') INTO v_maquina_nombre
  FROM public.maquinarias WHERE id = NEW.maquinaria_id;

  PERFORM public.invoke_edge_function('send-push', jsonb_build_object(
    'user_ids', v_mechanic_user_ids,
    'title', 'Nueva observación de máquina',
    'body', COALESCE(v_maquina_nombre, 'Máquina') || ': ' || LEFT(COALESCE(NEW.observacion, ''), 100),
    'url', '/mantenimiento',
    'tag', 'obs-' || NEW.id::text
  ));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_observacion_maquina ON public.observaciones_maquina_estado;
CREATE TRIGGER trg_notify_observacion_maquina
  AFTER INSERT ON public.observaciones_maquina_estado
  FOR EACH ROW EXECUTE FUNCTION public.notify_observacion_maquina();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recordar-parte-pendiente-diario') THEN
    PERFORM cron.unschedule('recordar-parte-pendiente-diario');
  END IF;
END $$;

SELECT cron.schedule(
  'recordar-parte-pendiente-diario',
  '0 21 * * 1-6',
  $cron$
  SELECT public.invoke_edge_function('recordar-parte-pendiente', '{}'::jsonb);
  $cron$
);
