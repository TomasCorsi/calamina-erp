// Utilidades para matching de nombres de proveedores

const SUFIJOS = [
  "sociedad anonima", "sociedad anónima", "s a", "sa",
  "s r l", "srl", "s.r.l", "s.a", "s.a.s", "sas",
  "sociedad de responsabilidad limitada",
  "cia", "compañia", "compania", "y cia", "e hijos", "hnos", "hermanos",
];

export function normalizeProveedorName(s: string): string {
  if (!s) return "";
  let out = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // remover sufijos societarios al final
  for (const suf of SUFIJOS) {
    const re = new RegExp(`(\\s|^)${suf}$`);
    out = out.replace(re, "").trim();
  }
  return out.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export function similarity(a: string, b: string): number {
  const na = normalizeProveedorName(a);
  const nb = normalizeProveedorName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  let score = 1 - dist / maxLen;
  // bonus por substring (ej: "acme" vs "acme construcciones")
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    score = Math.max(score, 0.7 + 0.3 * (shorter / longer));
  }
  // bonus si comparten la primera palabra significativa
  const w1 = na.split(" ")[0];
  const w2 = nb.split(" ")[0];
  if (w1 && w2 && w1 === w2 && w1.length >= 4) {
    score = Math.max(score, 0.6);
  }
  return Math.max(0, Math.min(1, score));
}

export interface ProveedorMatchInput {
  id: string;
  nombre: string;
  cuit?: string | null;
}

export interface ProveedorMatchResult<T extends ProveedorMatchInput> {
  proveedor: T;
  score: number;
  byCuit: boolean;
}

function cleanCuit(c?: string | null): string {
  return (c || "").replace(/\D/g, "");
}

export function findBestProveedorMatch<T extends ProveedorMatchInput>(
  query: string,
  cuit: string | undefined,
  proveedores: T[]
): ProveedorMatchResult<T> | null {
  if (!proveedores || proveedores.length === 0) return null;

  // 1) match exacto por CUIT
  const qCuit = cleanCuit(cuit);
  if (qCuit && qCuit.length >= 10) {
    const byCuit = proveedores.find((p) => cleanCuit(p.cuit) === qCuit);
    if (byCuit) return { proveedor: byCuit, score: 1, byCuit: true };
  }

  // 2) similitud por nombre
  if (!query?.trim()) return null;
  let best: ProveedorMatchResult<T> | null = null;
  for (const p of proveedores) {
    const score = similarity(query, p.nombre);
    if (!best || score > best.score) {
      best = { proveedor: p, score, byCuit: false };
    }
  }
  return best;
}
