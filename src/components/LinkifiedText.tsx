import { linkTokens } from "../lib/linkify";

/** Renders plain text with any [label](url) or bare http(s)/www links made clickable (new tab).
 *  Wrap status-update text in this wherever it is displayed. */
export function LinkifiedText({ text, linkColor = "var(--accent)" }: { text: string; linkColor?: string }) {
  return (
    <>
      {linkTokens(text).map((t, i) =>
        t.kind === "text" ? (
          <span key={i}>{t.text}</span>
        ) : (
          <a
            key={i}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-word" }}
          >
            {t.text}
          </a>
        ),
      )}
    </>
  );
}
