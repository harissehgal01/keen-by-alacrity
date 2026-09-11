"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import { DISPLAY, MONO } from "../../lib/theme";

const UPDATES = [
  {
    emoji: "\ud83d\udd11", title: "New way to sign in",
    body: "Haroon and Abdullah now have their own usernames and PINs \u2014 no email needed. Ask your teacher if you need one set up too.",
  },
  {
    emoji: "\ud83d\udce3", title: "The Feed",
    body: "A shared space where everyone can post, share pictures and GIFs, and comment on each other's stuff. Everyone in class can see what's posted.",
  },
  {
    emoji: "\u2696\ufe0f", title: "Fairer scoring",
    body: "Some of you have 3, 4, or 5 classes a week \u2014 that shouldn't decide who wins. Winners are now picked by your average score per class, not the total, so everyone has an equal shot no matter how many classes you have.",
  },
];

const TIERS = [
  { medal: "\ud83e\udd47", label: "1st place", bucks: 10 },
  { medal: "\ud83e\udd48", label: "2nd place", bucks: 6 },
  { medal: "\ud83e\udd49", label: "3rd place", bucks: 2 },
];

export default function Updates() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb().from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile || profile.role === "pending") return router.replace(profile ? "/pending" : "/login");
      setIsAdmin(profile.role === "admin");
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Fonts C={C} />Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif" }}>
      <Fonts C={C} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Lockup C={C} sub="What's new" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push(isAdmin ? "/teacher" : "/me")}
              style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>
              Back
            </button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>
          What's new this week
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>A few new things landed in Keen. Here's everything that changed.</p>

        {UPDATES.map((u) => (
          <Card key={u.title} C={C} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{u.emoji}</span>
              <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>{u.title}</h3>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{u.body}</p>
          </Card>
        ))}

        <Card C={C} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>\ud83c\udfc6</span>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>Three places win now, not just one</h3>
          </div>
          {TIERS.map((t, i) => (
            <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}`, fontSize: 14.5 }}>
              <span>{t.medal} {t.label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{t.bucks} bucks</span>
            </div>
          ))}
          <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>
            1 Alacrity Buck = Rs 50. If two people tie for a place, they split it evenly.
          </p>
        </Card>

        <Card C={C} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>\ud83c\udf81</span>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>The Store</h3>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            Spend your Alacrity Bucks on real things \u2014 coffee, chips, and more. Can't afford something yet? Tap{" "}
            <strong>"Save for this"</strong> and watch your progress toward it.
          </p>
          <div style={{ marginTop: 10 }}>
            <span style={{ display: "inline-block", background: C.soft, color: C.deep, fontFamily: MONO, fontSize: 11, letterSpacing: ".05em", padding: "3px 10px", borderRadius: 999, marginRight: 6, marginTop: 8 }}>
              \u2615 Coffee \u00b7 Rs 750
            </span>
            <span style={{ display: "inline-block", background: C.soft, color: C.deep, fontFamily: MONO, fontSize: 11, letterSpacing: ".05em", padding: "3px 10px", borderRadius: 999, marginRight: 6, marginTop: 8 }}>
              \ud83c\udf5f Chips \u00b7 Rs 100
            </span>
          </div>
        </Card>

        <Card C={C} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>\ud83d\udcc5</span>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>Homework with real dates</h3>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            Homework now shows when it was set and when it's due, right on the day it belongs to. Your teacher marks it Not done, Partial, or Done.
          </p>
        </Card>

        <Card C={C} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>\ud83d\udcd6</span>
            <h3 style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, margin: 0 }}>New: Rules & Store page</h3>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            Everything above, laid out in one place \u2014 how scoring works, how winning works, and what's in the store. Find it from the "Rules" link at the top of Keen.
          </p>
        </Card>

        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
