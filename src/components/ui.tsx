import { Calendar, Check, Hourglass, UserRound } from "lucide-react";
import { Fragment, type CSSProperties } from "react";
import type { Status, Subtask, SubtaskStatus, Task } from "../lib/types";

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

function fromDateInputValue(str: string): string {
  if (!str) return "";
  const [y, mo, d] = str.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DateInput({
  value,
  onChange,
  style,
  className = "input",
  returnRaw = false,
}: {
  value: string | undefined;
  onChange: (val: string) => void;
  style?: CSSProperties;
  className?: string;
  returnRaw?: boolean;
}) {
  return (
    <input
      type="date"
      className={className}
      value={toDateInputValue(value)}
      onChange={(e) => onChange(e.target.value ? (returnRaw ? e.target.value : fromDateInputValue(e.target.value)) : "")}
      style={style}
    />
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

const TASK_STATUS_LABEL: Record<SubtaskStatus, string> = {
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
  if (!hasStatus && !hasNext) return null;
  return (
    <Fragment>
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

export function DueChip({ due }: { due: string }) {
  return <span className="chip"><Calendar /> {due}</span>;
}

export function Bar({ value }: { value: number }) {
  return <div className="bar"><i style={{ width: `${value * 100}%` }} /></div>;
}
