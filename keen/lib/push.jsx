"use client";
import { useEffect, useState } from "react";
import { sb } from "./supabaseClient";

const VAPID_PUBLIC = "BMB-ommNfL69HclaK6rpvb_YRaA-u2yJpIgxsHabYwzKqX1v8A_onammlBnALIWtnhYMvKEdjtlW0q9XhFf5FEI";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function saveSubscription(sub) {
  const { data: { session } } = await sb().auth.getSession();
  if (!session) return false;
  const j = sub.toJSON();
  await sb().from("push_subscriptions").delete().eq("endpoint", j.endpoint);
  const { error } = await sb().from("push_subscriptions").insert({
    profile_id: session.user.id, endpoint: j.endpoint,
    p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200),
  });
  return !error;
}

// States: loading | unsupported | needs-install | off | on | denied
export function PushToggle({ C }) {
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (!supported) return setState(ios && !standalone ? "needs-install" : "unsupported");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (Notification.permission === "denied") return setState("denied");
        const existing = await reg.pushManager.getSubscription();
        if (existing && Notification.permission === "granted") {
          await saveSubscription(existing); // keep the stored copy fresh
          return setState("on");
        }
        setState("off");
      } catch (e) { setState("unsupported"); }
    })();
  }, []);

  const enable = async () => {
    setBusy(true); setErr("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setBusy(false); return setState(perm === "denied" ? "denied" : "off"); }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
      const ok = await saveSubscription(sub);
      if (!ok) throw new Error("save failed");
      setState("on");
    } catch (e) {
      setErr("Couldn't turn notifications on. Try again, or reopen Keen from your home screen.");
    }
    setBusy(false);
  };

  if (state === "loading" || state === "unsupported") return null;

  const box = { background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginTop: 12 };

  if (state === "on") {
    return <div style={{ ...box, fontSize: 13.5, color: C.deep }}>{"\u{1F514}"} Notifications are on. You'll hear from your teacher here.</div>;
  }
  if (state === "needs-install") {
    return <div style={{ ...box, fontSize: 13.5, color: C.deep, lineHeight: 1.5 }}>{"\u{1F514}"} To get notifications, open Keen from your home screen icon, not from Safari.</div>;
  }
  if (state === "denied") {
    return <div style={{ ...box, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Notifications are blocked for Keen. Turn them on in your phone's Settings, under Notifications, then reopen Keen.</div>;
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.deep }}>{"\u{1F514}"} Turn on notifications</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Get reminders about homework, reading and weekly results.</div>
      <button onClick={enable} disabled={busy}
        style={{ marginTop: 10, background: C.accent, color: C.onAccent, borderRadius: 999, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Turning on\u2026" : "Turn on"}
      </button>
      {err ? <div style={{ color: C.warn, fontSize: 12.5, marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}

// Admin: send a notification to every device that has turned them on.
export function SendPush({ C }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [count, setCount] = useState(null);

  const loadCount = async () => {
    const { count: n } = await sb().from("push_subscriptions").select("id", { count: "exact", head: true });
    setCount(n ?? 0);
  };
  useEffect(() => { loadCount(); }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) return setResult("Add a title and a message first.");
    setBusy(true); setResult("");
    const { data, error } = await sb().functions.invoke("send-push", { body: { title: title.trim(), body: body.trim() } });
    setBusy(false);
    if (error || data?.error) return setResult("Didn't send: " + (data?.error || error.message));
    setResult(`Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}` + (data.failed ? `, ${data.failed} failed` : "") + ".");
    setTitle(""); setBody(""); loadCount();
  };

  const input = { width: "100%", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, padding: "10px 12px", fontSize: 15, fontFamily: "inherit" };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginTop: 12 }}>
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Send a notification</h3>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
        {count === null ? "Checking devices\u2026" : `${count} device${count === 1 ? " has" : "s have"} notifications on.`}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={60} style={{ ...input, marginTop: 12 }} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={3} maxLength={180}
        style={{ ...input, marginTop: 8, resize: "vertical" }} />
      <button onClick={send} disabled={busy}
        style={{ width: "100%", marginTop: 10, background: C.accent, color: C.onAccent, borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
        {busy ? "Sending\u2026" : "Send to everyone"}
      </button>
      {result ? <div style={{ fontSize: 13, color: result.startsWith("Didn't") ? C.warn : C.deep, marginTop: 10 }}>{result}</div> : null}
    </div>
  );
}
