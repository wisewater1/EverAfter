/*
  # Fix Security Issues - Part 3: Remaining RLS Policy Optimizations

  Optimize remaining RLS policies for better performance using correct column names.
*/

-- user_connections policies (correct column: addressee_id)
DROP POLICY IF EXISTS "Users can view own connections" ON public.user_connections;
CREATE POLICY "Users can view own connections" ON public.user_connections
  FOR SELECT TO authenticated
  USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create connection requests" ON public.user_connections;
CREATE POLICY "Users can create connection requests" ON public.user_connections
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update received connections" ON public.user_connections;
CREATE POLICY "Users can update received connections" ON public.user_connections
  FOR UPDATE TO authenticated
  USING (addressee_id = (select auth.uid()))
  WITH CHECK (addressee_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own connection requests" ON public.user_connections;
CREATE POLICY "Users can delete own connection requests" ON public.user_connections
  FOR DELETE TO authenticated
  USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));
