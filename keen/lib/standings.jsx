"use client";
import { useEffect, useState } from "react";
import { sb } from "./supabaseClient";
import { MAXDAY } from "./theme";

const DISPLAY = "'Outfit', sans-serif";
const MONO = "'Space Mono', monospace";
const PRIZE = { 1: 10, 2: 6, 3: 2 };

// Live Mon-Fri table of every student's average per class this week.
export function WeeklyStandings({ C, highlightIds = [] }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await sb().rpc("weekly_standings");
      if (alive) setRows(error ? [] : data || []);
    };
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (rows === null || rows.length === 0) return null;

  const top = Number(rows[0].avg_points) || 1;
  // Ties share a place, like the real payout.
  let place = 0, last = null;
  const ranked = rows.map((r, i) => {
    const pts = Number(r.avg_points);
    if (pts !== last) { place = i + 1; last = pts; }
    return { ...r, pts, place };
  });

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginTop: 12 }}>
      <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>This week's table</h3>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
        Average points per class, Monday to Friday. Updates as marks come in. Top 3 on Friday win bucks.
      </div>
      <div style={{ marginTop: 12 }}>
        {ranked.map((r) => {
          const me = highlightIds.includes(r.student_id);
          const medal = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : null;
          return (
            <div key={r.student_id}
              style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginTop: 6,
                borderRadius: 10, border: `1px solid ${me ? C.accent : C.line}`, background: C.surface2 }}>
              <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.max(0, (r.pts / top) * 100)}%`, background: C.soft, opacity: me ? 1 : 0.5 }} />
              <span style={{ position: "relative", width: 26, fontFamily: MONO, fontSize: 13, fontWeight: 700, color: r.place <= 3 ? C.accent : C.muted }}>
                {medal || r.place}
              </span>
              <span style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: me ? 700 : 500 }}>{r.name}{me ? " (you)" : ""}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                  {r.classes} class{r.classes === 1 ? "" : "es"} so far{PRIZE[r.place] ? ` · on track for ${PRIZE[r.place]} bucks` : ""}
                </span>
              </span>
              <span style={{ position: "relative", fontFamily: MONO, fontSize: 17, fontWeight: 700 }}>
                {r.pts.toFixed(1)}<span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}> /{MAXDAY}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
