"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Stat, ScoreRow, Button, Footer } from "../../lib/ui";
import { DISPLAY, MONO, CATS, MAXDAY, points, RUPEES_PER_BUCK, WEEKLY_TIERS } from "../../lib/theme";

// Everything on this page is fictional sample data held in memory only.
// Nothing here reads from or writes to the real database.
const full = () => Object.fromEntries(CATS.map((c) => [c.key, 5]));
const mk = (vals) => ({ ...Object.fromEntries(CATS.map((c) => [c.key, 0])), bonus: 0, ...vals });

const SAMPLE_STUDENTS = [
  { id: "s1", name: "Zara", schedule: "Mon to Fri, 4:30 to 5:30 pm", bank: 32, wins: 3, seconds: 1, thirds: 0, lastPlace: 1,
    today: mk({ ...full(), bonus: 2 }), att: "present", avg: 48.6 },
  { id: "s2", name: "Omar", schedule: "Mon to Fri, 4:30 to 5:30 pm", bank: 22, wins: 1, seconds: 2, thirds: 1, lastPlace: 2,
    today: mk({ work: 5, behaviour: 4, obedience: 5, phone: 5, seat: 4, homework: 5, punctuality: 5 }), att: "present", avg: 46.2 },
  { id: "s3", name: "Sana", schedule: "Mon, Wed, Fri", bank: 14, wins: 1, seconds: 0, thirds: 2, lastPlace: 3,
    today: mk({ work: 4, behaviour: 5, obedience: 4, phone: 5, seat: 5, homework: 4, punctuality: 5 }), att: "present", avg: 44.9 },
  { id: "s4", name: "Bilal", schedule: "Mon to Thu, 7 to 8 pm", bank: 6, wins: 0, seconds: 1, thirds: 1, lastPlace: null,
    today: mk({ work: 3, behaviour: 4, obedience: 3, phone: 2, seat: 4, homework: 3, punctuality: 4 }), att: "present", avg: 38.1 },
  { id: "s5", name: "Hina", schedule: "Tue and Thu", bank: 2, wins: 0, seconds: 0, thirds: 1, lastPlace: null,
    today: mk({}), att: "absent", avg: 35.4 },
];

const SAMPLE_HOMEWORK = {
  s1: [{ title: "Maths worksheet: fractions", set: "Mon 15 Sep", due: "Tue 16 Sep", status: "done" },
       { title: "English comprehension", set: "Tue 16 Sep", due: "Wed 17 Sep", status: "partial" }],
  s2: [{ title: "Science diagram", set: "Mon 15 Sep", due: "Tue 16 Sep", status: "done" }],
  s3: [{ title: "Reading log", set: "Wed 17 Sep", due: "Fri 19 Sep", status: "not_done" }],
  s4: [], s5: [],
};

const SAMPLE_STORE = [
  { name: "Chips", price: 100, icon: "\u{1F35F}", desc: "One packet, any flavour" },
  { name: "Art supplies combo", price: 600, icon: "\u{1F3A8}", desc: "Sketchbook, 12 colour pencils, eraser" },
  { name: "Coffee", price: 750, icon: "\u2615", desc: "Any drink from the cafe" },
  { name: "Movie ticket", price: 1500, icon: "\u{1F3AC}", desc: "One cinema ticket" },
];

const SAMPLE_FEED = [
  { who: "Teacher", when: "2h ago", body: "This week's results are in!\n\n\u{1F947} 1st: Zara, 10 bucks\n\u{1F948} 2nd: Omar, 6 bucks\n\u{1F949} 3rd: Sana, 2 bucks\n\nGreat work, everyone.", comments: [["Omar", "next week is mine"], ["Zara", "we'll see \u{1F451}"]] },
  { who: "Sana", when: "5h ago", body: "Finally finished the reading log \u{1F4DA}", comments: [["Teacher", "Well done Sana!"]] },
];

const HW_BADGE = { done: ["Done", "accent"], partial: ["Partial", "#B8860B"], not_done: ["Not done", "muted"] };

export default function Demo() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState("teacher");
  const [students, setStudents] = useState(SAMPLE_STUDENTS);
  const [open, setOpen] = useState("s2");
  const [viewAs, setViewAs] = useState("s1");

  const bump = (sid, key, delta, min, max) =>
    setStudents((all) => all.map((s) => s.id !== sid ? s
      : { ...s, today: { ...s.today, [key]: Math.max(min, Math.min(max, (s.today[key] || 0) + delta)) } }));
  const perfect = (sid) => setStudents((all) => all.map((s) => s.id !== sid ? s : { ...s, today: { ...s.today, ...full() } }));

  const color = (c) => (c === "accent" ? C.accent : c === "muted" ? C.muted : c);
  const ranked = [...students].sort((a, b) => b.avg - a.avg);
  const me = students.find((s) => s.id === viewAs);

  const tabBtn = (k, l) => (
    <button key={k} onClick={() => setTab(k)}
      style={{ background: tab === k ? C.accent : "transparent", color: tab === k ? C.onAccent : C.ink,
        border: `1px solid ${tab === k ? C.accent : C.line}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
      {l}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 16px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Guest preview" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push("/login")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Exit</button>
          </div>
        </div>

        <div style={{ background: C.soft, color: C.deep, borderRadius: 12, padding: "12px 14px", marginTop: 16, fontSize: 13.5, lineHeight: 1.5 }}>
          You're exploring Keen with <strong>sample students and made-up data</strong>. Tap around freely, nothing here is saved or real.
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>Keen</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Points, attendance, homework and rewards for a tutoring class.</p>

        <div style={{ display: "flex", gap: 6, marginTop: 16, overflowX: "auto", paddingBottom: 2 }}>
          {tabBtn("teacher", "Teacher view")}
          {tabBtn("student", "Student view")}
          {tabBtn("feed", "Class feed")}
          {tabBtn("store", "Store")}
        </div>

        {tab === "teacher" && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>Ranked by average score per class, so students with fewer classes a week compete fairly. Tap a student to score them.</p>
            {ranked.map((s, i) => {
              const val = points(s.today);
              const isOpen = open === s.id;
              return (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <button onClick={() => setOpen(isOpen ? null : s.id)}
                    style={{ width: "100%", position: "relative", overflow: "hidden", textAlign: "left", background: C.surface,
                      border: `1px solid ${C.line}`, borderRadius: isOpen ? "14px 14px 0 0" : 14, padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: 12, color: C.ink }}>
                    <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${(s.avg / ranked[0].avg) * 100}%`, background: C.soft, opacity: i === 0 ? 1 : 0.55 }} />
                    <span style={{ position: "relative", fontFamily: MONO, fontSize: 13, fontWeight: 700, color: i === 0 ? C.accent : C.muted, width: 18 }}>{i + 1}</span>
                    <span style={{ position: "relative", flex: 1 }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>{s.name}{s.lastPlace === 1 ? " \u{1F451}" : ""}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: s.att === "absent" ? C.warn : C.muted, marginTop: 2 }}>
                        {s.att === "absent" ? "Absent today" : "Present"} · avg {s.avg} / {MAXDAY}
                      </span>
                    </span>
                    <span style={{ position: "relative", fontFamily: MONO, fontSize: 19, fontWeight: 700, color: i === 0 ? C.accent : C.ink }}>{val}</span>
                  </button>
                  {isOpen && (
                    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "10px 16px 16px" }}>
                      <button onClick={() => perfect(s.id)}
                        style={{ width: "100%", background: C.soft, color: C.deep, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 0", fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
                        Mark perfect day · {MAXDAY}/{MAXDAY}
                      </button>
                      {CATS.map((c) => (
                        <ScoreRow key={c.key} C={C} label={c.label} hint={c.hint} weight={c.weight} max={5}
                          value={s.today[c.key] || 0}
                          onMinus={() => bump(s.id, c.key, -1, 0, 5)} onPlus={() => bump(s.id, c.key, 1, 0, 5)} />
                      ))}
                      <ScoreRow C={C} label="Bonus or penalty" hint="Extra effort, or points lost" signed value={s.today.bonus || 0}
                        onMinus={() => bump(s.id, "bonus", -1, -10, 10)} onPlus={() => bump(s.id, "bonus", 1, -10, 10)} />
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.line}`, marginTop: 10 }}>
                        <span style={{ fontSize: 13, color: C.muted }}>Day total</span>
                        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.accent }}>{val} / {MAXDAY}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <Card C={C} style={{ marginTop: 16 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Weekly prizes</h3>
              {WEEKLY_TIERS.map((t, i) => (
                <div key={t.place} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none", marginTop: i ? 0 : 8, fontSize: 14 }}>
                  <span>{t.label}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{t.bucks} bucks</span>
                </div>
              ))}
              <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0" }}>The teacher declares the week once Friday is scored, and results post to the class feed automatically.</p>
            </Card>
          </div>
        )}

        {tab === "student" && me && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {students.map((s) => (
                <button key={s.id} onClick={() => setViewAs(s.id)}
                  style={{ background: viewAs === s.id ? C.ink : "transparent", color: viewAs === s.id ? C.bg : C.muted,
                    border: `1px solid ${viewAs === s.id ? C.ink : C.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 12.5 }}>
                  {s.name}
                </button>
              ))}
            </div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", margin: "16px 0 0" }}>
              {me.name}{me.lastPlace === 1 ? " \u{1F451}" : ""}
            </h2>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>{me.schedule}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Stat C={C} label="Today" value={points(me.today)} big />
              <Stat C={C} label="Weekly average" value={me.avg} />
              <Stat C={C} label="Attendance" value={me.att === "absent" ? "Absent" : "Present"} />
            </div>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Alacrity Bucks</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.accent }}>{me.bank}</span>
                <span style={{ fontSize: 15, color: C.muted }}>= Rs {me.bank * RUPEES_PER_BUCK}</span>
              </div>
              {me.lastPlace ? (
                <div style={{ background: C.soft, borderRadius: 10, padding: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{me.lastPlace === 1 ? "\u{1F451}" : me.lastPlace === 2 ? "\u{1F948}" : "\u{1F949}"}</span>
                  <span style={{ fontSize: 14, color: C.deep, fontWeight: 600 }}>
                    {me.lastPlace === 1 ? "Winner of last week!" : me.lastPlace === 2 ? "2nd place last week" : "3rd place last week"}
                  </span>
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 13.5 }}>
                <span>{"\u{1F451}"} <strong style={{ fontFamily: MONO }}>{me.wins}</strong> wins</span>
                <span>{"\u{1F948}"} <strong style={{ fontFamily: MONO }}>{me.seconds}</strong></span>
                <span>{"\u{1F949}"} <strong style={{ fontFamily: MONO }}>{me.thirds}</strong></span>
              </div>
            </Card>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Homework</h3>
              {(SAMPLE_HOMEWORK[me.id] || []).length === 0 ? (
                <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8 }}>Nothing set right now.</p>
              ) : SAMPLE_HOMEWORK[me.id].map((h) => (
                <div key={h.title} style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color(HW_BADGE[h.status][1]), marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14.5 }}>{h.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>Set {h.set} · Due {h.due} · {HW_BADGE[h.status][0]}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab === "feed" && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 4px" }}>A shared space for the class. The teacher can remove any post or comment.</p>
            {SAMPLE_FEED.map((p, i) => (
              <Card key={i} C={C} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.who}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{p.when}</span>
                </div>
                <p style={{ fontSize: 15, marginTop: 8, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.body}</p>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                  {p.comments.map(([w, c], j) => (
                    <div key={j} style={{ fontSize: 13.5, marginTop: j ? 6 : 0 }}><strong style={{ fontWeight: 600 }}>{w}</strong> {c}</div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "store" && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>Students spend their bucks here, or tap "Save for this" to track progress toward something bigger.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SAMPLE_STORE.map((r) => (
                <div key={r.name} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 34, lineHeight: 1 }}>{r.icon}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 10 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{r.desc}</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent, marginTop: 6 }}>Rs {r.price}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Button C={C} onClick={() => router.push("/login")} style={{ width: "100%" }}>Back to sign in</Button>
        </div>
        <Footer C={C} />
      </div>
    </div>
  );
}
