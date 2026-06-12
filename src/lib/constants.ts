import type { Workspace } from "./types";

export const CONTEXTS: Record<Workspace, string[]> = {
  work: ["@work", "@calls", "@waiting", "@home"],
  personal: ["@home", "@calls", "@errands", "@waiting"],
};
