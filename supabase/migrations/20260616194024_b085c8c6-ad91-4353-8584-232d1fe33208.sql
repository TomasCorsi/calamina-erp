
REVOKE EXECUTE ON FUNCTION public.invoke_edge_function(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(TEXT, JSONB) TO service_role;
