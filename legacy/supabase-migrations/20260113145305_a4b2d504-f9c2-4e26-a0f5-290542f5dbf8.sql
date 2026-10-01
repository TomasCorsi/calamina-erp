-- Make all fields optional in cargas_combustible table except id and timestamps
ALTER TABLE public.cargas_combustible 
  ALTER COLUMN fecha DROP NOT NULL,
  ALTER COLUMN obra_id DROP NOT NULL,
  ALTER COLUMN maquinaria_id DROP NOT NULL,
  ALTER COLUMN litros DROP NOT NULL,
  ALTER COLUMN precio_litro DROP NOT NULL,
  ALTER COLUMN costo_total DROP NOT NULL,
  ALTER COLUMN horas_maquina DROP NOT NULL,
  ALTER COLUMN estacion DROP NOT NULL,
  ALTER COLUMN operador DROP NOT NULL;

-- Set default values for numeric fields
ALTER TABLE public.cargas_combustible 
  ALTER COLUMN litros SET DEFAULT 0,
  ALTER COLUMN precio_litro SET DEFAULT 0,
  ALTER COLUMN costo_total SET DEFAULT 0,
  ALTER COLUMN horas_maquina SET DEFAULT 0;