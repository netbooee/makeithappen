import { Calendar, Check, ChevronDown, ChevronUp, Hourglass, UserRound } from "lucide-react";
import { Fragment, type CSSProperties } from "react";
import type { Project, Status, Subtask, SubtaskStatus, Task } from "../lib/types";

/** Shared green/amber/red risk color mapping, reused anywhere a project's RAG status needs a color. */
export const RAG = { green: "#10B981", amber: "#F59E0B", red: "#EF4444" } as const;

/** Color for a project's risk level, or undefined when no risk is set (callers should fall back to their default). */
export function riskColor(risk: Project["risk"]): string | undefined {
  return risk ? RAG[risk] : undefined;
}

/* ---- Date helpers ---- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function toDateInputValue(str: string | undefined): string {
  if (!str || str === "No date" || str === "Not set") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\w{3})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (m) {
    const mo = MONTHS.findIndex((x) => x === m[1]) + 1;
    if (mo > 0) {
      const yr = m[3] ? +m[3] : new Date().getFullYear();
      return `${yr}-${String(mo).padStart(2,"0")}-${String(+m[2]).padStart(2,"0")}`;
    }
  }
  return "";
}

/** Parse an update timestamp like "Jun 16, 9:00 AM" or "Jun 16, 2025, 9:00 AM" into epoch ms.
 *  Native Date parsing can't be used: without a year Chrome assumes 2001 and Safari/Firefox
 *  return Invalid Date. A missing year is treated as the current year. Returns NaN if unparseable. */
export function parseTimestamp(str: string | undefined): number {
  if (!str) return NaN;
  const m = str.trim().match(/^([A-Za-z]{3})\s+(\d{1,2})(?:,\s*(\d{4}))?(?:,?\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  if (m) {
    const mo = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
    if (mo >= 0) {
      const yr = m[3] ? +m[3] : new Date().getFullYear();
      let hr = m[4] ? +m[4] : 0;
      const min = m[5] ? +m[5] : 0;
      const ampm = m[6]?.toUpperCase();
      if (ampm === "PM" && hr < 12) hr += 12;
      if (ampm === "AM" && hr === 12) hr = 0;
      return new Date(yr, mo, +m[2], hr, min).getTime();
    }
  }
  return new Date(str).getTime();
}

function fromDateInputValue(str: string): string {
  if (!str) return "";
  const [y, mo, d] = str.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDue(str: string): string {
  if (!str || str === "No date" || str === "Not set") return str;
  const iso = toDateInputValue(str);
  if (!iso) return str;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isOverdue(due: string | undefined, done = false): boolean {
  if (!due || done) return false;
  const iso = toDateInputValue(due);
  if (!iso) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return iso < today;
}

export function DateInput({
  value,
  onChange,
  onStep,
  style,
  className = "input",
  returnRaw = false,
  showMonthStep = false,
}: {
  value: string | undefined;
  onChange: (val: string) => void;
  onStep?: (val: string) => void;
  style?: CSSProperties;
  className?: string;
  returnRaw?: boolean;
  showMonthStep?: boolean;
}) {
  const format = (iso: string) => (iso ? (returnRaw ? iso : fromDateInputValue(iso)) : "");
  const emit = (iso: string) => onChange(format(iso));

  const stepMonth = (delta: number) => {
    const base = toDateInputValue(value) || toDateInputValue(new Date().toISOString().slice(0, 10));
    const [y, mo, d] = base.split("-").map(Number);
    const total = (mo - 1) + delta;
    const newYear = y + Math.floor(total / 12);
    const newMonth = ((total % 12) + 12) % 12;
    const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
    const day = Math.min(d, maxDay);
    const iso = `${newYear}-${String(newMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    (onStep ?? onChange)(format(iso));
  };

  const input = (
    <input
      type="date"
      className={className}
      value={toDateInputValue(value)}
      onChange={(e) => emit(e.target.value)}
      style={style}
    />
  );

  if (!showMonthStep) return input;

  return (
    <span style={{ display: "inline-flex", alignItems: "stretch", gap: 2 }}>
      {input}
      <span style={{ display: "inline-flex", flexDirection: "column", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => stepMonth(1)}
          title="Next month"
          style={{ lineHeight: 0, padding: "0 2px", border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)" }}
        >
          <ChevronUp size={11} />
        </button>
        <button
          type="button"
          onClick={() => stepMonth(-1)}
          title="Previous month"
          style={{ lineHeight: 0, padding: "0 2px", border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)" }}
        >
          <ChevronDown size={11} />
        </button>
      </span>
    </span>
  );
}

export function Avatar({ who, size = 24, color = "var(--ink-2)" }: { who: string; size?: number; color?: string }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}>
      {who}
    </span>
  );
}

const STATUS_LABEL: Record<Status, string> = { active: "Active", waiting: "Waiting", hold: "On Hold", complete: "Complete" };

export function StatusChip({ status }: { status: Status }) {
  return <span className={`chip status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Checkbox({ done, onClick, title }: { done: boolean; onClick?: () => void; title?: string }) {
  return (
    <button className={"check" + (done ? " done" : "")} onClick={onClick} title={title} aria-checked={done} role="checkbox">
      <Check strokeWidth={3.2} />
    </button>
  );
}

/** Checkbox, or a delegated/waiting marker, matching the prototype's TaskMarker. */
export function TaskMarker({ task, onClick }: { task: Task | Subtask; onClick?: () => void }) {
  if (task.state === "delegated") {
    return (
      <button className="state-mark delegate" onClick={onClick} title={`Delegated to ${task.to ?? "someone"}`}>
        <UserRound />
      </button>
    );
  }
  if (task.state === "waiting") {
    return (
      <button className="state-mark wait" onClick={onClick} title={`Waiting for ${task.waitFor ?? "…"}`}>
        <Hourglass />
      </button>
    );
  }
  return <Checkbox done={task.done} onClick={onClick} />;
}

export const TASK_STATUS_LABEL: Record<SubtaskStatus, string> = {
  "not-started": "Not started",
  "scheduled": "Scheduled",
  "in-progress": "In progress",
  "completed": "Completed",
};

/** Next / Delegated / Waiting tag, matching the prototype's StateTag. */
export function StateTag({ task }: { task: Task | Subtask }) {
  if (task.state === "delegated") return <span className="chip delegate"><UserRound /> {task.to ?? "Delegated"}</span>;
  if (task.state === "waiting") return <span className="chip wait"><Hourglass /> {task.waitFor ?? "Waiting"}</span>;
  const hasStatus = 'taskStatus' in task && task.taskStatus;
  const hasNext = task.next && !task.done;
  const hasLate = task.late && !task.done;
  if (!hasStatus && !hasNext && !hasLate) return null;
  return (
    <Fragment>
      {hasLate && <span className="chip late"><FlagIcon /> Late</span>}
      {hasNext && <span className="chip next"><FlagIcon /> Next</span>}
      {hasStatus && <span className={`chip ts-${task.taskStatus}`}>{TASK_STATUS_LABEL[task.taskStatus as SubtaskStatus]}</span>}
    </Fragment>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function DueChip({ due, done = false }: { due: string; done?: boolean }) {
  return <span className={`chip${isOverdue(due, done) ? " overdue" : ""}`}><Calendar /> {fmtDue(due)}</span>;
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return <div className="bar"><i style={{ width: `${value * 100}%`, ...(color ? { background: color } : {}) }} /></div>;
}

export function ProgressDial({ value, size = 44, color }: { value: number; size?: number; color?: string }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" role="img" aria-label={`${Math.round(pct * 100)}% complete`} style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
      {pct > 0 && (
        <circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color ?? "var(--accent)"} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 22 22)"
          style={{ transition: "stroke-dashoffset .5s" }}
        />
      )}
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink)">
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
}
