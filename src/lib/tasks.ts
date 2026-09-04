import { nextActionSubtasks } from "../pages/projects/NextActionsSection";
import type { WorkspaceData } from "./types";

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
