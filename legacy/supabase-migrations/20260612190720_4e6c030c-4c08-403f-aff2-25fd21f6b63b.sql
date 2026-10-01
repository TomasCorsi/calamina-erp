ALTER TABLE public.empleado_documentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.empleado_documentos;