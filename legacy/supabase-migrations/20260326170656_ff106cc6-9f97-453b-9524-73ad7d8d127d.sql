ALTER TABLE public.cargas_combustible_repartidor ADD COLUMN numero_remito integer;

-- Backfill existing records with sequential numbers based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.cargas_combustible_repartidor
)
UPDATE public.cargas_combustible_repartidor c
SET numero_remito = n.rn
FROM numbered n
WHERE c.id = n.id;

-- Create a sequence starting after the max existing number
DO $$
DECLARE
  max_num integer;
BEGIN
  SELECT COALESCE(MAX(numero_remito), 0) INTO max_num FROM public.cargas_combustible_repartidor;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS cargas_repartidor_remito_seq START WITH %s', max_num + 1);
  EXECUTE 'ALTER TABLE public.cargas_combustible_repartidor ALTER COLUMN numero_remito SET DEFAULT nextval(''cargas_repartidor_remito_seq'')';
END $$;