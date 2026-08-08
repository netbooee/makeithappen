import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Download, Pencil, Sparkles } from "lucide-react";
import { useStore } from "../store/store";
import { parseTimestamp } from "../components/ui";
import type { Project, StatusUpdate } from "../lib/types";
import { exportExecUpdateHtml } from "../lib/exportExecUpdateHtml";
import { generateExecNarrative, localExecNext, localExecSince } from "../lib/claude";

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
  /** Next-action item texts pulled from milestone subtasks and the task lists. */
  nextItems: { text: string; source?: string }[];
  /** The forward-looking "coming next" paragraph shown on the card. */
  statement: string;
  /** One-sentence recap of the latest executive update, shown under the paragraph. Empty when there is none. */
  sinceLine: string;
  /** True when the statement was written by AI (or edited by hand) and stored on the project. */
  statementIsStored: boolean;
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

/** Provenance line under the statement — shared by the live card and the HTML export. */
export function execMetaLine(entry: ExecEntry): string {
  const { execUpdate, nextItems } = entry;
  const parts: string[] = [];
  if (nextItems.length > 0) {
    parts.push(`${nextItems.length} next action${nextItems.length === 1 ? "" : "s"}`);
  }
  parts.push(
    execUpdate ? `Update ${shortDate(execUpdate.when)} · ${execUpdate.who}` : "No executive update yet",
  );
  return parts.join(" · ");
}

export function ExecutiveUpdate() {
  const { data, setExecUpdateOrder, updateProject } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const entries = useMemo<ExecEntry[]>(() => {
    const taskPool = [...data.todayTasks, ...data.upcoming, ...data.someday];
    const raw = data.projects
      .map((project) => {
        const execUpdate = latestExecUpdate(project);
        const nextItems = [
          ...project.milestones.flatMap((m) =>
            m.subtasks.filter((s) => s.next && !s.done).map((s) => ({ text: s.t, source: m.title })),
          ),
          ...taskPool
            .filter((t) => t.project === project.title && t.next && !t.done)
            .map((t) => ({ text: t.text, source: t.context })),
        ];
        const stored = project.execStatement?.trim();
        const statement =
          stored || localExecNext(nextItems, project.nextActionsAiSummary?.trim() || null);
        const sinceLine =
          project.execSince?.trim() || localExecSince(execUpdate?.text ?? null);
        return {
          project,
          execUpdate,
          nextItems,
          statement,
          sinceLine,
          statementIsStored: Boolean(stored),
        };
      })
      .filter((e) => e.statement.length > 0 || e.sinceLine.length > 0);

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

  const regenerate = async (entry: ExecEntry) => {
    const { project, execUpdate, nextItems } = entry;
    setBusy(project.id);
    try {
      const narrative = await generateExecNarrative(
        project,
        nextItems,
        execUpdate,
        project.nextActionsAiSummary?.trim() || null,
      );
      const statement = narrative.statement.trim();
      const since = narrative.since.trim();
      if (statement || since) {
        updateProject(project.id, {
          execStatement: statement || undefined,
          execSince: since || undefined,
          execStatementAt: new Date().toLocaleString(),
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const regenerateAll = async () => {
    setBulk({ done: 0, total: entries.length });
    for (let i = 0; i < entries.length; i++) {
      await regenerate(entries[i]);
      setBulk({ done: i + 1, total: entries.length });
    }
    setBulk(null);
  };

  const startEdit = (entry: ExecEntry) => {
    setEditing(entry.project.id);
    setDraft(entry.statement);
  };

  const saveEdit = (project: Project) => {
    const text = draft.trim();
    updateProject(project.id, {
      execStatement: text || undefined,
      execStatementAt: text ? new Date().toLocaleString() : undefined,
    });
    setEditing(null);
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
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            disabled={bulk !== null || entries.length === 0}
            onClick={regenerateAll}
          >
            <Sparkles size={13} /> {bulk ? `Writing ${bulk.done}/${bulk.total}…` : "AI update all"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => exportExecUpdateHtml(entries)}
          >
            <Download size={13} /> Export HTML
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.map((entry, idx) => {
          const { project, statement, sinceLine, statementIsStored } = entry;
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
          const isEditing = editing === project.id;
          const isBusy = busy === project.id;
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

                  <div style={{ borderTop: "0.5px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
                    {isEditing ? (
                      <>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={4}
                          autoFocus
                          style={{
                            width: "100%",
                            fontSize: 13.5,
                            lineHeight: 1.62,
                            color: "var(--ink-1)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "0.5px solid var(--border)",
                            background: "var(--surface-3)",
                            resize: "vertical",
                            fontFamily: "inherit",
                          }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button className="btn btn-ghost" onClick={() => saveEdit(project)}>
                            Save
                          </button>
                          <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                          <span style={{ fontSize: 11, color: "var(--ink-4)", alignSelf: "center" }}>
                            Clear the text to fall back to the auto-composed statement.
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 5 }}>
                          Coming next
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.62,
                            color: "var(--ink-1)",
                            whiteSpace: "pre-wrap",
                            opacity: isBusy ? 0.5 : 1,
                          }}
                        >
                          {statement}
                        </div>
                        {sinceLine && (
                          <div
                            style={{
                              fontSize: 12,
                              lineHeight: 1.55,
                              color: "var(--ink-4)",
                              fontStyle: "italic",
                              marginTop: 8,
                              opacity: isBusy ? 0.5 : 1,
                            }}
                          >
                            Since last update: {sinceLine}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginTop: 7,
                            fontSize: 11,
                            color: "var(--ink-4)",
                          }}
                        >
                          {statementIsStored && <Sparkles size={11} />}
                          <span>{execMetaLine(entry)}</span>
                          <span style={{ flex: 1 }} />
                          <button
                            className="btn btn-ghost"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 8px" }}
                            disabled={isBusy || bulk !== null}
                            onClick={() => regenerate(entry)}
                          >
                            <Sparkles size={11} />
                            {isBusy ? "Writing…" : statementIsStored ? "Regenerate" : "AI update"}
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 8px" }}
                            disabled={isBusy || bulk !== null}
                            onClick={() => startEdit(entry)}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
