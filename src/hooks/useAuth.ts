import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface Session {
  token: string;
  user: User;
}

const SESSION_KEY = "yt_live_session";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as Session;
        setSession(parsed);
        setUser(parsed.user);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Login failed" };
      }

      // Store session
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      setSession(data.session);
      setUser(data.session.user);

      return {};
    } catch (error: any) {
      return { error: error.message || "Network error" };
    }
  }, []);

  const signup = useCallback(async (username: string, password: string, adminPassword: string): Promise<{ error?: string }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ username, password, adminPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Signup failed" };
      }

      return {};
    } catch (error: any) {
      return { error: error.message || "Network error" };
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setUser(null);
  }, []);

  return {
    user,
    session,
    loading,
    login,
    signup,
    signOut,
    isAuthenticated: !!session,
  };
};
