"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Stat, Calendar, Button, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import {
  DISPLAY, MONO, CATS, MAXDAY, BLANK, points, MONTHS, iso, pretty, mondayOf,
  BUCKS_PER_WEEK, RUPEES_PER_BUCK,
} from "../../lib/theme";

export default function Me() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState({});
  const [bucks, setBucks] = useState([]);
  const [homework, setHomework] = useState([]);
  const [date, setDate] = useState(iso(new Date()));
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [loading, setLoading] = useState(true);
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb()
        .from("profiles").select("role, student_id").eq("id", session.user.id).single();
      if (profile?.role === "admin") return router.replace("/teacher");
      if (!profile || !profile.student_id) return router.replace("/pending");

      const [{ data: s }, { data: recs }, { data: wb }, { data: hw }] = await Promise.all([
        sb().from("students").select("*").eq("id", profile.student_id).single(),
        sb().from("day_records").select("*").eq("student_id", profile.student_id),
        sb().from("weekly_bucks").select("*").eq("student_id", profile.student_id),
        sb().from("homework").select("*").eq("student_id", profile.student_id).order("due_date", { nullsFirst: false }),
      ]);
      setHomework(hw || []);
      setStudent(s);
      const byDate = {};
      (recs || []).forEach((r) => { byDate[r.on_date] = r; });
      setRecords(byDate);
      setBucks(wb || []);
      setLoading(false);
    })();
  }, [router]);

  const signOut = async () => { await sb().auth.signOut(); router.replace("/login"); };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Fonts C={C} />Loading your card…
      </div>
    );
  }

  const inMonth = (k) => { const d = new Date(k); return d.getFullYear() === cursor.y && d.getMonth() === cursor.m; };
  const monthKeys = Object.keys(records).filter(inMonth);
  const monthPoints = monthKeys.reduce((a, k) => a + points(records[k]), 0);
  const allPoints = Object.keys(records).reduce((a, k) => a + points(records[k]), 0);
  const held = monthKeys.filter((k) => ["present", "absent"].includes(records[k].attendance)).length;
  const present = monthKeys.filter((k) => records[k].attendance === "present").length;
  const missed = held - present;
  const pct = held ? Math.round((present / held) * 100) : 0;

  const today = records[date] || BLANK;
  const totalBucks = bucks.reduce((a, b) => a + Number(b.bucks), 0);
  const totalRupees = bucks.reduce((a, b) => a + Number(b.rupees), 0);
  const leadingNow = bucks.some((b) => b.week_start === mondayOf(date));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub={`Keen · ${MONTHS[cursor.m]}`} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push("/feed")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Feed</button>
            <button onClick={signOut} style={{ background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600 }}>Sign out</button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 0" }}>
          {student?.name}
        </h1>
        {student?.schedule ? <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6 }}>{student.schedule}</div> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Stat C={C} label={`Points in ${MONTHS[cursor.m].slice(0, 3)}`} value={monthPoints} big />
          <Stat C={C} label="Classes attended" value={`${present}/${held}`} />
          <Stat C={C} label="Attendance" value={`${pct}%`} />
        </div>

        <Card C={C} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Recent activity</h3>
            <button onClick={() => setShowCal(!showCal)} style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 600 }}>
              {showCal ? "Hide calendar" : "View calendar"}
            </button>
          </div>
          {Object.keys(records).sort().reverse().slice(0, 8).length === 0 ? (
            <p style={{ fontSize: 13.5, color: C.muted, marginTop: 10 }}>Nothing logged yet — check back after your next class.</p>
          ) : (
            Object.keys(records).sort().reverse().slice(0, 8).map((k) => {
              const r = records[k];
              const pts = points(r);
              const sel = k === date;
              return (
                <button key={k} onClick={() => setDate(k)}
                  style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 0", borderTop: `1px solid ${C.line}`, background: sel ? C.soft : "transparent",
                    borderRadius: sel ? 8 : 0, marginTop: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                    background: r.attendance === "absent" ? C.warn : r.attendance === "present" || pts ? C.accent : C.dim }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{pretty(k)}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {r.attendance === "present" ? "Present" : r.attendance === "absent" ? "Absent" : r.attendance === "no_class" ? "No class" : ""}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.accent, width: 30, textAlign: "right" }}>{pts}</span>
                </button>
              );
            })
          )}
        </Card>

        {showCal && (
        <div style={{ marginTop: 12 }}>
          <Calendar C={C} cursor={cursor} setCursor={setCursor} date={date} onPick={setDate}
            marks={(k) => {
              const r = records[k];
              if (!r) return null;
              if (r.attendance === "absent") return { bg: C.absentBg, dot: C.warn };
              if (r.attendance === "present" || points(r)) return { bg: C.soft, dot: C.accent };
              return null;
            }} />
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: C.accent }} />Attended
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: C.warn }} />Missed
            </span>
            <span>Tap a date to see that day</span>
          </div>
        </div>
        )}

        <Card C={C} style={{ marginTop: 12 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>{pretty(date)}</h3>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            {today.attendance === "present" ? "Present"
              : today.attendance === "absent" ? "Absent"
              : today.attendance === "no_class" ? "No class" : "Not marked"}
          </div>
          {CATS.map((c) => {
            const v = today[c.key] || 0;
            return (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1, fontSize: 13.5 }}>{c.label}</div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <span key={n} style={{ width: 9, height: 9, borderRadius: 2, background: n < v ? C.accent : C.line }} />
                  ))}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: v ? C.accent : C.muted, width: 46, textAlign: "right" }}>
                  {v * c.weight} pts
                </div>
              </div>
            );
          })}
          {today.bonus ? (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13.5 }}>
              <span>Bonus or penalty</span>
              <span style={{ fontFamily: MONO, color: today.bonus < 0 ? C.warn : C.accent }}>
                {today.bonus > 0 ? `+${today.bonus}` : today.bonus}
              </span>
            </div>
          ) : null}
          {(() => {
            const dayHw = homework.filter((h) => h.set_on === date || h.due_date === date);
            if (!dayHw.length) return null;
            return (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Homework for this day</div>
                {dayHw.map((h) => {
                  const badge = h.status === "done" ? { l: "Done", c: C.accent }
                    : h.status === "partial" ? { l: "Partial", c: "#B8860B" }
                    : { l: "Not done", c: C.muted };
                  const overdue = h.status !== "done" && h.due_date && h.due_date < iso(new Date());
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: badge.c, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, textDecoration: h.status === "done" ? "line-through" : "none", color: h.status === "done" ? C.muted : C.ink }}>
                          {h.title}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: overdue ? C.warn : C.muted, marginTop: 2 }}>
                          {`Set ${pretty(h.set_on)}${h.due_date ? ` \u00b7 Due ${pretty(h.due_date)}` : ""}`} \u00b7 {badge.l}
                          {overdue ? " \u00b7 overdue" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>Day total</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{points(today)} / {MAXDAY}</span>
          </div>
        </Card>


        {homework.length ? (
          <Card C={C} style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Homework</h3>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>
                {homework.filter((h) => h.status !== "done").length} to do
              </span>
            </div>
            {homework.map((h) => {
              const badge = h.status === "done" ? { l: "Done", c: C.accent }
                : h.status === "partial" ? { l: "Partial", c: "#B8860B" }
                : { l: "Not done", c: C.muted };
              const overdue = h.status !== "done" && h.due_date && h.due_date < iso(new Date());
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: badge.c, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, textDecoration: h.status === "done" ? "line-through" : "none", color: h.status === "done" ? C.muted : C.ink }}>
                      {h.title}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: overdue ? C.warn : C.muted, marginTop: 2 }}>
                      {`Set ${pretty(h.set_on)}${h.due_date ? ` · Due ${pretty(h.due_date)}` : ""}`} · {badge.l}
                      {overdue ? " · overdue" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.5 }}>
              Status is set by your teacher, not here.
            </div>
          </Card>
        ) : null}
        <Card C={C} style={{ marginTop: 12 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Alacrity Bucks</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.accent }}>{totalBucks}</span>
            <span style={{ fontSize: 15, color: C.muted }}>= Rs {totalRupees}</span>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            Each week's winner earns {BUCKS_PER_WEEK} bucks, and 1 buck is worth Rs {RUPEES_PER_BUCK}.
            If two students tie, the bucks are split between them.
          </div>
          {leadingNow ? (
            <div style={{ background: C.soft, borderRadius: 10, padding: 12, marginTop: 12, fontSize: 13.5, color: C.deep }}>
              You're top of this week so far.
            </div>
          ) : null}
        </Card>

        <Card C={C} style={{ marginTop: 12 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Points, all time</h3>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, marginTop: 6 }}>{allPoints}</div>
        </Card>

        <p style={{ color: C.muted, fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
          A perfect day is {MAXDAY} points: each category is scored 0–5, then multiplied by how much it counts.
          You're seeing your own card only.
        </p>
        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
