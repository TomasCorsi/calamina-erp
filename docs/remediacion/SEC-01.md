# LEGACY / REFERENCE — Remediación SEC-01

> Documento histórico del sistema legacy; no es una migración base de ERP v2.

## Problema

El flujo público de registro de empleados podía consultar una vista `SECURITY DEFINER` enumerable derivada de `public.personal`. Aunque la vista limitaba las columnas, cualquier cliente anónimo podía obtener en bloque identificadores, legajos, roles y estado de vinculación.

La remediación elimina esa superficie pública y la reemplaza por una función que sólo responde si un legajo puntual existe y está disponible para vincularse.

## Evidencia original

La migración `supabase/migrations/20260128175102_5761f409-8f01-4391-a10f-d56233cb55b2.sql` creó la policy `Allow public legajo lookup for registration` con `FOR SELECT USING (true)` sobre `public.personal`.

Esa policy fue eliminada posteriormente por `supabase/migrations/20260129155818_1deb867e-5a70-4712-afed-3d978d3c3c88.sql`. Por lo tanto, no era el mecanismo final versionado.

La exposición que permanecía en el historial era `public.personal_legajo_lookup`, recreada con `security_invoker = off` y concedida a `anon` por `supabase/migrations/20260212153953_aa11946e-93a8-4808-ac08-7fd4f69ac757.sql`. La vista devolvía:

- `id`;
- `legajo`;
- `rol`;
- `ya_vinculado`.

`src/pages/RegistroEmpleado.tsx` consultaba esa vista antes de crear el usuario.

## Riesgo

Un cliente anónimo podía consultar la vista sin conocer previamente un legajo y enumerar información laboral que no era necesaria para validar un registro. El riesgo incluía reconocimiento de empleados, legajos, roles y cuentas ya vinculadas.

El estado realmente desplegado de migrations, grants y policies no puede demostrarse desde el repositorio y debe comprobarse en Lovable Cloud.

## Flujo de registro encontrado

1. `/registro-empleado` solicita nombre, legajo, email, teléfono y contraseña.
2. Antes de la remediación, el navegador consultaba `personal_legajo_lookup` por legajo.
3. Si encontraba una fila libre, ejecutaba `supabase.auth.signUp` incluyendo el legajo en metadata.
4. Después intentaba `link_personal_to_user` con el legajo y el UUID creado.
5. Esa RPC devuelve, entre otros datos, el rol del registro vinculado.
6. El frontend aplica el mapeo existente y conserva el intento de `upsert` sobre `user_roles`.

La asignación de roles también ocurre en `handle_new_user` y `link_personal_to_user`. Esos mecanismos no fueron modificados en esta remediación.

## Solución elegida

Se reemplazó la consulta pública a la vista por:

```sql
public.is_personal_legajo_available(p_legajo text) returns boolean
```

La función devuelve `true` únicamente cuando el legajo, después de aplicar `btrim`, existe y no tiene `user_id`. Devuelve el mismo `false` para valores vacíos, legajos inexistentes y legajos vinculados.

La función es `STABLE`, `SECURITY DEFINER`, usa `search_path = pg_catalog` y referencia `public.personal` explícitamente. No retorna columnas de `personal`.

El frontend obtiene el rol exclusivamente del resultado posterior de `link_personal_to_user`, no del lookup anónimo. El mapeo y el upsert existentes se mantienen. Si la vinculación no devuelve un rol, no se inventa uno ni se intenta obtenerlo públicamente.

## Archivos modificados

- `supabase/migrations/20260930180000_8f2a3d8e-2dfc-4f43-9bfe-7f0b14dcfb2f.sql`
- `src/pages/RegistroEmpleado.tsx`
- `src/integrations/supabase/types.ts`
- `docs/remediacion/SEC-01.md`

No se modificaron rutas, `ProtectedRoute`, `handle_new_user`, `link_personal_to_user`, policies de `user_roles` ni otros módulos.

## Migración creada

La nueva migración es forward-only y realiza, en orden:

1. `DROP POLICY IF EXISTS` de la policy histórica vulnerable.
2. `REVOKE SELECT` únicamente al rol `anon` sobre `public.personal`.
3. `DROP VIEW IF EXISTS public.personal_legajo_lookup`, sin `CASCADE`.
4. Creación de la RPC booleana.
5. Revocación de ejecución a `PUBLIC` y `authenticated`.
6. Concesión de ejecución exclusivamente a `anon`.

No modifica ni elimina datos.

## Cambios de permisos

Permisos eliminados:

- `SELECT` directo de `anon` sobre `public.personal`, si existía como grant directo.
- acceso anónimo a `personal_legajo_lookup`, como consecuencia de eliminar la vista.
- ejecución implícita de la nueva RPC por `PUBLIC` y ejecución por `authenticated`.

Permiso agregado:

- `EXECUTE` de `is_personal_legajo_available(text)` para `anon`.

No se revocan ni conceden permisos de tabla a `authenticated`, `service_role`, admin o capataz. Sus grants y policies permanecen sin cambios.

## Riesgos residuales

- Un atacante todavía puede probar legajos individualmente y observar un booleano positivo para los que estén disponibles. CAPTCHA, rate limiting o invitaciones quedan fuera de SEC-01.
- Existe una carrera entre la comprobación de disponibilidad y la vinculación posterior.
- No se valida `personal.activo`, para no cambiar una regla de negocio en esta corrección.
- La ruta pública `/registro` general permanece sin cambios.
- Los grants y policies efectivos de producción requieren inspección manual.

## Relación con SEC-02

SEC-02 no fue implementado ni mitigado como efecto colateral. Permanecen sin cambios:

- la confianza en el legajo incluido en metadata;
- `handle_new_user`;
- `link_personal_to_user`;
- el mapeo `administrativo -> admin`;
- las policies de `user_roles`;
- el bloque cliente de mapeo/upsert.

El único ajuste relacionado es que el rol utilizado por el bloque cliente proviene ahora del resultado autenticado de `link_personal_to_user`, porque la RPC pública de SEC-01 no puede exponerlo.

## Pruebas necesarias

En un ambiente aislado deben verificarse estos casos:

1. `anon` no puede ejecutar `SELECT` sobre `public.personal`.
2. `personal_legajo_lookup` ya no existe.
3. La nueva RPC sólo devuelve un booleano.
4. Un legajo existente y sin vincular devuelve `true`.
5. Un legajo inexistente, vacío o ya vinculado devuelve el mismo `false`.
6. Un usuario `authenticated` sin permisos no puede ejecutar esta RPC ni leer filas ajenas.
7. Admin, capataz y empleado sobre su propia fila conservan sus accesos RLS actuales.
8. Un registro válido conserva signup, vinculación y el mapeo/upsert existente usando el rol devuelto por `link_personal_to_user`.
9. Ninguna respuesta pública contiene ID, rol, nombre, DNI, teléfono, email, banco, cuenta, salario u observaciones.

El repositorio no tiene infraestructura de tests y no se instalaron dependencias como parte de esta corrección.

## Verificación pendiente en Lovable Cloud

- Confirmar que todas las migraciones históricas relevantes están aplicadas.
- Inspeccionar grants efectivos de `anon`, `authenticated` y `service_role` sobre `personal`.
- Confirmar que no exista otra vista o RPC anónima que exponga datos de `personal`.
- Probar el endpoint REST de `personal` con una sesión anónima controlada.
- Probar la nueva RPC para los cinco estados de entrada documentados.
- Confirmar que admin, capataz y empleados conservan sus accesos esperados.
- Revisar logs de acceso previos a la remediación.
- Evaluar CAPTCHA/rate limiting y un mecanismo de invitación al tratar SEC-02.

## Procedimiento recomendado de despliegue

Este procedimiento es documental. No fue ejecutado.

1. Revisar y aprobar el diff completo.
2. Preparar un ambiente de staging separado de producción.
3. Con herramientas previamente instaladas y autorizadas, verificar el frontend local:

   ```bash
   npm ci
   npm run lint
   npm run build
   ```

4. Vincular Supabase CLI exclusivamente al proyecto de staging y revisar el plan:

   ```bash
   supabase link --project-ref <STAGING_PROJECT_REF>
   supabase db push --dry-run
   ```

5. Aplicar la migración en staging y desplegar inmediatamente el frontend:

   ```bash
   supabase db push
   ```

6. Ejecutar todos los casos de prueba anteriores y revisar logs.
7. Programar una ventana coordinada para producción. Aplicar primero la migración y luego el frontend. Durante el intervalo, el registro de empleados fallará de forma cerrada.
8. Repetir la inspección de grants y las pruebas anónimas en producción.
9. Regenerar los tipos Supabase desde el esquema desplegado en una tarea controlada posterior.

No se recomienda restaurar la vista pública como rollback. Ante un fallo, debe mantenerse temporalmente cerrado el registro o corregirse hacia adelante mediante otra migración revisada.
