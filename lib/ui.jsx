"use client";
import { useState, useEffect } from "react";
import { LIGHT, DARK, DISPLAY, MONO, MONTHS, monthGrid, iso } from "./theme";

export function useTheme() {
  const [dark, setDark] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (!touched) setDark(mq.matches);
      const on = (e) => { if (!touched) setDark(e.matches); };
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    } catch (e) {}
  }, [touched]);
  const C = dark ? DARK : LIGHT;
  return { C, dark, setDark: (v) => { setTouched(true); setDark(v); } };
}

export function Fonts({ C }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@300..800&family=Space+Mono:wght@400;700&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      body { margin: 0; }
      button { font-family: inherit; cursor: pointer; border: none; }
      button:focus-visible, input:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
      .bar { transition: width .4s cubic-bezier(.2,.8,.2,1); }
      @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
    `}</style>
  );
}

export function Lockup({ C, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <img src={C.mark} alt="Alacrity Designs" style={{ height: 28, width: "auto", display: "block" }} />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: C.ink }}>
          Alacrity Designs
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted, marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

export function ThemeToggle({ C, dark, setDark }) {
  return (
    <button onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ background: "transparent", border: `1px solid ${C.line}`, borderRadius: 999, color: C.muted, width: 34, height: 34, fontSize: 14, lineHeight: 1 }}>
      {dark ? "\u2600" : "\u263e"}
    </button>
  );
}

export function Footer({ C }) {
  return (
    <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.muted }}>
        Keen by Alacrity
      </span>
      <span style={{ fontSize: 14 }}>
        <a href="https://alacritydesigns.com" style={{ color: C.accent, textDecoration: "none" }}>alacritydesigns.com</a>
        <span style={{ color: C.muted }}> · </span>
        <a href="mailto:connect@alacritydesigns.com" style={{ color: C.accent, textDecoration: "none" }}>connect@alacritydesigns.com</a>
      </span>
    </div>
  );
}

export function Card({ C, children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

export function Stat({ C, label, value, big }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 12px 14px" }}>
      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.3, minHeight: 26 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: big ? 26 : 18, fontWeight: 700, color: big ? C.accent : C.ink }}>{value}</div>
    </div>
  );
}

export function Calendar({ C, cursor, setCursor, date, onPick, marks }) {
  const cells = monthGrid(cursor.y, cursor.m);
  const today = iso(new Date());
  const nav = (dir) => setCursor(({ y, m }) => {
    const n = m + dir;
    return n < 0 ? { y: y - 1, m: 11 } : n > 11 ? { y: y + 1, m: 0 } : { y, m: n };
  });
  const navBtn = { background: C.surface, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, width: 34, height: 34, fontSize: 12 };
  return (
    <Card C={C} style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => nav(-1)} style={navBtn} aria-label="Previous month">◀</button>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600 }}>{MONTHS[cursor.m]} {cursor.y}</div>
        <button onClick={() => nav(1)} style={navBtn} aria-label="Next month">▶</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 14 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.muted }}>{d}</div>
        ))}
        {cells.map((c) => {
          const sel = c.date === date;
          const mark = marks ? marks(c.date) : null;
          const weekend = c.dow === 0 || c.dow === 6;
          return (
            <button key={c.date} onClick={() => onPick(c.date)}
              style={{
                aspectRatio: "1", background: sel ? C.accent : mark?.bg || "transparent",
                color: sel ? C.onAccent : c.inMonth ? (weekend ? C.muted : C.ink) : C.dim,
                border: `1px solid ${sel ? C.accent : c.date === today ? C.accent : "transparent"}`,
                borderRadius: 10, fontSize: 13.5, fontWeight: sel || c.date === today ? 600 : 400,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 0,
              }}>
              {c.dom}
              <span style={{ width: 4, height: 4, borderRadius: 999, background: mark?.dot ? (sel ? C.onAccent : mark.dot) : "transparent" }} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function ScoreRow({ C, label, hint, value, weight, max, signed, onMinus, onPlus }) {
  const step = { background: C.soft, color: C.deep, borderRadius: 8, width: 36, height: 36, fontSize: 18, lineHeight: 1, fontWeight: 600, flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{hint}</div>
        {weight ? (
          <div style={{ fontFamily: MONO, fontSize: 11, color: value ? C.accent : C.muted, marginTop: 3 }}>
            {value} × {weight} = {value * weight} pts
          </div>
        ) : null}
      </div>
      <button onClick={onMinus} style={step} aria-label={`Subtract from ${label}`}>−</button>
      <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, width: 34, textAlign: "center", color: value < 0 ? C.warn : C.ink }}>
        {signed && value > 0 ? `+${value}` : value}
        {max ? <span style={{ color: C.muted, fontSize: 11 }}>/{max}</span> : null}
      </span>
      <button onClick={onPlus} style={step} aria-label={`Add to ${label}`}>+</button>
    </div>
  );
}

export function Button({ C, children, onClick, variant = "primary", style, ...rest }) {
  const base = { borderRadius: 14, padding: "12px 20px", fontSize: 15, fontWeight: 500 };
  const looks = variant === "primary"
    ? { background: C.accent, color: C.onAccent }
    : { background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  return <button onClick={onClick} style={{ ...base, ...looks, ...style }} {...rest}>{children}</button>;
}

export function Input({ C, style, ...rest }) {
  return (
    <input {...rest} style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink,
      padding: "10px 12px", fontSize: 16, fontFamily: "inherit", width: "100%", ...style,
    }} />
  );
}
