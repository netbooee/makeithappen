import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Mail, X } from "lucide-react";
import { buildTaskStatusEmailHtml, buildTaskStatusTextBlock, type TaskEmailInfo } from "../lib/taskStatusEmail";

/** Panel for emailing a task's current status to its owner — an Outlook-safe HTML email with
 *  a "Provide Status" button that drafts a reply back to `pmEmail` with a clean text summary.
 *  Shared by TaskEditPanel and SubtaskEditPanel, so it takes already-resolved display fields
 *  rather than a Task/Subtask directly. */
export function TaskStatusEmailPanel({
  info,
  ownerEmail,
  pmEmail,
  close,
}: {
  info: TaskEmailInfo;
  ownerEmail: string;
  pmEmail: string;
  close: () => void;
}) {
  const [to, setTo] = useState(ownerEmail);
  const [subject, setSubject] = useState(`Status update: ${info.taskName}`);
  const [copied, setCopied] = useState(false);
  const [copiedRich, setCopiedRich] = useState(false);

  const plainBody = buildTaskStatusTextBlock(info);
  const html = buildTaskStatusEmailHtml(info, pmEmail);

  const doCopy = async () => {
    await navigator.clipboard.writeText(plainBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const doCopyRich = async () => {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plainBody], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    setCopiedRich(true);
    setTimeout(() => setCopiedRich(false), 1600);
  };

  const openInOutlook = () => {
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(url, "_blank");
  };

  const openInGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(url, "_blank");
  };

  return createPortal(
    <div className="overlay">
      <div className="overlay-bg" onClick={close} />
      <div className="side-panel">
        <div className="side-panel-head">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <Mail size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Email status request</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{info.taskName}</div>
          </div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>

        <div className="side-panel-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">To</label>
            <input
              className="input"
              placeholder="owner@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ fontWeight: 500 }}
            />
            {!ownerEmail && (
              <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>No email on file for {info.ownerLabel} — enter one above.</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="field-label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ fontWeight: 500 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <label className="field-label">Preview</label>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={html}
              style={{ flex: 1, minHeight: 320, width: "100%", border: "1px solid var(--border)", borderRadius: 7, background: "#fff" }}
            />
          </div>
        </div>

        <div className="side-panel-foot" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={openInOutlook}>
            <Mail /> Outlook
          </button>
          <button className="btn btn-primary" onClick={openInGmail}>
            <Mail /> Gmail
          </button>
          <button className="btn btn-ghost" onClick={doCopyRich}>
            {copiedRich ? <><Check /> Copied</> : <><Copy /> Copy as rich text</>}
          </button>
          <button className="btn btn-ghost" onClick={doCopy}>
            {copied ? <><Check /> Copied</> : <><Copy /> Copy plain text</>}
          </button>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={close}>Cancel</button>
        </div>
        <div style={{ padding: "0 20px 16px", fontSize: 11.5, color: "var(--ink-4)" }}>
          Outlook/Gmail deep links only prefill plain text — use "Copy as rich text" and paste into the compose window for the full HTML formatting and button.
        </div>
      </div>
    </div>,
    document.body,
  );
}
