import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function hashClientAddress(address: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(address));
  return bytesToHex(new Uint8Array(signature));
}

async function deriveWorkspacePassword(secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("cjv-workspace-login-account-v1"),
  );
  return bytesToHex(new Uint8Array(signature));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const loginPassword = Deno.env.get("LOGIN_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!loginPassword || !supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Login gate is missing required server configuration.");
    return jsonResponse({ error: "The login service is not configured." }, 503);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || username.length > 80 || password.length === 0 || password.length > 256) {
    return jsonResponse({ error: "Enter a username and password." }, 400);
  }

  try {
    const address = request.headers.get("x-real-ip")
      ?? request.headers.get("cf-connecting-ip")
      ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? "unknown";
    const addressHash = await hashClientAddress(address, serviceRoleKey);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: attemptAllowed, error: rateLimitError } = await admin.rpc(
      "consume_login_gate_attempt",
      { p_ip_hash: addressHash },
    );
    if (rateLimitError) {
      console.error("Login gate rate-limit check failed.");
      return jsonResponse({ error: "The login service is temporarily unavailable." }, 503);
    }
    if (!attemptAllowed) {
      return jsonResponse({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    }

    const [providedDigest, expectedDigest] = await Promise.all([
      digest(password),
      digest(loginPassword),
    ]);
    if (!constantTimeEqual(providedDigest, expectedDigest)) {
      return jsonResponse({ error: "Username or password is incorrect." }, 401);
    }

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const accountId = await hashClientAddress("cjv-workspace-login-account-v1", serviceRoleKey);
    const email = `workspace-login-${accountId.slice(0, 24)}@${projectRef}.supabase.co`;
    const workspacePassword = await deriveWorkspacePassword(serviceRoleKey);
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: workspacePassword,
      email_confirm: true,
      app_metadata: { workspace_access: "cjv" },
      user_metadata: { display_name: username },
    });
    const accountAlreadyExists = createError?.code === "user_already_exists"
      || createError?.code === "email_exists"
      || createError?.message.toLowerCase().includes("already been registered");
    if (createError && !accountAlreadyExists) {
      console.error("Login gate could not provision its workspace account.");
      return jsonResponse({ error: "The login service is temporarily unavailable." }, 503);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: workspacePassword,
    });
    if (signInError || !data.session) {
      console.error("Login gate could not create an authenticated session.");
      return jsonResponse({ error: "The login service is temporarily unavailable." }, 503);
    }

    const { error: clearError } = await admin
      .from("login_gate_attempts")
      .delete()
      .eq("ip_hash", addressHash);
    if (clearError) {
      console.error("Login gate could not clear the attempt counter.");
      return jsonResponse({ error: "The login service is temporarily unavailable." }, 503);
    }

    return jsonResponse({ session: data.session });
  } catch {
    console.error("Login gate request failed.");
    return jsonResponse({ error: "The login service is temporarily unavailable." }, 503);
  }
});
