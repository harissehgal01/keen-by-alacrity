"use client";
import { useState } from "react";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Input, Footer } from "../../lib/ui";
import { DISPLAY, MONO } from "../../lib/theme";

export default function Login() {
  const { C, dark, setDark } = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [child, setChild] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    const addr = email.trim().toLowerCase();
    if (!addr) return setErr("Enter your email address.");
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithOtp({
      email: addr,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: name.trim(), requested_student_name: child.trim() },
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
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
          Keen
        </h1>
        <p style={{ color: C.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
          Points and attendance for Alacrity Designs students. Sign in with your email — we'll send you a link,
          so there's no password to remember.
        </p>

        {sent ? (
          <Card C={C} style={{ marginTop: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.accent }}>
              Check your inbox
            </div>
            <p style={{ fontSize: 15, marginTop: 10, lineHeight: 1.6 }}>
              A sign-in link is on its way to <strong>{email.trim()}</strong>. Open it on this device.
              If it hasn't arrived in a couple of minutes, check your spam folder.
            </p>
            <Button C={C} variant="secondary" onClick={() => setSent(false)} style={{ marginTop: 6 }}>
              Use a different email
            </Button>
          </Card>
        ) : (
          <Card C={C} style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13.5, fontWeight: 600 }}>Your email</label>
            <Input C={C} type="email" inputMode="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ marginTop: 6 }} />

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>Your name</label>
              <Input C={C} value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" style={{ marginTop: 6 }} />
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>Which student are you?</label>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                Students: your own name. Parents: your child's name. Your teacher checks this before your account is opened.
              </div>
              <Input C={C} value={child} onChange={(e) => setChild(e.target.value)} placeholder="Student's name" style={{ marginTop: 6 }} />
            </div>

            {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 12 }}>{err}</div> : null}

            <Button C={C} onClick={send} disabled={busy} style={{ marginTop: 18, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </Card>
        )}

        <Footer C={C} />
      </div>
    </div>
  );
}
