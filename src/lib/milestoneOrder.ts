import type { Milestone } from "./types";

/**
 * Applies a manual override order (a list of milestone ids, e.g. `project.milestoneOrder`)
 * on top of a default comparator. Milestones not present in the override — e.g. ones added
 * after a manual reorder was set — fall in after the ordered ones, sorted by the default.
 */
export function applyMilestoneOrder(
  milestones: Milestone[],
  order: string[] | undefined,
  defaultCompare: (a: Milestone, b: Milestone) => number,
): Milestone[] {
  if (!order || order.length === 0) return [...milestones].sort(defaultCompare);
  const byId = new Map(milestones.map((m) => [m.id, m]));
  const ordered: Milestone[] = [];
  for (const id of order) {
    const m = byId.get(id);
    if (m) {
      ordered.push(m);
      byId.delete(id);
    }
  }
  const rest = [...byId.values()].sort(defaultCompare);
  return [...ordered, ...rest];
}
