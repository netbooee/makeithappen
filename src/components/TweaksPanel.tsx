import { X } from "lucide-react";
import { useStore } from "../store/store";

export function TweaksPanel({ close }: { close: () => void }) {
  const { tweaks, setTweak, resetDemoData } = useStore();

  return (
    <div className="tweaks-panel">
      <h4>
        Tweaks
        <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={close}><X /></button>
      </h4>

      <div className="tweak-section">Milestone sections</div>

      <div className="tweak-row">
        Collapsible
        <button
          className={"switch" + (tweaks.collapsible ? " on" : "")}
          onClick={() => setTweak("collapsible", !tweaks.collapsible)}
          aria-checked={tweaks.collapsible}
          role="switch"
        />
      </div>

      <div className="tweak-row stack">
        Default state
        <div className="segmented">
          {(["all", "active", "none"] as const).map((opt) => (
            <button
              key={opt}
              className={tweaks.defaultState === opt ? "active" : ""}
              onClick={() => setTweak("defaultState", opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        Count when collapsed
        <button
          className={"switch" + (tweaks.showCount ? " on" : "")}
          onClick={() => setTweak("showCount", !tweaks.showCount)}
          aria-checked={tweaks.showCount}
          role="switch"
        />
      </div>

      <div className="tweak-section">Demo data</div>
      <div className="tweak-row">
        Reset to seed data
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={resetDemoData}>
          Reset
        </button>
      </div>
    </div>
  );
}
