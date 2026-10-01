// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Roles que deben cargar parte diario (excluye admin, sereno, topografo)
const ROLES_QUE_CARGAN = ["maquinista", "ayudante", "capataz", "chofer", "mecanico"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fecha de hoy en zona ARG (UTC-3)
    const ahoraUTC = new Date();
    const argMs = ahoraUTC.getTime() - 3 * 60 * 60 * 1000;
    const argDate = new Date(argMs);
    const fechaHoy = argDate.toISOString().slice(0, 10);

    // Empleados activos con cuenta vinculada y rol que carga parte
    const { data: empleados, error: empErr } = await supabase
      .from("personal")
      .select("id, user_id, rol, nombre, apellido")
      .not("user_id", "is", null)
      .in("rol", ROLES_QUE_CARGAN);

    if (empErr) throw empErr;

    if (!empleados?.length) {
      return new Response(JSON.stringify({ message: "No employees to check", fecha: fechaHoy }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Partes ya cargados hoy
    const { data: partesHoy, error: partesErr } = await supabase
      .from("partes_diarios")
      .select("personal_id")
      .eq("fecha", fechaHoy);

    if (partesErr) throw partesErr;

    const cargaron = new Set((partesHoy || []).map((p: any) => p.personal_id));
    const faltantes = empleados.filter((e: any) => !cargaron.has(e.id));

    if (faltantes.length === 0) {
      return new Response(
        JSON.stringify({ message: "Todos cargaron el parte", fecha: fechaHoy }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userIds = faltantes.map((e: any) => e.user_id);

    // Invocar send-push
    const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        user_ids: userIds,
        title: "Recordatorio: parte diario pendiente",
        body: "Aún no cargaste tu parte diario de hoy. Cargalo antes de que termine el día.",
        url: "/parte-diario",
        tag: "recordatorio-parte-" + fechaHoy,
      }),
    });

    const pushJson = await pushRes.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        fecha: fechaHoy,
        empleados_faltantes: faltantes.length,
        push_result: pushJson,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("recordar-parte-pendiente error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
