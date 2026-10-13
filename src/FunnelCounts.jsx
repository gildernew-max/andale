/** Hidden device log. Not linked from the app. Open with #funnel. */

import { useState } from "react";
import { dayKeyFromDate } from "./firstDoor.js";
import { FUNNEL_STORE_KEY } from "./funnel.js";
import { FUNNEL_COUNT_ROWS, funnelDayCounts, readStoredFunnelLog } from "./funnelCounts.js";

const LIGHT = {
  page: "#F6EFE4",
  card: "#FFFFFF",
  ink: "#3C3C3C",
  sub: "#6B6258",
  line: "#E5E5E5",
};
const DARK = {
  page: "#15171C",
  card: "#1E2128",
  ink: "#F6EFE4",
  sub: "#CDBBA6",
  line: "#2A2E36",
};

function savedTheme() {
  try {
    const raw = localStorage.getItem("andale-v3");
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && saved.theme === "dark") return "dark";
    if (saved && saved.theme === "light") return "light";
  } catch {
    /* fall through */
  }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* light */
  }
  return "light";
}

export default function FunnelCounts() {
  const [mode, setMode] = useState(savedTheme);
  const [log] = useState(() => readStoredFunnelLog(typeof localStorage === "undefined" ? null : localStorage));
  const paint = mode === "dark" ? DARK : LIGHT;
  const today = dayKeyFromDate(new Date());
  const days = funnelDayCounts(log.events, today);
  const past = days.filter((row) => !row.today);

  return (
    <main
      data-testid="funnel-counts"
      data-mode={mode}
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        background: paint.page,
        color: paint.ink,
        fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif",
        padding: "20px 16px 40px",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, lineHeight: 1.2, margin: 0, fontWeight: 900 }}>Funnel counts</h1>
          <div role="group" aria-label="Color mode" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {["light", "dark"].map((choice) => (
              <button
                key={choice}
                type="button"
                data-testid={`funnel-mode-${choice}`}
                aria-pressed={mode === choice}
                onClick={() => setMode(choice)}
                style={{
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: 12,
                  borderRadius: 999,
                  border: `1.5px solid ${paint.line}`,
                  background: mode === choice ? paint.card : "transparent",
                  color: paint.ink,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                {choice === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <p data-testid="funnel-scope" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 700, color: paint.sub, margin: "12px 0 0" }}>
          This browser only. Counts come from localStorage key {FUNNEL_STORE_KEY} on this device. Other phones are not here, and the live site is not here. Nothing is sent.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 700, color: paint.sub, margin: "8px 0 0" }}>
          Lectura win is the chapter claim (lectura_chapter_done). Locked story · day 1 is also inside the locked story row. Timed stays at 0 until a wall opens from somewhere other than a win or a locked story.
        </p>
        {!log.readable && (
          <p data-testid="funnel-unreadable" style={{ fontSize: 14, fontWeight: 800, margin: "12px 0 0" }}>
            This browser did not keep a readable log. The counts below are empty.
          </p>
        )}
        {days.map((bucket) => (
          <section
            key={bucket.day}
            data-testid="funnel-day"
            data-day={bucket.day}
            style={{
              marginTop: 16,
              background: paint.card,
              border: `1px solid ${paint.line}`,
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <h2 style={{ fontSize: 15, margin: "0 0 10px", fontWeight: 900 }}>
              {bucket.today ? `Today · ${bucket.day}` : bucket.day}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px 12px", alignItems: "baseline" }}>
              {FUNNEL_COUNT_ROWS.map((row) => (
                <div key={row.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>{row.label}</div>
                  <div
                    data-testid={`funnel-count-${bucket.day}-${row.id}`}
                    style={{ fontSize: 16, fontWeight: 900, fontVariantNumeric: "tabular-nums", textAlign: "right" }}
                  >
                    {bucket.counts[row.id]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {past.length === 0 && (
          <p data-testid="funnel-no-past" style={{ fontSize: 13, fontWeight: 800, color: paint.sub, margin: "12px 0 0" }}>
            No earlier days on this device.
          </p>
        )}
      </div>
    </main>
  );
}
