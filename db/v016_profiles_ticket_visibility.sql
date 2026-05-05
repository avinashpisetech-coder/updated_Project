-- Allow users to read profiles referenced in tickets they can access
CREATE POLICY "Allow read profiles for visible tickets"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE (
        t.requester_id = profiles.id
        OR t.assigned_to_id = profiles.id
      )
      AND (
        -- User can see the ticket by existing ticket RLS
        t.requester_id = auth.uid()
        OR t.created_by_id = auth.uid()
        OR t.affected_person_id = auth.uid()
        OR t.assigned_to_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profile_module_access pma
          WHERE pma.profile_id = auth.uid() AND pma.can_view = true AND pma.module_id = t.module_id
        )
        OR public.is_admin()
      )
    )
  );
