import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, type, instrucciones } = await req.json(); // type: "text" | "image"
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Eres un experto en cómputos métricos de construcción y movimiento de suelos en Argentina. 
Tu tarea es extraer los rubros (categorías) e ítems de un cómputo/presupuesto.

Reglas:
- Las unidades válidas son: m², m³, tn, hr, gl, un, ml, kg
- Si no reconoces una unidad, usa la más cercana
- Los números de ítem deben ser del formato "1.1", "1.2", "2.1", etc.
- Si hay precios, extráelos. Si no hay precios, pon 0
- cantidad_m2 es la superficie, altura_promedio es la altura/espesor, cantidad_m3 = m2 × altura
- Si la unidad es m³ y solo hay una cantidad, ponla en cantidad_m3
- Si la unidad NO es m³ (ej: tn, hr, un, gl), pon la cantidad en cantidad_m3 (se usa como cantidad general)
- Agrupa los ítems en rubros/categorías lógicas si no están agrupados
- Extrae una descripción general de la obra si está disponible`;

    const instruccionesPrefix = instrucciones ? `Instrucciones del usuario: ${instrucciones}\n\n` : "";

    const userContent: any[] = [];
    if (type === "image") {
      userContent.push({
        type: "image_url",
        image_url: { url: content },
      });
      userContent.push({
        type: "text",
        text: `${instruccionesPrefix}Extraé todos los rubros e ítems de este cómputo/presupuesto de obra.`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `${instruccionesPrefix}Extraé todos los rubros e ítems del siguiente cómputo/presupuesto de obra:\n\n${content}`,
      });
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_computo",
            description: "Extrae rubros e ítems estructurados de un cómputo de obra",
            parameters: {
              type: "object",
              properties: {
                descripcion_general: {
                  type: "string",
                  description: "Descripción general de la obra o cotización",
                },
                categorias: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      numero: { type: "number" },
                      nombre: { type: "string" },
                    },
                    required: ["numero", "nombre"],
                  },
                },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      categoria_index: { type: "number", description: "Índice de la categoría (0-based)" },
                      numero: { type: "string", description: "Número del ítem, ej: 1.1" },
                      descripcion: { type: "string" },
                      unidad: { type: "string", enum: ["m²", "m³", "tn", "hr", "gl", "un", "ml", "kg"] },
                      cantidad_m2: { type: "number" },
                      altura_promedio: { type: "number" },
                      cantidad_m3: { type: "number" },
                      precio_unitario: { type: "number" },
                    },
                    required: ["categoria_index", "numero", "descripcion", "unidad", "cantidad_m3"],
                  },
                },
              },
              required: ["categorias", "items"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_computo" } },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intentá de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error al procesar con IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "La IA no pudo extraer datos estructurados" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-computo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
