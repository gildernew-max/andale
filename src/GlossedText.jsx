import React, { useEffect, useId, useRef, useState } from "react";
import { lookupGloss, segmentGlossText } from "./storyGloss.js";

/** One-line gloss near a stamped word. Tap / hover / keyboard focus. */
export function GlossWord({ token, uiLang, D, accent, onActivate }) {
  const hit = lookupGloss(token, uiLang);
  const tipId = useId();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const focused = useRef(false);
  const sticky = useRef(false);

  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
  };

  const show = () => {
    place();
    setOpen(true);
  };

  const hide = () => {
    if (focused.current || sticky.current) return;
    setOpen(false);
  };

  const dismiss = () => {
    focused.current = false;
    sticky.current = false;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) dismiss();
    };
    const onKey = (e) => {
      if (e.key === "Escape") dismiss();
    };
    const onScroll = () => {
      dismiss();
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (!hit) return token;

  const activate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate?.(hit);
    if (sticky.current && open) {
      dismiss();
    } else {
      sticky.current = true;
      show();
    }
  };

  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        data-testid="gloss-word"
        data-gloss-key={hit.key}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") activate(e);
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={() => { focused.current = true; show(); }}
        onBlur={() => { focused.current = false; setOpen(false); }}
        style={{
          cursor: "pointer",
          borderRadius: 4,
          padding: "0 1px",
          background: open ? "#FFE9A8" : "transparent",
          borderBottom: `2px dotted ${accent || D.blue}66`,
          color: "inherit",
          font: "inherit",
          fontWeight: "inherit",
        }}
      >
        {token}
      </span>
      {open && (
        <span
          role="tooltip"
          id={tipId}
          data-testid="gloss-tip"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateX(-50%)",
            zIndex: 40,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            maxWidth: "min(280px, 90vw)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            background: D.card,
            color: D.ink,
            border: `1.5px solid ${D.line}`,
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.3,
            boxShadow: "0 4px 12px rgba(0,0,0,.12)",
          }}
        >
          {hit.gloss}
        </span>
      )}
    </span>
  );
}

/** Wrap a string so only stamped words become gloss targets. */
export function GlossedText({ text, uiLang, D, accent, onActivate }) {
  return segmentGlossText(text).map((seg, i) => {
    if (/^\s+$/.test(seg.raw) || !seg.raw) return seg.raw;
    if (!seg.key) return <span key={i}>{seg.raw}</span>;
    return (
      <GlossWord
        key={i}
        token={seg.raw}
        uiLang={uiLang}
        D={D}
        accent={accent}
        onActivate={onActivate}
      />
    );
  });
}
