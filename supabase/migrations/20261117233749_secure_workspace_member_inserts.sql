
-- NEXO AI
-- Restringe las inserciones directas de miembros y espacios.
-- Centraliza el alta de miembros en una RPC con validación de permisos.

-- 1. Función interna: alta controlada de un miembro existente.
CREATE OR REPLACE FUNCTION private.add_workspace_member_internal(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RETURN 'unauthenticated';
  END IF;

  IF p_workspace_id IS NULL OR p_user_id IS NULL THEN
    RETURN 'invalid_parameters';
  END IF;

  IF p_user_id = v_actor_id THEN
    RETURN 'cannot_add_self';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('member', 'admin') THEN
    RETURN 'invalid_role';
  END IF;

  -- Mismo bloqueo por usuario que utilizan los flujos de invitación
  -- y creación de espacios para evitar altas concurrentes.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  -- Comprobar el rol del usuario que ejecuta la operación.
  SELECT wm.role
  INTO v_actor_role
  FROM public.workspace_members AS wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_actor_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN 'actor_not_authorized';
  END IF;

  IF v_actor_role NOT IN ('owner', 'admin') THEN
    RETURN 'actor_not_authorized';
  END IF;

  IF v_actor_role = 'admin' AND p_role <> 'member' THEN
    RETURN 'admin_cannot_add_admin';
  END IF;

  -- Solo admitir usuarios existentes con email confirmado.
  PERFORM 1
  FROM auth.users AS u
  WHERE u.id = p_user_id
    AND u.email_confirmed_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN 'target_not_found_or_unconfirmed';
  END IF;

  -- Evitar duplicados en el mismo espacio.
  IF EXISTS (
    SELECT 1
    FROM public.workspace_members AS wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_user_id
  ) THEN
    RETURN 'already_member';
  END IF;

  -- Mantener la regla actual: un usuario solo puede pertenecer
  -- a un espacio de trabajo.
  IF EXISTS (
    SELECT 1
    FROM public.workspace_members AS wm
    WHERE wm.user_id = p_user_id
  ) THEN
    RETURN 'already_in_other_workspace';
  END IF;

  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role
  )
  VALUES (
    p_workspace_id,
    p_user_id,
    p_role
  );

  RETURN 'added';
END;
$function$;

-- 2. Función pública invocada desde la aplicación.
CREATE OR REPLACE FUNCTION public.add_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS text
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.add_workspace_member_internal(
    p_workspace_id,
    p_user_id,
    p_role
  );
$function$;

-- 3. Limitar la ejecución de ambas funciones.
REVOKE ALL ON FUNCTION
  private.add_workspace_member_internal(uuid, uuid, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  private.add_workspace_member_internal(uuid, uuid, text)
  TO authenticated;

REVOKE ALL ON FUNCTION
  public.add_workspace_member(uuid, uuid, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.add_workspace_member(uuid, uuid, text)
  TO authenticated;

-- 4. Retirar permisos de INSERT directos a authenticated.
REVOKE INSERT ON TABLE public.workspaces FROM authenticated;
REVOKE INSERT (
  created_at,
  created_by,
  id,
  name,
  updated_at
) ON TABLE public.workspaces FROM authenticated;

REVOKE INSERT ON TABLE public.workspace_members FROM authenticated;
REVOKE INSERT (
  created_at,
  role,
  user_id,
  workspace_id
) ON TABLE public.workspace_members FROM authenticated;

-- 5. Eliminar políticas de INSERT que ya no serán necesarias.
DROP POLICY IF EXISTS
  "authenticated users can create their own workspace"
  ON public.workspaces;

DROP POLICY IF EXISTS
  "workspace admins can add members"
  ON public.workspace_members;

DROP POLICY IF EXISTS
  "workspace creator can add initial membership"
  ON public.workspace_members;

DROP POLICY IF EXISTS
  "workspace owners can add members and admins"
  ON public.workspace_members;
