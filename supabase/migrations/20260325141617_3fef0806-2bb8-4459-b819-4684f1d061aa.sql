ALTER TABLE cotizaciones ALTER COLUMN numero DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN descripcion DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN responsable DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN fecha_vencimiento DROP NOT NULL;