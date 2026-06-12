// Supabase Edge Function (Deno) — proxies requests to Anthropic using the
// user's stored API key. Key is fetched server-side and never sent to the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  const jwt = req.headers.get("authorization")?.replace(/^bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...cors, "content-type": "application/json" },
    });
  }

  // SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically by Supabase
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } },
  );

  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401, headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { data: prefs } = await sb
    .from("user_preferences")
    .select("anthropic_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = (prefs as { anthropic_key?: string } | null)?.anthropic_key;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "no_key", message: "No Anthropic API key saved. Open Settings (⚙) to add yours." }),
      { status: 402, headers: { ...cors, "content-type": "application/json" } },
    );
  }

  const body = await req.json() as { system?: string; messages?: { role: string; content: string }[] };

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: body.system,
      messages: body.messages,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic error:", anthropicRes.status, errText);
    return new Response(errText, { status: anthropicRes.status, headers: cors });
  }

  const json = await anthropicRes.json() as { content?: { text?: string }[] };
  return new Response(
    JSON.stringify({ text: json.content?.[0]?.text ?? "" }),
    { headers: { ...cors, "content-type": "application/json" } },
  );
});
