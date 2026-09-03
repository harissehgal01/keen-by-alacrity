"use client";
import { useEffect, useState } from "react";
import { sb } from "./supabaseClient";
import { MONO } from "./theme";

export function GoogleButton({ C, label = "Continue with Google" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <>
      <button onClick={go} disabled={busy}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: C.surface, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 14,
          padding: "12px 20px", fontSize: 15, fontWeight: 500, opacity: busy ? 0.6 : 1,
        }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.4z"/>
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.4 46 24 46z"/>
          <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z"/>
          <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.8 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.1 12.2-9.1z"/>
        </svg>
        {busy ? "Opening Google…" : label}
      </button>
      {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 10 }}>{err}</div> : null}
    </>
  );
}

export function Divider({ C }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <span style={{ flex: 1, height: 1, background: C.line }} />
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>or</span>
      <span style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

// Android/Chrome fires beforeinstallprompt; iOS Safari never does, so it gets instructions.
export function InstallPrompt({ C }) {
  const [deferred, setDeferred] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) { setHidden(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ua = window.navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) setIosHint(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!deferred && !iosHint)) return null;

  return (
    <div style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginTop: 16 }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.deep }}>Keep Keen on your home screen</div>
      {deferred ? (
        <>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "6px 0 12px", lineHeight: 1.5 }}>
            Add it to your phone and it opens like an app, without the browser bar.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={async () => { deferred.prompt(); await deferred.userChoice; setDeferred(null); }}
              style={{ background: C.accent, color: C.onAccent, borderRadius: 14, padding: "10px 18px", fontSize: 14, fontWeight: 500 }}>
              Add to home screen
            </button>
            <button onClick={() => setHidden(true)}
              style={{ background: "transparent", color: C.muted, fontSize: 14, fontWeight: 500 }}>
              Not now
            </button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13.5, color: C.muted, margin: "6px 0 0", lineHeight: 1.55 }}>
          Tap the Share button at the bottom of Safari, then choose <strong style={{ color: C.ink }}>Add to Home Screen</strong>.
          Keen will then open like an app.
        </p>
      )}
    </div>
  );
}
