REVOKE EXECUTE ON FUNCTION public.map_personal_rol_to_app_role(public.rol_personal) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_personal_to_user(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.link_personal_to_user(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_personal_rol_to_app_role(public.rol_personal) TO service_role;