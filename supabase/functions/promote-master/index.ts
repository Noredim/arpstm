import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = { email: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[promote-master] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { email } = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (!email || !String(email).includes("@")) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders });
  }

  console.log("[promote-master] Promoting user to ADMIN", { email });

  const { error } = await supabaseAdmin.rpc("promote_user_to_admin", {
    target_email: String(email),
  });

  if (error) {
    console.error("[promote-master] RPC error", { message: error.message });
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});