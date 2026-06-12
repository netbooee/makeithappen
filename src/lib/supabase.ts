import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Tweaks } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when env vars are absent — the app then runs in local demo mode. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = Boolean(supabase);

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  if (!supabase) return;
  localStorage.removeItem("mih_data_v1"); // clear cached data so next user starts fresh
  await supabase.auth.signOut();
}

/** Load the full app state blob for the current user. Returns null if no data exists yet. */
export async function loadUserData<T>(): Promise<T | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) { console.error("loadUserData:", error.message); return null; }
  return (data?.data as T) ?? null;
}

/** Upsert the full app state blob for the current user. */
export async function saveUserData<T>(appData: T): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("user_data").upsert(
    { user_id: user.id, data: appData },
    { onConflict: "user_id" },
  );
  if (error) console.error("saveUserData:", error.message);
}

/** Persist milestone-section preferences to user_preferences (upsert keyed by user). */
export async function saveTweaks(tweaks: Tweaks) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      milestone_collapsible: tweaks.collapsible,
      milestone_default_state: tweaks.defaultState,
      milestone_count_collapsed: tweaks.showCount,
    },
    { onConflict: "user_id" },
  );
}
