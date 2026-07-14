import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, X, TriangleAlert } from "lucide-react";
import { useStore } from "../store/store";
import { supabaseConfigured, saveAnthropicKey, clearAnthropicKey, hasAnthropicKey } from "../lib/supabase";
import type { AppData } from "../lib/types";

export function TweaksPanel({ close }: { close: () => void }) {
  const { tweaks, setTweak, resetDemoData, all, importData, updateUser } = useStore();
  const importRef = useRef<HTMLInputElement>(null);

  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [feedbackEmail, setFeedbackEmail] = useState(all.user.feedbackEmail ?? "");
  const [emailSaved, setEmailSaved] = useState(false);

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const confirmReset = () => {
    if (resetConfirmText.trim().toLowerCase() !== "delete") return;
    resetDemoData();
    setConfirmingReset(false);
    setResetConfirmText("");
  };

  const cancelReset = () => {
    setConfirmingReset(false);
    setResetConfirmText("");
  };

  const saveEmail = () => {
    updateUser({ feedbackEmail: feedbackEmail.trim() });
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

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

      <div className="tweak-section">Profile</div>
      <div style={{ padding: "4px 0 6px", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
        Email for feedback buttons in HTML exports. Required to enable those buttons.
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={feedbackEmail}
          onChange={(e) => { setFeedbackEmail(e.target.value); setEmailSaved(false); }}
          onKeyDown={(e) => e.key === "Enter" && saveEmail()}
          style={{ flex: 1, fontSize: 12.5 }}
          autoComplete="email"
        />
        <button
          className="btn btn-primary"
          style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
          onClick={saveEmail}
          disabled={!feedbackEmail.trim()}
        >
          {emailSaved ? "Saved ✓" : "Save"}
        </button>
      </div>

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
      <div
        style={{
          marginTop: 4,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--danger, #e5484d)",
          background: "rgba(229, 72, 77, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <TriangleAlert size={16} color="var(--danger, #e5484d)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong style={{ color: "var(--danger, #e5484d)" }}>Warning: this permanently erases all your data.</strong>
            {" "}Resetting to seed data replaces every project, task, and setting with the demo dataset. This cannot be undone.
          </div>
        </div>

        <div className="tweak-row" style={{ marginTop: 8, paddingTop: 0, border: "none" }}>
          Reset to seed data
          {!confirmingReset && (
            <button
              className="btn btn-ghost"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => setConfirmingReset(true)}
            >
              Reset
            </button>
          )}
        </div>

        {confirmingReset && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              Are you sure? Type <strong>delete</strong> to confirm.
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                className="input"
                type="text"
                placeholder="delete"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmReset()}
                style={{ flex: 1, fontSize: 12.5 }}
                autoComplete="off"
                autoFocus
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                onClick={cancelReset}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  background: "var(--danger, #e5484d)",
                  borderColor: "var(--danger, #e5484d)",
                }}
                onClick={confirmReset}
                disabled={resetConfirmText.trim().toLowerCase() !== "delete"}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
