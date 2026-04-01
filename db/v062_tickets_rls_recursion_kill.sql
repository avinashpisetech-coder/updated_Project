-- v062_tickets_rls_recursion_kill.sql
-- Description: Resolves the "Infinite Recursion" loop when updating tickets.
--
-- Loop: UPDATE tickets -> tickets RLS -> is_super_admin_safe() -> SELECT profiles
--        -> profiles RLS -> SELECT tickets (to check visibility) -> tickets RLS -> ...

-- 1. Create a SECURITY DEFINER helper to check ticket visibility without triggering RLS.
-- This breaks the cycle by allowing the permission check to query 'tickets' internaly.
CREATE OR REPLACE FUNCTION public.can_user_see_profile_of_ticket(profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Does the current user have a ticket relationship with the target profile?
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid())
    AND (t.requester_id = profile_id OR t.assigned_to_id = profile_id)
    LIMIT 1
  );
$$;

-- 2. Update the Profiles RLS policy to use the non-recursive helper.
DROP POLICY IF EXISTS "Allow read profiles unified" ON public.profiles;
CREATE POLICY "Allow read profiles unified"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR public.is_super_admin_safe()
    OR public.can_user_see_profile_of_ticket(profiles.id)
  );

-- 3. Update the Tickets RLS policy for UPDATE/INSERT to use the Safe-Pass.
-- This ensures that committing a protocol (Update) doesn't loop during the check.
DROP POLICY IF EXISTS "Allow super_admin read all tickets" ON public.tickets;
CREATE POLICY "Allow super_admin read all tickets" ON public.tickets
  FOR SELECT TO authenticated USING (id = id AND public.is_super_admin_safe());

-- Specifically fix the UPDATE policy for tickets
DROP POLICY IF EXISTS "Allow manage tickets" ON public.tickets;
CREATE POLICY "Allow manage tickets admin"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin_safe())
  WITH CHECK (public.is_super_admin_safe());

-- 4. Restore End-User Update access for their own tickets (needed for Commit Protocol)
DROP POLICY IF EXISTS "Allow requester update own tickets" ON public.tickets;
CREATE POLICY "Allow requester update own tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());
