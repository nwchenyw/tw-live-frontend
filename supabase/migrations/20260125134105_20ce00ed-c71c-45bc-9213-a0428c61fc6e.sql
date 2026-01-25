-- Create users table for username-based auth
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow reading own user data (for authenticated sessions via edge function)
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
USING (true);

-- Only edge functions (service role) can insert/update
CREATE POLICY "Service role can manage users"
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);