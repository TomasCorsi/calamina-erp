# Auth e invitaciones locales de CALAMINA ERP v2

Este bloque habilita exclusivamente el flujo local mínimo de acceso a ERP v2.
No contiene integración de correo, conexión a Supabase Cloud ni mecanismos de
provisión para staging o producción.

## Alcance

- El bootstrap local existente crea el primer administrador.
- Un usuario con `users.invite` puede crear y revocar invitaciones pendientes.
- El token se genera en la Edge Function y la base guarda únicamente SHA-256.
- La invitación vence a las 72 horas y reserva su uso durante la aceptación.
- La aceptación crea un usuario confirmado y finaliza profile, membership, rol,
  estado de invitación y auditoría dentro de una única RPC transaccional.
- Los permisos que ve la UI provienen de `api.current_user_permissions()`; RLS
  y las RPC continúan siendo la autoridad.

No se implementó HMAC, envío de email, recuperación compleja ni idempotencia
distribuida. Si la finalización falla después de crear Auth, la Edge Function
reintenta una vez y luego intenta borrar solamente ese usuario recién creado.

## Prueba manual local

1. Ejecutar `npm.cmd run supabase:start`.
2. Crear `.env.local` a partir de `.env.example` con
   `VITE_APP_ENV=local`, `VITE_SUPABASE_URL=http://127.0.0.1:54321` y la
   publishable/anon key que informa `npm.cmd run supabase:status`.
3. Configurar `.env.bootstrap.local` según la documentación del bootstrap y
   ejecutar `npm.cmd run auth:bootstrap:local`.
4. Ejecutar `npm.cmd run dev`.
5. Abrir `http://localhost:5173`, iniciar sesión con el admin y entrar en
   **Usuarios**.
6. Crear una invitación, copiar su enlace y abrirlo en una ventana incógnita.
7. Elegir nombre y contraseña, aceptar la invitación e iniciar sesión con el
   nuevo usuario.

El smoke reproducible se ejecuta con `npm.cmd run auth:smoke:local` después de
un reset y usando las mismas variables locales del bootstrap. No imprime el
token, contraseñas ni claves de Supabase.
