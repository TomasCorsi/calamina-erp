-- Step 1: Drop foreign key constraints that reference clientes
ALTER TABLE public.obras DROP CONSTRAINT IF EXISTS obras_cliente_id_fkey;
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_cliente_id_fkey;
ALTER TABLE public.remitos DROP CONSTRAINT IF EXISTS remitos_cliente_id_fkey;
ALTER TABLE public.cargas_combustible DROP CONSTRAINT IF EXISTS cargas_combustible_cliente_id_fkey;
ALTER TABLE public.registros_hh DROP CONSTRAINT IF EXISTS registros_hh_cliente_id_fkey;

-- Step 2: Drop cliente_id columns from all tables
ALTER TABLE public.obras DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE public.cotizaciones DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE public.remitos DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE public.cargas_combustible DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE public.registros_hh DROP COLUMN IF EXISTS cliente_id;

-- Step 3: Add obra_id to cotizaciones (since cotizaciones now reference obras instead of clientes)
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES public.obras(id);

-- Step 4: Drop RLS policies on clientes table
DROP POLICY IF EXISTS "Admins and capataces can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Maquinistas can view clientes" ON public.clientes;

-- Step 5: Drop clientes table
DROP TABLE IF EXISTS public.clientes CASCADE;