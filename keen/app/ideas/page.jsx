"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Footer } from "../../lib/ui";
import { DISPLAY, MONO } from "../../lib/theme";

const STATUS = {
  new: ["New", "muted"],
  planned: ["Coming soon", "accent"],
  done: ["Added ✅", "deep"],
  declined: ["Not for now", "muted"],
};

function when(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function Ideas() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [names, setNames] = useState({});
  const [list, setList] = useState([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(true);
  const [replyDraft, setReplyDraft] = useState({});

  const load = useCallback(async () => {
    const [{ data, error }, { data: profs }] = await Promise.all([
      sb().from("suggestions").select("*").order("created_at", { ascending: false }),
      sb().rpc("feed_profile_names"),
    ]);
    if (error) { setReady(false); return; }
    setReady(true);
    setList(data || []);
    const m = {}; (profs || []).forEach((p) => { m[p.id] = p.full_name; }); setNames(m);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb().from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || profile.role === "pending") return router.replace(profile ? "/pending" : "/login");
      setMe(profile);
      await load();
    })();
  }, [router, load]);

  const send = async () => {
    const text = body.trim();
    if (text.length < 3) return setMsg("Write a bit more first.");
    setBusy(true); setMsg("");
    const { error } = await sb().from("suggestions").insert({ author_id: me.id, body: text });
    setBusy(false);
    if (error) return setMsg("That didn't send. Try again in a moment.");
    setBody(""); setMsg("Thanks! Your idea went straight to Sir.");
    await load();
  };

  const setStatus = async (id, status) => {
    await sb().from("suggestions").update({ status }).eq("id", id);
    await load();
  };
  const saveReply = async (id) => {
    await sb().from("suggestions").update({ reply: (replyDraft[id] || "").trim() || null }).eq("id", id);
    await load();
  };
  const remove = async (id) => {
    await sb().from("suggestions").delete().eq("id", id);
    await load();
  };

  if (!me) {
    return <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, padding: 24, fontFamily: "'Inter', sans-serif" }}><Fonts C={C} />Loading…</div>;
  }
  const isAdmin = me.role === "admin";
  const input = { width: "100%", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Ideas" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push(isAdmin ? "/teacher" : "/me")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>
              {isAdmin ? "Points table" : "My Keen"}
            </button>
            <button onClick={() => router.push("/feed")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Feed</button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>
          {isAdmin ? "Suggestions" : "Make Keen better"}
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>
          {isAdmin ? "Everything students and parents have suggested." : "Got an idea for the app? A new reward, a feature, something annoying? Tell Sir here. Only he sees it."}
        </p>

        {!ready ? (
          <Card C={C} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, color: C.muted }}>Suggestions are being set up. Check back soon!</div>
          </Card>
        ) : (
          <>
            {!isAdmin ? (
              <Card C={C} style={{ marginTop: 16 }}>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={1000}
                  placeholder="I think Keen should…" style={{ ...input, resize: "vertical" }} />
                {msg ? <div style={{ fontSize: 13, color: msg.startsWith("Thanks") ? C.deep : C.warn, marginTop: 8 }}>{msg}</div> : null}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <Button C={C} onClick={send} disabled={busy} style={{ padding: "9px 18px", fontSize: 14, opacity: busy ? 0.6 : 1 }}>
                    {busy ? "Sending…" : "Send idea"}
                  </Button>
                </div>
              </Card>
            ) : null}

            <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>
              {isAdmin ? `${list.filter((s) => s.status === "new").length} new` : "Your ideas"}
            </div>
            {list.length === 0 ? (
              <p style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>{isAdmin ? "No suggestions yet." : "You haven't sent any ideas yet."}</p>
            ) : null}
            {list.map((s) => {
              const [label, tone] = STATUS[s.status] || STATUS.new;
              return (
                <Card key={s.id} C={C} style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{isAdmin ? (names[s.author_id] || "Someone") : when(s.created_at)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C[tone] }}>{isAdmin ? `${when(s.created_at)} · ${label}` : label}</span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.55, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{s.body}</p>
                  {s.reply && !isAdmin ? (
                    <div style={{ background: C.soft, borderRadius: 8, padding: "8px 10px", marginTop: 10, fontSize: 13.5 }}>
                      <strong style={{ color: C.deep }}>Sir:</strong> {s.reply}
                    </div>
                  ) : null}
                  {isAdmin ? (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                        {Object.entries(STATUS).map(([k, [l]]) => (
                          <button key={k} onClick={() => setStatus(s.id, k)}
                            style={{ background: s.status === k ? C.accent : "transparent", color: s.status === k ? C.onAccent : C.muted,
                              border: `1px solid ${s.status === k ? C.accent : C.line}`, borderRadius: 999, padding: "5px 11px", fontSize: 12 }}>
                            {l}
                          </button>
                        ))}
                        <button onClick={() => remove(s.id)} style={{ background: "transparent", color: C.warn, fontSize: 12, marginLeft: "auto" }}>Delete</button>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <input value={replyDraft[s.id] ?? s.reply ?? ""} onChange={(e) => setReplyDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                          placeholder="Reply (they'll see it)" style={{ ...input, fontSize: 13.5, padding: "8px 10px" }} />
                        <Button C={C} onClick={() => saveReply(s.id)} style={{ padding: "0 14px", fontSize: 13 }}>Save</Button>
                      </div>
                    </>
                  ) : null}
                </Card>
              );
            })}
          </>
        )}
        <Footer C={C} />
      </div>
    </div>
  );
}
