// Match empleado documents using Lovable AI to extract DNI/CUIT/nombre
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonalLite {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
}

interface InFile {
  name: string;
  mime: string;
  data: string; // base64 data url
}

interface MatchResult {
  name: string;
  detected: { nombre?: string; apellido?: string; dni?: string; cuit?: string } | null;
  personal_id: string | null;
  personal_label: string | null;
  confidence: 'alta' | 'media' | 'baja' | 'sin_match';
  error?: string;
}

const normalize = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const digits = (s: string) => (s || '').replace(/\D+/g, '');

// personal.dni en realidad guarda el CUIT (11 dígitos). Indexamos los dos formatos.
function dniOf(p: PersonalLite): string {
  const d = digits(p.dni || '');
  if (d.length === 11) return d.slice(2, 10).padStart(8, '0');
  if (d.length >= 7 && d.length <= 8) return d.padStart(8, '0');
  return '';
}
function cuitOf(p: PersonalLite): string {
  const d = digits(p.dni || '');
  return d.length === 11 ? d : '';
}

function findMatch(detected: any, personal: PersonalLite[]): { p: PersonalLite | null; conf: MatchResult['confidence'] } {
  if (!detected) return { p: null, conf: 'sin_match' };
  const cuitDoc = digits(detected.cuit || '');
  const dniDocRaw = digits(detected.dni || '');
  const dniDoc = dniDocRaw.length >= 7 && dniDocRaw.length <= 8
    ? dniDocRaw.padStart(8, '0')
    : (cuitDoc.length === 11 ? cuitDoc.slice(2, 10).padStart(8, '0') : '');

  if (cuitDoc.length === 11) {
    const found = personal.find((p) => cuitOf(p) === cuitDoc);
    if (found) return { p: found, conf: 'alta' };
  }
  if (dniDoc) {
    const found = personal.find((p) => dniOf(p) === dniDoc);
    if (found) return { p: found, conf: 'alta' };
  }

  const nom = normalize(detected.nombre || '');
  const ape = normalize(detected.apellido || '');
  if (nom && ape) {
    const exact = personal.find(
      (p) => normalize(p.nombre) === nom && normalize(p.apellido) === ape
    );
    if (exact) return { p: exact, conf: 'media' };
    const fuzzy = personal.find(
      (p) =>
        (normalize(p.apellido).includes(ape) || ape.includes(normalize(p.apellido))) &&
        (normalize(p.nombre).includes(nom.split(' ')[0]) || nom.includes(normalize(p.nombre).split(' ')[0]))
    );
    if (fuzzy) return { p: fuzzy, conf: 'baja' };
  } else if (ape) {
    const cand = personal.filter((p) => normalize(p.apellido) === ape);
    if (cand.length === 1) return { p: cand[0], conf: 'baja' };
    // último intento: apellido contenido
    const sub = personal.filter((p) => {
      const a = normalize(p.apellido);
      return a.length >= 3 && (a.includes(ape) || ape.includes(a));
    });
    if (sub.length === 1) return { p: sub[0], conf: 'baja' };
  } else if (nom) {
    const cand = personal.filter((p) => normalize(p.nombre) === nom);
    if (cand.length === 1) return { p: cand[0], conf: 'baja' };
  }

  return { p: null, conf: 'sin_match' };
}

async function extractFromFile(file: InFile, tipo: string): Promise<any | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const isPdf = file.mime.includes('pdf');
  const promptText = tipo === 'recibo_sueldo'
    ? `Extraé del recibo de sueldo adjunto los datos del EMPLEADO (titular del recibo): nombre (de pila), apellido, DNI y CUIT/CUIL. Devolvé SOLO un JSON {"nombre":"","apellido":"","dni":"","cuit":""}. Si algún dato no aparece dejá string vacío.`
    : `Este archivo puede ser UNA hoja de un PDF más grande con varios estudios médicos. Identificá al PACIENTE/EMPLEADO EVALUADO de ESTA hoja. NO devuelvas datos del médico que firma, ni del laboratorio, ni de la empresa o ART. Buscá las etiquetas "Paciente", "Apellido y Nombre", "Empleado", "Examinado", "DNI", "CUIL" cerca del nombre del trabajador. Si la hoja no tiene datos del paciente (ej. solo resultados de un estudio anterior), devolvé los campos vacíos. Devolvé SOLO un JSON {"nombre":"","apellido":"","dni":"","cuit":""}.`;
  const userContent: any[] = [
    { type: 'text', text: promptText },
  ];

  if (isPdf) {
    userContent.push({
      type: 'file',
      file: { filename: file.name, file_data: file.data },
    });
  } else {
    userContent.push({ type: 'image_url', image_url: { url: file.data } });
  }

  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Sos un extractor de datos. Respondés SOLO JSON válido.' },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('AI error', resp.status, text);
    if (resp.status === 429) throw new Error('Rate limit. Intentá nuevamente en unos segundos.');
    if (resp.status === 402) throw new Error('Sin créditos de IA. Recargá en Workspace → Usage.');
    throw new Error(`AI error ${resp.status}`);
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { files, tipo, personal } = await req.json();
    if (!Array.isArray(files) || !Array.isArray(personal) || !tipo) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: MatchResult[] = [];
    for (const f of files as InFile[]) {
      try {
        const detected = await extractFromFile(f, tipo);
        const { p, conf } = findMatch(detected, personal as PersonalLite[]);
        results.push({
          name: f.name,
          detected,
          personal_id: p?.id ?? null,
          personal_label: p ? `${p.apellido} ${p.nombre}`.trim() : null,
          confidence: conf,
        });
      } catch (e: any) {
        results.push({
          name: f.name,
          detected: null,
          personal_id: null,
          personal_label: null,
          confidence: 'sin_match',
          error: e?.message || String(e),
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
