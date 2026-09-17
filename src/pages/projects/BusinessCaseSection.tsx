import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { useStore } from "../../store/store";
import { claudeConfigured, parseBusinessCase } from "../../lib/claude";
import type { Project } from "../../lib/types";

const FIELDS = [
  { key: "problemOpportunity", label: "Problem or opportunity" },
  { key: "businessJustification", label: "Business justification" },
  { key: "projectObjectives", label: "Project objectives" },
  { key: "keyDeliverables", label: "Key deliverables" },
  { key: "expectedRoi", label: "Expected ROI" },
] as const satisfies { key: keyof Project; label: string }[];

const PLACEHOLDER = `Paste a business case or project charter — problem/opportunity, business justification, objectives, deliverables, expected ROI…`;

export function BusinessCaseSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const set = (patch: Partial<Project>) => updateProject(project.id, patch);

  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fill = async () => {
    if (!pasteText.trim()) return;
    if (!claudeConfigured) {
      setError("Add your Anthropic API key in Settings (⚙) to use this.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fields = await parseBusinessCase(pasteText);
      set({
        problemOpportunity: fields.problemOpportunity || undefined,
        businessJustification: fields.businessJustification || undefined,
        projectObjectives: fields.projectObjectives || undefined,
        keyDeliverables: fields.keyDeliverables || undefined,
        expectedRoi: fields.expectedRoi || undefined,
      });
      setPasteText("");
      setPasting(false);
    } catch {
      setError("Couldn't parse that. Make sure your Anthropic API key is saved in Settings (⚙) and try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setPasteText("");
    setError(null);
    setPasting(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!pasting ? (
        <button
          className="card"
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
            color: "var(--ink-3)", fontSize: 13.5, fontWeight: 500, width: "100%",
            borderStyle: "dashed", boxShadow: "none", background: "transparent", cursor: "pointer",
          }}
          onClick={() => setPasting(true)}
        >
          <ClipboardPaste size={14} /> Paste to fill
        </button>
      ) : (
        <div className="card" style={{ padding: "13px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          <textarea
            className="input"
            autoFocus
            rows={10}
            placeholder={PLACEHOLDER}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancel()}
            style={{ resize: "vertical", fontSize: 12.5, lineHeight: 1.5 }}
          />
          {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" style={{ fontSize: 12.5 }} disabled={!pasteText.trim() || busy} onClick={fill}>
              {busy ? "Filling…" : "Fill fields"}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {label}
            </div>
            <textarea
              style={{
                border: "none", boxShadow: "none", padding: 0, background: "transparent",
                fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", resize: "vertical",
                minHeight: 44, fontFamily: "inherit", width: "100%",
              }}
              placeholder="—"
              value={(project[key] as string | undefined) ?? ""}
              onChange={(e) => set({ [key]: e.target.value || undefined })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
