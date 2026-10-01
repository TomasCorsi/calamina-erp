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

    const { content, type, instrucciones } = await req.json(); // type: "text" | "image" | "pdf"
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Sos un experto en cotizaciones, presupuestos y facturas de proveedores en Argentina.
Tu tarea es extraer los datos generales y los ítems de una cotización/factura para precargar una orden de compra.

Reglas:
- Unidades válidas: un, kg, m, m², m³, tn, hr, lt, gl, ml. Si no reconocés, usá la más cercana o "un".
- Los números en Argentina usan coma como decimal y punto como separador de miles (ej: 1.234,56 = 1234.56). Normalizá a número decimal con punto.
- Moneda: si ves "US$", "USD", "u\\$s", "dólares" => USD. Si ves "$", "ARS", "pesos" o nada => ARS.
- incluir_iva: true si el IVA aparece discriminado aparte del subtotal, o si dice "no incluye IVA". false si los precios ya tienen IVA incluido ("IVA incluido", "final").
- iva_porcentaje: por defecto 21 en Argentina, salvo que se indique otro (10.5, 27).
- fecha: en formato YYYY-MM-DD. Si solo hay mes/año, usá el primer día.
- proveedor_nombre: razón social o nombre comercial del que EMITE la cotización/factura (no el cliente/destinatario).
- proveedor_cuit: CUIT del proveedor emisor, solo dígitos (11 dígitos sin guiones ni puntos). NO confundir con el CUIT del cliente/destinatario.
- numero_factura: número de comprobante del proveedor. En facturas AFIP de Argentina suele tener el formato "0001-00012345" (punto de venta 4 dígitos + guion + número 8 dígitos). Buscá etiquetas como "Factura N°", "Comp. Nro", "Nº", "Comprobante", "Remito Nº" (solo si es remito), "Presupuesto N°". Normalizá a "PPPP-NNNNNNNN" si podés (rellenando con ceros a la izquierda). NO uses el CAE, ni el N° de pedido interno, ni el N° de cliente.
- items: una fila por producto/servicio cotizado. Ignorá filas de subtotal, IVA, total, descuento global.
- articulo: si la fila trae código/SKU/N° de artículo/referencia del proveedor (ej: "HC-200", "ART-12345", "Cod. 7788"), mapealo a "articulo". El nombre o detalle largo va en "descripcion". Si no hay código, dejá articulo vacío o no lo incluyas.
- precio_unitario: precio por unidad sin IVA si está discriminado; si solo hay precio final con IVA, usá ese y marcá incluir_iva=false.
- cantidad y precio_unitario deben ser números (no strings).
- percepcion_iva: MONTO (no porcentaje) de la Percepción de IVA, en la moneda de la factura. Buscá etiquetas como "Percepción IVA", "Perc. IVA", "Percep. IVA", "IVA Percepción", "RG 3337". Si no aparece, devolvé 0. No confundir con el IVA general (21%/10.5%/27%).
- percepcion_iibb: MONTO (no porcentaje) de la Percepción de Ingresos Brutos, en la moneda de la factura. Buscá "Percepción IIBB", "Perc. IIBB", "Percep. IIBB", "IIBB", "Ingresos Brutos", "ARBA", "AGIP", "Percepción IB". Si no aparece, devolvé 0.
- Si en la factura figura el monto de IVA discriminado (ej: "IVA 21% $X"), poné incluir_iva=true y iva_porcentaje=21 (o la alícuota indicada: 10.5, 27).`;

    const instruccionesPrefix = instrucciones ? `Instrucciones del usuario: ${instrucciones}\n\n` : "";

    const userContent: any[] = [];
    if (type === "image" || type === "pdf") {
      userContent.push({
        type: "image_url",
        image_url: { url: content },
      });
      userContent.push({
        type: "text",
        text: `${instruccionesPrefix}Extraé los datos y todos los ítems de esta cotización/factura de proveedor.`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `${instruccionesPrefix}Extraé los datos y todos los ítems de la siguiente cotización/factura de proveedor:\n\n${content}`,
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
            name: "extract_orden_compra",
            description: "Extrae datos estructurados de una cotización o factura de proveedor",
            parameters: {
              type: "object",
              properties: {
                proveedor_nombre: { type: "string", description: "Razón social del proveedor que emite" },
                proveedor_cuit: { type: "string", description: "CUIT del proveedor emisor, 11 dígitos sin separadores" },
                numero_factura: { type: "string", description: "Número de comprobante/factura del proveedor, ideal formato PPPP-NNNNNNNN" },
                fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
                moneda: { type: "string", enum: ["ARS", "USD"] },
                incluir_iva: { type: "boolean" },
                iva_porcentaje: { type: "number" },
                percepcion_iva: { type: "number", description: "Monto (no porcentaje) de Percepción de IVA, en la moneda de la factura. 0 si no aparece." },
                percepcion_iibb: { type: "number", description: "Monto (no porcentaje) de Percepción de Ingresos Brutos, en la moneda de la factura. 0 si no aparece." },
                condiciones_pago: { type: "string" },
                observaciones: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      articulo: { type: "string", description: "Código, SKU o N° de artículo del proveedor (opcional)" },
                      descripcion: { type: "string" },
                      unidad: { type: "string", enum: ["un", "kg", "m", "m²", "m³", "tn", "hr", "lt", "gl", "ml"] },
                      cantidad: { type: "number" },
                      precio_unitario: { type: "number" },
                    },
                    required: ["descripcion", "unidad", "cantidad", "precio_unitario"],
                  },
                },
              },
              required: ["items"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_orden_compra" } },
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
    console.error("parse-orden-compra error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
