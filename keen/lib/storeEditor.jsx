"use client";
import { useEffect, useRef, useState } from "react";
import { sb } from "./supabaseClient";
import { Card, Button, Input } from "./ui";
import { DISPLAY, MONO } from "./theme";

// Small square picture for a store item (shows a plain tile when there is no photo).
export function RewardThumb({ C, r, size = 48 }) {
  const box = { width: size, height: size, borderRadius: 10, flexShrink: 0, background: C.soft, border: `1px solid ${C.line}`, overflow: "hidden" };
  if (!r.image_url) return null;
  return <img src={r.image_url} alt={r.name} loading="lazy" style={{ ...box, objectFit: "cover", display: "block" }} />;
}

// Shrink photos so they upload fast. GIFs are left alone so they keep moving.
const shrink = (f) => new Promise((resolve) => {
  if (f.type === "image/gif" || f.size < 300 * 1024) return resolve(f);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => resolve(b ? new File([b], "item.jpg", { type: "image/jpeg" }) : f), "image/jpeg", 0.85);
  };
  img.onerror = () => resolve(f);
  img.src = URL.createObjectURL(f);
});

// Returns the editor's expiry (Date) if this login may edit the store right now, otherwise null.
export function useStoreEditor() {
  const [state, setState] = useState({ until: null, userId: null });
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await sb().auth.getSession();
        if (!session) return;
        const { data } = await sb().from("store_editors").select("expires_at")
          .eq("profile_id", session.user.id).gt("expires_at", new Date().toISOString()).maybeSingle();
        if (data?.expires_at) setState({ until: new Date(data.expires_at), userId: session.user.id });
      } catch (e) { /* not an editor */ }
    })();
  }, []);
  return state;
}

const untilLabel = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export function StoreEditor({ C, userId, until, onChanged }) {
  const [mine, setMine] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const pick = useRef(null);

  const load = async () => {
    const { data } = await sb().from("rewards").select("*").eq("created_by", userId).order("created_at", { ascending: false });
    setMine(data || []);
  };
  useEffect(() => { load(); }, [userId]);

  const choose = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please pick a picture.");
    if (f.size > 20 * 1024 * 1024) return setErr("That picture is too big. Pick a smaller one.");
    setErr(""); setFile(f); setPreview(URL.createObjectURL(f));
  };
  const clearFile = () => { setFile(null); setPreview(""); if (pick.current) pick.current.value = ""; };

  const add = async () => {
    const n = name.trim();
    const p = parseInt(price, 10);
    if (n.length < 2) return setErr("Give the item a name.");
    if (!p || p < 10 || p > 2000) return setErr("The price must be between Rs 10 and Rs 2000.");
    setBusy(true); setErr("");
    let image_url = null;
    if (file) {
      const up = await shrink(file);
      const ext = up.type === "image/gif" ? "gif" : up.type === "image/png" ? "png" : up.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb().storage.from("store").upload(path, up, { contentType: up.type, upsert: false });
      if (upErr) { setBusy(false); return setErr("The picture didn't upload. Check your connection and try again."); }
      image_url = sb().storage.from("store").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb().from("rewards").insert({ name: n, price_rupees: p, image_url, created_by: userId });
    setBusy(false);
    if (error) return setErr("That didn't save. Your editing time may be over, or try again.");
    setName(""); setPrice(""); clearFile();
    await load(); onChanged && onChanged();
  };

  const setActive = async (r, active) => {
    setErr("");
    const { error } = await sb().from("rewards").update({ active }).eq("id", r.id);
    if (error) return setErr("That didn't work. Try again.");
    await load(); onChanged && onChanged();
  };

  const live = mine.filter((r) => r.active);
  const removed = mine.filter((r) => !r.active);

  return (
    <Card C={C} style={{ marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "baseline", background: "transparent", padding: 0, color: C.ink, textAlign: "left" }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600 }}>Your store shelf</span>
        <span style={{ fontSize: 12.5, color: C.accent, fontWeight: 600 }}>{open ? "Close" : "Add items"}</span>
      </button>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
        You can add and remove your own items until {untilLabel(until)}.
      </div>

      {open ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
            <button onClick={() => pick.current && pick.current.click()} aria-label="Add a picture"
              style={{ width: 84, height: 84, borderRadius: 12, flexShrink: 0, border: `1.5px dashed ${C.line}`, background: preview ? "transparent" : C.soft, color: C.muted, fontSize: 12, overflow: "hidden", padding: 0 }}>
              {preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : "+ Photo"}
            </button>
            <input ref={pick} type="file" accept="image/*" onChange={choose} style={{ display: "none" }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <Input C={C} value={name} maxLength={60} placeholder="Item, e.g. Hot Cheetos" onChange={(e) => setName(e.target.value)} />
              <Input C={C} value={price} inputMode="numeric" placeholder="Price in Rs, e.g. 100"
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} style={{ fontFamily: MONO }} />
            </div>
          </div>
          {preview ? (
            <button onClick={clearFile} style={{ background: "transparent", color: C.muted, fontSize: 12, marginTop: 6, padding: 0 }}>Remove picture</button>
          ) : null}
          <Button C={C} onClick={add} disabled={busy} style={{ width: "100%", marginTop: 12, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Adding…" : "Add to the store"}
          </Button>
          {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 10 }}>{err}</div> : null}

          {live.length ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>In the store now</div>
              {live.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 10 }}>
                  {r.image_url ? <RewardThumb C={C} r={r} size={44} /> : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>Rs {r.price_rupees}</div>
                  </div>
                  <button onClick={() => setActive(r, false)}
                    style={{ background: "transparent", color: C.warn, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 500 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {removed.length ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Removed</div>
              {removed.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 13.5, color: C.muted }}>
                  <span style={{ flex: 1, textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <button onClick={() => setActive(r, true)} style={{ background: "transparent", color: C.accent, fontSize: 12.5, fontWeight: 500 }}>Put back</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
