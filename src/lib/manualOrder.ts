/**
 * Applies a manual override order (a list of item ids, e.g. `project.milestoneOrder` or
 * `milestone.subtaskOrder`) on top of a default comparator. Items not present in the override —
 * e.g. ones added after a manual reorder was set — fall in after the ordered ones, sorted by the
 * default.
 */
export function applyManualOrder<T extends { id: string }>(
  items: T[],
  order: string[] | undefined,
  defaultCompare: (a: T, b: T) => number,
): T[] {
  if (!order || order.length === 0) return [...items].sort(defaultCompare);
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  const rest = [...byId.values()].sort(defaultCompare);
  return [...ordered, ...rest];
}
