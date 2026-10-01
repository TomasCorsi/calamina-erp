-- Make all personal fields optional (nullable)
ALTER TABLE personal ALTER COLUMN nombre DROP NOT NULL;
ALTER TABLE personal ALTER COLUMN apellido DROP NOT NULL;
ALTER TABLE personal ALTER COLUMN dni DROP NOT NULL;
ALTER TABLE personal ALTER COLUMN telefono DROP NOT NULL;
ALTER TABLE personal ALTER COLUMN fecha_ingreso DROP NOT NULL;

-- Set default value for rol so it can be omitted
ALTER TABLE personal ALTER COLUMN rol SET DEFAULT 'chofer'::rol_personal;