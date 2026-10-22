"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Input, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import { PushToggle, SendPush } from "../../lib/push";
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
  const [showLink, setShowLink] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [reactions, setReactions] = useState({});
  const [viewer, setViewer] = useState("");
  const fileRef = useRef(null);
  const [commentDraft, setCommentDraft] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, { data: allProfiles }, { data: c }, { data: r }] = await Promise.all([
      sb().from("feed_posts").select("*").order("created_at", { ascending: false }),
      sb().rpc("feed_profile_names"),
      sb().from("feed_comments").select("*").order("created_at", { ascending: true }),
      sb().from("feed_reactions").select("post_id, profile_id, emoji"),
    ]);
    const rmap = {};
    (r || []).forEach((x) => { (rmap[x.post_id] = rmap[x.post_id] || []).push(x); });
    setReactions(rmap);
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

  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => clearInterval(t);
  }, [loading, load]);

  const nameFor = (id) => profiles[id]?.full_name || "Someone";

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) return setErr("Pick a photo or a GIF.");
    if (f.size > 10 * 1024 * 1024) return setErr("That file is over 10 MB. Try a smaller one.");
    setErr(""); setFile(f); setPreview(URL.createObjectURL(f)); setMediaUrl(""); setShowLink(false);
  };
  const clearFile = () => { setFile(null); setPreview(""); };

  // Shrink big photos so they upload fast on mobile data. GIFs are left alone so they keep moving.
  const shrink = (f) => new Promise((resolve) => {
    if (f.type === "image/gif" || f.size < 600 * 1024) return resolve(f);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b ? new File([b], "photo.jpg", { type: "image/jpeg" }) : f), "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(f);
    img.src = URL.createObjectURL(f);
  });

  const post = async () => {
    const text = body.trim();
    let url = mediaUrl.trim();
    if (!text && !url && !file) return;
    setPosting(true); setErr("");
    if (file) {
      const up = await shrink(file);
      const ext = up.type === "image/gif" ? "gif" : up.type === "image/png" ? "png" : up.type === "image/webp" ? "webp" : "jpg";
      const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb().storage.from("feed").upload(path, up, { contentType: up.type, upsert: false });
      if (upErr) { setPosting(false); return setErr("The picture didn't upload. Check your connection and try again."); }
      url = sb().storage.from("feed").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb().from("feed_posts").insert({ author_id: me.id, body: text, media_url: url });
    setPosting(false);
    if (error) return setErr("That didn't post. Try again.");
    setBody(""); setMediaUrl(""); setShowLink(false); clearFile();
    await load();
  };

  const toggleReact = async (postId, emoji) => {
    const mine = (reactions[postId] || []).some((r) => r.profile_id === me.id && r.emoji === emoji);
    setReactions((all) => {
      const list = all[postId] || [];
      return { ...all, [postId]: mine ? list.filter((r) => !(r.profile_id === me.id && r.emoji === emoji)) : [...list, { post_id: postId, profile_id: me.id, emoji }] };
    });
    if (mine) await sb().from("feed_reactions").delete().match({ post_id: postId, profile_id: me.id, emoji });
    else await sb().from("feed_reactions").insert({ post_id: postId, profile_id: me.id, emoji });
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

  const isImg = (url) => /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(url) || /\/storage\/v1\/object\/public\/feed\//.test(url) || /giphy\.com\/media|tenor\.com\/.*\.gif/i.test(url);
  const EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\udd25", "\ud83d\udc4f", "\ud83d\ude2e"];

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
            <button onClick={() => router.push("/rules")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Rules</button>
            <button onClick={() => router.push("/updates")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>New</button>
            <button onClick={() => router.push("/ideas")} style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>Ideas</button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>
          Feed
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>Everyone in class can see and comment here.</p>
        <PushToggle C={C} />
        {isAdmin ? <SendPush C={C} /> : null}

        <Card C={C} style={{ marginTop: 16 }}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share something…"
            rows={3}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical" }} />
          {preview ? (
            <div style={{ position: "relative", marginTop: 10 }}>
              <img src={preview} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 10, display: "block" }} />
              <button onClick={clearFile} aria-label="Remove picture"
                style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 16, lineHeight: "30px" }}>
                {"\u00d7"}
              </button>
            </div>
          ) : null}
          {showLink && !file ? (
            <Input C={C} value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Paste an image or GIF link" style={{ marginTop: 8, fontSize: 13.5 }} />
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 8 }}>{err}</div> : null}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ background: C.soft, color: C.deep, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
                {"\ud83d\udcf7 Photo / GIF"}
              </button>
              {!file ? (
                <button onClick={() => setShowLink((v) => !v)}
                  style={{ background: "transparent", color: C.muted, borderRadius: 999, padding: "8px 10px", fontSize: 13, fontWeight: 500 }}>
                  {"\ud83d\udd17 Link"}
                </button>
              ) : null}
            </div>
            <Button C={C} onClick={post} disabled={posting} style={{ padding: "9px 18px", fontSize: 14, opacity: posting ? 0.6 : 1 }}>
              {posting ? (file ? "Uploading…" : "Posting…") : "Post"}
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
                    <img src={p.media_url} alt="" loading="lazy" onClick={() => setViewer(p.media_url)}
                      style={{ width: "100%", maxHeight: 460, objectFit: "cover", borderRadius: 10, marginTop: 10, display: "block", cursor: "zoom-in", background: C.surface2 }} />
                  ) : (
                    <a href={p.media_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: 13, color: C.accent, wordBreak: "break-all" }}>
                      {p.media_url}
                    </a>
                  )
                ) : null}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {EMOJIS.map((e) => {
                    const list = (reactions[p.id] || []).filter((r) => r.emoji === e);
                    const mine = list.some((r) => r.profile_id === me.id);
                    return (
                      <button key={e} onClick={() => toggleReact(p.id, e)}
                        title={list.map((r) => nameFor(r.profile_id)).join(", ")}
                        style={{ background: mine ? C.soft : "transparent", border: `1px solid ${mine ? C.accent : C.line}`, color: C.ink,
                          borderRadius: 999, padding: "4px 10px", fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{e}</span>{list.length ? <span style={{ fontFamily: MONO, fontSize: 11.5, color: mine ? C.deep : C.muted }}>{list.length}</span> : null}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 14, marginTop: 10, alignItems: "center" }}>
                  <button onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                    style={{ background: "transparent", color: C.muted, fontSize: 13, fontWeight: 500 }}>
                    {showC ? "Hide comments" : postComments.length ? `\ud83d\udcac ${postComments.length} comment${postComments.length === 1 ? "" : "s"}` : "\ud83d\udcac Comment"}
                  </button>
                  {canDeletePost ? (
                    <button onClick={() => removePost(p.id)} style={{ background: "transparent", color: C.warn, fontSize: 13, fontWeight: 500 }}>
                      Delete
                    </button>
                  ) : null}
                </div>

                {!showC && postComments.length ? (
                  <div style={{ marginTop: 8 }}>
                    {postComments.slice(-2).map((c) => (
                      <div key={c.id} style={{ fontSize: 13.5, marginTop: 4 }}>
                        <strong style={{ fontWeight: 600 }}>{nameFor(c.author_id)}</strong> <span>{c.body}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
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

        {viewer ? (
          <div onClick={() => setViewer("")}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
            <img src={viewer} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
          </div>
        ) : null}
        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
