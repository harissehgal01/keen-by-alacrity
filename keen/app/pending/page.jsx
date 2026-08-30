"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Button, Footer } from "../../lib/ui";
import { DISPLAY, MONO } from "../../lib/theme";

export default function Pending() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      setEmail(session.user.email);
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role === "admin") router.replace("/teacher");
      if (profile?.role === "student" || profile?.role === "parent") router.replace("/me");
    })();
  }, [router]);

  const signOut = async () => { await sb().auth.signOut(); router.replace("/login"); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="Keen" />
          <ThemeToggle C={C} dark={dark} setDark={setDark} />
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "24px 0 0" }}>
          Waiting for approval
        </h1>

        <Card C={C} style={{ marginTop: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>
            Signed in as
          </div>
          <div style={{ fontSize: 16, marginTop: 6 }}>{email}</div>
          <p style={{ fontSize: 14.5, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
            Your account is created, but Haris needs to confirm who you are and link you to the right student
            before any scores are visible. You'll see the card as soon as that's done — just sign in again later.
          </p>
          <Button C={C} variant="secondary" onClick={signOut} style={{ marginTop: 6 }}>Sign out</Button>
        </Card>

        <Footer C={C} />
      </div>
    </div>
  );
}
