NEXO AI — EDITAR OPORTUNIDAD UI 1.0

Contenido:
- src/app/opportunities/[id]/page.tsx

Instalación:
1. Haz una copia de seguridad del archivo actual:
   src/app/opportunities/[id]/page.tsx
2. Extrae este ZIP en la raíz del proyecto, manteniendo la estructura de carpetas.
3. Reemplaza el archivo cuando Windows lo solicite.
4. Desde PowerShell, en la carpeta del proyecto, ejecuta:
   npm run typecheck
   npm run build
5. Inicia la aplicación y abre una oportunidad existente desde el pipeline.
6. Comprueba que aparecen los datos actuales, que puedes guardar cambios y que la acción de eliminar sigue solicitando confirmación.

Alcance:
- Actualiza únicamente la presentación visual de la página de detalle/edición.
- Conserva la autenticación, la comprobación de pertenencia al workspace, las consultas,
  los nombres de campos, las acciones de servidor y la lista de etapas.
- No requiere cambios en Supabase ni migraciones.

Nota:
La compilación y la prueba funcional deben ejecutarse en el proyecto local.
