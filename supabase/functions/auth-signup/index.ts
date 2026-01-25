import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function using Web Crypto API
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let client: Client | null = null;

  try {
    const { username, password } = await req.json();

    // Validate input
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (username.length < 1 || username.length > 50) {
      return new Response(
        JSON.stringify({ error: "Username must be between 1 and 50 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to MySQL
    client = await new Client().connect({
      hostname: Deno.env.get("MYSQL_HOST") || "localhost",
      port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
      username: Deno.env.get("MYSQL_USERNAME") || "",
      password: Deno.env.get("MYSQL_PASSWORD") || "",
      db: Deno.env.get("MYSQL_DATABASE") || "",
    });

    // Check if username already exists
    const existingUsers = await client.query(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (existingUsers && existingUsers.length > 0) {
      await client.close();
      return new Response(
        JSON.stringify({ error: "Username already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash password and create user
    const salt = Deno.env.get("PASSWORD_SALT") || "tw_live_salt_2024";
    const passwordHash = await hashPassword(password, salt);
    
    const result = await client.execute(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())",
      [username, passwordHash]
    );

    // Get the newly created user
    const newUsers = await client.query(
      "SELECT id, username, created_at FROM users WHERE id = ?",
      [result.lastInsertId]
    );

    await client.close();

    const newUser = newUsers[0];

    return new Response(
      JSON.stringify({ success: true, user: newUser }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Signup error:", error);
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
