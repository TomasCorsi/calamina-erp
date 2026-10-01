CREATE OR REPLACE FUNCTION public.map_personal_rol_to_app_role(_rol public.rol_personal)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _rol = 'capataz'::public.rol_personal THEN 'capataz'::public.app_role
    WHEN _rol = 'administrativo'::public.rol_personal THEN 'admin'::public.app_role
    WHEN _rol = 'ayudante'::public.rol_personal THEN 'ayudante'::public.app_role
    ELSE 'maquinista'::public.app_role
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_legajo text;
  v_rol public.rol_personal;
  v_app_role public.app_role := 'maquinista'::public.app_role;
BEGIN
  v_legajo := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'legajo', '')), '');

  IF v_legajo IS NOT NULL THEN
    SELECT p.rol
      INTO v_rol
      FROM public.personal p
     WHERE p.legajo = v_legajo
     LIMIT 1;

    IF v_rol IS NOT NULL THEN
      v_app_role := public.map_personal_rol_to_app_role(v_rol);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, nombre_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_personal_to_user(
  p_legajo text,
  p_user_id uuid
)
RETURNS TABLE (
  success boolean,
  personal_id uuid,
  rol public.rol_personal,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal_id uuid;
  v_rol public.rol_personal;
  v_existing_user_id uuid;
  v_app_role public.app_role;
BEGIN
  SELECT p.id, p.rol, p.user_id
    INTO v_personal_id, v_rol, v_existing_user_id
    FROM public.personal p
   WHERE p.legajo = p_legajo
   LIMIT 1;

  IF v_personal_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'Legajo no encontrado'::text;
    RETURN;
  END IF;

  IF v_existing_user_id IS NOT NULL AND v_existing_user_id <> p_user_id THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'Este legajo ya tiene cuenta asociada'::text;
    RETURN;
  END IF;

  UPDATE public.personal
     SET user_id = p_user_id
   WHERE id = v_personal_id;

  v_app_role := public.map_personal_rol_to_app_role(v_rol);

  DELETE FROM public.user_roles
   WHERE user_id = p_user_id
     AND role IN ('admin'::public.app_role, 'capataz'::public.app_role, 'maquinista'::public.app_role, 'ayudante'::public.app_role)
     AND role <> v_app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT true, v_personal_id, v_rol, NULL::text;
END;
$$;

UPDATE public.user_roles ur
   SET role = public.map_personal_rol_to_app_role(p.rol)
  FROM public.personal p
 WHERE ur.user_id = p.user_id
   AND p.user_id IS NOT NULL
   AND p.rol IN ('capataz'::public.rol_personal, 'ayudante'::public.rol_personal)
   AND ur.role = 'maquinista'::public.app_role;

GRANT EXECUTE ON FUNCTION public.map_personal_rol_to_app_role(public.rol_personal) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_personal_to_user(text, uuid) TO authenticated;