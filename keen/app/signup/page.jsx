"use client";
import { useState } from "react";
import Link from "next/link";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Input, Footer } from "../../lib/ui";
import { GoogleButton, Divider, InstallPrompt } from "../../lib/auth";
import { DISPLAY, MONO } from "../../lib/theme";

export default function Signup() {
  const { C, dark, setDark } = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [child, setChild] = useState("");
  const [who, setWho] = useState("student");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    const addr = email.trim().toLowerCase();
    if (!addr) return setErr("Enter your email address.");
    if (!child.trim()) return setErr("Enter the student's name so your teacher knows who you are.");
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithOtp({
      email: addr,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: {
          full_name: name.trim(),
          requested_student_name: child.trim(),
          requested_role: who,
        },
      },
    });
    setBusy(false);
    if (!error) return setSent(true);
    if (/rate|limit|too many/i.test(error.message)) {
      setErr("Too many registration emails have gone out in the last hour. Use Continue with Google instead, or try again shortly.");
    } else {
      setErr(error.message);
    }
  };

  const pill = (active) => ({
    flex: 1, background: active ? C.accent : "transparent", color: active ? C.onAccent : C.ink,
    border: `1px solid ${active ? C.accent : C.line}`, borderRadius: 999,
    padding: "10px 0", fontSize: 14, fontWeight: 500,
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Keen" />
          <ThemeToggle C={C} dark={dark} setDark={setDark} />
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "24px 0 0" }}>
          Register
        </h1>
        <p style={{ color: C.muted, fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
          Create your account, then Haris confirms who you are before any scores appear.
        </p>

        {sent ? (
          <Card C={C} style={{ marginTop: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.accent }}>
              Check your inbox
            </div>
            <p style={{ fontSize: 15, marginTop: 10, lineHeight: 1.6 }}>
              A link is on its way to <strong>{email.trim()}</strong>. Open it on this device to finish registering.
              You'll then wait for approval.
            </p>
            <Button C={C} variant="secondary" onClick={() => setSent(false)}>Back</Button>
          </Card>
        ) : (
          <Card C={C} style={{ marginTop: 20 }}>
            <GoogleButton C={C} label="Register with Google" />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              If you register with Google, tell Haris which student you are so he can link your account.
            </div>
            <Divider C={C} />

            <label style={{ fontSize: 13.5, fontWeight: 600 }}>I am the…</label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setWho("student")} style={pill(who === "student")}>Student</button>
              <button onClick={() => setWho("parent")} style={pill(who === "parent")}>Parent</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>Your name</label>
              <Input C={C} value={name} onChange={(e) => setName(e.target.value)}
                placeholder="First and last name" style={{ marginTop: 6 }} />
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>
                {who === "student" ? "Your name as your teacher writes it" : "Your child's name"}
              </label>
              <Input C={C} value={child} onChange={(e) => setChild(e.target.value)}
                placeholder="Student's name" style={{ marginTop: 6 }} />
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13.5, fontWeight: 600 }}>Email</label>
              <Input C={C} type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="you@example.com" style={{ marginTop: 6 }} />
            </div>

            {err ? <div style={{ color: C.warn, fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{err}</div> : null}

            <Button C={C} onClick={send} disabled={busy} style={{ marginTop: 18, width: "100%", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending…" : "Register"}
            </Button>

            <p style={{ fontSize: 14, color: C.muted, marginTop: 18, textAlign: "center" }}>
              Already registered? <Link href="/login" style={{ color: C.accent }}>Sign in</Link>
            </p>
          </Card>
        )}

        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
