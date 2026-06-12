// Zero-dependency Netlify Function — plain CommonJS, no bundler needed.
// Calls Supabase REST API to verify the user JWT and fetch their stored key,
// then proxies the request to Anthropic server-side so the key never hits the browser.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const MODEL = "claude-sonnet-4-20250514";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
  const jwt = authHeader.replace(/^bearer\s+/i, "");
  if (!jwt) return { statusCode: 401, body: JSON.stringify({ error: "unauthorized" }) };

  // Verify JWT via Supabase Auth REST API
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY },
  });

  if (!authRes.ok) {
    console.error("auth failed:", authRes.status);
    return { statusCode: 401, body: JSON.stringify({ error: "invalid_token" }) };
  }

  const authData = await authRes.json();
  const userId = authData.id;
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: "invalid_token" }) };
  }

  // Fetch user's stored Anthropic key via PostgREST (RLS enforces user_id = auth.uid())
  const prefsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?select=anthropic_key&user_id=eq.${userId}&limit=1`,
    { headers: { Authorization: `Bearer ${jwt}`, apikey: ANON_KEY } },
  );

  if (!prefsRes.ok) {
    console.error("prefs fetch failed:", prefsRes.status);
    return { statusCode: 500, body: JSON.stringify({ error: "db_error" }) };
  }

  const prefsData = await prefsRes.json();
  const apiKey = prefsData && prefsData[0] && prefsData[0].anthropic_key;

  if (!apiKey) {
    return {
      statusCode: 402,
      body: JSON.stringify({
        error: "no_key",
        message: "No Anthropic API key saved. Open Settings (⚙) to add yours.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
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

  const json = await anthropicRes.json();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: (json.content && json.content[0] && json.content[0].text) || "" }),
  };
};
