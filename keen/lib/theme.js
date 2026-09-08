// Alacrity Designs tokens — Sea teal accent
export const LIGHT = {
  bg: "#F1F3F1", surface: "#FFFFFF", surface2: "#FAFBFA", line: "#E0E4E1",
  ink: "#0E1413", muted: "#586863", accent: "#0A6E7A", deep: "#054750",
  soft: "#E1EFF1", onAccent: "#FFFFFF", warn: "#A6392C", absentBg: "#F6E7E4",
  dim: "#C3CCC8", mark: "/mark-dark.png",
};
export const DARK = {
  bg: "#0B0F0E", surface: "#121817", surface2: "#0F1413", line: "#1F2826",
  ink: "#ECEFED", muted: "#8A9893", accent: "#2DC8D4", deep: "#63DCE5",
  soft: "#122123", onAccent: "#042226", warn: "#F2836F", absentBg: "#2A1A17",
  dim: "#3A4643", mark: "/mark-light.png",
};

export const DISPLAY = "'Outfit', sans-serif";
export const BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'Space Mono', monospace";

export const CATS = [
  { key: "work", label: "Work completed", weight: 3, hint: "Tasks finished today" },
  { key: "behaviour", label: "Behaviour", weight: 2, hint: "Respect, listening, calm" },
  { key: "obedience", label: "Follows instructions", weight: 1, hint: "Does what's asked, first time" },
  { key: "phone", label: "Phone put away", weight: 1, hint: "5 = never out, 0 = out all lesson" },
  { key: "seat", label: "Stays at desk", weight: 1, hint: "Asks before leaving the table" },
  { key: "homework", label: "Homework", weight: 1, hint: "Completed the set homework" },
  { key: "punctuality", label: "Punctuality", weight: 1, hint: "On time, prepared to start" },
];
// Weights sum to 10, so a perfect day is exactly 50 - bonus (up to 10) sits outside that.
export const MAXDAY = CATS.reduce((a, c) => a + c.weight * 5, 0);
export const BLANK = { work: 0, behaviour: 0, obedience: 0, phone: 0, seat: 0, homework: 0, punctuality: 0, bonus: 0 };
export const points = (r) => CATS.reduce((a, c) => a + (r?.[c.key] || 0) * c.weight, 0) + (r?.bonus || 0);

export const BUCKS_PER_WEEK = 10;
export const RUPEES_PER_BUCK = 50;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const pretty = (s) => { const d = fromIso(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const nextDay = (s) => {
  const d = fromIso(s);
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
};

export const mondayOf = (s) => {
  const d = fromIso(s);
  return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
};

export function monthGrid(y, m) {
  const first = new Date(y, m, 1);
  const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: iso(d), inMonth: d.getMonth() === m, dom: d.getDate(), dow: d.getDay() };
  });
}
