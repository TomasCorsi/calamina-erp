import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoDocumento = "estudio_medico" | "recibo_sueldo";

export interface EmpleadoDocumento {
  id: string;
  personal_id: string;
  tipo: TipoDocumento;
  titulo: string;
  periodo: string | null;
  descripcion: string | null;
  storage_path: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  nombre_original: string | null;
  uploaded_by: string | null;
  visto_at: string | null;
  firma_data_url: string | null;
  firmado_at: string | null;
  firmado_ip: string | null;
  created_at: string;
  updated_at: string;
  personal?: { id: string; nombre: string; apellido: string; legajo: string | null } | null;
}

const BUCKET = "empleado-documentos";

export function useEmpleadoDocumentos(filters?: { personalId?: string; tipo?: TipoDocumento }) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["empleado_documentos", filters?.personalId ?? null, filters?.tipo ?? null],
    queryFn: async () => {
      let q = supabase
        .from("empleado_documentos")
        .select("*, personal:personal_id(id,nombre,apellido,legajo)")
        .order("created_at", { ascending: false });
      if (filters?.personalId) q = q.eq("personal_id", filters.personalId);
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EmpleadoDocumento[];
    },
  });

  const uploadOne = useMutation({
    mutationFn: async (payload: {
      personal_id: string;
      tipo: TipoDocumento;
      titulo: string;
      periodo?: string;
      descripcion?: string;
      file: File;
    }) => {
      const ext = payload.file.name.split(".").pop() || "bin";
      const path = `${payload.personal_id}/${payload.tipo}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, payload.file, {
        contentType: payload.file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insErr } = await supabase.from("empleado_documentos").insert({
        personal_id: payload.personal_id,
        tipo: payload.tipo,
        titulo: payload.titulo,
        periodo: payload.periodo || null,
        descripcion: payload.descripcion || null,
        storage_path: path,
        mime_type: payload.file.type || null,
        tamano_bytes: payload.file.size,
        nombre_original: payload.file.name,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empleado_documentos"] });
      qc.invalidateQueries({ queryKey: ["mis_documentos"] });
      toast.success("Documento subido");
    },
    onError: (e: any) => toast.error(e?.message || "Error al subir"),
  });

  const remove = useMutation({
    mutationFn: async (doc: EmpleadoDocumento) => {
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      const { error } = await supabase.from("empleado_documentos").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empleado_documentos"] });
      qc.invalidateQueries({ queryKey: ["mis_documentos"] });
      toast.success("Documento eliminado");
    },
    onError: (e: any) => toast.error(e?.message || "Error al eliminar"),
  });

  const getDownloadUrl = async (doc: EmpleadoDocumento) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    documentos: list.data || [],
    isLoading: list.isLoading,
    uploadOne: uploadOne.mutateAsync,
    isUploading: uploadOne.isPending,
    remove: remove.mutate,
    isRemoving: remove.isPending,
    getDownloadUrl,
  };
}
