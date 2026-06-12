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

  // Verify the JWT and get user identity (RLS enforced by using anonKey + JWT)
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: "invalid_token" }) };
  }

  // Fetch the user's stored Anthropic key (RLS ensures they can only read their own row)
  const { data: prefs } = await sb
    .from("user_preferences")
    .select("anthropic_key")
    .eq("user_id", user.id)
    .maybeSingle();

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
