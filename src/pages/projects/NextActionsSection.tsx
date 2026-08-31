import { useState } from "react";
import { useStore } from "../../store/store";
import { Avatar, DueChip, TASK_STATUS_LABEL, toDateInputValue } from "../../components/ui";
import { SubtaskEditPanel } from "../../components/SubtaskEditPanel";
import { assigneeAvatar, projectContactPool } from "../../lib/projectContacts";
import type { Milestone, Project, Subtask } from "../../lib/types";

export interface NextActionRow {
  milestone: Milestone;
  subtask: Subtask;
}

/** Every subtask flagged as a next action and not yet done, across all of the project's milestones —
 *  sorted soonest-due first, undated items last (same comparator as the milestone due-date sort above). */
export function nextActionSubtasks(project: Project): NextActionRow[] {
  return project.milestones
    .flatMap((m) =>
      m.subtasks.filter((s) => s.next && !s.done).map((s) => ({ milestone: m, subtask: s })),
    )
    .sort((a, b) => {
      const da = toDateInputValue(a.subtask.due);
      const db = toDateInputValue(b.subtask.due);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    });
}

const colHead: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em",
};

export function NextActionsSection({ project }: { project: Project }) {
  const { data } = useStore();
  const pool = projectContactPool(project, data.contacts);
  const rows = nextActionSubtasks(project);
  const [openSubtask, setOpenSubtask] = useState<{ milestoneId: string; subtaskId: string } | null>(null);

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-h">Next Actions</div>
      <div className="card" style={{ padding: "6px 10px 8px" }}>
        {rows.length === 0 && (
          <div style={{ padding: "10px 4px", fontSize: 13, color: "var(--ink-4)" }}>
            Nothing flagged as next action.
          </div>
        )}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "4px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 2 }}>
            <span style={{ flex: 1, ...colHead }}>Task</span>
            <span style={{ width: 130, flexShrink: 0, ...colHead }}>Milestone</span>
            <span style={{ width: 78, flexShrink: 0, ...colHead }}>Due</span>
            <span style={{ width: 120, flexShrink: 0, ...colHead }}>Owner</span>
            <span style={{ width: 110, flexShrink: 0, ...colHead }}>Status</span>
          </div>
        )}
        {rows.map(({ milestone, subtask: s }) => {
          const avatar = assigneeAvatar(pool, s.assignee, s.who);
          const ownerLabel = avatar.title || "—";
          return (
            <button
              key={s.id}
              onClick={() => setOpenSubtask({ milestoneId: milestone.id, subtaskId: s.id })}
              title="Open task details"
              style={{
                display: "flex", width: "100%", gap: 10, padding: "7px 4px",
                borderBottom: "1px solid var(--border)", alignItems: "center", flexWrap: "wrap",
                textAlign: "left", cursor: "pointer",
              }}
            >
              <span className="row-title-flex" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500 }}>{s.t}</span>
              <span style={{ width: 130, flexShrink: 0, fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {milestone.title}
              </span>
              <span style={{ width: 78, flexShrink: 0 }}>
                {s.due ? <DueChip due={s.due} done={s.done} /> : <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>—</span>}
              </span>
              <span style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                {avatar.ini && <Avatar who={avatar.ini} size={20} color={avatar.color ?? "var(--ink-3)"} />}
                <span style={{ fontSize: 12, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ownerLabel}
                </span>
              </span>
              <span style={{ width: 110, flexShrink: 0 }}>
                {s.taskStatus ? (
                  <span className={`chip ts-${s.taskStatus}`}>{TASK_STATUS_LABEL[s.taskStatus]}</span>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>—</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {openSubtask && (
        <SubtaskEditPanel
          projectId={project.id}
          milestoneId={openSubtask.milestoneId}
          subtaskId={openSubtask.subtaskId}
          close={() => setOpenSubtask(null)}
        />
      )}
    </div>
  );
}
