# NEXO AI — integración de Auth

Esta ampliación añade registro, inicio de sesión, confirmación de email, cierre de sesión, onboarding de workspace y un dashboard protegido para Next.js 16 App Router.

## Archivos
Copia el contenido de `src/` en el directorio `src/` del proyecto, conservando la estructura. No reemplaces `src/app/page.tsx` ni `src/app/layout.tsx`.

## Supabase Auth
En el Dashboard de Supabase, abre **Authentication → URL Configuration**:
- Site URL: URL local de desarrollo y, posteriormente, dominio de producción.
- Redirect URLs: añade `http://localhost:3000/auth/callback` y la URL exacta de producción terminada en `/auth/callback`.

En Authentication → Providers → Email, decide si exigir confirmación de email. Si está activada, el usuario recibirá un enlace y el workspace se crea al volver por `/auth/callback`. Configura SMTP de producción antes de lanzar el SaaS; el servicio de correo de prueba de Supabase tiene límites.

## RPC de creación del workspace
La función `public.create_workspace_for_current_user(text)` se ha creado en el proyecto NEXO AI. Es `SECURITY INVOKER`, exige `auth.uid()`, serializa altas simultáneas del mismo usuario, crea workspace y rol owner en una sola transacción, y solo concede EXECUTE a `authenticated`.

Si quieres reproducirla en otra base, ejecuta el SQL incluido en `supabase/create_workspace_rpc.sql`.

## Seguridad
- La publishable key puede estar en `NEXT_PUBLIC_`; nunca pongas una secret/service_role key en el navegador.
- `workspace_name` en `user_metadata` solo se usa como etiqueta inicial, nunca como autorización.
- El dashboard obtiene el usuario con `auth.getUser()` y consulta membresías bajo RLS.
- El Proxy renueva cookies; no sustituye las comprobaciones de autorización del servidor.
- Revisa las URL de callback y el proveedor de correo antes de producción.

## Validación local
Desde la raíz del repositorio:
```powershell
npm run typecheck
npm run build
npm run dev
```
Prueba con una dirección de correo que controles:
1. Abre `/login` y crea una cuenta.
2. Confirma el correo si Supabase lo exige.
3. Comprueba que `/dashboard` muestra el nombre del workspace y contadores a cero.
4. Cierra sesión y verifica que `/dashboard` redirige a `/login`.
5. Vuelve a iniciar sesión y comprueba que conserva el mismo workspace.

No uses datos personales de terceros para esta prueba.
