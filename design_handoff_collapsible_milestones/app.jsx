/* ============ MakeItHappen — app shell ============ */
const NAV = [
  { id: "today", label: "Today", icon: Icon.Home },
  { id: "projects", label: "Projects", icon: Icon.Folder },
  { id: "tasks", label: "Tasks", icon: Icon.ListTodo },
  { id: "crm", label: "Contacts", icon: Icon.Users },
  { id: "habits", label: "Habits", icon: Icon.Flame },
  { id: "assistant", label: "AI Assistant", icon: Icon.Sparkles },
];

const CRUMB = { today: "Today", projects: "Projects", tasks: "Tasks", crm: "Contacts", habits: "Habits", assistant: "AI Assistant" };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "collapsible": true,
  "defaultState": "active",
  "showCount": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [ws, setWs] = useState(() => localStorage.getItem("mih_ws") || "work");
  const [route, setRoute] = useState(() => localStorage.getItem("mih_route") || "today");
  const [projId, setProjId] = useState(null);
  // mutable working copy so check-offs feel real
  const [state, setState] = useState(() => JSON.parse(JSON.stringify(DATA)));

  useEffect(() => { document.body.setAttribute("data-workspace", ws); localStorage.setItem("mih_ws", ws); }, [ws]);
  useEffect(() => { localStorage.setItem("mih_route", route); }, [route]);

  const data = state[ws];

  const go = (r, pid) => { setRoute(r); if (r === "projects") setProjId(pid || null); window.__scrollReset && window.__scrollReset(); };

  // mutations
  const mutate = (fn) => setState(s => { const c = JSON.parse(JSON.stringify(s)); fn(c[ws]); return c; });

  const toggleTask = (id, group) => mutate(d => {
    const lists = [d.todayTasks, d.upcoming || [], d.someday || []];
    lists.forEach(l => { const t = l.find(x => x.id === id); if (t) t.done = !t.done; });
  });
  const toggleHabit = (id) => mutate(d => { const h = d.habits.find(x => x.id === id); if (h) { h.doneToday = !h.doneToday; h.streak += h.doneToday ? 1 : -1; } });
  const toggleSub = (pid, mid, sid) => mutate(d => {
    const p = d.projects.find(x => x.id === pid); if (!p) return;
    const m = p.milestones.find(x => x.id === mid); if (!m) return;
    const s = m.subtasks.find(x => x.id === sid); if (s) s.done = !s.done;
    // recompute progress
    const all = p.milestones.flatMap(mm => mm.subtasks);
    p.progress = all.length ? all.filter(x => x.done).length / all.length : 0;
  });

  const scrollRef = useRef(null);
  useEffect(() => { window.__scrollReset = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }; }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [route, projId]);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div className="brand-name">Make<b style={{ color: "var(--accent)" }}>It</b>Happen</div>
        </div>

        <div className="nav-group">
          {NAV.map(n => (
            <button key={n.id} className={"nav-item" + (route === n.id ? " active" : "")} onClick={() => go(n.id)}>
              <n.icon size={16} />
              {n.label}
              {n.id === "tasks" && <span className="badge">{data.todayTasks.filter(t => !t.done).length}</span>}
              {n.id === "crm" && data.contacts.filter(c => c.followUp).length > 0 && <span className="badge">{data.contacts.filter(c => c.followUp).length}</span>}
            </button>
          ))}
        </div>

        {/* Next actions widget */}
        <div className="next-widget">
          <div className="next-widget-head"><Icon.Flag size={13} /> Next Actions</div>
          {data.nextActions.slice(0, 3).map(na => (
            <button key={na.id} className="next-mini" onClick={() => go(na.project ? "projects" : "tasks")}>
              <span className="next-mini-dot"></span>
              <span>
                <span className="next-mini-text">{na.text}</span>
                <span className="next-mini-meta" style={{ display: "block", marginTop: 2 }}>{na.project || "Standalone"} · {na.due}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-foot">
          <Avatar who={DATA.user.initials} color="var(--ink)" size={30} />
          <div className="who">{DATA.user.name}<small>{DATA.user.email}</small></div>
          <button className="icon-btn"><Icon.Settings size={15} /></button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Top banner — recolors by workspace */}
        <div className="topbanner">
          <div className="topbanner-inner">
            <div className="ws-switch">
              <button className={"ws-opt" + (ws === "work" ? " active" : "")} data-ws="work" onClick={() => setWs("work")}>
                <span className="ws-dot"></span> Work
              </button>
              <button className={"ws-opt" + (ws === "personal" ? " active" : "")} data-ws="personal" onClick={() => setWs("personal")}>
                <span className="ws-dot"></span> Personal
              </button>
            </div>
            <div className="crumb"><span className="sep">/</span> {CRUMB[route]}</div>
            <div className="topbanner-actions">
              <div className="search-pill"><Icon.Search size={14} /> Search <kbd>⌘K</kbd></div>
              <button className="icon-btn" style={{ background: "rgba(255,255,255,0.6)" }}><Icon.Bell size={15} /></button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="scroll" ref={scrollRef}>
          {route === "assistant" ? (
            <Assistant ws={ws} data={data} />
          ) : (
            <>
              {route === "today" && <Dashboard ws={ws} data={data} go={go} toggleTask={toggleTask} toggleHabit={toggleHabit} />}
              {route === "projects" && <Projects data={data} selectedId={projId} setSelectedId={setProjId} toggleSub={toggleSub} tweaks={t} />}
              {route === "tasks" && <Tasks ws={ws} data={data} toggleTask={toggleTask} />}
              {route === "crm" && <CRM data={data} />}
              {route === "habits" && <Habits ws={ws} data={data} toggleHabit={toggleHabit} />}
            </>
          )}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Milestone sections" />
        <TweakToggle label="Collapsible" value={t.collapsible}
          onChange={(v) => setTweak('collapsible', v)} />
        <TweakRadio label="Default state" value={t.defaultState}
          options={['all', 'active', 'none']}
          onChange={(v) => setTweak('defaultState', v)} />
        <TweakToggle label="Count when collapsed" value={t.showCount}
          onChange={(v) => setTweak('showCount', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
