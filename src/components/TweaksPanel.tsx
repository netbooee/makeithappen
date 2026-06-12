import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useStore } from "../store/store";
import { supabaseConfigured, saveAnthropicKey, clearAnthropicKey, hasAnthropicKey } from "../lib/supabase";
import type { AppData } from "../lib/types";

export function TweaksPanel({ close }: { close: () => void }) {
  const { tweaks, setTweak, resetDemoData, all, importData } = useStore();
  const importRef = useRef<HTMLInputElement>(null);

  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    hasAnthropicKey().then(setKeyExists);
  }, []);

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    await saveAnthropicKey(keyInput.trim());
    setSaving(false);
    setKeyExists(true);
    setKeyInput("");
  };

  const removeKey = async () => {
    await clearAnthropicKey();
    setKeyExists(false);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makeithappen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppData;
        importData(parsed);
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="tweaks-panel">
      <h4>
        Settings
        <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={close}><X /></button>
      </h4>

      <div className="tweak-section">Appearance</div>

      <div className="tweak-row">
        Dark mode
        <button
          className={"switch" + (tweaks.darkMode ? " on" : "")}
          onClick={() => setTweak("darkMode", !tweaks.darkMode)}
          aria-checked={tweaks.darkMode}
          role="switch"
        />
      </div>

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

      {supabaseConfigured && (
        <>
          <div className="tweak-section">AI — Anthropic API key</div>
          <div style={{ padding: "4px 0 8px", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Your key is stored in your account and only used server-side — it never appears in browser traffic.
          </div>

          {keyExists === true ? (
            <div className="tweak-row">
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Key saved ✓</span>
              <button
                className="btn btn-ghost"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={removeKey}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  className="input"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-ant-…"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  style={{ width: "100%", paddingRight: 32, fontSize: 12.5 }}
                  autoComplete="off"
                />
                <button
                  className="icon-btn"
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 24, height: 24 }}
                  onClick={() => setShowKey((v) => !v)}
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                onClick={saveKey}
                disabled={saving || !keyInput.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </>
      )}

      <div className="tweak-section">Data</div>
      <div className="tweak-row">
        Export backup
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={exportData}>
          Export
        </button>
      </div>
      <div className="tweak-row">
        Import backup
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => importRef.current?.click()}>
          Import
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
      </div>
      <div className="tweak-row">
        Reset to seed data
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={resetDemoData}>
          Reset
        </button>
      </div>
    </div>
  );
}
