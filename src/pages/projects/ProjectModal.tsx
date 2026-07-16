import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "../../store/store";
import { DateInput } from "../../components/ui";
import type { Project, Status } from "../../lib/types";

export function ProjectModal({
  initial,
  heading,
  onSave,
  onDelete,
  close,
}: {
  initial: Partial<Project>;
  heading: string;
  onSave: (patch: Partial<Project>) => void;
  onDelete?: () => void;
  close: () => void;
}) {
  const { all } = useStore();
  const [title, setTitle] = useState(initial.title ?? "");
  const [desc, setDesc] = useState(initial.desc ?? "");
  const [due, setDue] = useState(initial.due && initial.due !== "No date" ? initial.due : "");
  const [status, setStatus] = useState<Status>(initial.status ?? "active");
  const [owner, setOwner] = useState(initial.owner ?? all.user.initials);
  const [heroImage, setHeroImage] = useState(initial.heroImage ?? "");
  const [clientLogo, setClientLogo] = useState(initial.clientLogo ?? "");
  const [webUrl, setWebUrl] = useState(initial.webUrl ?? "");
  const [meetingAgendaLocationUrl, setMeetingAgendaLocationUrl] = useState(initial.meetingAgendaLocationUrl ?? "");

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHeroImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setClientLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      desc: desc.trim(),
      due: due.trim() || "No date",
      status,
      owner: owner.trim() || all.user.initials,
      active: status === "active",
      heroImage: heroImage || undefined,
      clientLogo: clientLogo || undefined,
      webUrl: webUrl.trim() || undefined,
      meetingAgendaLocationUrl: meetingAgendaLocationUrl.trim() || undefined,
    });
    close();
  };

  return (
    <div className="modal-center">
      <div className="overlay-bg" onClick={close} style={{ position: "fixed" }} />
      <div className="modal-card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{heading}</div>
        <input
          className="input"
          autoFocus
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <textarea
          className="input"
          rows={2}
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="row">
          <DateInput value={due} onChange={setDue} style={{ flex: 1 }} />
          <input
            className="input"
            placeholder="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Status</div>
          <div className="segmented" style={{ display: "flex" }}>
            {(["active", "hold", "complete"] as Status[]).map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                style={{ flex: 1 }}
                onClick={() => setStatus(s)}
              >
                {s === "hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Client logo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clientLogo && (
              <img src={clientLogo} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "contain", flexShrink: 0, background: "var(--surface-2)", padding: 4 }} />
            )}
            <label style={{ cursor: "pointer" }}>
              <span className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", pointerEvents: "none" }}>
                {clientLogo ? "Replace logo" : "Upload logo"}
              </span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoFile} />
            </label>
            {clientLogo && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", color: "var(--ink-4)" }} onClick={() => setClientLogo("")}>
                Remove
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Cover image</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {heroImage && (
              <img src={heroImage} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            )}
            <label style={{ cursor: "pointer" }}>
              <span className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", pointerEvents: "none" }}>
                {heroImage ? "Replace image" : "Upload image"}
              </span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
            </label>
            {heroImage && (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", color: "var(--ink-4)" }} onClick={() => setHeroImage("")}>
                Remove
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Project URL</div>
          <input
            className="input"
            type="url"
            placeholder="https://…"
            value={webUrl}
            onChange={(e) => setWebUrl(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Meeting Agenda Location URL</div>
          <input
            className="input"
            type="url"
            placeholder="https://…"
            value={meetingAgendaLocationUrl}
            onChange={(e) => setMeetingAgendaLocationUrl(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={submit}>
            {initial.id ? "Save changes" : "Create project"}
          </button>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          {onDelete && (
            <button
              className="btn btn-ghost"
              style={{ color: "var(--danger)", marginLeft: "auto", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}
              onClick={onDelete}
            >
              <Trash2 size={14} /> Delete project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
