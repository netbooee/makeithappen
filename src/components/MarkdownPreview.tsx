import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { safeHref } from "../lib/safeUrl";

/** Shared markdown rendering styles — used anywhere freeform text is written in Markdown. */
export const mdComponents: Components = {
  h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 650, margin: "10px 0 6px", color: "var(--ink)" }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 650, margin: "10px 0 6px", color: "var(--ink)" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 650, margin: "8px 0 4px", color: "var(--ink)" }}>{children}</h3>,
  p: ({ children }) => <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 650, color: "var(--ink)" }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  a: ({ children, href }) => (
    <a href={safeHref(href)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code style={{ background: "var(--surface-2)", borderRadius: 4, padding: "1px 5px", fontSize: 12.5, fontFamily: "monospace" }}>{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ margin: "0 0 8px", paddingLeft: 10, borderLeft: "2px solid var(--border)", color: "var(--ink-3)" }}>{children}</blockquote>
  ),
};

/** Renders Markdown text with the shared styles, or a placeholder when there's nothing to show. */
export function MarkdownPreview({ text, style }: { text: string; style?: React.CSSProperties }) {
  if (!text.trim()) {
    return <div style={{ fontSize: 13, color: "var(--ink-4)", fontStyle: "italic", ...style }}>Nothing to preview yet.</div>;
  }
  return (
    <div style={style}>
      <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>
    </div>
  );
}
