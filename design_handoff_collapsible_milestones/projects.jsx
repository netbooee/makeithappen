/* ============ MakeItHappen — Projects ============ */
function Projects({ data, selectedId, setSelectedId, toggleSub, tweaks }) {
  const project = data.projects.find(p => p.id === selectedId);
  if (project) return <ProjectDetail project={project} back={() => setSelectedId(null)} toggleSub={toggleSub} tweaks={tweaks} />;
  return <ProjectList projects={data.projects} open={setSelectedId} />;
}

function ProjectList({ projects, open }) {
  return (
    <div className="page fade">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Projects</div>
          <div className="page-sub">{projects.filter(p => p.status === "active").length} active · {projects.length} total</div>
        </div>
        <button className="btn btn-primary"><Icon.Plus size={15} /> New project</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {projects.map(p => {
          const total = p.milestones.reduce((a, m) => a + m.subtasks.length, 0);
          const done = p.milestones.reduce((a, m) => a + m.subtasks.filter(s => s.done).length, 0);
          const nextMs = p.milestones.find(m => m.status === "active") || p.milestones[0];
          return (
            <button key={p.id} className="card card-pad" onClick={() => open(p.id)} style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", transition: "border-color .14s, box-shadow .14s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", flex: 1 }}>{p.title}</div>
                <StatusChip status={p.status} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, minHeight: 38 }}>{p.desc}</div>
              <div className="bar"><i style={{ width: (p.progress * 100) + "%" }}></i></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-3)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon.CheckCircle size={13} /> {done}/{total} subtasks</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon.Calendar size={13} /> {p.due}</span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <Avatar who={p.owner} size={22} color="var(--ink-2)" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- A single collapsible milestone card ---- */
function MilestoneCard({ project, m, toggleSub, tweaks, isOpen, onToggle }) {
  const { collapsible, showCount } = tweaks;
  const total = m.subtasks.length;
  const done = m.subtasks.filter(s => s.done).length;
  const shown = collapsible ? isOpen : true;

  const Header = collapsible ? "button" : "div";
  return (
    <div className="card">
      <Header
        onClick={collapsible ? onToggle : undefined}
        style={{
          padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, width: "100%",
          textAlign: "left", cursor: collapsible ? "pointer" : "default",
          borderBottom: shown ? "1px solid var(--border)" : "1px solid transparent",
          transition: "border-color .18s",
        }}>
        {collapsible && (
          <Icon.ChevronRight size={14} style={{ color: "var(--ink-4)", flexShrink: 0, transition: "transform .18s ease", transform: shown ? "rotate(90deg)" : "none" }} />
        )}
        <div style={{
          width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
          background: m.status === "complete" ? "var(--next)" : m.status === "active" ? "var(--accent)" : "var(--ink-4)",
        }}></div>
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{m.title}</div>
        {collapsible && showCount && !shown && (
          <span className="chip" style={{ color: done === total ? "var(--next)" : "var(--ink-3)" }}>
            <Icon.CheckCircle size={11} /> {done}/{total}
          </span>
        )}
        <span className="chip"><Icon.Calendar size={11} /> {m.due}</span>
        <StatusChip status={m.status} />
      </Header>
      {shown && (
        <div style={{ padding: "6px 10px 8px" }}>
          {m.subtasks.map(s => (
            <div key={s.id} className="task-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 8px", borderRadius: 7 }}>
              <TaskMarker task={s} onClick={() => toggleSub(project.id, m.id, s.id)} />
              <span style={{ flex: 1, fontSize: 13 }} className={s.done ? "strike" : ""}>{s.t}</span>
              <StateTag task={s} />
              <Avatar who={s.who} size={20} color="var(--ink-3)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, back, toggleSub, tweaks }) {
  const [draftFor, setDraftFor] = useState(null);
  const total = project.milestones.reduce((a, m) => a + m.subtasks.length, 0);
  const done = project.milestones.reduce((a, m) => a + m.subtasks.filter(s => s.done).length, 0);

  // open/closed state per milestone, seeded from the "default state" tweak
  const seed = () => {
    const map = {};
    project.milestones.forEach(m => {
      map[m.id] = tweaks.defaultState === "all" ? true
        : tweaks.defaultState === "none" ? false
        : m.status === "active";
    });
    return map;
  };
  const [openMap, setOpenMap] = useState(seed);
  useEffect(() => { setOpenMap(seed()); }, [project.id, tweaks.defaultState]);
  const toggleOne = (id) => setOpenMap(o => ({ ...o, [id]: !o[id] }));
  const toggleAll = () => setOpenMap(o => {
    const anyOpen = project.milestones.some(m => o[m.id]);
    const next = {};
    project.milestones.forEach(m => { next[m.id] = !anyOpen; });
    return next;
  });

  return (
    <div className="page fade" style={{ maxWidth: 1100 }}>
      <button onClick={back} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-3)", marginBottom: 16, fontWeight: 500 }}>
        <Icon.ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> All projects
      </button>

      <div className="page-head" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="page-title" style={{ marginBottom: 8 }}>{project.title} <StatusChip status={project.status} /></div>
          <div className="page-sub" style={{ maxWidth: 620 }}>{project.desc}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            <span className="chip"><Icon.User size={11} /> {project.owner}</span>
            <span className="chip"><Icon.Calendar size={11} /> Due {project.due}</span>
            <span className="chip"><Icon.CheckCircle size={11} /> {done}/{total} done</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 20, alignItems: "start" }}>
        {/* LEFT: milestones */}
        <div>
          <div className="section-h" style={{ display: "flex", alignItems: "center" }}>
            Milestones
            {tweaks.collapsible && (
              <button className="head-action" onClick={toggleAll} style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon.ChevronRight size={11} /> Toggle all
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {project.milestones.map(m => (
              <MilestoneCard key={m.id} project={project} m={m} toggleSub={toggleSub} tweaks={tweaks} isOpen={!!openMap[m.id]} onToggle={() => toggleOne(m.id)} />
            ))}
          </div>
        </div>

        {/* RIGHT: status updates */}
        <div>
          <div className="section-h" style={{ display: "flex" }}>
            Status Updates
            <button className="head-action" style={{ marginLeft: "auto", color: "var(--accent-ink)", fontSize: 12, fontWeight: 550, display: "flex", alignItems: "center", gap: 5 }}><Icon.Plus size={12} /> Add update</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {project.updates.map(u => (
              <div key={u.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar who={u.who} size={24} color="var(--ink-2)" />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{u.who === "JR" ? "Jordan Reeves" : u.who}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-4)", marginLeft: "auto" }}>{u.when}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{u.text}</div>
                <button className="btn btn-soft" style={{ alignSelf: "flex-start", fontSize: 12, padding: "5px 10px" }} onClick={() => setDraftFor(u)}>
                  <Icon.Sparkles size={13} /> Draft email
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {draftFor && <DraftEmailPanel project={project} update={draftFor} close={() => setDraftFor(null)} />}
    </div>
  );
}

/* ---- AI Draft Email side panel ---- */
function DraftEmailPanel({ project, update, close }) {
  const [stage, setStage] = useState("loading"); // loading -> ready
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const draft = `Hi team,\n\nQuick status update on ${project.title}.\n\nWhere things stand: ${project.milestones.filter(m=>m.status==="complete").length} of ${project.milestones.length} milestones are complete, and we're currently focused on "${(project.milestones.find(m=>m.status==="active")||project.milestones[0]).title}."\n\n${update.text}\n\nNext up, I'll keep things moving toward our ${project.due} target. I'll send another note once we hit the next milestone.\n\nBest,\nJordan`;
    const t = setTimeout(() => { setBody(draft); setStage("ready"); }, 1100);
    return () => clearTimeout(t);
  }, []);

  const doCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(20,23,28,0.28)", animation: "fadeUp .2s" }}></div>
      <div style={{ position: "relative", width: 480, background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", animation: "slideIn .28s cubic-bezier(.2,.7,.3,1)" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}`}</style>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}><Icon.Sparkles size={15} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI Draft — Status Email</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{project.title}</div>
          </div>
          <button className="icon-btn" onClick={close}><Icon.X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-4)" }}>To</label>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="chip">priya@makeithappen.app</span>
              <span className="chip">team@makeithappen.app</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-4)" }}>Subject</label>
            <input defaultValue={`${project.title} — status update`} style={{ border: "1px solid var(--border)", borderRadius: 7, padding: "9px 11px", fontSize: 13.5, fontWeight: 500, outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-4)", display: "flex", alignItems: "center" }}>
              Body
              {stage === "ready" && <span style={{ marginLeft: "auto", color: "var(--accent-ink)", display: "flex", alignItems: "center", gap: 4, textTransform: "none", letterSpacing: 0, fontWeight: 500 }}><Icon.Sparkles size={11} /> Generated by Claude</span>}
            </label>
            {stage === "loading" ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 7, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 92, 78, 88, 60, 95, 40].map((w, i) => (
                  <div key={i} style={{ height: 9, width: w + "%", borderRadius: 5, background: "linear-gradient(90deg,var(--surface-2),var(--border),var(--surface-2))", backgroundSize: "200% 100%", animation: `shimmer 1.3s ${i * 0.08}s infinite linear` }}></div>
                ))}
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                  <Icon.Sparkles size={13} /> Claude is drafting from project context…
                </div>
              </div>
            ) : (
              <textarea value={body} onChange={e => setBody(e.target.value)} style={{ flex: 1, minHeight: 280, border: "1px solid var(--border)", borderRadius: 7, padding: "12px 13px", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", color: "var(--ink)", fontFamily: "var(--font)" }} />
            )}
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 9, alignItems: "center" }}>
          <button className="btn btn-primary" disabled={stage !== "ready"} style={{ opacity: stage === "ready" ? 1 : 0.5 }}><Icon.Mail size={15} /> Send via Gmail</button>
          <button className="btn btn-ghost" onClick={doCopy} disabled={stage !== "ready"} style={{ opacity: stage === "ready" ? 1 : 0.5 }}>
            {copied ? <><Icon.Check size={15} /> Copied</> : <><Icon.Copy size={15} /> Copy</>}
          </button>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

window.Projects = Projects;
