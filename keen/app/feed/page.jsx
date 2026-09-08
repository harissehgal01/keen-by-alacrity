"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Input, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import { DISPLAY, MONO } from "../../lib/theme";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Feed() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [commentDraft, setCommentDraft] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, { data: allProfiles }, { data: c }] = await Promise.all([
      sb().from("feed_posts").select("*").order("created_at", { ascending: false }),
      sb().from("profiles").select("id, full_name, email, role"),
      sb().from("feed_comments").select("*").order("created_at", { ascending: true }),
    ]);
    setPosts(p || []);
    const pmap = {};
    (allProfiles || []).forEach((x) => { pmap[x.id] = x; });
    setProfiles(pmap);
    const cmap = {};
    (c || []).forEach((x) => { (cmap[x.post_id] = cmap[x.post_id] || []).push(x); });
    setComments(cmap);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb().from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || profile.role === "pending") return router.replace(profile ? "/pending" : "/login");
      setMe(profile);
      await load();
      setLoading(false);
    })();
  }, [router, load]);

  const nameFor = (id) => profiles[id]?.full_name || profiles[id]?.email?.split("@")[0] || "Someone";

  const post = async () => {
    const text = body.trim();
    const url = mediaUrl.trim();
    if (!text && !url) return;
    setPosting(true); setErr("");
    const { error } = await sb().from("feed_posts").insert({ author_id: me.id, body: text, media_url: url });
    setPosting(false);
    if (error) return setErr("That didn't post — try again.");
    setBody(""); setMediaUrl("");
    await load();
  };

  const removePost = async (id) => {
    const { error } = await sb().from("feed_posts").delete().eq("id", id);
    if (error) setErr("Couldn't delete that.");
    await load();
  };

  const addComment = async (postId) => {
    const text = (commentDraft[postId] || "").trim();
    if (!text) return;
    const { error } = await sb().from("feed_comments").insert({ post_id: postId, author_id: me.id, body: text });
    if (!error) { setCommentDraft((d) => ({ ...d, [postId]: "" })); await load(); }
  };

  const removeComment = async (id) => {
    await sb().from("feed_comments").delete().eq("id", id);
    await load();
  };

  const isImg = (url) => /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(url);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Fonts C={C} />Loading the feed…
      </div>
    );
  }

  const isAdmin = me?.role === "admin";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Class feed" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push(isAdmin ? "/teacher" : "/me")}
              style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>
              {isAdmin ? "Points table" : "My Keen"}
            </button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>
          Feed
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>Everyone in class can see and comment here.</p>

        <Card C={C} style={{ marginTop: 16 }}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share something…"
            rows={3}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical" }} />
          <Input C={C} value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Paste an image or GIF link (optional)" style={{ marginTop: 8, fontSize: 13.5 }} />
          {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 8 }}>{err}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <Button C={C} onClick={post} disabled={posting} style={{ padding: "9px 18px", fontSize: 14, opacity: posting ? 0.6 : 1 }}>
              {posting ? "Posting…" : "Post"}
            </Button>
          </div>
        </Card>

        <div style={{ marginTop: 16 }}>
          {posts.length === 0 && (
            <p style={{ fontSize: 14, color: C.muted, textAlign: "center", marginTop: 24 }}>Nobody's posted yet — be first.</p>
          )}
          {posts.map((p) => {
            const canDeletePost = isAdmin || p.author_id === me.id;
            const postComments = comments[p.id] || [];
            const showC = !!openComments[p.id];
            return (
              <Card key={p.id} C={C} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{nameFor(p.author_id)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{timeAgo(p.created_at)}</span>
                </div>
                {p.body ? <p style={{ fontSize: 15, marginTop: 8, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.body}</p> : null}
                {p.media_url ? (
                  isImg(p.media_url) ? (
                    <img src={p.media_url} alt="" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 10, display: "block" }} />
                  ) : (
                    <a href={p.media_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: 13, color: C.accent, wordBreak: "break-all" }}>
                      {p.media_url}
                    </a>
                  )
                ) : null}

                <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center" }}>
                  <button onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                    style={{ background: "transparent", color: C.muted, fontSize: 13, fontWeight: 500 }}>
                    {postComments.length ? `${postComments.length} comment${postComments.length === 1 ? "" : "s"}` : "Comment"}
                  </button>
                  {canDeletePost ? (
                    <button onClick={() => removePost(p.id)} style={{ background: "transparent", color: C.warn, fontSize: 13, fontWeight: 500 }}>
                      Delete
                    </button>
                  ) : null}
                </div>

                {showC ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                    {postComments.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
                        <div style={{ fontSize: 13.5 }}>
                          <strong style={{ fontWeight: 600 }}>{nameFor(c.author_id)}</strong>{" "}
                          <span style={{ color: C.ink }}>{c.body}</span>
                        </div>
                        {(isAdmin || c.author_id === me.id) ? (
                          <button onClick={() => removeComment(c.id)} style={{ background: "transparent", color: C.muted, fontSize: 11, flexShrink: 0 }}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <Input C={C} value={commentDraft[p.id] || ""} placeholder="Write a comment…"
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                        style={{ fontSize: 13.5 }} />
                      <Button C={C} onClick={() => addComment(p.id)} style={{ padding: "0 14px", fontSize: 13 }}>Send</Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
