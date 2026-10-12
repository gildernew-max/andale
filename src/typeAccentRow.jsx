import { useLayoutEffect, useRef, useState } from "react";
import {
  ACCENT_KEY_GAP,
  ACCENT_KEY_MIN,
  ACCENT_ROW_FOOTER_GAP,
  typeAccentContentWidth,
  typeAccentRows,
} from "./typeAccentRow.js";

/**
 * Accent keys for type / listen / transform. Same tile face as before.
 * Narrow phones split 5 then 4. The bottom pad is the clearance that lets
 * the lesson body scroll the keys fully above the pinned check footer.
 */
export function TypeAccentRow({ disabled, onInsert, keyStyle }) {
  const ref = useRef(null);
  const [measured, setMeasured] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const next = el.clientWidth;
      if (next > 0) setMeasured((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    };
    read();
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    obs?.observe(el);
    window.addEventListener("resize", read);
    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);

  const width = measured > 0
    ? measured
    : typeAccentContentWidth(typeof window !== "undefined" ? window.innerWidth : 0);
  const rows = typeAccentRows(width);

  return (
    <div
      ref={ref}
      data-testid="type-accent-row"
      style={{ marginTop: 10, paddingBottom: ACCENT_ROW_FOOTER_GAP, width: "100%", boxSizing: "border-box" }}
    >
      <div data-testid="type-accent-keys" style={{ display: "grid", gap: ACCENT_KEY_GAP }}>
        {rows.map((line) => (
          <div
            key={line.join("")}
            data-testid="type-accent-line"
            style={{ display: "flex", flexWrap: "nowrap", gap: ACCENT_KEY_GAP, justifyContent: "flex-start" }}
          >
            {line.map((ch) => (
              <button
                type="button"
                key={ch}
                data-testid="type-accent-key"
                onClick={() => onInsert(ch)}
                disabled={disabled}
                className="tile"
                style={{
                  boxSizing: "border-box",
                  minWidth: ACCENT_KEY_MIN,
                  minHeight: ACCENT_KEY_MIN,
                  flex: "0 0 auto",
                  padding: "4px 11px",
                  fontSize: 15,
                  ...keyStyle,
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
