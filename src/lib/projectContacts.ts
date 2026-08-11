import type { Contact, ContactKind, Project, ProjectContactRef } from "./types";
import { lastNameOf } from "./types";

/** One officially entered contact on a project: internal member, external team member, or stakeholder. */
export interface ProjectContactOption {
  kind: ContactKind;
  id: string;
  name: string;
  ini: string;
  color?: string;
}

export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Every contact officially entered on the project, sorted by last name. */
export function projectContactPool(
  project: Project | null | undefined,
  contacts: Contact[],
): ProjectContactOption[] {
  if (!project) return [];
  const out: ProjectContactOption[] = [];
  for (const mem of project.members ?? []) {
    const c = contacts.find((x) => x.id === mem.contactId);
    if (!c) continue;
    out.push({ kind: "internal", id: c.id, name: c.name, ini: initialsOf(c.name), color: c.color });
  }
  for (const ext of project.externalTeam ?? []) {
    out.push({ kind: "external", id: ext.id, name: ext.name, ini: initialsOf(ext.name) });
  }
  for (const sh of project.stakeholders ?? []) {
    out.push({ kind: "stakeholder", id: sh.id, name: sh.name, ini: initialsOf(sh.name) });
  }
  return out.sort((a, b) => lastNameOf(a.name).localeCompare(lastNameOf(b.name)));
}

export function findProjectContact(
  pool: ProjectContactOption[],
  ref: ProjectContactRef | undefined,
): ProjectContactOption | undefined {
  if (!ref) return undefined;
  return pool.find((p) => p.kind === ref.kind && p.id === ref.id);
}

/** `"kind:id"` — the value used by the contact <select> elements. */
export function contactRefValue(ref: ProjectContactRef | undefined): string {
  return ref ? `${ref.kind}:${ref.id}` : "";
}

export function parseContactRef(value: string): ProjectContactRef | undefined {
  const [kind, ...rest] = value.split(":");
  const id = rest.join(":");
  if (!kind || !id) return undefined;
  return { kind: kind as ContactKind, id };
}

export function contactLabel(opt: ProjectContactOption): string {
  if (opt.kind === "external") return `${opt.name} (ext)`;
  if (opt.kind === "stakeholder") return `${opt.name} (stakeholder)`;
  return opt.name;
}

/** What the assignee avatar should render: the linked contact if there is one, else the typed name. */
export function assigneeAvatar(
  pool: ProjectContactOption[],
  assignee: ProjectContactRef | undefined,
  who: string | undefined,
): { ini: string; color?: string; title?: string } {
  const c = findProjectContact(pool, assignee);
  if (c) return { ini: c.ini, color: c.color, title: c.name };
  return { ini: who ?? "", title: who };
}
