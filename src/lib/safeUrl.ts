/**
 * Returns the URL only if it uses an allowed scheme (http, https, mailto);
 * anything else (javascript:, data:, vbscript:, …) is replaced with "#".
 * Use for any user-supplied URL rendered into an href.
 */
export function safeHref(url: string | undefined | null): string {
  const trimmed = String(url ?? "").trim();
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : "#";
}
