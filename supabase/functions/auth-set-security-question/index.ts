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
    const { username, password, securityQuestion, securityAnswer } = await req.json();

    // Validate input
    if (!username || !password || !securityQuestion || !securityAnswer) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Connect to MySQL
    const dbName = Deno.env.get("MYSQL_DATABASE") || "";
    const salt = Deno.env.get("PASSWORD_SALT") || "tw_live_salt_2024";
    
    client = await new Client().connect({
      hostname: Deno.env.get("MYSQL_HOST") || "localhost",
      port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
      username: Deno.env.get("MYSQL_USERNAME") || "",
      password: Deno.env.get("MYSQL_PASSWORD") || "",
    });

    // Find user and verify password
    const users = await client.query(
      `SELECT id, password_hash FROM \`${dbName}\`.users WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!users || users.length === 0) {
      await client.close();
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users[0];

    // Verify password
    const passwordHash = await hashPassword(password, salt);
    
    if (passwordHash !== user.password_hash) {
      await client.close();
      return new Response(
        JSON.stringify({ error: "Password is incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash security answer (case-insensitive, trimmed)
    const securityAnswerHash = await hashPassword(securityAnswer.trim().toLowerCase(), salt);

    // Update security question and answer
    await client.execute(
      `UPDATE \`${dbName}\`.users SET security_question = ?, security_answer_hash = ? WHERE id = ?`,
      [securityQuestion, securityAnswerHash, user.id]
    );

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Security question set successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Set security question error:", error);
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
