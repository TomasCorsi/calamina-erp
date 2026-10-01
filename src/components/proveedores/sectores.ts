export const SECTORES = [
  "Taller",
  "Obra",
  "Oficina",
  "Depósito",
  "Vehículos",
  "Otros",
] as const;

export type Sector = (typeof SECTORES)[number];
