import { useState } from "react";
import { useStore } from "../../store/store";
import { DateInput } from "../../components/ui";
import type { Project } from "../../lib/types";

const RAG = { green: "#10B981", amber: "#F59E0B", red: "#EF4444" } as const;

export function KpiSection({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const set = (patch: Partial<Project>) => updateProject(project.id, patch);

  const riskColor = project.risk ? RAG[project.risk] : "var(--ink-3)";
  const parseBudget = (s: string | undefined): number | null => {
    if (!s) return null;
    const c = s.replace(/[$,\s]/g, "");
    const k = c.match(/^([\d.]+)[kK]$/), m = c.match(/^([\d.]+)[mM]$/);
    if (k) return parseFloat(k[1]) * 1000;
    if (m) return parseFloat(m[1]) * 1_000_000;
    const n = parseFloat(c); return isNaN(n) ? null : n;
  };
  const fmtBudget = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n).toLocaleString()}`;
  };
  const totalVal = parseBudget(project.budget);
  const spentVal = parseBudget(project.budgetSpent);
  const remainingVal = totalVal !== null && spentVal !== null ? totalVal - spentVal : null;

  const kpiCard: React.CSSProperties = {
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
  };
  const kpiLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)",
    textTransform: "uppercase", letterSpacing: "0.07em",
  };
  const kpiInput: React.CSSProperties = {
    border: "none", boxShadow: "none", padding: 0, background: "transparent",
    fontSize: 15, fontWeight: 650, color: "var(--ink)", width: "100%",
    fontFamily: "inherit",
  };

  const latestExec = project.updates.find((u) => u.type === "executive") ?? null;
  const [execExpanded, setExecExpanded] = useState(false);

  return (
    <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 2fr", gap: 12, marginBottom: 24 }}>
      {/* Risk */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Risk</div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {(["green", "amber", "red"] as const).map((r) => (
            <button
              key={r}
              title={r.charAt(0).toUpperCase() + r.slice(1)}
              onClick={() => set({ risk: project.risk === r ? undefined : r })}
              style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: RAG[r],
                opacity: project.risk && project.risk !== r ? 0.3 : 1,
                border: project.risk === r ? "2px solid var(--ink)" : "2px solid transparent",
                transition: "opacity .15s, border .15s",
              }}
            />
          ))}
        </div>
        <textarea
          style={{ ...kpiInput, fontSize: 13, fontWeight: 550, color: riskColor, flex: 1, resize: "none", lineHeight: 1.5, minHeight: 40 }}
          placeholder="e.g. On track"
          value={project.riskNote ?? ""}
          onChange={(e) => set({ riskNote: e.target.value || undefined })}
        />
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 2, paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            { sub: "Timeline risk", key: "timelineRisk" as const },
            { sub: "Budget risk", key: "budgetRisk" as const },
            { sub: "Resource risk", key: "resourceRisk" as const },
          ]).map(({ sub, key }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{sub}</span>
              <div style={{ display: "flex", gap: 5 }}>
                {(["green", "amber", "red"] as const).map((r) => (
                  <button
                    key={r}
                    title={r.charAt(0).toUpperCase() + r.slice(1)}
                    onClick={() => set({ [key]: project[key] === r ? undefined : r })}
                    style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                      background: RAG[r],
                      opacity: project[key] && project[key] !== r ? 0.25 : 1,
                      border: project[key] === r ? "1.5px solid var(--ink)" : "1.5px solid transparent",
                      transition: "opacity .15s, border .15s",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            { sub: "Start", val: project.start, onChange: (v: string) => set({ start: v || undefined }) },
            { sub: "Due",   val: project.due,   onChange: (v: string) => set({ due: v || "No date" }) },
          ] as const).map(({ sub, val, onChange }) => (
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</span>
              <DateInput value={val} onChange={onChange} style={{ ...kpiInput, fontSize: 13, padding: "2px 0", width: 130 }} className="" />
            </div>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="card" style={kpiCard}>
        <div style={kpiLabel}>Budget</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            { sub: "Total Budget", val: project.budget, onChange: (v: string) => set({ budget: v || undefined }), placeholder: "e.g. $50,000" },
            { sub: "Actual Cost",  val: project.budgetSpent, onChange: (v: string) => set({ budgetSpent: v || undefined }), placeholder: "e.g. $12,000" },
          ] as const).map(({ sub, val, onChange, placeholder }) => (
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sub}</span>
              <input style={{ ...kpiInput, fontSize: 13 }} placeholder={placeholder} value={val ?? ""} onChange={(e) => onChange(e.target.value)} />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Remaining</span>
            <span style={{ fontSize: 13, fontWeight: 650, color: remainingVal === null ? "var(--ink-4)" : remainingVal < 0 ? "#EF4444" : "#10B981" }}>
              {remainingVal !== null ? fmtBudget(remainingVal) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Executive update */}
      <div className="card" style={{ ...kpiCard, justifyContent: "space-between" }}>
        <div style={kpiLabel}>Executive Update</div>
        {latestExec ? (
          <>
            <div style={{
              fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, flex: 1,
              ...(!execExpanded ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
            }}>
              {latestExec.text}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{latestExec.when}</span>
              <button onClick={() => setExecExpanded((v) => !v)} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 550, marginLeft: "auto" }}>
                {execExpanded ? "Show less" : "Read more"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>No executive updates yet.</div>
        )}
      </div>
    </div>
  );
}
