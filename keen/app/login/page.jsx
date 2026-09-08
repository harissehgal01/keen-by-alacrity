"use client";
import { useState } from "react";
import Link from "next/link";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Input, Footer } from "../../lib/ui";
import { GoogleButton, Divider, InstallPrompt } from "../../lib/auth";
import { DISPLAY, MONO } from "../../lib/theme";

export default function Login() {
  const { C, dark, setDark } = useTheme();
  const [mode, setMode] = useState("email"); // "email" | "student"
  const [email, setEmail] = useState("");
  const [uname, setUname] = useState("");
  const [pin, setPin] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const studentSignIn = async () => {
    const u = uname.trim().toLowerCase();
    const p = pin.trim();
    if (!u || !p) return setErr("Enter your username and PIN.");
    setBusy(true); setErr("");
    const { data: loginEmail, error: lookupErr } = await sb().rpc("student_login_email", { p_username: u });
    if (lookupErr || !loginEmail) { setBusy(false); return setErr("That username isn't set up yet. Check with your teacher."); }
    const { error } = await sb().auth.signInWithPassword({ email: loginEmail, password: p });
    setBusy(false);
    if (error) setErr("Username or PIN is wrong. Check with your teacher.");
    else window.location.href = "/";
  };

  const send = async () => {
    const addr = email.trim().toLowerCase();
    if (!addr) return setErr("Enter your email address.");
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithOtp({
      email: addr,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setBusy(false);
    if (!error) return setSent(true);
    if (/rate|limit|too many/i.test(error.message)) {
      setErr("Too many sign-in emails have gone out in the last hour. Use Continue with Google instead, or try again shortly.");
    } else if (/signups not allowed|not found|invalid/i.test(error.message)) {
      setErr("No account found for that address. Register first.");
    } else {
      setErr(error.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Keen" />
          <ThemeToggle C={C} dark={dark} setDark={setDark} />
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "24px 0 0" }}>
          Sign in
        </h1>
        <p style={{ color: C.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
          Points and attendance for Alacrity Designs students.
        </p>

        <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
          {[["email", "Email"], ["student", "Student login"]].map(([k, l]) => (
            <button key={k} onClick={() => { setMode(k); setErr(""); }}
              style={{ flex: 1, background: mode === k ? C.accent : "transparent", color: mode === k ? C.onAccent : C.ink,
                border: `1px solid ${mode === k ? C.accent : C.line}`, borderRadius: 999, padding: "9px 0", fontSize: 13.5, fontWeight: 500 }}>
              {l}
            </button>
          ))}
        </div>

        {mode === "student" ? (
          <Card C={C} style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              For students without their own email. Ask your teacher for your username and PIN.
            </p>
            <label style={{ fontSize: 13.5, fontWeight: 600 }}>Username</label>
            <Input C={C} value={uname} onChange={(e) => setUname(e.target.value)} placeholder="e.g. haroon" style={{ marginTop: 6 }} />
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>PIN</label>
              <Input C={C} type="password" inputMode="numeric" value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && studentSignIn()}
                placeholder="1234" style={{ marginTop: 6 }} />
            </div>
            {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{err}</div> : null}
            <Button C={C} onClick={studentSignIn} disabled={busy} style={{ marginTop: 16, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </Card>
        ) : sent ? (
          <Card C={C} style={{ marginTop: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.accent }}>
              Check your inbox
            </div>
            <p style={{ fontSize: 15, marginTop: 10, lineHeight: 1.6 }}>
              A sign-in link is on its way to <strong>{email.trim()}</strong>. Open it on this device.
              If nothing arrives in a few minutes, check spam, or use Google instead.
            </p>
            <Button C={C} variant="secondary" onClick={() => setSent(false)}>Back</Button>
          </Card>
        ) : (
          <Card C={C} style={{ marginTop: 14 }}>
            <GoogleButton C={C} />
            <Divider C={C} />

            <label style={{ fontSize: 13.5, fontWeight: 600 }}>Email</label>
            <Input C={C} type="email" inputMode="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="you@example.com" style={{ marginTop: 6 }} />

            {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{err}</div> : null}

            <Button C={C} onClick={send} disabled={busy} style={{ marginTop: 16, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </Button>

            <p style={{ fontSize: 14, color: C.muted, marginTop: 18, textAlign: "center" }}>
              New here? <Link href="/signup" style={{ color: C.accent }}>Register</Link>
            </p>
          </Card>
        )}

        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
