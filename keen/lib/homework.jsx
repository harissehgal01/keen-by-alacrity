"use client";
import { iso, fromIso, DOW } from "./theme";

const MONO = "'Space Mono', monospace";
const PARTIAL = "#B8860B";
const NEXT = { not_done: "partial", partial: "done", done: "not_done" };

// Short, human due label: "Today", "Tomorrow", "Wed", "2 days late".
export function dueInfo(h, C) {
  if (h.status === "done") return { label: "Done", color: C.accent };
  if (!h.due_date) return { label: "No date", color: C.muted };
  const today = iso(new Date());
  const days = Math.round((fromIso(h.due_date) - fromIso(today)) / 86400000);
  if (days < 0) return { label: days === -1 ? "1 day late" : `${-days} days late`, color: C.warn, late: true };
  if (days === 0) return { label: "Today", color: C.deep, soon: true };
  if (days === 1) return { label: "Tomorrow", color: C.deep, soon: true };
  if (days < 7) return { label: DOW[fromIso(h.due_date).getDay()], color: C.muted };
  const d = fromIso(h.due_date);
  return { label: `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`, color: C.muted };
}

// Round status mark: empty ring, half-filled, or ticked.
export function StatusMark({ C, status, size = 22 }) {
  const c = status === "done" ? C.accent : status === "partial" ? PARTIAL : C.dim;
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="11" cy="11" r="9" fill={status === "done" ? c : "none"} stroke={c} strokeWidth="2" />
      {status === "partial" ? <path d="M11 2 A9 9 0 0 1 11 20 Z" fill={c} /> : null}
      {status === "done" ? <path d="M6.5 11.5 L9.5 14.5 L15.5 8" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

const LABEL = { not_done: "Not done", partial: "Partial", done: "Done" };

// One homework item on one line. Tap the mark to cycle Not done -> Partial -> Done (teacher only).
export function HwRow({ C, h, onStatus, onDelete }) {
  const due = dueInfo(h, C);
  const done = h.status === "done";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
      {onStatus ? (
        <button onClick={() => onStatus(h, NEXT[h.status] || "partial")} title={`${LABEL[h.status] || "Not done"} · tap to change`}
          aria-label={`${h.title}: ${LABEL[h.status] || "Not done"}. Tap to change.`}
          style={{ background: "transparent", padding: 0, lineHeight: 0 }}>
          <StatusMark C={C} status={h.status} />
        </button>
      ) : (
        <span title={LABEL[h.status] || "Not done"}><StatusMark C={C} status={h.status} /></span>
      )}
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        color: done ? C.muted : C.ink, textDecoration: done ? "line-through" : "none" }}>
        {h.title}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: due.color, whiteSpace: "nowrap",
        background: due.late ? C.absentBg : due.soon ? C.soft : "transparent", borderRadius: 999, padding: due.late || due.soon ? "3px 9px" : "3px 0" }}>
        {due.label}
      </span>
      {onDelete ? (
        <button onClick={() => onDelete(h.id)} aria-label={`Delete ${h.title}`}
          style={{ background: "transparent", color: C.dim, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
      ) : null}
    </div>
  );
}

// Thin progress bar plus counts, replacing a line of text.
export function HwSummary({ C, list }) {
  const done = list.filter((h) => h.status === "done").length;
  const partial = list.filter((h) => h.status === "partial").length;
  const todo = list.length - done - partial;
  if (!list.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: C.line }}>
        <span style={{ width: `${(done / list.length) * 100}%`, background: C.accent }} />
        <span style={{ width: `${(partial / list.length) * 100}%`, background: PARTIAL }} />
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 7, fontFamily: MONO, fontSize: 11, color: C.muted }}>
        <span><b style={{ color: C.ink }}>{todo}</b> to do</span>
        {partial ? <span><b style={{ color: PARTIAL }}>{partial}</b> partial</span> : null}
        <span><b style={{ color: C.accent }}>{done}</b> done</span>
      </div>
    </div>
  );
}

export function HwLegend({ C }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11.5, color: C.muted, marginTop: 10 }}>
      {["not_done", "partial", "done"].map((s) => (
        <span key={s} style={{ display: "flex", gap: 5, alignItems: "center" }}><StatusMark C={C} status={s} size={14} />{LABEL[s]}</span>
      ))}
    </div>
  );
}
