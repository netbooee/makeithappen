import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown, FileText, Flag, Flame, FolderKanban, ListTodo, Menu, Search, Settings, Sparkles, Users,
} from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, toDateInputValue } from "./ui";
import { TweaksPanel } from "./TweaksPanel";
import { SearchModal } from "./SearchModal";
import type { Workspace } from "../lib/types";

const NAV = [
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/projects" },
  { id: "tasks", label: "Tasks", icon: ListTodo, path: "/tasks" },
  { id: "contacts", label: "E6W", icon: Users, path: "/contacts" },
  { id: "updates", label: "Updates", icon: FileText, path: "/updates" },
  { id: "habits", label: "Habits", icon: Flame, path: "/habits" },
  { id: "assistant", label: "AI Assistant", icon: Sparkles, path: "/assistant" },
];

const CRUMB: Record<string, string> = {
  projects: "Projects", tasks: "Tasks", contacts: "E6W Networking",
  updates: "Status Updates", habits: "Habits", assistant: "AI Assistant",
};

export function Shell() {
  const { workspace, setWorkspace, data, all } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split("/")[1] || "projects";
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [projsOpen, setProjsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const openTasks = data.todayTasks.filter((t) => !t.done).length;
  const followUps = data.contacts.filter((c) => c.followUp).length;

  const goNextAction = (project: string | null) => {
    if (project) {
      const p = data.projects.find((x) => x.title === project);
      navigate(p ? `/projects/${p.id}` : "/tasks");
    } else {
      navigate("/tasks");
    }
  };

  const WsSwitch = (
    <div className="ws-switch">
      {(["work", "personal"] as Workspace[]).map((ws) => (
        <button
          key={ws}
          className={"ws-opt" + (workspace === ws ? " active" : "")}
          data-ws={ws}
          onClick={() => setWorkspace(ws)}
        >
          <span className="ws-dot" /> {ws === "work" ? "Work" : "Personal"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="app">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div className="brand-name">Make<b style={{ color: "var(--accent)" }}>It</b>Happen</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="nav-group">
            {NAV.map((n) => (
              <button
                key={n.id}
                className={"nav-item" + (section === n.id ? " active" : "")}
                onClick={() => navigate(n.path)}
                title={n.label}
              >
                <n.icon />
                <span className="nav-label">{n.label}</span>
                {n.id === "tasks" && openTasks > 0 && <span className="badge">{openTasks}</span>}
                {n.id === "contacts" && followUps > 0 && <span className="badge">{followUps}</span>}
              </button>
            ))}
          </div>

          {/* Collapsible project list */}
          <div className="proj-nav-toggle" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button
              className="nav-item"
              style={{ justifyContent: "space-between" }}
              onClick={() => setProjsOpen((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FolderKanban size={18} />
                Projects
              </span>
              <ChevronDown size={13} style={{ transition: "transform 0.18s", transform: projsOpen ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--ink-4)" }} />
            </button>
            {projsOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "2px 4px 4px" }}>
                {data.projects.map((p) => {
                  const dotColor =
                    p.status === "complete" ? "var(--next)"
                    : p.status === "active" ? "var(--accent)"
                    : p.status === "hold" ? "#F59E0B"
                    : "var(--ink-4)";
                  return (
                    <button
                      key={p.id}
                      className={"proj-nav-card" + (location.pathname === `/projects/${p.id}` ? " active" : "")}
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <div className="proj-nav-title">{p.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                          {p.start ? `${p.start} → ${p.due}` : p.due}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                        {[...p.milestones].sort((a, b) => { const da = toDateInputValue(a.due), db = toDateInputValue(b.due); if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da.localeCompare(db); }).map((m) => {
                          const bg = m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : m.status === "waiting" ? "#8B5CF6" : "#F59E0B";
                          return <div key={m.id} style={{ height: 4, width: 16, borderRadius: 2, background: bg, flexShrink: 0 }} title={`${m.title} — ${m.status}`} />;
                        })}
                      </div>
                      <div style={{ marginTop: 4, height: 3, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p.progress * 100}%`, background: dotColor, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-4)", textAlign: "right", marginTop: 2 }}>{Math.round(p.progress * 100)}%</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>{/* end scrollable wrapper */}

        <div className="sidebar-foot">
          <Avatar who={all.user.initials} color="var(--ink)" size={30} />
          <div className="who">
            {all.user.name}
            <small>{all.user.email}</small>
          </div>
          <button className="icon-btn" onClick={() => setTweaksOpen((v) => !v)} title="Settings">
            <Settings />
          </button>
        </div>
      </aside>

      <div className="main">
        {/* Top banner (desktop) */}
        <div className="topbanner">
          <div className="topbanner-inner">
            {WsSwitch}
            <div className="crumb">
              <span className="sep">/</span> {CRUMB[section] ?? "Today"}
            </div>
            <div className="topbanner-actions">
              <button className="search-pill" onClick={() => setSearchOpen(true)}><Search /> Search <kbd>⌘K</kbd></button>
            </div>
          </div>
        </div>

        {/* Top bar (mobile) */}
        <div className="mobile-top">
          <div className="brand-mark" style={{ width: 24, height: 24, fontSize: 13 }}>M</div>
          {WsSwitch}
          <button className="icon-btn" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
        </div>

        <div className="scroll" ref={scrollRef}>
          <Outlet />
        </div>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="bottom-nav">
        {NAV.slice(0, 5).map((n) => (
          <button
            key={n.id}
            className={section === n.id ? "active" : ""}
            onClick={() => navigate(n.path)}
          >
            <n.icon /> {n.label}
          </button>
        ))}
        <button
          className={section === "assistant" ? "active" : ""}
          onClick={() => navigate("/assistant")}
        >
          <Menu /> More
        </button>
      </nav>

      {tweaksOpen && <TweaksPanel close={() => setTweaksOpen(false)} />}
      {searchOpen && <SearchModal close={() => setSearchOpen(false)} />}
    </div>
  );
}
