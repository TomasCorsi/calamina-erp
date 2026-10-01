import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITERATIONS = 8;
const MODEL = "google/gemini-2.5-flash";

const SCHEMA_PROMPT = `Eres un asistente de reportes para una empresa de construcción y movimiento de suelos en Argentina. 
Respondés siempre en español argentino. Tenés acceso a la base de datos para consultar información mediante la tool "ejecutar_consulta_sql".

PODÉS EJECUTAR MÚLTIPLES CONSULTAS SECUENCIALES si la pregunta lo requiere. Por ejemplo, para "todo el movimiento de la obra X":
1. Primero obtené el id de la obra: SELECT id, nombre FROM obras WHERE nombre ILIKE '%X%' LIMIT 1
2. Después usá ese obra_id para consultar partes_diarios, cargas_combustible_repartidor, remitos, otros_gastos, ordenes_compra, etc. (podés pedir varias tools en paralelo en una misma respuesta).
3. Cuando tengas TODOS los datos necesarios, respondé con un resumen claro en Markdown (con tablas si suma).

TABLAS DISPONIBLES (schema public):

- obras (id uuid, nombre text, ubicacion text, descripcion text, estado estado_obra, fecha_inicio date, fecha_fin_estimada date, cliente_id uuid, numero text)
- clientes (id uuid, nombre text, cuit text, direccion text, localidad text, telefono text, email text, activo boolean)
- personal (id uuid, nombre text, apellido text, dni text, rol rol_personal, legajo text, activo boolean, sueldo numeric, fecha_ingreso date)
- maquinarias (id uuid, codigo text, nombre text, tipo tipo_maquinaria, marca text, patente text, estado estado_maquinaria, horas_acumuladas numeric, km_acumulados numeric, obra_id uuid)
- cotizaciones (id uuid, numero text, obra_id uuid, descripcion text, estado estado_cotizacion, fecha_creacion date, subtotal numeric, iva numeric, total numeric, moneda text)
- cotizacion_items (id uuid, cotizacion_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric, categoria_id uuid)
- remitos (id uuid, numero text, fecha date, obra_id uuid, desde text, hasta text, material text, tipo_material text, cantidad numeric, unidad text, cantidad_viajes integer, precio_unitario numeric, precio_total numeric, maquinaria_id uuid, tipo_transporte text, cliente text, cliente_destino text)

- cargas_combustible_repartidor (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, litros numeric, tipo_producto text, numero_remito integer, observaciones text)
- mantenimientos (id uuid, fecha date, maquinaria_id uuid, tipo tipo_mantenimiento, descripcion text, costo_repuestos numeric, costo_mano_obra numeric, costo_total numeric, horas_maquina numeric, tecnico text, estado estado_mantenimiento)
- horas_maquina (id uuid, fecha date, maquinaria_id uuid, obra_id uuid, operador_id uuid, horas_trabajadas numeric)
- partes_diarios (id uuid, fecha date, personal_id uuid, obra_id uuid, maquinaria_id uuid, hora_entrada time, hora_salida time, horometro_inicio numeric, horometro_fin numeric, cantidad_viajes integer, estado text, novedades text, tareas text)
- otros_gastos (id uuid, fecha date, obra_id uuid, categoria text, descripcion text, monto numeric, proveedor text)
- ordenes_compra (id uuid, numero text, fecha date, obra_id uuid, proveedor_id uuid, descripcion text, total numeric, estado text)
- certificados (id uuid, obra_id uuid, numero text, periodo text, estado estado_certificado, subtotal numeric, iva numeric, total numeric)
- certificado_items (id uuid, certificado_id uuid, descripcion text, unidad text, cantidad numeric, precio_unitario numeric, subtotal numeric)

REGLAS:
- Solo SELECT. Nunca INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE.
- Siempre poné LIMIT (máximo 100 filas).
- Usá JOINs para mostrar nombres legibles en vez de UUIDs (ej: JOIN personal ON ..., JOIN maquinarias ON ...).
- Si un query falla, leé el error y corregí el SQL en el siguiente intento.
- Formateá montos como pesos argentinos cuando corresponda.
- Cuando agrupes información de una obra, presentá secciones claras (Personal, Combustible, Remitos, Gastos, etc.) con totales.
- La fecha actual es ${new Date().toISOString().split("T")[0]}.`;

const tools = [
  {
    type: "function",
    function: {
      name: "ejecutar_consulta_sql",
      description: "Ejecuta una consulta SQL SELECT contra la base de datos. Podés invocar esta tool varias veces seguidas si necesitás cruzar información de distintas tablas.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "Query SQL SELECT a ejecutar" },
          explicacion: { type: "string", description: "Breve explicación de qué busca la consulta" },
        },
        required: ["sql"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden usar el chat de reportes" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const conversation: any[] = [
      { role: "system", content: SCHEMA_PROMPT },
      ...messages,
    ];

    const callModel = async (stream: boolean) => {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: conversation,
          tools,
          stream,
        }),
      });
    };

    // Agentic loop: keep executing tool calls until model returns a final answer
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      console.log(`Iteration ${iter + 1}/${MAX_ITERATIONS}`);
      const resp = await callModel(false);

      if (!resp.ok) {
        const status = resp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá de nuevo en unos segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await resp.text();
        console.error("AI gateway error:", status, errText);
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await resp.json();
      const choice = data.choices?.[0]?.message;

      if (!choice?.tool_calls?.length) {
        // No more tool calls → final answer. Re-run with streaming for nice UX.
        const finalResp = await callModel(true);
        if (!finalResp.ok || !finalResp.body) {
          // Fallback: return non-stream content
          const content = choice?.content || "No pude procesar tu consulta.";
          return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(finalResp.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // Push assistant turn with tool calls
      conversation.push(choice);

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        choice.tool_calls.map(async (toolCall: any) => {
          if (toolCall.function.name !== "ejecutar_consulta_sql") {
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({ error: "Tool desconocida" }),
            };
          }
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({ error: "Argumentos inválidos" }),
            };
          }
          console.log(`[iter ${iter + 1}] SQL:`, args.sql);
          const { data: rows, error } = await userClient.rpc("execute_readonly_query", {
            query_sql: args.sql,
          });
          return {
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(
              error
                ? { error: error.message }
                : { rows: rows ?? [], count: Array.isArray(rows) ? rows.length : 0 }
            ),
          };
        })
      );

      conversation.push(...toolResults);
    }

    // Hit iteration cap
    return new Response(
      JSON.stringify({
        content:
          "La consulta requirió demasiadas búsquedas y no pude completarla. Probá dividirla en partes más chicas (por ejemplo: pedí primero los empleados, después combustible, después remitos).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-reportes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
