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
    const dbName = Deno.env.get("MYSQL_DATABASE") || "";
    client = await new Client().connect({
      hostname: Deno.env.get("MYSQL_HOST") || "localhost",
      port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
      username: Deno.env.get("MYSQL_USERNAME") || "",
      password: Deno.env.get("MYSQL_PASSWORD") || "",
    });

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    // GET - 取得用戶頭像檔名
    if (req.method === "GET") {
      if (!userId) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const avatars = await client.query(
        `SELECT filename FROM \`${dbName}\`.user_avatars WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      await client.close();

      if (!avatars || avatars.length === 0) {
        return new Response(
          JSON.stringify({ success: true, filename: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, filename: avatars[0].filename }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - 新增或更新頭像
    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, filename } = body;

      if (!user_id || !filename) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "user_id and filename are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // UPSERT - 如果存在就更新，不存在就插入
      await client.execute(
        `INSERT INTO \`${dbName}\`.user_avatars (user_id, filename, created_at, updated_at) 
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE filename = ?, updated_at = NOW()`,
        [user_id, filename, filename]
      );

      await client.close();

      return new Response(
        JSON.stringify({ success: true, filename }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - 刪除頭像記錄
    if (req.method === "DELETE") {
      const body = await req.json();
      const { user_id } = body;

      if (!user_id) {
        await client.close();
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await client.execute(
        `DELETE FROM \`${dbName}\`.user_avatars WHERE user_id = ?`,
        [user_id]
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
    console.error("Avatars API error:", error);
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
