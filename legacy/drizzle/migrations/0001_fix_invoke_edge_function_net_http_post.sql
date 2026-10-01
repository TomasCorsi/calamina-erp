CREATE OR REPLACE FUNCTION public.invoke_edge_function(_function_name text, _payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
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

  SELECT net.http_post(
    url := v_base_url || '/' || _function_name,
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon_key, '')
    )
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_edge_function failed: %', SQLERRM;
  RETURN NULL;
END;
$function$;