import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TABLES = [
  "personal",
  "obras",
  "clientes",
  "maquinarias",
  "remitos",
  "viajes",
  "partes_diarios",
  
  "cargas_combustible_repartidor",
  "mantenimientos",
  "otros_gastos",
  "vacaciones",
  "stock_items",
  "movimientos_stock",
  "horas_maquina",
  "cotizaciones",
  "cotizacion_items",
  "cotizacion_categorias",
  "certificados",
  "certificado_conceptos",
  "certificado_items",
  "certificado_pagos",
  "entregas_epp",
  "entrega_epp_items",
  "registros_hh",
  "observaciones_maquina_estado",
  "precios_productos_mes",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role using service role client
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden realizar backups" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all tables in parallel
    const results: Record<string, unknown[]> = {};
    const fetches = TABLES.map(async (table) => {
      let allRows: unknown[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await adminClient
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          hasMore = false;
        } else {
          allRows = allRows.concat(data || []);
          hasMore = (data?.length || 0) === pageSize;
          from += pageSize;
        }
      }
      results[table] = allRows;
    });

    await Promise.all(fetches);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
