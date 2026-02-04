import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  email: string;
  newPassword: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[reset-user-password] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.newPassword ?? "");

  if (!email || !email.includes("@")) {
    return new Response("Invalid email", { status: 400, headers: corsHeaders });
  }

  if (!newPassword || newPassword.length < 6) {
    return new Response("Password must be at least 6 characters", { status: 400, headers: corsHeaders });
  }

  console.log("[reset-user-password] Resetting password", { email });

  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("[reset-user-password] listUsers error", { message: listError.message });
    return new Response(listError.message, { status: 500, headers: corsHeaders });
  }

  const target = (listData?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target?.id) {
    return new Response("User not found", { status: 404, headers: corsHeaders });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error("[reset-user-password] updateUserById error", { message: updateError.message });
    return new Response(updateError.message, { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});