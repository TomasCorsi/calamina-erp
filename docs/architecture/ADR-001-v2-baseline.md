# ADR-001 — Baseline independiente de CALAMINA ERP v2

- **Estado:** Aceptado
- **Fecha:** 2026-10-01

## Contexto

CALAMINA ERP v2 parte de una copia del sistema productivo heredado. El legacy
continúa funcionando en Lovable Cloud y queda fuera del alcance operativo de
este repositorio.

La copia contiene configuración de entorno, migraciones, Edge Functions,
metadatos Lovable y tipos generados asociados al backend anterior. Reutilizar
esa configuración o reproducir automáticamente su historial podría conectar el
nuevo desarrollo a producción o trasladar deuda y vulnerabilidades históricas.

## Decisión

1. ERP v2 será un sistema independiente.
2. Supabase será el backend de v2 y se administrará directamente.
3. `supabase/migrations/` será la única autoridad de esquema.
4. Las migraciones históricas Supabase y Drizzle no se reproducirán en v2.
5. Se diseñará un baseline limpio a partir del estado funcional deseado.
6. npm será el único package manager.
7. Los ambientes serán local, staging y producción, con proyectos y secretos
   separados.
8. El desarrollo local no podrá inicializar Supabase con una URL remota.
9. Lovable queda fuera del build, preview, Auth, despliegue y operación de v2.
10. El contenido heredado se conservará bajo `legacy/` sólo como referencia.

## Consecuencias

- La aplicación no puede iniciarse hasta proporcionar configuración local
  válida.
- Los tipos Supabase actuales son temporales y deberán regenerarse después del
  baseline v2.
- La migración de datos necesitará un proceso ETL separado y validado.
- Las funciones legacy deberán revisarse o rediseñarse antes de volver a formar
  parte de un backend v2.
- Ninguna operación de esta fase crea, vincula o modifica proyectos Supabase.

## Lint baseline heredado

El código legacy parte con 450 errores de lint que Fase 0A no introdujo.
Durante esta transición, `npm run typecheck` y `npm run build` son gates
obligatorios de CI, mientras que el lint completo queda temporalmente diferido.

El gate de lint se reactivará cuando exista un boundary v2 o un baseline
verificable que permita medir la deuda sin ocultarla. Hasta entonces, el script
`npm run lint` se conserva y todo código v2 nuevo deberá tender a cumplir las
reglas vigentes sin aumentar la deuda heredada.

## Higiene de dependencias críticas

En Fase 0B se actualizó `jspdf` de `4.0.0` a `4.2.1` para corregir
vulnerabilidades de inyección y denegación de servicio publicadas para las
versiones hasta `4.2.0`. La versión continúa siendo compatible con
`jspdf-autotable` y con los imports y APIs utilizados por los generadores PDF
existentes.

Después de la actualización, `npm audit` informa 32 vulnerabilidades
(2 low, 10 moderate y 20 high) y `npm audit --omit=dev` informa 29
(2 low, 9 moderate y 18 high), sin vulnerabilidades critical en ninguno de los
dos casos. Permanecen hallazgos high que requieren tratamiento separado, entre
ellos routing (`react-router-dom`), archivos Excel (`xlsx`), dependencias de
runtime transitivas y herramientas de build. La exposición real a inputs no
confiables debe evaluarse antes de actualizar esos paquetes.

No se utilizará `npm audit fix` ni `npm audit fix --force` como mecanismo
automático: cada actualización se revisará por alcance, compatibilidad y riesgo
funcional.
