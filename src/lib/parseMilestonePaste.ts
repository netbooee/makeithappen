/**
 * Parses a plain-text outline into milestones + tasks.
 *
 * Format: milestone titles are top-level lines (no leading whitespace, no
 * bullet marker). Tasks are lines indented and/or bullet-prefixed beneath
 * a milestone line, using any of `- * • ‣ ◦` as the bullet character.
 */

export interface ParsedMilestone {
  title: string;
  tasks: string[];
}

const BULLET_CHARS = ["-", "*", "•", "‣", "◦"];

/** Strips leading whitespace and at most one leading bullet marker (+ the whitespace after it). */
function stripTaskPrefix(line: string): string {
  let s = line.replace(/^[ \t]+/, "");
  if (s.length > 0 && BULLET_CHARS.includes(s[0])) {
    s = s.slice(1).replace(/^[ \t]+/, "");
  }
  return s.trim();
}

function isTaskLine(rawLine: string): boolean {
  const hasLeadingWhitespace = /^[ \t]/.test(rawLine);
  const trimmed = rawLine.replace(/^[ \t]+/, "");
  const startsWithBullet = trimmed.length > 0 && BULLET_CHARS.includes(trimmed[0]);
  return hasLeadingWhitespace || startsWithBullet;
}

export function parseMilestonePaste(text: string): ParsedMilestone[] {
  const lines = text.split(/\r\n|\n/);
  const milestones: ParsedMilestone[] = [];
  let current: ParsedMilestone | null = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue; // skip blank/whitespace-only lines

    if (isTaskLine(rawLine)) {
      if (!current) continue; // task line before any milestone seen — skip
      const taskText = stripTaskPrefix(rawLine);
      if (!taskText) continue; // nothing left after stripping — skip
      current.tasks.push(taskText);
      continue;
    }

    const title = rawLine.trim();
    if (!title) continue; // titleless milestone — skip
    current = { title, tasks: [] };
    milestones.push(current);
  }

  return milestones;
}
