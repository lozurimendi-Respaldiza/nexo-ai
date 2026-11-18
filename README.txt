NEXO AI — migraciones históricas recuperadas

Contenido:
- 20261109201337_initial_multitenant_crm_schema.sql
- 20261109201344_tighten_workspace_rls_and_foreign_keys.sql
- 20261109201349_index_foreign_keys.sql

Estas migraciones se han reconstruido a partir de las sentencias exportadas
de supabase_migrations.schema_migrations del proyecto remoto.

IMPORTANTE:
- Ya constan como aplicadas en el proyecto remoto.
- Estos archivos sirven para recuperar el historial local del repositorio.
- NO volver a ejecutarlas contra la base de datos.
- NO ejecutar supabase db push ni reaplicar estas migraciones.
