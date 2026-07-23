import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { useStore } from "../store/store";

export function ProjectSites() {
  const { data, updateProject } = useStore();
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (key: string, url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Project Sites</h1>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {["Project Name", "Project Site URL", "Project Meeting URL"].map((label) => (
                <th
                  key={label}
                  style={{ padding: "9px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--ink-3)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => {
              const siteKey = `${p.id}:site`;
              const meetingKey = `${p.id}:meeting`;
              return (
                <tr key={p.id}>
                  <td className="td-primary" style={{ padding: "10px 12px", minWidth: 200 }}>
                    <span
                      className="clickable"
                      style={{ fontWeight: 600, cursor: "pointer" }}
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      {p.title}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="https://…"
                        value={p.webUrl ?? ""}
                        onChange={(e) => updateProject(p.id, { webUrl: e.target.value })}
                        style={{ width: "100%" }}
                      />
                      <button
                        className="icon-btn"
                        style={{ color: copiedKey === siteKey ? "var(--next)" : "var(--ink-4)", flexShrink: 0 }}
                        onClick={() => copy(siteKey, p.webUrl ?? "")}
                        disabled={!p.webUrl}
                        title={p.webUrl ? "Copy URL" : "No URL set"}
                      >
                        {copiedKey === siteKey ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="https://…"
                        value={p.meetingAgendaLocationUrl ?? ""}
                        onChange={(e) => updateProject(p.id, { meetingAgendaLocationUrl: e.target.value })}
                        style={{ width: "100%" }}
                      />
                      <button
                        className="icon-btn"
                        style={{ color: copiedKey === meetingKey ? "var(--next)" : "var(--ink-4)", flexShrink: 0 }}
                        onClick={() => copy(meetingKey, p.meetingAgendaLocationUrl ?? "")}
                        disabled={!p.meetingAgendaLocationUrl}
                        title={p.meetingAgendaLocationUrl ? "Copy URL" : "No URL set"}
                      >
                        {copiedKey === meetingKey ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
