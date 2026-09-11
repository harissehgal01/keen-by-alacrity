"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Calendar, ScoreRow, Button, Input, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import {
  DISPLAY, MONO, CATS, MAXDAY, BLANK, points, MONTHS, iso, pretty, mondayOf, nextDay,
  RUPEES_PER_BUCK,
} from "../../lib/theme";

const ATT = [["present", "Present"], ["absent", "Absent"], ["no_class", "No class"]];

export default function Teacher() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});      // `${student_id}|${date}` -> row
  const [bucks, setBucks] = useState([]);
  const [pending, setPending] = useState([]);
  const [date, setDate] = useState(iso(new Date()));
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [open, setOpen] = useState(null);
  const [view, setView] = useState("day");
  const [tab, setTab] = useState("score");
  const [previewId, setPreviewId] = useState(null);
  const [previewAs, setPreviewAs] = useState("parent");
  const [showCal, setShowCal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [newName, setNewName] = useState("");
  const [homework, setHomework] = useState([]);
  const [hwTitle, setHwTitle] = useState({});
  const [hwExpanded, setHwExpanded] = useState({});
  const hwCutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d); })();
  const recentHw = (list) => list.filter((h) => (h.due_date || h.set_on) >= hwCutoff);
  const [hwDue, setHwDue] = useState({});

  const [links, setLinks] = useState([]);
  const [addChildFor, setAddChildFor] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [newReward, setNewReward] = useState({ name: "", price: "" });

  const load = useCallback(async () => {
    const [{ data: st }, { data: recs }, { data: wb }, { data: pf }, { data: hw }, { data: pl }, { data: rw }, { data: rd }] = await Promise.all([
      sb().from("students").select("*").eq("active", true).order("name"),
      sb().from("day_records").select("*"),
      sb().from("weekly_bucks").select("*"),
      sb().from("profiles").select("*").order("created_at"),
      sb().from("homework").select("*").order("due_date", { nullsFirst: false }),
      sb().from("parent_links").select("*"),
      sb().from("rewards").select("*").order("price_rupees"),
      sb().from("redemptions").select("*").order("created_at", { ascending: false }),
    ]);
    setRewards(rw || []);
    setRedemptions(rd || []);
    setLinks(pl || []);
    setHomework(hw || []);
    setStudents(st || []);
    const map = {};
    (recs || []).forEach((r) => { map[`${r.student_id}|${r.on_date}`] = r; });
    setRecords(map);
    setBucks(wb || []);
    setPending(pf || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb()
        .from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role !== "admin") return router.replace(profile?.student_id ? "/me" : "/pending");
      await load();
      setLoading(false);
    })();
  }, [router, load]);

  const rec = (sid, d = date) => records[`${sid}|${d}`] || { ...BLANK, attendance: null };

  const write = async (sid, patch) => {
    const current = rec(sid);
    const row = {
      student_id: sid, on_date: date,
      work: current.work || 0, behaviour: current.behaviour || 0, obedience: current.obedience || 0,
      phone: current.phone || 0, seat: current.seat || 0, homework: current.homework || 0,
      punctuality: current.punctuality || 0,
      bonus: current.bonus || 0, attendance: current.attendance ?? null,
      ...patch, updated_at: new Date().toISOString(),
    };
    setRecords((r) => ({ ...r, [`${sid}|${date}`]: row }));   // optimistic
    setStatus("Saving…");
    const { error } = await sb().from("day_records")
      .upsert(row, { onConflict: "student_id,on_date" });
    if (error) { setStatus("Did NOT save — check your connection and try again."); await load(); }
    else { setStatus(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`); }
  };

  const bump = (sid, key, delta, min, max) => {
    const v = Math.max(min, Math.min(max, (rec(sid)[key] || 0) + delta));
    write(sid, { [key]: v });
  };

  const markPerfect = (sid) => {
    const full = {};
    CATS.forEach((c) => { full[c.key] = 5; });
    write(sid, full);
  };

  const setAtt = (sid, mark) => write(sid, { attendance: rec(sid).attendance === mark ? null : mark });

  const approve = async (profileId, role, studentId) => {
    await sb().from("profiles").update({ role, student_id: studentId }).eq("id", profileId);
    await load();
  };
  const linkChild = async (profileId, studentId) => {
    if (!studentId) return;
    await sb().from("parent_links").insert({ profile_id: profileId, student_id: studentId });
    setAddChildFor(null);
    await load();
  };
  const unlinkChild = async (profileId, studentId) => {
    await sb().from("parent_links").delete().eq("profile_id", profileId).eq("student_id", studentId);
    await load();
  };

  const addReward = async () => {
    const name = newReward.name.trim();
    const price = Number(newReward.price);
    if (!name || !price || price <= 0) return;
    await sb().from("rewards").insert({ name, price_rupees: price });
    setNewReward({ name: "", price: "" });
    await load();
  };
  const toggleReward = async (id, active) => {
    await sb().from("rewards").update({ active: !active }).eq("id", id);
    await load();
  };
  const resolveRedemption = async (id, status) => {
    await sb().from("redemptions").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    await load();
  };
  const addStudent = async () => {
    const n = newName.trim();
    if (!n) return;
    await sb().from("students").insert({ name: n });
    setNewName(""); await load();
  };

  const renameStudent = async (id, field, value) => {
    const { error } = await sb().from("students").update({ [field]: value }).eq("id", id);
    if (error) { setStatus("Did NOT save the name — try again."); await load(); }
  };
  const addHomework = async (sid) => {
    const title = (hwTitle[sid] || "").trim();
    if (!title) return;
    setStatus("Saving…");
    const { error } = await sb().from("homework").insert({
      student_id: sid, title, set_on: date, due_date: hwDue[sid] || nextDay(date),
    });
    setHwTitle((t) => ({ ...t, [sid]: "" }));
    setHwDue((d) => ({ ...d, [sid]: "" }));
    setStatus(error ? "Did NOT save — try again." : "Saved");
    await load();
  };

  const setHomeworkStatus = async (item, status) => {
    setHomework((h) => h.map((x) => (x.id === item.id ? { ...x, status } : x)));
    const { error } = await sb().from("homework").update({ status }).eq("id", item.id);
    if (error) { setStatus("Did NOT save — try again."); await load(); }
  };

  const removeHomework = async (id) => {
    await sb().from("homework").delete().eq("id", id);
    await load();
  };

  const signOut = async () => { await sb().auth.signOut(); router.replace("/login"); };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Fonts C={C} />Loading…
      </div>
    );
  }

  const inMonth = (k) => { const d = new Date(k); return d.getFullYear() === cursor.y && d.getMonth() === cursor.m; };
  // Week/Month/All-time compare AVERAGE points per class held, not the raw sum,
  // so a 3-day-a-week student is judged fairly against a 5-day-a-week one.
  const scoreOf = (sid) => {
    if (view === "day") return points(rec(sid));
    const keys = Object.keys(records)
      .filter((k) => k.startsWith(`${sid}|`))
      .filter((k) => (view === "month" ? inMonth(k.split("|")[1]) : true));
    if (!keys.length) return 0;
    const total = keys.reduce((a, k) => a + points(records[k]), 0);
    return Math.round((total / keys.length) * 10) / 10;
  };
  const attStats = (sid) => {
    const keys = Object.keys(records).filter((k) => k.startsWith(`${sid}|`) && inMonth(k.split("|")[1]));
    const held = keys.filter((k) => ["present", "absent"].includes(records[k].attendance)).length;
    const present = keys.filter((k) => records[k].attendance === "present").length;
    return { held, present, missed: held - present, pct: held ? Math.round((present / held) * 100) : 0 };
  };

  const ranked = [...students].sort((a, b) => scoreOf(b.id) - scoreOf(a.id));
  const top = ranked.length ? scoreOf(ranked[0].id) : 0;
  const thisWeek = mondayOf(date);
  const weekWinners = bucks.filter((b) => b.week_start === thisWeek);
  const bucksTotals = students.map((s) => ({
    s,
    bucks: bucks.filter((b) => b.student_id === s.id && b.week_start !== thisWeek).reduce((a, b) => a + Number(b.bucks), 0),
    rupees: bucks.filter((b) => b.student_id === s.id && b.week_start !== thisWeek).reduce((a, b) => a + Number(b.rupees), 0),
  })).sort((a, b) => b.bucks - a.bucks);
  const waiting = pending.filter((p) => p.role === "pending");
  const pendingRedemptions = redemptions.filter((r) => r.status === "requested");
  const rupeesSpent = (sid) => redemptions.filter((r) => r.student_id === sid && r.status !== "cancelled").reduce((a, r) => a + r.price_rupees, 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 16px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Keen" />
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
              <ThemeToggle C={C} dark={dark} setDark={setDark} />
              <button onClick={() => router.push("/feed")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Feed</button>
              <button onClick={() => router.push("/rules")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Rules</button>
              <button onClick={signOut} style={{ background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600 }}>Sign out</button>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: status.includes("NOT") ? C.warn : C.muted, marginTop: 4 }}>{status}</div>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 0" }}>Keen</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{pretty(date)}</div>

        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {[["score", "Scoring"], ["rewards", `Store${pendingRedemptions.length ? ` (${pendingRedemptions.length})` : ""}`], ["people", `People${waiting.length ? ` (${waiting.length})` : ""}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ background: tab === k ? C.accent : "transparent", color: tab === k ? C.onAccent : C.ink,
                border: `1px solid ${tab === k ? C.accent : C.line}`, borderRadius: 999, padding: "8px 16px", fontSize: 13.5, fontWeight: 500 }}>
              {l}
            </button>
          ))}
        </div>

        {tab === "rewards" ? (
          <div style={{ marginTop: 16 }}>
            <Card C={C}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Pending requests</h3>
              {pendingRedemptions.length === 0 ? (
                <p style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Nobody's asked for anything yet.</p>
              ) : pendingRedemptions.map((r) => {
                const s = students.find((x) => x.id === r.student_id);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 12, gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{s?.name || "Unknown"}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{r.reward_name} · Rs {r.price_rupees}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => resolveRedemption(r.id, "given")}
                        style={{ background: C.accent, color: C.onAccent, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 500 }}>
                        Given
                      </button>
                      <button onClick={() => resolveRedemption(r.id, "cancelled")}
                        style={{ background: "transparent", color: C.warn, border: `1px solid ${C.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 500 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Catalog</h3>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Input C={C} value={newReward.name} placeholder="Item name"
                  onChange={(e) => setNewReward((v) => ({ ...v, name: e.target.value }))} />
                <input value={newReward.price} placeholder="Rs" type="number" inputMode="numeric"
                  onChange={(e) => setNewReward((v) => ({ ...v, price: e.target.value }))}
                  style={{ width: 90, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 10px", fontSize: 15, fontFamily: "inherit" }} />
                <Button C={C} onClick={addReward} style={{ padding: "0 18px" }}>Add</Button>
              </div>
              {rewards.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 12 }}>
                  <div>
                    <span style={{ fontSize: 15, textDecoration: r.active ? "none" : "line-through", color: r.active ? C.ink : C.muted }}>{r.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, marginLeft: 10 }}>Rs {r.price_rupees}</span>
                  </div>
                  <button onClick={() => toggleReward(r.id, r.active)}
                    style={{ background: "transparent", color: r.active ? C.warn : C.accent, fontSize: 12.5, fontWeight: 500 }}>
                    {r.active ? "Retire" : "Restore"}
                  </button>
                </div>
              ))}
            </Card>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Spent so far</h3>
              {students.map((s) => {
                const spent = rupeesSpent(s.id);
                if (!spent) return null;
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 10, fontSize: 14 }}>
                    <span>{s.name}</span>
                    <span style={{ fontFamily: MONO, color: C.muted }}>Rs {spent}</span>
                  </div>
                );
              })}
              {students.every((s) => !rupeesSpent(s.id)) ? (
                <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>Nothing redeemed yet.</p>
              ) : null}
            </Card>

            <p style={{ color: C.muted, fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
              Students request from what's earned and unspent. "Given" marks it handed over; "Cancel" returns the bucks.
            </p>
            <Footer C={C} />
          </div>
        ) : tab === "people" ? (
          <div style={{ marginTop: 16 }}>
            <Card C={C}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Waiting for approval</h3>
              {waiting.length === 0 ? (
                <p style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Nobody is waiting. New sign-ups appear here.</p>
              ) : waiting.map((p) => (
                <div key={p.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, marginTop: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.full_name || "(no name given)"}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{p.email}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                    Says they're linked to: <strong style={{ color: C.ink }}>{p.requested_student_name || "—"}</strong>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {students.map((s) => (
                      <span key={s.id} style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => approve(p.id, "student", s.id)}
                          style={{ background: C.soft, color: C.deep, border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}>
                          {s.name} · student
                        </button>
                        <button onClick={() => approve(p.id, "parent", s.id)}
                          style={{ background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}>
                          parent
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Approved accounts</h3>
              {pending.filter((p) => p.role !== "pending").map((p) => {
                const extra = links.filter((l) => l.profile_id === p.id).map((l) => students.find((s) => s.id === l.student_id)).filter(Boolean);
                const allNames = [students.find((s) => s.id === p.student_id), ...extra].filter(Boolean).map((s) => s.name);
                const linkedIds = new Set([p.student_id, ...extra.map((s) => s.id)]);
                const linkable = students.filter((s) => !linkedIds.has(s.id));
                return (
                  <div key={p.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5 }}>{p.full_name || p.email}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          {p.role} · {allNames.length ? allNames.join(", ") : (p.role === "admin" ? "all students" : "not linked")}
                        </div>
                      </div>
                      {p.role !== "admin" ? (
                        <button onClick={() => approve(p.id, "pending", null)}
                          style={{ background: "transparent", color: C.warn, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Revoke</button>
                      ) : null}
                    </div>
                    {extra.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {extra.map((s) => (
                          <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: C.soft, color: C.deep, borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
                            {s.name}
                            <button onClick={() => unlinkChild(p.id, s.id)} style={{ background: "transparent", color: C.deep, fontSize: 12, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {p.role === "parent" && linkable.length ? (
                      addChildFor === p.id ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {linkable.map((s) => (
                            <button key={s.id} onClick={() => linkChild(p.id, s.id)}
                              style={{ background: "transparent", color: C.accent, border: `1px solid ${C.line}`, borderRadius: 999, padding: "5px 12px", fontSize: 12 }}>
                              + {s.name}
                            </button>
                          ))}
                          <button onClick={() => setAddChildFor(null)} style={{ background: "transparent", color: C.muted, fontSize: 12 }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddChildFor(p.id)}
                          style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 500, marginTop: 8 }}>
                          + Link another child
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </Card>

            <Card C={C} style={{ marginTop: 12 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Students</h3>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Input C={C} value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStudent()} placeholder="Add a student" />
                <Button C={C} onClick={addStudent} style={{ padding: "0 18px" }}>Add</Button>
              </div>
              {students.map((s) => (
                <div key={s.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Input C={C} value={s.name}
                      onChange={(e) => setStudents((all) => all.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                      onBlur={(e) => renameStudent(s.id, "name", e.target.value)}
                      style={{ fontSize: 15 }} />
                    <button onClick={() => { setTab("score"); setPreviewId(s.id); setPreviewAs("parent"); }}
                      style={{ background: "transparent", color: C.accent, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                      View as parent
                    </button>
                    <button onClick={() => { setTab("score"); setPreviewId(s.id); setPreviewAs("student"); }}
                      style={{ background: "transparent", color: C.accent, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                      View as student
                    </button>
                  </div>
                  <Input C={C} value={s.schedule || ""} placeholder="Schedule, e.g. Mon–Fri · 4:30–5:30 pm"
                    onChange={(e) => setStudents((all) => all.map((x) => (x.id === s.id ? { ...x, schedule: e.target.value } : x)))}
                    onBlur={(e) => renameStudent(s.id, "schedule", e.target.value)}
                    style={{ fontSize: 12.5, marginTop: 6, color: C.muted }} />
                </div>
              ))}
            </Card>
            <InstallPrompt C={C} />
        <Footer C={C} />
          </div>
        ) : previewId ? (
          <div style={{ marginTop: 16 }}>
            {(() => {
              const s = students.find((x) => x.id === previewId);
              if (!s) return null;
              const keys = Object.keys(records).filter((k) => k.startsWith(`${s.id}|`));
              const monthKeys = keys.filter((k) => inMonth(k.split("|")[1]));
              const monthPts = monthKeys.reduce((a, k) => a + points(records[k]), 0);
              const a = attStats(s.id);
              const r = rec(s.id);
              const sHw = homework.filter((h) => h.student_id === s.id);
              const sBucks = bucks.filter((b) => b.student_id === s.id);
              const totalBucks = sBucks.reduce((a2, b) => a2 + Number(b.bucks), 0);
              const totalRupees = sBucks.reduce((a2, b) => a2 + Number(b.rupees), 0);
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>
                      Viewing as {s.name}{previewAs === "student" ? " (student login)" : "'s parent"}
                    </div>
                    <button onClick={() => setPreviewId(null)} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>
                      Back to scoring
                    </button>
                  </div>
                  <h2 style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em", margin: "10px 0 0" }}>{s.name}</h2>
                  {s.schedule ? <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>{s.schedule}</div> : null}

                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 12px 14px" }}>
                      <div style={{ fontSize: 10.5, color: C.muted }}>Points in {MONTHS[cursor.m].slice(0, 3)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.accent }}>{monthPts}</div>
                    </div>
                    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 12px 14px" }}>
                      <div style={{ fontSize: 10.5, color: C.muted }}>Attendance</div>
                      <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>{a.pct}%</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Calendar C={C} cursor={cursor} setCursor={setCursor} date={date}
                      onPick={(d) => { setDate(d); const dt = new Date(d); setCursor({ y: dt.getFullYear(), m: dt.getMonth() }); }}
                      marks={(k) => {
                        const rec2 = records[`${s.id}|${k}`];
                        if (!rec2) return null;
                        if (rec2.attendance === "absent") return { bg: C.absentBg, dot: C.warn };
                        if (rec2.attendance === "present" || points(rec2)) return { bg: C.soft, dot: C.accent };
                        return null;
                      }} />
                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: C.accent }} />Attended
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: C.warn }} />Missed
                      </span>
                      <span>Tap a date to see that day below</span>
                    </div>
                  </div>

                  <Card C={C} style={{ marginTop: 12 }}>
                    <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>{pretty(date)}</h3>
                    {CATS.map((c) => (
                      <div key={c.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}>
                        <span>{c.label}</span>
                        <span style={{ fontFamily: MONO, color: C.muted }}>{(r[c.key] || 0)} × {c.weight} = {(r[c.key] || 0) * c.weight}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                      <span style={{ fontSize: 13, color: C.muted }}>Day total</span>
                      <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{points(r)} / {MAXDAY}</span>
                    </div>
                  </Card>

                  <Card C={C} style={{ marginTop: 12 }}>
                    <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Homework</h3>
                    {(() => {
                      const shown = hwExpanded[s.id] ? sHw : recentHw(sHw);
                      const hiddenCount = sHw.length - shown.length;
                      if (sHw.length === 0) return <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8 }}>Nothing set.</p>;
                      return (
                        <>
                          {shown.map((h) => {
                            const badge = h.status === "done" ? { l: "Done", c: C.accent }
                              : h.status === "partial" ? { l: "Partial", c: "#B8860B" }
                              : { l: "Not done", c: C.muted };
                            const overdue = h.status !== "done" && h.due_date && h.due_date < iso(new Date());
                            return (
                              <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 10 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 999, background: badge.c, marginTop: 6, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, textDecoration: h.status === "done" ? "line-through" : "none", color: h.status === "done" ? C.muted : C.ink }}>
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
                          {hiddenCount > 0 ? (
                            <button onClick={() => setHwExpanded((e) => ({ ...e, [s.id]: true }))}
                              style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 500, marginTop: 10 }}>
                              Show all ({hiddenCount} more)
                            </button>
                          ) : hwExpanded[s.id] ? (
                            <button onClick={() => setHwExpanded((e) => ({ ...e, [s.id]: false }))}
                              style={{ background: "transparent", color: C.muted, fontSize: 12.5, fontWeight: 500, marginTop: 10 }}>
                              Show less
                            </button>
                          ) : null}
                        </>
                      );
                    })()}
                  </Card>

                  <Card C={C} style={{ marginTop: 12 }}>
                    <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Alacrity Bucks</h3>
                    <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.accent, marginTop: 8 }}>
                      {totalBucks} <span style={{ fontSize: 15, color: C.muted, fontWeight: 400 }}>= Rs {totalRupees}</span>
                    </div>
                  </Card>

                  <p style={{ color: C.muted, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
                    This is exactly what {s.name}{previewAs === "student" ? " sees signing in as a student" : "'s parent sees signing in"} — read only, no editing here.
                    The student and parent views currently show identical content.
                  </p>
                </>
              );
            })()}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
              <button onClick={() => setShowCal(!showCal)}
                style={{ background: "transparent", color: C.accent, border: `1px solid ${C.line}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
                {showCal ? "Hide calendar" : "Calendar"}
              </button>
              <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: 3 }}>
                {[["day", "Day"], ["month", "Month"], ["all", "All time"]].map(([k, l]) => (
                  <button key={k} onClick={() => setView(k)}
                    style={{ background: view === k ? C.accent : "transparent", color: view === k ? C.onAccent : C.muted, fontWeight: 500, fontSize: 12.5, padding: "7px 13px", borderRadius: 999 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {showCal && (
              <div style={{ marginTop: 12 }}>
                <Calendar C={C} cursor={cursor} setCursor={setCursor} date={date}
                  onPick={(d) => { setDate(d); setOpen(null); const dt = new Date(d); setCursor({ y: dt.getFullYear(), m: dt.getMonth() }); }}
                  marks={(k) => (Object.keys(records).some((rk) => rk.endsWith(`|${k}`)) ? { bg: C.soft, dot: C.accent } : null)} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: C.muted }}>
                  <span>Dots mark days with records</span>
                  <button onClick={() => { const t = new Date(); setDate(iso(t)); setCursor({ y: t.getFullYear(), m: t.getMonth() }); }}
                    style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 600 }}>Today</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              {ranked.map((s, i) => {
                const val = scoreOf(s.id);
                const pct = top > 0 ? Math.max(0, (val / top) * 100) : 0;
                const isOpen = open === s.id;
                const r = rec(s.id);
                const a = attStats(s.id);
                return (
                  <div key={s.id} style={{ marginBottom: 8 }}>
                    <button onClick={() => setOpen(isOpen ? null : s.id)}
                      style={{ width: "100%", position: "relative", overflow: "hidden", textAlign: "left", background: C.surface,
                        border: `1px solid ${C.line}`, borderRadius: isOpen ? "14px 14px 0 0" : 14, padding: "14px 16px",
                        display: "flex", alignItems: "center", gap: 12, color: C.ink }}>
                      <span className="bar" style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct}%`, background: C.soft, opacity: i === 0 ? 1 : 0.55 }} />
                      <span style={{ position: "relative", fontFamily: MONO, fontSize: 13, fontWeight: 700, color: i === 0 ? C.accent : C.muted, width: 18 }}>{i + 1}</span>
                      <span style={{ position: "relative", flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 500 }}>{s.name}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: r.attendance === "absent" ? C.warn : C.muted, marginTop: 2 }}>
                          {view === "day"
                            ? (r.attendance ? ATT.find(([k]) => k === r.attendance)[1] : "Not marked")
                            : `${a.present}/${a.held} classes · ${a.pct}%`}
                        </span>
                      </span>
                      <span style={{ position: "relative", fontFamily: MONO, fontSize: 19, fontWeight: 700, color: i === 0 && val > 0 ? C.accent : C.ink }}>{val}</span>
                    </button>

                    {isOpen && (
                      <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "6px 16px 16px" }}>
                        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", color: C.muted, textTransform: "uppercase", padding: "12px 0 2px" }}>
                          {pretty(date)}
                        </div>
                        {s.schedule ? <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>{s.schedule}</div> : null}
                        <div style={{ display: "flex", gap: 6, margin: "8px 0 6px" }}>
                          {ATT.map(([k, l]) => {
                            const on = r.attendance === k;
                            return (
                              <button key={k} onClick={() => setAtt(s.id, k)}
                                style={{ flex: 1, background: on ? (k === "absent" ? C.warn : k === "present" ? C.accent : C.muted) : "transparent",
                                  color: on ? "#FFFFFF" : C.ink, border: `1px solid ${on ? "transparent" : C.line}`,
                                  borderRadius: 999, padding: "9px 0", fontSize: 13, fontWeight: 500 }}>
                                {l}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, paddingBottom: 4 }}>
                          {MONTHS[cursor.m]}: {a.present}/{a.held} attended · {a.missed} missed · {a.pct}%
                        </div>

                        <button onClick={() => markPerfect(s.id)}
                          style={{ width: "100%", background: C.soft, color: C.deep, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 0", fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>
                          Mark perfect day · {MAXDAY}/{MAXDAY}
                        </button>

                        {CATS.map((c) => (
                          <ScoreRow key={c.key} C={C} label={c.label} hint={c.hint} weight={c.weight} max={5}
                            value={r[c.key] || 0}
                            onMinus={() => bump(s.id, c.key, -1, 0, 5)} onPlus={() => bump(s.id, c.key, 1, 0, 5)} />
                        ))}
                        <ScoreRow C={C} label="Bonus or penalty" hint="Extra effort, or points lost" signed value={r.bonus || 0}
                          onMinus={() => bump(s.id, "bonus", -1, -10, 10)} onPlus={() => bump(s.id, "bonus", 1, -10, 10)} />


                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Homework</span>
                            <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                              {homework.filter((h) => h.student_id === s.id && h.status !== "done").length} outstanding
                            </span>
                          </div>

                          {(() => {
                            const all = homework.filter((h) => h.student_id === s.id);
                            const shownHw = hwExpanded[s.id] ? all : recentHw(all);
                            const hidden = all.length - shownHw.length;
                            if (all.length === 0) return <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>Nothing set yet.</div>;
                            return (
                              <>
                                {shownHw.map((h) => (
                              <div key={h.id} style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, textDecoration: h.status === "done" ? "line-through" : "none", color: h.status === "done" ? C.muted : C.ink }}>
                                      {h.title}
                                    </div>
                                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>
                                      {`Set ${pretty(h.set_on)}${h.due_date ? ` · Due ${pretty(h.due_date)}` : ""}`}
                                    </div>
                                  </div>
                                  <button onClick={() => removeHomework(h.id)}
                                    style={{ background: "transparent", color: C.muted, fontSize: 12 }}>Delete</button>
                                </div>
                                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                  {[["not_done", "Not done"], ["partial", "Partial"], ["done", "Done"]].map(([st, l]) => {
                                    const on = h.status === st;
                                    const c = st === "done" ? C.accent : st === "partial" ? "#B8860B" : C.muted;
                                    return (
                                      <button key={st} onClick={() => setHomeworkStatus(h, st)}
                                        style={{ flex: 1, background: on ? c : "transparent", color: on ? "#FFFFFF" : C.ink,
                                          border: `1px solid ${on ? c : C.line}`, borderRadius: 999, padding: "6px 0", fontSize: 11.5, fontWeight: 500 }}>
                                        {l}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                                ))}
                                {hidden > 0 ? (
                                  <button onClick={() => setHwExpanded((e) => ({ ...e, [s.id]: true }))}
                                    style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 500, marginTop: 10 }}>
                                    Show all ({hidden} more)
                                  </button>
                                ) : hwExpanded[s.id] ? (
                                  <button onClick={() => setHwExpanded((e) => ({ ...e, [s.id]: false }))}
                                    style={{ background: "transparent", color: C.muted, fontSize: 12.5, fontWeight: 500, marginTop: 10 }}>
                                    Show less
                                  </button>
                                ) : null}
                              </>
                            );
                          })()}

                          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                            <Input C={C} value={hwTitle[s.id] || ""} placeholder="Set homework…"
                              onChange={(e) => setHwTitle((t) => ({ ...t, [s.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && addHomework(s.id)} style={{ fontSize: 14 }} />
                            <input type="date" value={hwDue[s.id] || ""}
                              onChange={(e) => setHwDue((d) => ({ ...d, [s.id]: e.target.value }))}
                              style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 8px", fontSize: 13, fontFamily: "inherit" }} />
                            <Button C={C} onClick={() => addHomework(s.id)} style={{ padding: "0 16px", fontSize: 14 }}>Set</Button>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.line}`, marginTop: 10 }}>
                          <span style={{ fontSize: 13, color: C.muted }}>Day total</span>
                          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.accent }}>{points(r)} / {MAXDAY}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Card C={C} style={{ marginTop: 20 }}>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, margin: 0 }}>Alacrity Bucks</h3>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                1st place earns 10 bucks, 2nd earns 6, 3rd earns 2 · judged by average score per class, so 3-day and 5-day students compete fairly · 1 buck = Rs {RUPEES_PER_BUCK} · ties within a place split it evenly
              </div>
              {weekWinners.length ? (
                <div style={{ background: C.soft, borderRadius: 10, padding: 12, marginTop: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.deep }}>This week</div>
                  {[1, 2, 3].map((place) => {
                    const atPlace = weekWinners.filter((w) => w.place === place);
                    if (!atPlace.length) return null;
                    const label = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
                    return (
                      <div key={place} style={{ fontSize: 14, marginTop: 6 }}>
                        <span style={{ fontFamily: MONO, color: C.deep, fontWeight: 600 }}>{label}</span>{" "}
                        <strong>{atPlace.map((w) => students.find((s) => s.id === w.student_id)?.name).filter(Boolean).join(" & ")}</strong>
                        {" "}· {Number(atPlace[0].points).toFixed(1)} / {MAXDAY} a class
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {bucksTotals.some((b) => b.bucks > 0) ? (
                <div style={{ marginTop: 14 }}>
                  {bucksTotals.map((b) => (
                    <div key={b.s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                      <span style={{ flex: 1, fontSize: 15 }}>{b.s.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: b.bucks ? C.accent : C.muted, width: 40, textAlign: "right" }}>{b.bucks}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, width: 78, textAlign: "right" }}>Rs {b.rupees}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Bucks are banked once a week finishes.</div>
              )}
            </Card>

            <p style={{ color: C.muted, fontSize: 12, marginTop: 22, lineHeight: 1.6 }}>
              Pick a date, mark attendance, then score each student. A perfect day is {MAXDAY} points.
              Every tap saves to the database straight away.
            </p>
            <InstallPrompt C={C} />
            <Footer C={C} />
          </>
        )}
      </div>
    </div>
  );
}
