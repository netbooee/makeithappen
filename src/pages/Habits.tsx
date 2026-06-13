import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight, Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/store";
import type { Habit } from "../lib/types";

const EMOJIS = ["🏃", "📚", "🧘", "🌙", "📥", "🎯", "💬", "💧", "🥗", "✍️", "🎸", "🧹"];
const CADENCES = ["Daily", "Weekly", "Weekdays", "Every 2 days"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type GridCell = { date: string; level: number; isFuture: boolean };

function buildGrid(checkins: string[]): GridCell[][] {
  const set = new Set(checkins);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Start from the Sunday 52 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 - today.getDay());

  const out: GridCell[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 52; w++) {
    const col: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = cur.toISOString().slice(0, 10);
      col.push({ date: ds, level: set.has(ds) ? 2 : 0, isFuture: ds > todayIso });
      cur.setDate(cur.getDate() + 1);
    }
    out.push(col);
  }
  return out;
}

function longestStreak(checkins: string[]): number {
  if (!checkins.length) return 0;
  const sorted = [...checkins].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const next = new Date(sorted[i]);
    const diff = Math.round((next.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else if (diff > 1) cur = 1;
  }
  return best;
}

function Ring({ done, onClick }: { done: boolean; onClick: () => void }) {
  const [justDone, setJustDone] = useState(false);
  const r = 22, c = 2 * Math.PI * r;
  return (
    <button
      className={"ring-btn" + (justDone ? " just-done" : "")}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) { setJustDone(true); setTimeout(() => setJustDone(false), 500); }
        onClick();
      }}
      title={done ? "Mark as not done" : "Complete habit"}
    >
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={r} fill="none"
          stroke={done ? "var(--next)" : "var(--border-strong)"}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={done ? 0 : c}
        />
      </svg>
      <span className="ring-check" style={{ color: done ? "#fff" : "var(--ink-4)", opacity: done ? 1 : 0.45 }}>
        <Check size={20} strokeWidth={3} />
      </span>
    </button>
  );
}

export function HabitList() {
  const { data, toggleHabit, addHabit, workspace } = useStore();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [cadence, setCadence] = useState(CADENCES[0]);

  const submit = () => {
    if (!name.trim()) return;
    const habit: Habit = { id: "h" + Date.now(), name: name.trim(), icon: emoji, streak: 0, doneToday: false, cadence, checkins: [] };
    addHabit(habit);
    setAdding(false);
    setName("");
    setEmoji(EMOJIS[0]);
    setCadence(CADENCES[0]);
  };

  const doneCount = data.habits.filter((h) => h.doneToday).length;

  return (
    <div className="page fade" style={{ maxWidth: 680 }}>
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div className="page-title">Habits</div>
          <div className="page-sub">{doneCount} of {data.habits.length} done today</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus /> New habit</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.habits.map((h) => (
          <div
            key={h.id}
            className={"card habit-card" + (h.doneToday ? " done-today" : "")}
            onClick={() => navigate(`/habits/${h.id}`)}
          >
            <span style={{ fontSize: 26 }}>{h.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="habit-name">{h.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{h.cadence}</div>
            </div>
            <span className="streak-badge">🔥 {h.streak}</span>
            <Ring done={h.doneToday} onClick={() => toggleHabit(h.id)} />
          </div>
        ))}
      </div>

      {adding && (
        <div className="modal-center">
          <div className="overlay-bg" onClick={() => setAdding(false)} style={{ position: "fixed" }} />
          <div className="modal-card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>New habit</div>
            <input className="input" autoFocus placeholder="Habit name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <div>
              <div className="field-label" style={{ marginBottom: 7 }}>Emoji</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    style={{ fontSize: 19, padding: 5, borderRadius: 7, background: emoji === e ? "var(--accent-soft)" : "transparent", border: emoji === e ? "1px solid var(--accent)" : "1px solid transparent" }}
                    onClick={() => setEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 7 }}>Cadence</div>
              <div className="segmented" style={{ display: "flex" }}>
                {CADENCES.map((c) => (
                  <button key={c} className={cadence === c ? "active" : ""} style={{ flex: 1 }} onClick={() => setCadence(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              Will be added to your <b>{workspace}</b> workspace.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={submit}>Create habit</button>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, toggleHabit, toggleCheckin, updateHabit, deleteHabit } = useStore();
  const habit = data.habits.find((h) => h.id === id);

  const [editingHabit, setEditingHabit] = useState(false);
  const [editName, setEditName] = useState(habit?.name ?? "");
  const [editEmoji, setEditEmoji] = useState(habit?.icon ?? EMOJIS[0]);
  const [editCadence, setEditCadence] = useState(habit?.cadence ?? CADENCES[0]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const grid = useMemo(() => buildGrid(habit?.checkins ?? []), [habit?.checkins]);
  const longest = useMemo(() => longestStreak(habit?.checkins ?? []), [habit?.checkins]);
  const totalDone = (habit?.checkins ?? []).length;

  if (!habit) {
    return (
      <div className="page fade">
        <div className="page-title">Habit not found</div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/habits")}>Back to habits</button>
      </div>
    );
  }

  return (
    <div className="page fade" style={{ maxWidth: 760 }}>
      <button
        onClick={() => navigate("/habits")}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-3)", marginBottom: 16, fontWeight: 500 }}
      >
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> All habits
      </button>

      <div className="page-head" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 34 }}>{habit.icon}</span>
        <div style={{ flex: 1 }}>
          <div className="page-title">{habit.name}</div>
          <div className="page-sub">{habit.cadence}</div>
        </div>
        <button
          className="icon-btn"
          style={{ color: "var(--ink-4)" }}
          onClick={() => { setEditName(habit.name); setEditEmoji(habit.icon); setEditCadence(habit.cadence); setEditingHabit(true); }}
          title="Edit habit"
        >
          <Pencil size={16} />
        </button>
        <Ring done={habit.doneToday} onClick={() => toggleHabit(habit.id)} />
      </div>

      {editingHabit && (
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Edit habit</div>
          <input
            className="input"
            autoFocus
            placeholder="Habit name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div>
            <div className="field-label" style={{ marginBottom: 7 }}>Emoji</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  style={{ fontSize: 19, padding: 5, borderRadius: 7, background: editEmoji === e ? "var(--accent-soft)" : "transparent", border: editEmoji === e ? "1px solid var(--accent)" : "1px solid transparent" }}
                  onClick={() => setEditEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 7 }}>Cadence</div>
            <div className="segmented" style={{ display: "flex" }}>
              {CADENCES.map((c) => (
                <button key={c} className={editCadence === c ? "active" : ""} style={{ flex: 1 }} onClick={() => setEditCadence(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => { updateHabit(habit.id, { name: editName.trim() || habit.name, icon: editEmoji, cadence: editCadence }); setEditingHabit(false); }}
            >
              Save
            </button>
            <button className="btn btn-ghost" onClick={() => setEditingHabit(false)}>Cancel</button>
            <button
              className="btn btn-ghost"
              style={{ color: "var(--danger)", marginLeft: "auto", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={() => { deleteHabit(habit.id); navigate("/habits"); }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}

      <div className="row" style={{ marginBottom: 20 }}>
        <div className="card card-pad" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <Flame size={20} style={{ color: "#F59E0B" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 650 }}>{habit.streak}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Current streak</div>
          </div>
        </div>
        <div className="card card-pad" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <Flame size={20} style={{ color: "var(--ink-4)" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 650 }}>{longest}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Longest streak</div>
          </div>
        </div>
        <div className="card card-pad" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <Check size={20} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 650 }}>{totalDone}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Total check-ins</div>
          </div>
        </div>
      </div>

      <div className="section-h">Last 52 weeks</div>
      <div className="card card-pad">
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 8 }}>Click any day to toggle a check-in</div>
        <div className="contrib">
          {grid.map((col, w) => (
            <div key={w} className="contrib-col">
              {col.map((cell, d) => (
                <span
                  key={d}
                  className={"contrib-cell" + (cell.level === 2 ? " l2" : "")}
                  title={cell.date}
                  style={{
                    cursor: cell.isFuture ? "default" : "pointer",
                    outline: hoveredDate === cell.date ? "1.5px solid var(--accent)" : undefined,
                    opacity: cell.isFuture ? 0.25 : 1,
                  }}
                  onMouseEnter={() => !cell.isFuture && setHoveredDate(cell.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={() => !cell.isFuture && toggleCheckin(habit.id, cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
        {hoveredDate && (
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8, textAlign: "right" }}>
            {hoveredDate} {(habit.checkins ?? []).includes(hoveredDate) ? "· checked in" : "· not checked in"}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--ink-3)", justifyContent: "flex-end" }}>
          Less
          <span className="contrib-cell" />
          <span className="contrib-cell l2" />
          More
        </div>
      </div>
    </div>
  );
}
