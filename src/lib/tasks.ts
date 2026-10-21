import { nextActionSubtasks } from "../pages/projects/NextActionsSection";
import { TASK_STATUS_LABEL } from "../components/ui";
import type { Subtask, Task, WorkspaceData } from "./types";

/**
 * Count of all undone next-action rows across the whole workspace — standalone
 * `Task`s flagged `next` plus milestone `Subtask`s flagged `next`, across every
 * project. This is the single source of truth for "how many next actions are
 * open" — used by both the Tasks page (grouped display) and the Shell nav badge,
 * so they never drift apart.
 */
export function nextActionCount(data: WorkspaceData): number {
  const taskCount = data.tasks.filter((t) => t.next && !t.done).length;
  const subtaskCount = data.projects.reduce((sum, p) => sum + nextActionSubtasks(p).length, 0);
  return taskCount + subtaskCount;
}

/** Plain-text progress status for a Task or Subtask — the same precedence StateTag renders as
 *  chips, but as one label for places (e.g. a status email) that need a single string. */
export function progressStatusLabel(task: Task | Subtask): string {
  if (task.done) return "Completed";
  if (task.state === "delegated") return `Delegated to ${task.to || "someone"}`;
  if (task.state === "waiting") return `Waiting on ${task.waitFor || "something"}`;
  if ("taskStatus" in task && task.taskStatus) return TASK_STATUS_LABEL[task.taskStatus];
  if (task.next) return "Next action";
  return "Not started";
}
