import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  email: string;
  password: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[create-user] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !email.includes("@")) {
    return new Response("Invalid email", { status: 400, headers: corsHeaders });
  }

  if (!password || password.length < 6) {
    return new Response("Password must be at least 6 characters", { status: 400, headers: corsHeaders });
  }

  console.log("[create-user] Creating user", { email });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("[create-user] createUser error", { message: error.message });
    return new Response(error.message, { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, userId: data.user?.id ?? null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});