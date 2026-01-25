import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let client: Client | null = null;

  try {
    // Connect to MySQL
    client = await new Client().connect({
      hostname: Deno.env.get("MYSQL_HOST") || "localhost",
      port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
      username: Deno.env.get("MYSQL_USERNAME") || "",
      password: Deno.env.get("MYSQL_PASSWORD") || "",
      db: Deno.env.get("MYSQL_DATABASE") || "",
    });

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (req.method === "GET") {
      // Fetch monitors for a user (or all if no user_id)
      let monitors;
      if (userId) {
        monitors = await client.query(
          "SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC",
          [userId]
        );
      } else {
        monitors = await client.query(
          "SELECT * FROM monitors ORDER BY created_at DESC"
        );
      }

      await client.close();

      return new Response(
        JSON.stringify({ success: true, monitors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, channel_id, channel_name, channel_url, thumbnail_url } = body;

      if (!user_id || !channel_id) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "user_id and channel_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already exists
      const existing = await client.query(
        "SELECT id FROM monitors WHERE user_id = ? AND channel_id = ? LIMIT 1",
        [user_id, channel_id]
      );

      if (existing && existing.length > 0) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "Monitor already exists for this channel" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await client.execute(
        `INSERT INTO monitors (user_id, channel_id, channel_name, channel_url, thumbnail_url, is_live, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, false, NOW(), NOW())`,
        [user_id, channel_id, channel_name || "", channel_url || "", thumbnail_url || ""]
      );

      const newMonitors = await client.query(
        "SELECT * FROM monitors WHERE id = ?",
        [result.lastInsertId]
      );

      await client.close();

      return new Response(
        JSON.stringify({ success: true, monitor: newMonitors[0] }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      const { monitor_id, user_id: deleteUserId } = body;

      if (!monitor_id) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "monitor_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await client.execute(
        "DELETE FROM monitors WHERE id = ? AND user_id = ?",
        [monitor_id, deleteUserId]
      );

      await client.close();

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await client.close();
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Monitors API error:", error);
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
