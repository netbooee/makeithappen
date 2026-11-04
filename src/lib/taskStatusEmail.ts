/**
 * Builds the "email task owner for a status update" HTML — a self-contained, Outlook-safe
 * email body (inline styles, no external CSS) with a call-to-action button that drafts a reply
 * back to the project manager. Self-contained on purpose, same convention as exportHtml.ts /
 * exportHtmlV2.ts: small helpers are duplicated here rather than imported across that boundary.
 */
import { safeHref } from "./safeUrl";

export interface TaskEmailInfo {
  taskName: string;
  /** "Project Title" or "Project Title · Milestone Title", or "No project" when standalone. */
  projectLabel: string;
  ownerLabel: string;
  /** Formatted due date text, or "No due date". */
  dueLabel: string;
  isLate: boolean;
  progressLabel: string;
  /** Raw notes text — may contain a small amount of Markdown (bold/italic/links). */
  notes: string;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A deliberately small Markdown subset (bold, italics, links, line breaks) for the notes
 *  block of a one-shot email — not the full feature set MarkdownPreview renders live. */
function mdInline(s: string): string {
  const escaped = esc(s.trim())
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) =>
      `<a href="${url}" target="_blank" style="color:#2563EB">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/\*([^*]+)\*|_([^_]+)_/g, (_m, a, b) => `<em>${a ?? b}</em>`);
  return escaped.replace(/\n/g, "<br>");
}

/** The clean plain-text block of key task info — used as the status email's own plain-text
 *  copy, and as the body of the "Provide Status" reply the call-to-action button drafts. */
export function buildTaskStatusTextBlock(info: TaskEmailInfo): string {
  return [
    `Task: ${info.taskName}`,
    `Project: ${info.projectLabel}`,
    `Assigned to: ${info.ownerLabel}`,
    `Due: ${info.dueLabel}${info.isLate ? " (LATE)" : ""}`,
    `Progress: ${info.progressLabel}`,
    "",
    "Notes:",
    info.notes.trim() || "—",
  ].join("\n");
}

const FONT = "Calibri, Arial, sans-serif";
const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const LATE = "#DC2626";
const ACCENT = "#2563EB";

function metaRow(label: string, valueHtml: string): string {
  return `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid ${BORDER};font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};width:140px;vertical-align:top">${esc(label)}</td>
        <td style="padding:7px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK}">${valueHtml}</td>
      </tr>`;
}

/**
 * The full status-request email HTML. `statusToEmail` is the project manager's address the
 * "Provide Status" button drafts a reply to (empty disables the button, href="#").
 */
export function buildTaskStatusEmailHtml(info: TaskEmailInfo, statusToEmail: string): string {
  const subject = `Status update: ${info.taskName}`;
  const replyBody = buildTaskStatusTextBlock(info);
  const ctaHref = statusToEmail
    ? safeHref(`mailto:${statusToEmail}?subject=${encodeURIComponent(`Re: ${subject}`)}&body=${encodeURIComponent(replyBody)}`)
    : "#";
  const dueValueHtml = info.isLate
    ? `<span style="color:${LATE};font-weight:700">${esc(info.dueLabel)} — LATE</span>`
    : esc(info.dueLabel);

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F3F4F6;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid ${BORDER};max-width:600px">
        <tr><td style="padding:28px 32px 20px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};margin-bottom:6px">Status requested</div>
          <h1 style="margin:0;font-family:${FONT};font-size:22px;line-height:1.3;color:${INK}">${esc(info.taskName)}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${metaRow("Project", esc(info.projectLabel))}
            ${metaRow("Assigned to", esc(info.ownerLabel))}
            ${metaRow("Due date", dueValueHtml)}
            ${metaRow("Progress", esc(info.progressLabel))}
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};margin-bottom:8px">Notes</div>
          <div style="font-size:14px;line-height:1.6;color:${INK}">
            ${info.notes.trim() ? mdInline(info.notes) : `<span style="color:${MUTED}">No notes.</span>`}
          </div>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 32px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:${ACCENT};mso-padding-alt:16px 36px;border-radius:6px">
              <!-- Outlook's Word rendering engine overrides an <a>'s own color with its default
                   hyperlink color — the button text only stays white when the color is also
                   set on a nested span (and, for old Outlook, a <font> tag) around the text. -->
              <a href="${ctaHref}" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;mso-line-height-rule:exactly">
                <font color="#FFFFFF"><span style="color:#FFFFFF;text-decoration:none">Provide Status</span></font>
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
