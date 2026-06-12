import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, FolderKanban, ListTodo, Users, type LucideIcon } from "lucide-react";
import { useStore } from "../store/store";

type ResultType = "project" | "task" | "contact" | "habit";

interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sub: string;
  path: string;
}

const TYPE_ICON: Record<ResultType, LucideIcon> = {
  project: FolderKanban,
  task: ListTodo,
  contact: Users,
  habit: Flame,
};

const TYPE_LABEL: Record<ResultType, string> = {
  project: "Project",
  task: "Task",
  contact: "Contact",
  habit: "Habit",
};

export function SearchModal({ close }: { close: () => void }) {
  const { all } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const ws of ["work", "personal"] as const) {
      for (const p of all[ws].projects) {
        if (p.title.toLowerCase().includes(q) || (p.desc ?? "").toLowerCase().includes(q)) {
          out.push({ type: "project", id: p.id, label: p.title, sub: p.desc ?? "", path: `/projects/${p.id}` });
        }
      }
      for (const list of [all[ws].todayTasks, all[ws].upcoming, all[ws].someday]) {
        for (const t of list) {
          if (t.text.toLowerCase().includes(q)) {
            out.push({ type: "task", id: t.id, label: t.text, sub: t.project ?? t.context, path: "/tasks" });
          }
        }
      }
      for (const h of all[ws].habits) {
        if (h.name.toLowerCase().includes(q)) {
          out.push({ type: "habit", id: h.id, label: h.name, sub: `${h.streak}-day streak`, path: `/habits/${h.id}` });
        }
      }
    }

    // Contacts are shared across workspaces — deduplicate by id
    const seen = new Set<string>();
    for (const ws of ["work", "personal"] as const) {
      for (const c of all[ws].contacts) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        if (c.name.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q)) {
          out.push({ type: "contact", id: c.id, label: c.name, sub: c.company ?? c.rel, path: `/contacts/${c.id}` });
        }
      }
    }

    return out.slice(0, 10);
  }, [query, all]);

  useEffect(() => { setActive(0); }, [results]);

  const go = (r: SearchResult) => { navigate(r.path); close(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((v) => Math.min(v + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((v) => Math.max(v - 1, 0)); return; }
      if (e.key === "Enter" && results[active]) { go(results[active]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="search-overlay" onMouseDown={close}>
      <div className="search-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-dialog-input"
          placeholder="Search projects, tasks, contacts, habits…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <button
                  key={r.id + r.type}
                  className={"search-result" + (i === active ? " active" : "")}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <span className="search-result-icon"><Icon size={14} /></span>
                  <span className="search-result-body">
                    <span className="search-result-label">{r.label}</span>
                    {r.sub && <span className="search-result-sub">{r.sub}</span>}
                  </span>
                  <span className="search-result-type">{TYPE_LABEL[r.type]}</span>
                </button>
              );
            })}
          </div>
        )}
        {query.trim() && results.length === 0 && (
          <div style={{ padding: "16px 14px", fontSize: 13, color: "var(--ink-4)" }}>No results for "{query}"</div>
        )}
      </div>
    </div>
  );
}
