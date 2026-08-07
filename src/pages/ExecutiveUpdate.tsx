import { useMemo } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Download, Star } from "lucide-react";
import { useStore } from "../store/store";
import { parseTimestamp } from "../components/ui";
import type { Project, StatusUpdate } from "../lib/types";
import { exportExecUpdateHtml } from "../lib/exportExecUpdateHtml";

/* ================= Executive update ================= */

const RISK_EMOJI: Record<string, string> = { green: "🟢", amber: "🟡", red: "🔴" };

const CHIP: Record<string, [string, string, string]> = {
  active: ["#E1F5EE", "#085041", "Active"],
  waiting: ["#FAEEDA", "#854F0B", "Waiting"],
  hold: ["#FAEEDA", "#854F0B", "On Hold"],
  complete: ["#E1F5EE", "#085041", "Complete"],
};

export interface ExecEntry {
  project: Project;
  execUpdate: StatusUpdate | null;
  comingUp: string | null;
}

export function latestExecUpdate(project: Project): StatusUpdate | null {
  const execs = project.updates.filter((u) => u.type === "executive");
  if (execs.length === 0) return null;
  return execs.reduce((a, b) => (parseTimestamp(b.when) > parseTimestamp(a.when) ? b : a));
}

/** Leading "Mon D" from a store timestamp like "Aug 4, 2026, 3:12 PM". */
export function shortDate(when: string): string {
  const m = when.match(/^([A-Za-z]{3,9} \d{1,2})/);
  return m ? m[1] : when;
}

export function formatBudgetShort(val?: string): string | null {
  if (!val) return null;
  const n = Number(String(val).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n === 0) return val;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function InsetBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: "9px 11px", marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--ink-4)", marginBottom: 3 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-1)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

export function ExecutiveUpdate() {
  const { data, setExecUpdateOrder } = useStore();

  const entries = useMemo<ExecEntry[]>(() => {
    const taskPool = [...data.todayTasks, ...data.upcoming, ...data.someday];
    const raw = data.projects
      .map((project) => {
        const execUpdate = latestExecUpdate(project);
        const nextItems = [
          ...project.milestones.flatMap((m) => m.subtasks.filter((s) => s.next && !s.done).map((s) => s.t)),
          ...taskPool.filter((t) => t.project === project.title && t.next && !t.done).map((t) => t.text),
        ];
        const comingUp = project.nextActionsAiSummary?.trim()
          ? project.nextActionsAiSummary.trim()
          : nextItems.length > 0
            ? nextItems.map((t) => `• ${t}`).join("\n")
            : null;
        return { project, execUpdate, comingUp };
      })
      .filter((e) => e.execUpdate || e.comingUp);

    const order = data.execUpdateOrder ?? [];
    const byId = new Map(raw.map((e) => [e.project.id, e]));
    const ordered: ExecEntry[] = [];
    for (const id of order) {
      const e = byId.get(id);
      if (e) {
        ordered.push(e);
        byId.delete(id);
      }
    }
    for (const e of raw) if (byId.has(e.project.id)) ordered.push(e);
    return ordered;
  }, [data]);

  const move = (idx: number, delta: -1 | 1) => {
    const ids = entries.map((e) => e.project.id);
    const j = idx + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    setExecUpdateOrder(ids);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)" }}>Executive update</div>
          <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2 }}>
            {entries.length} project{entries.length === 1 ? "" : "s"} with executive updates or upcoming work
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          onClick={() => exportExecUpdateHtml(entries)}
        >
          <Download size={13} /> Export HTML
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.map((entry, idx) => {
          const { project, execUpdate, comingUp } = entry;
          const chip = CHIP[project.status] ?? CHIP.active;
          const doneMs = project.milestones.filter((m) => m.status === "complete");
          const upcomingMs = project.milestones.filter((m) => m.status !== "complete");
          const budget = formatBudgetShort(project.budget);
          const subline = [
            project.owner,
            `due ${project.due}`,
            `${Math.round(project.progress * 100)}% complete`,
            budget ? `budget ${budget}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={project.id}
              className="card"
              style={{ borderRadius: 10, padding: "14px 16px" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ink)" }}>
                      {RISK_EMOJI[project.risk ?? "green"]} {project.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: chip[0],
                        color: chip[1],
                      }}
                    >
                      {chip[2]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 3 }}>{subline}</div>

                  {(doneMs.length > 0 || upcomingMs.length > 0) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                      {doneMs.map((m) => (
                        <span
                          key={m.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "#E1F5EE",
                            color: "#085041",
                          }}
                        >
                          <Check size={11} /> {m.title}
                        </span>
                      ))}
                      {upcomingMs.map((m) => (
                        <span
                          key={m.id}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: 20,
                            border: "0.5px solid var(--border)",
                            color: "var(--ink-3)",
                          }}
                        >
                          {m.title}
                          {m.due ? ` · ${m.due}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {execUpdate ? (
                    <InsetBlock
                      icon={<Star size={13} />}
                      label={`Executive update · ${shortDate(execUpdate.when)} · ${execUpdate.who}`}
                    >
                      {execUpdate.text}
                    </InsetBlock>
                  ) : (
                    <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink-4)", marginTop: 10 }}>
                      No executive update yet
                    </div>
                  )}

                  {comingUp && (
                    <div style={{ marginTop: execUpdate ? 8 : 8 }}>
                      <InsetBlock icon={<ArrowRight size={13} />} label="Coming up next">
                        {comingUp}
                      </InsetBlock>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                  <button
                    className="icon-btn"
                    style={{ width: 16, height: 14, color: idx === 0 ? "var(--border)" : "var(--ink-4)" }}
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                    title="Move up"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 16, height: 14, color: idx === entries.length - 1 ? "var(--border)" : "var(--ink-4)" }}
                    disabled={idx === entries.length - 1}
                    onClick={() => move(idx, 1)}
                    title="Move down"
                  >
                    <ChevronDown size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="card card-pad" style={{ fontSize: 13, color: "var(--ink-4)" }}>
            No projects have an executive update or upcoming work yet. Add an update with the
            "Executive" type on a project page and it will show up here.
          </div>
        )}
      </div>
    </div>
  );
}
