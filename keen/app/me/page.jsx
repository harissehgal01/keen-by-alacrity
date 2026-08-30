"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Stat, Calendar, Button, Footer } from "../../lib/ui";
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
  const [date, setDate] = useState(iso(new Date()));
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await supabase
        .from("profiles").select("role, student_id").eq("id", session.user.id).single();
      if (profile?.role === "admin") return router.replace("/teacher");
      if (!profile || !profile.student_id) return router.replace("/pending");

      const [{ data: s }, { data: recs }, { data: wb }] = await Promise.all([
        sb().from("students").select("*").eq("id", profile.student_id).single(),
        sb().from("day_records").select("*").eq("student_id", profile.student_id),
        sb().from("weekly_bucks").select("*").eq("student_id", profile.student_id),
      ]);
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
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>Day total</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{points(today)} / {MAXDAY}</span>
          </div>
        </Card>

        <Card C={C} style={{ marginTop: 12 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Electricity Bucks</h3>
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
        <Footer C={C} />
      </div>
    </div>
  );
}
