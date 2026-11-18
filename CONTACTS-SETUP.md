# NEXO AI — Módulo de contactos

## Contenido

- `/contacts`: listado, búsqueda y contador.
- `/contacts/new`: alta de contacto.
- `/contacts/[id]`: ficha, notas e historial de actividad.
- `/contacts/[id]/edit`: edición.
- Eliminación con confirmación del navegador.
- Registro de llamadas, emails, reuniones, notas y otras interacciones.

## Instalación

1. Descomprime el ZIP en la raíz del proyecto `nexo-ai-starter`.
2. Permite combinar carpetas y reemplazar `src/app/dashboard/page.tsx` cuando Windows lo solicite.
3. No reemplaces `.env.local`, `package.json` ni los archivos de autenticación.
4. Ejecuta:

```powershell
npm run typecheck
npm run build
```

5. Si ambos comandos terminan correctamente, inicia el servidor:

```powershell
npm run dev
```

6. Accede a `http://localhost:3000/contacts` o pulsa **Gestionar contactos** en el dashboard.

## Seguridad

- Las operaciones se realizan con el cliente Supabase de servidor y la sesión del usuario.
- El `workspace_id` se obtiene de la membresía autenticada; nunca se acepta desde el formulario.
- Las consultas CRUD filtran por `workspace_id` y quedan además protegidas por RLS.
- La creación de actividad verifica que el contacto pertenezca al workspace activo.
- No requiere nuevas dependencias ni claves secretas.

## Limitaciones de esta entrega

- La búsqueda muestra los primeros 50 resultados; no incorpora todavía paginación.
- La ficha muestra hasta 50 actividades recientes.
- No incluye importación CSV, duplicados, adjuntos ni sincronización externa.
- Si un usuario pertenece a varios workspaces, esta versión selecciona su primera membresía; el selector de workspace se añadirá cuando se implemente la gestión de equipos.
