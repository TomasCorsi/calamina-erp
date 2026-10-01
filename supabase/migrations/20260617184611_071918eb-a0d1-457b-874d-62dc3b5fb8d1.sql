CREATE OR REPLACE FUNCTION public.notify_documento_subido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_tipo := COALESCE(NEW.tipo::text, 'documento');

  PERFORM public.invoke_edge_function('send-push', jsonb_build_object(
    'user_ids', jsonb_build_array(v_user_id),
    'title', 'Nuevo documento para firmar',
    'body', 'Tenés un ' || v_tipo || ' pendiente de firma.',
    'url', '/mis-documentos',
    'tag', 'doc-' || NEW.id::text
  ));

  RETURN NEW;
END;
$function$;