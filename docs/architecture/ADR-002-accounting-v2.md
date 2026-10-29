# ADR-002 — Contabilidad v2

## Estado

Implementado localmente el 8 de octubre de 2026.

## Decisión

CALAMINA ERP utiliza contabilidad por devengado, partida doble y moneda funcional ARS. `public.journal_entries` y `public.journal_entry_lines` son el libro contable. Los asientos confirmados son inmutables y cualquier corrección requiere una reversión explícita.

La numeración se asigna al confirmar, por empresa y ejercicio. Los períodos se cierran mensualmente. Las operaciones automáticas utilizan una clave idempotente y una identidad de evento origen para impedir contabilizaciones duplicadas.

`obra_id` y `maquinaria_id` son dimensiones analíticas independientes de una misma línea. No son cuentas ni crean importes adicionales. `requires_work` puede exigir obra según la cuenta; no existe `requires_machine`. Una maquinaria inactiva sigue siendo válida en históricos.

## Seguridad

- Lecturas limitadas por membership activa, empresa y permisos.
- Escrituras financieras exclusivamente mediante RPC transaccionales.
- `accounting.view`, `accounting.manage`, `accounting.post`, `treasury.view` y `treasury.manage` se asignan inicialmente sólo a `admin`.
- Confirmaciones, reversiones, cierres y tesorería dejan auditoría.
- No hay credenciales privilegiadas en el frontend.

## Integraciones

- Facturas, certificados, liquidaciones, pagos, cobros y transferencias pueden generar asientos determinísticos.
- Gastos, combustible y mantenimiento generan borradores revisables.
- Combustible conserva obra, maquinaria, período y precio de valuación; no mezcla equipos distintos.
- Remitos y Parte Diario no contabilizan por su sola existencia.
- Órdenes de compra no generan deuda: la obligación nace con la factura de proveedor.

## Operatoria y navegación

`/contabilidad` es la home del subsistema y contiene un launcher estático de doce sectores. Cada sector usa una ruta lazy independiente, por lo que el launcher no ejecuta consultas contables. Los formularios y tablas existentes se reutilizan dentro de Ventas, Compras, Tesorería, Contable, IVA e Informes.

Clientes y Proveedores continúan siendo los únicos maestros comerciales. `accounting_parties` es un vínculo interno y Contabilidad no puede crear un maestro paralelo.

- Facturas y notas de débito incrementan la deuda.
- Notas de crédito revierten ingresos/costos e IVA y pueden aplicarse a varios documentos.
- Certificados originan un borrador de factura; no generan deuda directamente.
- Tesorería es la única fuente de nuevos pagos y cobranzas.
- Pagos y cobranzas pueden aplicarse parcialmente a varios documentos sin generar más de un asiento.

Las lecturas transitorias `contab_*` siguen siendo vistas de compatibilidad sobre el esquema v2. Los reportes de obra y maquinaria agregan líneas confirmadas y nunca suman dos veces una línea que contiene ambas dimensiones.

## Pendientes deliberados

- Migración y asiento de apertura de datos reales.
- Conciliación bancaria avanzada.
- Cheques, retenciones complejas y cierres anuales.
- Presentación fiscal ARCA/AFIP.
- Revaluación automática de moneda extranjera.
