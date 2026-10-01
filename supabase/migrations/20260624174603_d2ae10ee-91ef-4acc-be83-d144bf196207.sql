
DO $$ BEGIN CREATE TYPE public.contab_cuenta_tipo AS ENUM ('activo','pasivo','patrimonio','ingreso','egreso','resultado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contab_tercero_tipo AS ENUM ('cliente','proveedor','ambos'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contab_cond_iva AS ENUM ('RI','MT','EX','CF','NR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contab_cbte_tipo AS ENUM ('FA_A','FA_B','FA_C','NC_A','NC_B','NC_C','ND_A','ND_B','ND_C','RECIBO','TICKET','FA_CPA_A','FA_CPA_B','FA_CPA_C','NC_CPA','ND_CPA','OTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contab_cbte_estado AS ENUM ('borrador','confirmado','anulado','pagado','parcial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contab_pago_medio AS ENUM ('efectivo','transferencia','cheque','tarjeta','deposito','otro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- EMPRESA
CREATE TABLE IF NOT EXISTS public.contab_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuit text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  nombre_fantasia text,
  condicion_iva public.contab_cond_iva NOT NULL DEFAULT 'RI',
  iibb text, inicio_actividades date,
  domicilio_fiscal text, localidad text, provincia text, cp text,
  telefono text, email text, logo_url text, pie_factura text,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_empresa TO authenticated;
GRANT ALL ON public.contab_empresa TO service_role;
ALTER TABLE public.contab_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_empresa_select" ON public.contab_empresa FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_empresa_modify" ON public.contab_empresa FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contab_empresa_upd BEFORE UPDATE ON public.contab_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PUNTOS DE VENTA
CREATE TABLE IF NOT EXISTS public.contab_puntos_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.contab_empresa(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, numero)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_puntos_venta TO authenticated;
GRANT ALL ON public.contab_puntos_venta TO service_role;
ALTER TABLE public.contab_puntos_venta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_pv_select" ON public.contab_puntos_venta FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_pv_modify" ON public.contab_puntos_venta FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contab_pv_upd BEFORE UPDATE ON public.contab_puntos_venta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PLAN DE CUENTAS
CREATE TABLE IF NOT EXISTS public.contab_plan_cuentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  tipo public.contab_cuenta_tipo NOT NULL,
  parent_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE SET NULL,
  imputable boolean NOT NULL DEFAULT true,
  activa boolean NOT NULL DEFAULT true,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_plan_cuentas TO authenticated;
GRANT ALL ON public.contab_plan_cuentas TO service_role;
ALTER TABLE public.contab_plan_cuentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_pc_select" ON public.contab_plan_cuentas FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_pc_modify" ON public.contab_plan_cuentas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contab_pc_upd BEFORE UPDATE ON public.contab_plan_cuentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_contab_pc_parent ON public.contab_plan_cuentas(parent_id);

-- TERCEROS
CREATE TABLE IF NOT EXISTS public.contab_terceros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.contab_tercero_tipo NOT NULL DEFAULT 'cliente',
  cuit text,
  razon_social text NOT NULL,
  condicion_iva public.contab_cond_iva NOT NULL DEFAULT 'RI',
  domicilio text, localidad text, provincia text, cp text,
  telefono text, email text, cbu text, banco text, numero_cuenta text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_terceros TO authenticated;
GRANT ALL ON public.contab_terceros TO service_role;
ALTER TABLE public.contab_terceros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_terc_select" ON public.contab_terceros FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_terc_modify" ON public.contab_terceros FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_terc_upd BEFORE UPDATE ON public.contab_terceros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_contab_terc_cuit ON public.contab_terceros(cuit);

-- COMPROBANTES
CREATE TABLE IF NOT EXISTS public.contab_comprobantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.contab_empresa(id) ON DELETE SET NULL,
  tipo public.contab_cbte_tipo NOT NULL,
  letra text,
  punto_venta integer NOT NULL DEFAULT 1,
  numero bigint NOT NULL,
  fecha date NOT NULL,
  fecha_vto date,
  tercero_id uuid REFERENCES public.contab_terceros(id) ON DELETE SET NULL,
  neto_21 numeric(14,2) NOT NULL DEFAULT 0, iva_21 numeric(14,2) NOT NULL DEFAULT 0,
  neto_105 numeric(14,2) NOT NULL DEFAULT 0, iva_105 numeric(14,2) NOT NULL DEFAULT 0,
  neto_27 numeric(14,2) NOT NULL DEFAULT 0, iva_27 numeric(14,2) NOT NULL DEFAULT 0,
  neto_0 numeric(14,2) NOT NULL DEFAULT 0,
  exento numeric(14,2) NOT NULL DEFAULT 0,
  no_gravado numeric(14,2) NOT NULL DEFAULT 0,
  perc_iva numeric(14,2) NOT NULL DEFAULT 0,
  perc_iibb numeric(14,2) NOT NULL DEFAULT 0,
  perc_otras numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'ARS',
  cotizacion numeric(14,4) NOT NULL DEFAULT 1,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  estado public.contab_cbte_estado NOT NULL DEFAULT 'borrador',
  es_venta boolean NOT NULL DEFAULT true,
  observaciones text,
  asiento_id uuid,
  confirmado_at timestamptz, confirmado_por uuid,
  anulado_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_comprobantes TO authenticated;
GRANT ALL ON public.contab_comprobantes TO service_role;
ALTER TABLE public.contab_comprobantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_cbte_select" ON public.contab_comprobantes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_cbte_modify" ON public.contab_comprobantes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_cbte_upd BEFORE UPDATE ON public.contab_comprobantes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_contab_cbte_fecha ON public.contab_comprobantes(fecha);
CREATE INDEX IF NOT EXISTS idx_contab_cbte_tercero ON public.contab_comprobantes(tercero_id);
CREATE INDEX IF NOT EXISTS idx_contab_cbte_obra ON public.contab_comprobantes(obra_id);
CREATE INDEX IF NOT EXISTS idx_contab_cbte_maq ON public.contab_comprobantes(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_contab_cbte_estado ON public.contab_comprobantes(estado);

-- ITEMS
CREATE TABLE IF NOT EXISTS public.contab_comprobante_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.contab_comprobantes(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 1,
  descripcion text NOT NULL,
  cuenta_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE SET NULL,
  cantidad numeric(14,4) NOT NULL DEFAULT 1,
  precio_unit numeric(14,4) NOT NULL DEFAULT 0,
  neto numeric(14,2) NOT NULL DEFAULT 0,
  alicuota_iva numeric(5,2) NOT NULL DEFAULT 21,
  iva numeric(14,2) NOT NULL DEFAULT 0,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_comprobante_items TO authenticated;
GRANT ALL ON public.contab_comprobante_items TO service_role;
ALTER TABLE public.contab_comprobante_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_items_select" ON public.contab_comprobante_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_items_modify" ON public.contab_comprobante_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_items_upd BEFORE UPDATE ON public.contab_comprobante_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_contab_items_cbte ON public.contab_comprobante_items(comprobante_id);
CREATE INDEX IF NOT EXISTS idx_contab_items_obra ON public.contab_comprobante_items(obra_id);
CREATE INDEX IF NOT EXISTS idx_contab_items_maq ON public.contab_comprobante_items(maquinaria_id);

-- PAGOS
CREATE TABLE IF NOT EXISTS public.contab_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid REFERENCES public.contab_comprobantes(id) ON DELETE SET NULL,
  tercero_id uuid REFERENCES public.contab_terceros(id) ON DELETE SET NULL,
  es_cobro boolean NOT NULL DEFAULT true,
  fecha date NOT NULL,
  medio public.contab_pago_medio NOT NULL DEFAULT 'transferencia',
  monto numeric(14,2) NOT NULL DEFAULT 0,
  cuenta_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE SET NULL,
  referencia text,
  observaciones text,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  asiento_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_pagos TO authenticated;
GRANT ALL ON public.contab_pagos TO service_role;
ALTER TABLE public.contab_pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_pagos_select" ON public.contab_pagos FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_pagos_modify" ON public.contab_pagos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_pagos_upd BEFORE UPDATE ON public.contab_pagos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_contab_pagos_cbte ON public.contab_pagos(comprobante_id);
CREATE INDEX IF NOT EXISTS idx_contab_pagos_tercero ON public.contab_pagos(tercero_id);
CREATE INDEX IF NOT EXISTS idx_contab_pagos_fecha ON public.contab_pagos(fecha);

-- ASIENTOS
CREATE TABLE IF NOT EXISTS public.contab_asientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigserial,
  fecha date NOT NULL,
  descripcion text NOT NULL,
  origen text,
  comprobante_id uuid REFERENCES public.contab_comprobantes(id) ON DELETE SET NULL,
  pago_id uuid REFERENCES public.contab_pagos(id) ON DELETE SET NULL,
  total_debe numeric(14,2) NOT NULL DEFAULT 0,
  total_haber numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_asientos TO authenticated;
GRANT ALL ON public.contab_asientos TO service_role;
ALTER TABLE public.contab_asientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_as_select" ON public.contab_asientos FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_as_modify" ON public.contab_asientos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_as_upd BEFORE UPDATE ON public.contab_asientos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.contab_asiento_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asiento_id uuid NOT NULL REFERENCES public.contab_asientos(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 1,
  cuenta_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE SET NULL,
  descripcion text,
  debe numeric(14,2) NOT NULL DEFAULT 0,
  haber numeric(14,2) NOT NULL DEFAULT 0,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_asiento_lineas TO authenticated;
GRANT ALL ON public.contab_asiento_lineas TO service_role;
ALTER TABLE public.contab_asiento_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contab_asl_select" ON public.contab_asiento_lineas FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY "contab_asl_modify" ON public.contab_asiento_lineas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE INDEX IF NOT EXISTS idx_contab_asl_asiento ON public.contab_asiento_lineas(asiento_id);
CREATE INDEX IF NOT EXISTS idx_contab_asl_cuenta ON public.contab_asiento_lineas(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_contab_asl_obra ON public.contab_asiento_lineas(obra_id);
CREATE INDEX IF NOT EXISTS idx_contab_asl_maq ON public.contab_asiento_lineas(maquinaria_id);

-- FUNCION: generar asiento de comprobante
CREATE OR REPLACE FUNCTION public.contab_generar_asiento_cbte(_cbte_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cbte public.contab_comprobantes%ROWTYPE;
  v_asiento_id uuid;
  v_tercero text;
  v_desc text;
  v_total_iva numeric(14,2);
  v_total_perc numeric(14,2);
  v_cuenta_iva_db uuid; v_cuenta_iva_cr uuid;
  v_cuenta_deudores uuid; v_cuenta_proveedores uuid;
  v_cuenta_ventas uuid; v_cuenta_compras uuid;
  v_cuenta_percep uuid;
  v_it record;
  v_orden integer := 1;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO v_cbte FROM public.contab_comprobantes WHERE id = _cbte_id;
  IF v_cbte.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_cbte.asiento_id IS NOT NULL THEN RETURN v_cbte.asiento_id; END IF;

  SELECT COALESCE(razon_social,'-') INTO v_tercero FROM public.contab_terceros WHERE id = v_cbte.tercero_id;
  v_desc := v_cbte.tipo::text || ' ' || lpad(v_cbte.punto_venta::text,5,'0') || '-' || lpad(v_cbte.numero::text,8,'0') || ' ' || COALESCE(v_tercero,'');

  v_total_iva  := COALESCE(v_cbte.iva_21,0)+COALESCE(v_cbte.iva_105,0)+COALESCE(v_cbte.iva_27,0);
  v_total_perc := COALESCE(v_cbte.perc_iva,0)+COALESCE(v_cbte.perc_iibb,0)+COALESCE(v_cbte.perc_otras,0);

  SELECT id INTO v_cuenta_iva_db FROM public.contab_plan_cuentas WHERE codigo='1.1.4.01' LIMIT 1;
  SELECT id INTO v_cuenta_iva_cr FROM public.contab_plan_cuentas WHERE codigo='2.1.3.01' LIMIT 1;
  SELECT id INTO v_cuenta_deudores FROM public.contab_plan_cuentas WHERE codigo='1.1.2.01' LIMIT 1;
  SELECT id INTO v_cuenta_proveedores FROM public.contab_plan_cuentas WHERE codigo='2.1.1.01' LIMIT 1;
  SELECT id INTO v_cuenta_ventas FROM public.contab_plan_cuentas WHERE codigo='4.1.1.01' LIMIT 1;
  SELECT id INTO v_cuenta_compras FROM public.contab_plan_cuentas WHERE codigo='5.1.1.01' LIMIT 1;
  SELECT id INTO v_cuenta_percep FROM public.contab_plan_cuentas WHERE codigo='1.1.4.02' LIMIT 1;

  INSERT INTO public.contab_asientos (fecha, descripcion, origen, comprobante_id, total_debe, total_haber, created_by)
  VALUES (v_cbte.fecha, v_desc, CASE WHEN v_cbte.es_venta THEN 'VENTA' ELSE 'COMPRA' END, v_cbte.id, v_cbte.total, v_cbte.total, auth.uid())
  RETURNING id INTO v_asiento_id;

  IF v_cbte.es_venta THEN
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
    VALUES (v_asiento_id, v_orden, v_cuenta_deudores, 'Deudores - '||COALESCE(v_tercero,''), v_cbte.total, v_cbte.obra_id, v_cbte.maquinaria_id);
    v_orden := v_orden + 1;
    FOR v_it IN SELECT * FROM public.contab_comprobante_items WHERE comprobante_id = v_cbte.id ORDER BY orden LOOP
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
      VALUES (v_asiento_id, v_orden, COALESCE(v_it.cuenta_id, v_cuenta_ventas), v_it.descripcion, v_it.neto,
              COALESCE(v_it.obra_id, v_cbte.obra_id), COALESCE(v_it.maquinaria_id, v_cbte.maquinaria_id));
      v_orden := v_orden + 1;
    END LOOP;
    IF v_total_iva > 0 THEN
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber)
      VALUES (v_asiento_id, v_orden, v_cuenta_iva_cr, 'IVA Débito Fiscal', v_total_iva);
      v_orden := v_orden + 1;
    END IF;
    IF v_total_perc > 0 THEN
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber)
      VALUES (v_asiento_id, v_orden, v_cuenta_percep, 'Percepciones', v_total_perc);
    END IF;
  ELSE
    FOR v_it IN SELECT * FROM public.contab_comprobante_items WHERE comprobante_id = v_cbte.id ORDER BY orden LOOP
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
      VALUES (v_asiento_id, v_orden, COALESCE(v_it.cuenta_id, v_cuenta_compras), v_it.descripcion, v_it.neto,
              COALESCE(v_it.obra_id, v_cbte.obra_id), COALESCE(v_it.maquinaria_id, v_cbte.maquinaria_id));
      v_orden := v_orden + 1;
    END LOOP;
    IF v_total_iva > 0 THEN
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe)
      VALUES (v_asiento_id, v_orden, v_cuenta_iva_db, 'IVA Crédito Fiscal', v_total_iva);
      v_orden := v_orden + 1;
    END IF;
    IF v_total_perc > 0 THEN
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe)
      VALUES (v_asiento_id, v_orden, v_cuenta_percep, 'Percepciones a recuperar', v_total_perc);
      v_orden := v_orden + 1;
    END IF;
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
    VALUES (v_asiento_id, v_orden, v_cuenta_proveedores, 'Proveedores - '||COALESCE(v_tercero,''), v_cbte.total, v_cbte.obra_id, v_cbte.maquinaria_id);
  END IF;

  UPDATE public.contab_comprobantes
    SET asiento_id = v_asiento_id, estado = 'confirmado', confirmado_at = now(), confirmado_por = auth.uid()
    WHERE id = v_cbte.id;
  RETURN v_asiento_id;
END; $$;

-- FUNCION: generar asiento de pago
CREATE OR REPLACE FUNCTION public.contab_generar_asiento_pago(_pago_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pago public.contab_pagos%ROWTYPE;
  v_asiento_id uuid;
  v_tercero text;
  v_desc text;
  v_cuenta_contracta uuid;
  v_cuenta_caja uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO v_pago FROM public.contab_pagos WHERE id = _pago_id;
  IF v_pago.id IS NULL THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF v_pago.asiento_id IS NOT NULL THEN RETURN v_pago.asiento_id; END IF;

  SELECT COALESCE(razon_social,'-') INTO v_tercero FROM public.contab_terceros WHERE id = v_pago.tercero_id;
  v_desc := CASE WHEN v_pago.es_cobro THEN 'Cobranza ' ELSE 'Pago ' END || COALESCE(v_tercero,'') || ' - ' || v_pago.medio::text;

  IF v_pago.es_cobro THEN
    SELECT id INTO v_cuenta_contracta FROM public.contab_plan_cuentas WHERE codigo='1.1.2.01' LIMIT 1;
  ELSE
    SELECT id INTO v_cuenta_contracta FROM public.contab_plan_cuentas WHERE codigo='2.1.1.01' LIMIT 1;
  END IF;

  v_cuenta_caja := v_pago.cuenta_id;
  IF v_cuenta_caja IS NULL THEN
    SELECT id INTO v_cuenta_caja FROM public.contab_plan_cuentas WHERE codigo = CASE WHEN v_pago.medio = 'efectivo' THEN '1.1.1.01' ELSE '1.1.1.02' END LIMIT 1;
  END IF;

  INSERT INTO public.contab_asientos (fecha, descripcion, origen, pago_id, total_debe, total_haber, created_by)
  VALUES (v_pago.fecha, v_desc, CASE WHEN v_pago.es_cobro THEN 'COBRO' ELSE 'PAGO' END, v_pago.id, v_pago.monto, v_pago.monto, auth.uid())
  RETURNING id INTO v_asiento_id;

  IF v_pago.es_cobro THEN
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
    VALUES (v_asiento_id, 1, v_cuenta_caja, v_desc, v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
    VALUES (v_asiento_id, 2, v_cuenta_contracta, 'Cancelación deuda', v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
  ELSE
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
    VALUES (v_asiento_id, 1, v_cuenta_contracta, 'Cancelación deuda', v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
    VALUES (v_asiento_id, 2, v_cuenta_caja, v_desc, v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
  END IF;

  UPDATE public.contab_pagos SET asiento_id = v_asiento_id WHERE id = v_pago.id;

  IF v_pago.comprobante_id IS NOT NULL THEN
    UPDATE public.contab_comprobantes c
      SET estado = CASE
        WHEN (SELECT COALESCE(SUM(monto),0) FROM public.contab_pagos WHERE comprobante_id = c.id) >= c.total THEN 'pagado'::public.contab_cbte_estado
        WHEN (SELECT COALESCE(SUM(monto),0) FROM public.contab_pagos WHERE comprobante_id = c.id) > 0 THEN 'parcial'::public.contab_cbte_estado
        ELSE c.estado END
      WHERE id = v_pago.comprobante_id AND estado IN ('confirmado','parcial');
  END IF;

  RETURN v_asiento_id;
END; $$;

REVOKE ALL ON FUNCTION public.contab_generar_asiento_cbte(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.contab_generar_asiento_pago(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_generar_asiento_cbte(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contab_generar_asiento_pago(uuid) TO authenticated;
