import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Download, Pencil, Sparkles, X } from "lucide-react";
import { useStore } from "../store/store";
import { parseTimestamp, PROJECT_TYPE_LABEL } from "../components/ui";
import type { Project, ProjectContactRef, StatusUpdate } from "../lib/types";
import { exportExecUpdateHtml } from "../lib/exportExecUpdateHtml";
import { generateExecNarrative, localExecNext, localExecSince, suggestExecNextEdits, suggestStatusUpdateEdits } from "../lib/claude";
import { safeHref } from "../lib/safeUrl";
import { buildPortfolioReport, formatMoneyShort, RAG, RAG_NAME, RAG_ORDER, type PortfolioRow, type Rag } from "../lib/portfolioReport";
import { assigneeAvatar, projectContactPool } from "../lib/projectContacts";

/* ================= Executive update — data layer ================= */

export interface ExecEntry {
  project: Project;
  execUpdate: StatusUpdate | null;
  /** Next-action item texts pulled from milestone subtasks and the task lists. */
  nextItems: { text: string; source?: string; owner?: string }[];
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

/* ================= Modernist visual primitives ================= */

const FONT = "'Archivo', system-ui, sans-serif";
const INK = "#201e1d";
const DIVIDER = "rgba(32,30,29,0.4)";
const N300 = "#d7d3d3", N600 = "#7d7979", N700 = "#605d5d", N800 = "#444141";
const ACCENT = "#ec3013", ACCENT700 = "#ae1800", BG = "#f3f2f2";

const kicker: React.CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: N600 };
const label11: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N600 };

/** How many next-action items show inline in the right rail before collapsing behind "See all". */
const NEXT_ACTIONS_VISIBLE = 5;

function fmtLongDate(d: Date): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function RagChip({ rag, style }: { rag: Rag; style?: React.CSSProperties }) {
  return <span style={{ width: 12, height: 12, display: "inline-block", background: RAG[rag].swatch, flexShrink: 0, ...style }} />;
}

function RagScale({ active }: { active: Rag }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
        {RAG_ORDER.map((k) => (
          <span key={k} style={{ flex: 1, height: 8, background: k === active ? RAG[k].swatch : N300, display: "block" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 5, ...kicker }}>
        {RAG_ORDER.map((k) => <span key={k} style={{ flex: 1 }}>{RAG_NAME[k]}</span>)}
      </div>
    </div>
  );
}

/** The phase stepper — flat, zero-radius segments, one per milestone; the current one taller and colored. */
function PhaseStepper({ row, tall }: { row: PortfolioRow; tall?: boolean }) {
  if (row.phases === 0) {
    return <div style={{ fontSize: 12, color: N700 }}>No milestones yet</div>;
  }
  const currentHeight = tall ? "14px" : "12px";
  const cells = row.phaseCells.map((c) => ({ ...c, height: c.height === "12px" ? currentHeight : c.height }));
  return (
    <div role="group" aria-label={`Phase ${row.phase} of ${row.phases} · ${row.stage}`}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: currentHeight }} aria-hidden>
        {cells.map((c, i) => (
          <span key={i} style={{ flex: 1, display: "block", height: c.height, background: c.color }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
        <span style={{ color: RAG[row.rag].text }}>Phase {row.phase} of {row.phases} · {row.stage}</span>
        <span style={{ color: N700, flexShrink: 0 }}>{row.done} / {row.total} tasks · {row.pct}%</span>
      </div>
    </div>
  );
}

/** Full next-action list for one project, opened from the "See all" link in the right rail
 *  when there are more items than fit inline. */
function NextActionsPopup({
  projectTitle, items, close,
}: {
  projectTitle: string; items: { text: string; source?: string; owner?: string }[]; close: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return createPortal(
    <div className="overlay-center" role="dialog" aria-modal="true" aria-label={`Next actions — ${projectTitle}`}>
      <div className="overlay-bg" onClick={close} />
      <div className="popup-card">
        <div className="popup-card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Next actions</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectTitle}</div>
          </div>
          <button className="icon-btn" onClick={close}><X /></button>
        </div>
        <div className="popup-card-body">
          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingBottom: 12, borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-4)", flexShrink: 0, marginTop: 6 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                  {item.text}
                  {item.owner && <span style={{ fontSize: 11, fontStyle: "italic", color: "var(--ink-4)" }}> @{item.owner}</span>}
                </div>
                {item.source && <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 2 }}>{item.source}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ================= Page ================= */

export function ExecutiveUpdate() {
  const { data, all, setExecPortfolioSummary, updateProject, updateStatusUpdate, addUpdate } = useStore();
  const navigate = useNavigate();
  const [view, setView] = useState<"executive" | "full">("full");
  const [busy, setBusy] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [editingBudgetNote, setEditingBudgetNote] = useState<string | null>(null);
  const [budgetNoteDraft, setBudgetNoteDraft] = useState("");
  const [nextActionsPopupId, setNextActionsPopupId] = useState<string | null>(null);
  const [editingExecUpdate, setEditingExecUpdate] = useState<string | null>(null);
  const [execUpdateDraft, setExecUpdateDraft] = useState("");
  const [suggestingExecUpdate, setSuggestingExecUpdate] = useState(false);
  const [suggestingNext, setSuggestingNext] = useState(false);

  // Every project's executive-update data, unfiltered and in the user's saved order — the
  // portfolio report draws from this so a project with nothing written yet still gets a row.
  const allEntries = useMemo<ExecEntry[]>(() => {
    const taskPool = data.tasks;
    const raw = data.projects.map((project) => {
      const execUpdate = latestExecUpdate(project);
      const pool = projectContactPool(project, data.contacts);
      const ownerOf = (assignee: ProjectContactRef | undefined, who: string | undefined) => {
        const avatar = assigneeAvatar(pool, assignee, who);
        return avatar.title || undefined;
      };
      const nextItems = [
        ...project.milestones.flatMap((m) =>
          m.subtasks.filter((s) => s.next && !s.done).map((s) => ({ text: s.t, source: m.title, owner: ownerOf(s.assignee, s.who) })),
        ),
        ...taskPool
          .filter((t) => t.project === project.title && t.next && !t.done)
          .map((t) => ({ text: t.text, source: t.context, owner: ownerOf(t.assignee, t.who) })),
      ];
      const stored = project.execStatement?.trim();
      const statement = stored || localExecNext(project.nextActionsAiSummary?.trim() || null);
      const sinceLine = project.execSince?.trim() || localExecSince(execUpdate?.text ?? null);
      return { project, execUpdate, nextItems, statement, sinceLine, statementIsStored: Boolean(stored) };
    });

    const order = data.execUpdateOrder ?? [];
    const byId = new Map(raw.map((e) => [e.project.id, e]));
    const ordered: ExecEntry[] = [];
    for (const id of order) {
      const e = byId.get(id);
      if (e) { ordered.push(e); byId.delete(id); }
    }
    for (const e of raw) if (byId.has(e.project.id)) ordered.push(e);
    return ordered;
  }, [data]);

  const entriesById = useMemo(() => new Map(allEntries.map((e) => [e.project.id, e])), [allEntries]);

  // Pass projects in allEntries' order (already sorted by data.execUpdateOrder) so the
  // portfolio rows reflect the user's saved order.
  const report = useMemo(
    () => buildPortfolioReport(allEntries.map((e) => e.project), entriesById, data.execPortfolioSummary),
    [allEntries, entriesById, data.execPortfolioSummary],
  );

  // Project detail leads with what needs attention: red, then amber, then green,
  // preserving the saved order within each group.
  const detailRows = useMemo(
    () => [...report.rows].sort((a, b) => RAG_ORDER.indexOf(b.rag) - RAG_ORDER.indexOf(a.rag)),
    [report.rows],
  );

  const regenerate = async (entry: ExecEntry) => {
    const { project, execUpdate, nextItems } = entry;
    setBusy(project.id);
    try {
      const narrative = await generateExecNarrative(
        project, nextItems, execUpdate, project.nextActionsAiSummary?.trim() || null,
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
    setBulk({ done: 0, total: allEntries.length });
    for (let i = 0; i < allEntries.length; i++) {
      await regenerate(allEntries[i]);
      setBulk({ done: i + 1, total: allEntries.length });
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

  const startEditBudgetNote = (project: Project) => {
    setEditingBudgetNote(project.id);
    setBudgetNoteDraft(project.budgetNote ?? "");
  };

  const saveBudgetNote = (project: Project) => {
    updateProject(project.id, { budgetNote: budgetNoteDraft.trim() || undefined });
    setEditingBudgetNote(null);
  };

  const startEditExecUpdate = (entry: ExecEntry) => {
    setEditingExecUpdate(entry.project.id);
    setExecUpdateDraft(entry.execUpdate?.text ?? "");
  };

  const saveExecUpdate = (entry: ExecEntry) => {
    const text = execUpdateDraft.trim();
    if (text) {
      if (entry.execUpdate) {
        updateStatusUpdate(entry.project.id, entry.execUpdate.id, text, "executive");
      } else {
        addUpdate(entry.project.id, text, "executive");
      }
    }
    setEditingExecUpdate(null);
  };

  const handleSuggestExecUpdate = async (project: Project) => {
    if (!execUpdateDraft.trim()) return;
    setSuggestingExecUpdate(true);
    try {
      setExecUpdateDraft(await suggestStatusUpdateEdits(project, execUpdateDraft));
    } finally {
      setSuggestingExecUpdate(false);
    }
  };

  const handleSuggestNext = async (project: Project) => {
    if (!draft.trim()) return;
    setSuggestingNext(true);
    try {
      setDraft(await suggestExecNextEdits(project, draft));
    } finally {
      setSuggestingNext(false);
    }
  };

  const startEditSummary = () => {
    setSummaryDraft(report.summary);
    setEditingSummary(true);
  };

  const saveSummary = () => {
    setExecPortfolioSummary(summaryDraft);
    setEditingSummary(false);
  };

  const today = new Date();

  return (
    <div style={{ background: BG, minHeight: "100%" }}>
    <div style={{ maxWidth: 1320, margin: "0 auto", fontFamily: FONT, color: INK }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 32px 0", flexWrap: "wrap" }}>
        <span style={kicker}>As of {fmtLongDate(today)}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            disabled={bulk !== null || allEntries.length === 0}
            onClick={regenerateAll}
          >
            <Sparkles size={13} /> {bulk ? `Writing ${bulk.done}/${bulk.total}…` : "AI update all"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => exportExecUpdateHtml(report, all.user.name, all.user.feedbackEmail)}
          >
            <Download size={13} /> Export HTML
          </button>
          <div style={{ display: "flex", border: `1px solid ${DIVIDER}` }}>
            {(["executive", "full"] as const).map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
                  padding: "7px 12px", border: "none", borderLeft: i === 1 ? `1px solid ${DIVIDER}` : "none",
                  cursor: "pointer", background: view === v ? ACCENT : "transparent", color: view === v ? BG : INK,
                }}
              >
                {v === "executive" ? "Executive" : "Full detail"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {report.totalProjects === 0 ? (
        <div style={{ padding: "40px 32px", fontSize: 15, color: N700 }}>
          No active projects to report on. Mark a project active, or add an executive update to one, and it will show up here.
        </div>
      ) : (
        <>
          {/* Band B — Title block */}
          <div style={{ display: "grid", gridTemplateColumns: "1.85fr 1fr", borderBottom: `2px solid ${DIVIDER}`, marginTop: 20 }}>
            <div style={{ padding: "20px 32px 32px" }}>
              <h1 style={{ fontFamily: FONT, fontSize: 56, lineHeight: 1, letterSpacing: "-0.03em", margin: "0 0 16px", fontWeight: 800 }}>Portfolio update</h1>
              <p style={{ fontSize: 17, lineHeight: 1.45, maxWidth: "56ch", margin: "0 0 24px" }}>{report.lede}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, borderTop: `1px solid ${DIVIDER}`, paddingTop: 16 }}>
                <div>
                  <div style={{ ...kicker, marginBottom: 4 }}>Projects active</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15 }}>{report.totalProjects}</div>
                </div>
                <div>
                  <div style={{ ...kicker, marginBottom: 4 }}>Needs attention</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: ACCENT700 }}>
                    {report.needsAttention} project{report.needsAttention === 1 ? "" : "s"}
                  </div>
                </div>
                <div>
                  <div style={{ ...kicker, marginBottom: 4 }}>Programme owner</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15 }}>{all.user.name}</div>
                </div>
              </div>
            </div>
            <div style={{ borderLeft: `2px solid ${DIVIDER}`, padding: "20px 32px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ ...kicker, marginBottom: 10 }}>Portfolio completion</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 72, lineHeight: 0.85, letterSpacing: "-0.04em" }}>{report.pct}</span>
                  <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 24, lineHeight: 1 }}>%</span>
                </div>
                <div style={{ height: 10, background: N300, marginTop: 18, display: "flex" }}>
                  <div style={{ width: `${report.pct}%`, background: ACCENT }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, ...label11 }}>
                  <span>{report.doneTasks} of {report.totalTasks} tasks complete</span>
                  <span>{report.phasesOpen} phases open</span>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: 16 }}>
                <div style={{ ...kicker, marginBottom: 6 }}>Next portfolio milestone</div>
                {report.nextMilestone ? (
                  <>
                    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.01em" }}>{report.nextMilestone.date}</div>
                    <div style={{ fontSize: 13, color: N700, marginTop: 2 }}>
                      {report.nextMilestone.label} · {report.nextMilestone.daysOut <= 0 ? "due now" : `${report.nextMilestone.daysOut} days`}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: N700 }}>No upcoming gates on the books.</div>
                )}
              </div>
            </div>
          </div>

          {/* Band C — Portfolio metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: `2px solid ${DIVIDER}` }}>
            <div style={{ padding: "20px 32px 22px" }}>
              <div style={{ ...kicker, marginBottom: 8 }}>Portfolio health</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <RagChip rag={report.portfolioRag} />
                <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.01em" }}>{RAG_NAME[report.portfolioRag]}</span>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N700 }}>{RAG[report.portfolioRag].label}</span>
              </div>
              <div style={{ fontSize: 13, color: N700, marginTop: 4 }}>
                {report.totalProjects - report.needsAttention} of {report.totalProjects} project{report.totalProjects === 1 ? "" : "s"} on track
              </div>
              <RagScale active={report.portfolioRag} />
              <p style={{ fontSize: 13, lineHeight: 1.45, color: N800, margin: "10px 0 0" }}>{report.healthNote}</p>
            </div>
            <div style={{ padding: "20px 24px 22px", borderLeft: `1px solid ${DIVIDER}` }}>
              <div style={{ ...kicker, marginBottom: 8 }}>Risk breakdown · all projects</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {(["timeline", "budget", "resourcing"] as const).map((cat) => {
                  const counts = report.categoryCounts[cat];
                  const worst: Rag = counts.red > 0 ? "red" : counts.amber > 0 ? "amber" : "green";
                  const catLabel = cat === "timeline" ? "Timeline" : cat === "budget" ? "Budget" : "Resourcing";
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 11, height: 11, background: RAG[worst].swatch, display: "block", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{catLabel}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N700 }}>
                        {counts.green}G · {counts.amber}A · {counts.red}R
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: N800, margin: "10px 0 0" }}>{report.riskNote}</p>
            </div>
            <div style={{ padding: "20px 24px 22px", borderLeft: `1px solid ${DIVIDER}` }}>
              <div style={{ ...kicker, marginBottom: 8 }}>Schedule</div>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.01em" }}>{report.onDateCount} of {report.totalProjects} on time</div>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: N800, margin: "10px 0 0" }}>{report.scheduleNote}</p>
            </div>
            <div style={{ padding: "20px 32px 22px", borderLeft: `1px solid ${DIVIDER}` }}>
              <div style={{ ...kicker, marginBottom: 8 }}>Budget</div>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.01em" }}>
                {report.drawnPct === null ? "No budget set" : `${report.drawnPct}% drawn`}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                <div>
                  <div style={label11}>Approved</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15 }}>{formatMoneyShort(report.approvedTotal)}</div>
                </div>
                <div>
                  <div style={label11}>Spent</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15 }}>{formatMoneyShort(report.spentTotal)}</div>
                </div>
                <div>
                  <div style={label11}>Remaining</div>
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15 }}>{formatMoneyShort(Math.max(report.approvedTotal - report.spentTotal, 0))}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Band D — Executive poster (editable summary) */}
          <div style={{ background: ACCENT, color: BG, padding: "36px 32px 32px", borderBottom: `2px solid ${DIVIDER}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.85 }}>
                Executive summary · {fmtLongDate(today)}
              </span>
              {!editingSummary && (
                <button
                  onClick={startEditSummary}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT, fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: BG, opacity: 0.85, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
            </div>
            {editingSummary ? (
              <div>
                <textarea
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  rows={4}
                  autoFocus
                  style={{ width: "100%", maxWidth: "62ch", fontFamily: FONT, fontWeight: 600, fontSize: 17, lineHeight: 1.35, color: INK, padding: "10px 12px", border: "none", background: BG, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                  <button
                    onClick={saveSummary}
                    style={{ fontFamily: FONT, fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", padding: "7px 12px", background: BG, color: INK, border: "none", cursor: "pointer" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSummary(false)}
                    style={{ fontFamily: FONT, fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", padding: "7px 12px", background: "none", color: BG, border: "1px solid rgba(243,242,242,.45)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Clear the text to fall back to the auto-composed summary.</span>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: 28, lineHeight: 1.18, letterSpacing: "-0.02em", margin: 0, maxWidth: "62ch" }}>{report.summary}</p>
            )}
          </div>

          {/* Band G — Project detail (Full detail view only) */}
          {view === "full" && (
            <>
              <div style={{ borderTop: `2px solid ${DIVIDER}`, padding: "32px 32px 0" }}>
                <h2 style={{ fontFamily: FONT, fontSize: 24, letterSpacing: "-0.02em", margin: "0 0 4px", fontWeight: 800 }}>Project detail</h2>
                <p style={{ fontSize: 13, color: N700, margin: "0 0 24px" }}>Latest executive update, health, schedule, budget and next step for each project.</p>
              </div>
              <div style={{ padding: "0 32px 8px" }}>
                {detailRows.map((row) => {
                  const entry = entriesById.get(row.project.id);
                  const isEditing = editing === row.project.id;
                  const isBusy = busy === row.project.id;
                  const subNotes = (
                    [
                      ["Risk", row.project.riskNote],
                      ["Timeline", row.project.timelineNote],
                    ] as [string, string | undefined][]
                  ).filter(([, note]) => note?.trim());
                  const isEditingBudgetNote = editingBudgetNote === row.project.id;
                  const isEditingExecUpdate = editingExecUpdate === row.project.id;
                  return (
                    <div key={row.project.id} style={{ borderTop: `2px solid ${DIVIDER}`, padding: "18px 0 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 28, alignItems: "start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
                            <RagChip rag={row.rag} />
                            <h3
                              style={{ fontFamily: FONT, fontSize: 17, letterSpacing: "-0.01em", margin: 0, flex: 1, cursor: "pointer", fontWeight: 800 }}
                              onClick={() => navigate(`/projects/${row.project.id}`)}
                            >
                              {row.project.title}
                            </h3>
                          </div>
                          <div style={{ fontSize: 12, fontStyle: "italic", color: N600, marginBottom: 10 }}>
                            {row.project.owner}{row.project.technicalLead ? ` · Tech lead: ${row.project.technicalLead}` : ""}
                          </div>
                          <div style={{ ...kicker, marginBottom: 6 }}>Executive update{row.updateDate ? ` · ${shortDate(row.updateDate)}` : ""}</div>
                          {isEditingExecUpdate ? (
                            <div style={{ marginBottom: 14 }}>
                              <textarea
                                value={execUpdateDraft}
                                onChange={(e) => setExecUpdateDraft(e.target.value)}
                                rows={3}
                                autoFocus
                                style={{ width: "100%", fontSize: 14, lineHeight: 1.5, color: INK, padding: "8px 10px", border: `1px solid ${DIVIDER}`, background: "#fff", resize: "vertical", fontFamily: "inherit" }}
                              />
                              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => entry && saveExecUpdate(entry)}>Save</button>
                                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingExecUpdate(null)}>Cancel</button>
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                                  disabled={suggestingExecUpdate || !execUpdateDraft.trim()}
                                  onClick={() => handleSuggestExecUpdate(row.project)}
                                >
                                  <Sparkles size={11} /> {suggestingExecUpdate ? "Improving…" : "Suggest corrections"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 6px" }}>{row.update}</p>
                              {entry && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}
                                  onClick={() => startEditExecUpdate(entry)}
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                              )}
                            </>
                          )}

                          <div style={{ ...kicker, marginBottom: 6 }}>Coming up next</div>
                          {isEditing ? (
                            <div>
                              <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={3}
                                autoFocus
                                style={{ width: "100%", fontSize: 13, lineHeight: 1.5, color: INK, padding: "8px 10px", border: `1px solid ${DIVIDER}`, background: "#fff", resize: "vertical", fontFamily: "inherit" }}
                              />
                              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => saveEdit(row.project)}>Save</button>
                                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditing(null)}>Cancel</button>
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                                  disabled={suggestingNext || !draft.trim()}
                                  onClick={() => handleSuggestNext(row.project)}
                                >
                                  <Sparkles size={11} /> {suggestingNext ? "Improving…" : "Suggest corrections"}
                                </button>
                                <span style={{ fontSize: 11, color: N600 }}>Clear the text to fall back to the auto-composed statement.</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: N800, opacity: isBusy ? 0.5 : 1 }}>
                                {row.next || "No upcoming step recorded."}
                              </p>
                              {entry && (
                                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                                  <button
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                    disabled={isBusy || bulk !== null}
                                    onClick={() => regenerate(entry)}
                                  >
                                    <Sparkles size={11} /> {isBusy ? "Writing…" : entry.statementIsStored ? "Regenerate" : "AI update"}
                                  </button>
                                  <button
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                    disabled={isBusy || bulk !== null}
                                    onClick={() => startEdit(entry)}
                                  >
                                    <Pencil size={11} /> Edit
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ borderLeft: `2px solid ${DIVIDER}`, paddingLeft: 24 }}>
                          <div style={{ ...kicker, marginBottom: 6 }}>Next actions</div>
                          {row.nextItems.length === 0 ? (
                            <p style={{ fontSize: 13, color: N600, fontStyle: "italic", margin: 0 }}>Nothing flagged as next action.</p>
                          ) : (
                            <>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {row.nextItems.slice(0, NEXT_ACTIONS_VISIBLE).map((item, i) => (
                                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: N600, flexShrink: 0, marginTop: 6 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 13, lineHeight: 1.4, color: INK }}>
                                        {item.text}
                                        {item.owner && <span style={{ fontSize: 11, fontStyle: "italic", color: N600 }}> @{item.owner}</span>}
                                      </div>
                                      {item.source && <div style={{ fontSize: 11, color: N600, marginTop: 1 }}>{item.source}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {row.nextItems.length > NEXT_ACTIONS_VISIBLE && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: 11, padding: "3px 8px", marginTop: 10 }}
                                  onClick={() => setNextActionsPopupId(row.project.id)}
                                >
                                  See all {row.nextItems.length}
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ borderLeft: `2px solid ${DIVIDER}`, paddingLeft: 24 }}>
                          <div style={{ paddingBottom: 14, borderBottom: `1px solid ${DIVIDER}`, marginBottom: 4 }}>
                            <PhaseStepper row={row} tall />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${DIVIDER}`, fontSize: 13 }}>
                            <span style={{ color: N700 }}>Type / Tier</span>
                            <span style={{ fontFamily: FONT, fontWeight: 800 }}>
                              {row.project.projectType ? PROJECT_TYPE_LABEL[row.project.projectType] : "—"} / {row.project.tier ? `Tier ${row.project.tier}` : "No tier"}
                            </span>
                          </div>
                          {([
                            ["Timeline", row.timeline],
                            ["Budget", row.budget],
                            ["Resourcing", row.resourcing],
                          ] as [string, Rag][]).map(([lbl, rag]) => (
                            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${DIVIDER}`, fontSize: 13 }}>
                              <span style={{ color: N700 }}>{lbl}</span>
                              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: RAG[rag].text }}>{RAG[rag].label}</span>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${DIVIDER}`, fontSize: 13 }}>
                            <span style={{ color: N700 }}>Spend</span>
                            {row.project.budget ? (
                              <span style={{ fontFamily: FONT, fontWeight: 800, whiteSpace: "nowrap" }}>
                                {formatMoneyShort(row.approved)} − {formatMoneyShort(row.spent)} ={" "}
                                <span style={{ color: row.approved - row.spent >= 0 ? RAG.green.text : RAG.red.text }}>
                                  {row.approved - row.spent < 0 ? "-" : ""}
                                  {formatMoneyShort(Math.abs(row.approved - row.spent))}
                                </span>
                              </span>
                            ) : (
                              <span style={{ fontFamily: FONT, fontWeight: 800 }}>—</span>
                            )}
                          </div>
                          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                            {subNotes.map(([label, note]) => (
                              <div key={label}>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N700, marginBottom: 2 }}>{label} note</div>
                                <div style={{ fontSize: 13, lineHeight: 1.45, color: N800 }}>{note}</div>
                              </div>
                            ))}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: N700 }}>Budget note</span>
                                {!isEditingBudgetNote && (
                                  <button
                                    onClick={() => startEditBudgetNote(row.project)}
                                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: N700, display: "inline-flex", alignItems: "center" }}
                                    title="Edit budget note"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                )}
                              </div>
                              {isEditingBudgetNote ? (
                                <div>
                                  <textarea
                                    value={budgetNoteDraft}
                                    onChange={(e) => setBudgetNoteDraft(e.target.value)}
                                    rows={2}
                                    autoFocus
                                    style={{ width: "100%", fontSize: 13, lineHeight: 1.45, color: INK, padding: "6px 8px", border: `1px solid ${DIVIDER}`, background: "#fff", resize: "vertical", fontFamily: "inherit" }}
                                  />
                                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => saveBudgetNote(row.project)}>Save</button>
                                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingBudgetNote(null)}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => startEditBudgetNote(row.project)}
                                  style={{ fontSize: 13, lineHeight: 1.45, color: row.project.budgetNote ? N800 : N600, fontStyle: row.project.budgetNote ? "normal" : "italic", cursor: "pointer" }}
                                >
                                  {row.project.budgetNote || "No budget note — click to add one."}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Band H — Footer */}
          <div style={{ borderTop: `2px solid ${DIVIDER}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <span style={label11}>Portfolio update generated {fmtLongDate(today)}</span>
            {all.user.feedbackEmail && (
              <a
                href={safeHref(`mailto:${all.user.feedbackEmail}?subject=${encodeURIComponent("Portfolio update feedback")}`)}
                style={{ fontFamily: FONT, fontWeight: 800, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none", color: ACCENT }}
              >
                Send feedback
              </a>
            )}
          </div>

          {nextActionsPopupId && (() => {
            const popupEntry = entriesById.get(nextActionsPopupId);
            if (!popupEntry) return null;
            return (
              <NextActionsPopup
                projectTitle={popupEntry.project.title}
                items={popupEntry.nextItems}
                close={() => setNextActionsPopupId(null)}
              />
            );
          })()}
        </>
      )}
    </div>
    </div>
  );
}
