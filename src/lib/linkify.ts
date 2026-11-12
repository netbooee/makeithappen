/**
 * Hyperlinks inside plain-text fields (status updates). Recognises two forms:
 *   - Markdown-style links:  [Design review](https://example.com/review)
 *   - Bare URLs:             https://example.com/page  or  www.example.com/page
 * Every href goes through safeHref, so only http(s)/mailto links are ever emitted.
 * Used by the live UI (via LinkifiedText) and by the HTML exports (via linkifyHtml).
 */
import { safeHref } from "./safeUrl";

export type LinkToken = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

// [label](url)  |  http(s)://…  |  www.…
const LINK_RE = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

function normalizeHref(raw: string): string {
  return safeHref(/^www\./i.test(raw) ? `https://${raw}` : raw);
}

/** Splits text into plain-text and link tokens. Trailing sentence punctuation stays outside bare URLs. */
export function linkTokens(text: string): LinkToken[] {
  const out: LinkToken[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    let consumed = m[0];
    let token: LinkToken;
    if (m[1] !== undefined) {
      token = { kind: "link", text: m[1], href: normalizeHref(m[2]) };
    } else {
      // Bare URL: don't swallow a closing ")" or sentence punctuation that follows it.
      const url = m[3].replace(/[.,;:!?)\]]+$/, "");
      consumed = url;
      token = { kind: "link", text: url, href: normalizeHref(url) };
    }
    if (token.href === "#") continue; // unsafe scheme — leave it as plain text
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    out.push(token);
    last = start + consumed.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** True when the text contains at least one link. */
export function hasLinks(text: string): boolean {
  return linkTokens(text).some((t) => t.kind === "link");
}

/** Escaped HTML with <a> tags for links — for the self-contained HTML exports. `esc` is the caller's
 *  HTML escaper; `linkStyle` is an inline style string for the anchors. */
export function linkifyHtml(text: string, esc: (s: string) => string, linkStyle = "color:inherit;text-decoration:underline"): string {
  return linkTokens(text)
    .map((t) =>
      t.kind === "text"
        ? esc(t.text)
        : `<a href="${esc(t.href)}" target="_blank" rel="noopener noreferrer" style="${linkStyle}">${esc(t.text)}</a>`,
    )
    .join("");
}

/** Plain-text rendering — "[label](url)" becomes "label (url)", for emails and clipboard text. */
export function linksAsPlainText(text: string): string {
  return linkTokens(text)
    .map((t) => (t.kind === "link" && t.text !== t.href && !t.href.endsWith(t.text) ? `${t.text} (${t.href})` : t.text))
    .join("");
}
