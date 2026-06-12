import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const MODEL = "claude-sonnet-4-20250514";

type Handler = (event: {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}) => Promise<{ statusCode: number; headers?: Record<string, string>; body: string }>;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const jwt = event.headers.authorization?.replace(/^bearer\s+/i, "");
  if (!jwt) return { statusCode: 401, body: JSON.stringify({ error: "unauthorized" }) };

  // Pass the JWT explicitly — required in serverless environments where there is no stored session
  const sb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await sb.auth.getUser(jwt);
  if (authError || !user) {
    console.error("auth error:", authError?.message ?? "no user");
    return { statusCode: 401, body: JSON.stringify({ error: "invalid_token", detail: authError?.message }) };
  }

  // Fetch the user's stored Anthropic key (RLS policy ensures only own row is visible)
  const sbUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: prefs, error: prefsError } = await sbUser
    .from("user_preferences")
    .select("anthropic_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prefsError) {
    console.error("prefs error:", prefsError.message);
    return { statusCode: 500, body: JSON.stringify({ error: "db_error", detail: prefsError.message }) };
  }

  const apiKey = (prefs as { anthropic_key?: string } | null)?.anthropic_key;
  if (!apiKey) {
    return {
      statusCode: 402,
      body: JSON.stringify({ error: "no_key", message: "No Anthropic API key saved. Open Settings (⚙) to add yours." }),
    };
  }

  let body: { system?: string; messages?: { role: string; content: string }[] };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }

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
    return { statusCode: anthropicRes.status, body: errText };
  }

  const json = await anthropicRes.json() as { content?: { text?: string }[] };
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: json.content?.[0]?.text ?? "" }),
  };
};
