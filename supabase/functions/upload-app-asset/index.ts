import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  fileName: string;
  base64: string; // data URL ou base64 puro
};

function decodeBase64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",")[1] : input;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeFileName(name: string) {
  return String(name ?? "image.png").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const functionName = "upload-app-asset";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`[${functionName}] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  const fileName = safeFileName(body.fileName ?? "");
  const base64 = String(body.base64 ?? "");

  if (!fileName.toLowerCase().endsWith(".png")) {
    return new Response("Only .png allowed", { status: 400, headers: corsHeaders });
  }
  if (!base64 || base64.length < 50) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders });
  }

  const bytes = decodeBase64ToBytes(base64);

  const bucket = "app-assets";
  const path = `branding/${Date.now()}_${fileName}`;

  console.log(`[${functionName}] Uploading`, { bucket, path, size: bytes.length });

  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });

  if (uploadError) {
    console.error(`[${functionName}] Upload error`, { message: uploadError.message });
    return new Response(uploadError.message, { status: 400, headers: corsHeaders });
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

  return new Response(JSON.stringify({ ok: true, publicUrl: data.publicUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});