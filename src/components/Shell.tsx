import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Flag, Flame, Home, FolderKanban, ListTodo, Menu, Search, Settings, Sparkles, Users,
} from "lucide-react";
import { useStore } from "../store/store";
import { Avatar } from "./ui";
import { TweaksPanel } from "./TweaksPanel";
import type { Workspace } from "../lib/types";

const NAV = [
  { id: "today", label: "Today", icon: Home, path: "/today" },
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/projects" },
  { id: "tasks", label: "Tasks", icon: ListTodo, path: "/tasks" },
  { id: "contacts", label: "E6W", icon: Users, path: "/contacts" },
  { id: "habits", label: "Habits", icon: Flame, path: "/habits" },
  { id: "assistant", label: "AI Assistant", icon: Sparkles, path: "/assistant" },
];

const CRUMB: Record<string, string> = {
  today: "Today", projects: "Projects", tasks: "Tasks", contacts: "E6W Networking",
  habits: "Habits", assistant: "AI Assistant",
};

export function Shell() {
  const { workspace, setWorkspace, data, all } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split("/")[1] || "today";
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

        <div className="nav-group">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={"nav-item" + (section === n.id ? " active" : "")}
              onClick={() => navigate(n.path)}
            >
              <n.icon />
              {n.label}
              {n.id === "tasks" && openTasks > 0 && <span className="badge">{openTasks}</span>}
              {n.id === "contacts" && followUps > 0 && <span className="badge">{followUps}</span>}
            </button>
          ))}
        </div>

        <div className="next-widget">
          <div className="next-widget-head"><Flag /> Next Actions</div>
          {data.nextActions.slice(0, 3).map((na) => (
            <button key={na.id} className="next-mini" onClick={() => goNextAction(na.project)}>
              <span className="next-mini-dot" />
              <span>
                <span className="next-mini-text">{na.text}</span>
                <span className="next-mini-meta" style={{ display: "block", marginTop: 2 }}>
                  {na.project || "Standalone"} · {na.due}
                </span>
              </span>
            </button>
          ))}
        </div>

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
              <div className="search-pill"><Search /> Search <kbd>⌘K</kbd></div>
              <button className="icon-btn" style={{ background: "rgba(255,255,255,0.6)" }}><Bell /></button>
            </div>
          </div>
        </div>

        {/* Top bar (mobile) */}
        <div className="mobile-top">
          <div className="brand-mark" style={{ width: 24, height: 24, fontSize: 13 }}>M</div>
          {WsSwitch}
          <button className="icon-btn"><Bell /></button>
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
    </div>
  );
}
