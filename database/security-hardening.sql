-- Endurecimiento de privilegios SQL.
-- RLS no protege frente a TRUNCATE. La app no necesita este privilegio.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
