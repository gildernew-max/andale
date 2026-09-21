import React from "react";
import {
  waitlistCta,
  waitlistError,
  waitlistPlaceholder,
  waitlistPrivacy,
  waitlistPrompt,
  waitlistSuccess,
} from "./waitlist.js";

const HUB_CREAM = "#F6EFE4";
const MARK_INK = "#5C7356";

/** Quiet cream field + outline CTA. Never the filled annual button. */
export function WaitlistStrip({
  uiLang,
  draft,
  note,
  ink,
  sub,
  onDraft,
  onSubmit,
  style,
}) {
  return (
    <form data-testid="soft-paywall-waitlist" noValidate onSubmit={onSubmit} style={{ margin: 0, textAlign: "center", ...style }}>
      <div data-testid="soft-paywall-waitlist-prompt" style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: sub, margin: "2px 0 8px" }}>
        {waitlistPrompt(uiLang)}
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        data-testid="soft-paywall-waitlist-email"
        aria-label={waitlistPlaceholder(uiLang)}
        placeholder={waitlistPlaceholder(uiLang)}
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        style={{
          display: "block", width: "100%", boxSizing: "border-box",
          background: HUB_CREAM, color: ink,
          border: "1px solid #C46B3A", borderRadius: 12,
          padding: "12px 12px", minHeight: 44,
          fontFamily: "inherit", fontWeight: 700, fontSize: 13,
        }}
      />
      <div data-testid="soft-paywall-waitlist-privacy" style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: sub, marginTop: 6 }}>
        {waitlistPrivacy(uiLang)}
      </div>
      <button type="submit" data-testid="soft-paywall-waitlist-submit"
        style={{
          display: "block", width: "100%", marginTop: 8,
          background: HUB_CREAM, color: MARK_INK,
          border: `1px solid ${MARK_INK}`, borderRadius: 12,
          padding: "11px 12px", minHeight: 44,
          fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, lineHeight: 1.35, cursor: "pointer",
        }}>
        {waitlistCta(uiLang)}
      </button>
      {note && (
        <div data-testid="soft-paywall-waitlist-note" role="status" style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: sub, marginTop: 8 }}>
          {note === "ok" ? waitlistSuccess(uiLang) : waitlistError(uiLang)}
        </div>
      )}
    </form>
  );
}
