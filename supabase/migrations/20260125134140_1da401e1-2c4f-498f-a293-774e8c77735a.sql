-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- No RLS policies needed - edge functions use service role key which bypasses RLS
-- The users table should only be accessed via edge functions, never directly from client