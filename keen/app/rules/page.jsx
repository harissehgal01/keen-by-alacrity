"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "../../lib/supabaseClient";
import { useTheme, Fonts, Lockup, ThemeToggle, Card, Footer } from "../../lib/ui";
import { InstallPrompt } from "../../lib/auth";
import { DISPLAY, MONO, CATS, MAXDAY, RUPEES_PER_BUCK, WEEKLY_TIERS } from "../../lib/theme";

const ICONS = {
  coffee: "\u2615", chips: "\ud83c\udf5f", chocolate: "\ud83c\udf6b", candy: "\ud83c\udf6c",
  juice: "\ud83e\uddc3", soda: "\ud83e\udd64", ice: "\ud83c\udf66", pizza: "\ud83c\udf55",
  book: "\ud83d\udcda", pen: "\u270f\ufe0f", pencil: "\u270f\ufe0f", toy: "\ud83e\uddf8",
  ball: "\u26bd", game: "\ud83c\udfae", movie: "\ud83c\udfac", ticket: "\ud83c\udfab",
  speaker: "\ud83d\udd0a", headphone: "\ud83c\udfa7", watch: "\u231a", cap: "\ud83e\udde2",
};
const iconFor = (name) => {
  const key = Object.keys(ICONS).find((k) => name.toLowerCase().includes(k));
  return ICONS[key] || "\ud83c\udf81";
};

export default function Rules() {
  const { C, dark, setDark } = useTheme();
  const router = useRouter();
  const [rewards, setRewards] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb().auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await sb().from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile || profile.role === "pending") return router.replace(profile ? "/pending" : "/login");
      setIsAdmin(profile.role === "admin");
      const { data: rw } = await sb().from("rewards").select("*").eq("active", true).order("price_rupees");
      setRewards(rw || []);
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
          <Lockup C={C} sub="Rules & Store" />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle C={C} dark={dark} setDark={setDark} />
            <button onClick={() => router.push(isAdmin ? "/teacher" : "/me")}
              style={{ background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600 }}>
              Back
            </button>
          </div>
        </div>

        <h1 style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "18px 0 4px" }}>
          How Keen works
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>The rules of the weekly competition, and what's in the store.</p>

        <Card C={C} style={{ marginTop: 16 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Scoring each day</h3>
          <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Every class, you're scored 0–5 on six things. Each one counts differently:
          </p>
          {CATS.map((c) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 14.5 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{c.hint}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, flexShrink: 0, marginLeft: 10 }}>×{c.weight}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Perfect day</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: C.accent }}>{MAXDAY} points</span>
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            A bonus of up to ±10 can be added on top for something exceptional — or taken off.
          </p>
        </Card>

        <Card C={C} style={{ marginTop: 12 }}>
          <h3 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Winning the week</h3>
          <p style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Each week's placing is by <strong style={{ color: C.ink }}>average score per class</strong>, not the total —
            so it's fair whether you have 3 classes a week or 5. If two people tie for a place, they split that place's bucks evenly.
          </p>
          {WEEKLY_TIERS.map((t) => (
            <div key={t.place} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 14.5 }}>{t.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: C.accent }}>{t.bucks} bucks</span>
            </div>
          ))}
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
            1 Alacrity Buck = Rs {RUPEES_PER_BUCK}. Bucks never expire — save them up for something bigger.
          </p>
        </Card>

        <h2 style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", margin: "24px 0 0" }}>
          The store
        </h2>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "4px 0 0" }}>Spend your bucks on these.</p>

        {rewards.length === 0 ? (
          <Card C={C} style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13.5, color: C.muted }}>Nothing in the store right now.</p>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {rewards.map((r) => (
              <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 34, lineHeight: 1 }}>{iconFor(r.name)}</div>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 10 }}>{r.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent, marginTop: 4 }}>Rs {r.price_rupees}</div>
              </div>
            ))}
          </div>
        )}

        <InstallPrompt C={C} />
        <Footer C={C} />
      </div>
    </div>
  );
}
