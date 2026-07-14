import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";

export function ProjectSites() {
  const { data, updateProject } = useStore();
  const navigate = useNavigate();

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
            {data.projects.map((p) => (
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
                  <input
                    type="text"
                    className="input"
                    placeholder="https://…"
                    value={p.webUrl ?? ""}
                    onChange={(e) => updateProject(p.id, { webUrl: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={{ padding: "10px 12px", minWidth: 240 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="https://…"
                    value={p.meetingAgendaLocationUrl ?? ""}
                    onChange={(e) => updateProject(p.id, { meetingAgendaLocationUrl: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
