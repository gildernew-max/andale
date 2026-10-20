/** Perfil reservation row (Varys walk Oct 20: the reserve left no trace).
 *  One quiet row, cream on light / dark sheet on dark. No lime, no badge, no bird.
 *  Change reuses the reserve email field, «Reservar» and «Revisa el correo.». Device only. */
import { useState } from "react";
import { reserveWords, perfilReserveLine, readReservation, updateReservationEmail, removeReservation } from "./reserveAnnual.js";
import { isWaitlistEmail } from "./waitlist.js";

export default function PerfilReservation({ uiLang, theme }) {
  const [res, setRes] = useState(() => readReservation());
  const [mode, setMode] = useState("view"); // view | edit | confirm
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  if (!res) return null;
  const dark = theme === "dark";
  const rw = reserveWords(uiLang);
  const w = rw.perfil;
  const ink = dark ? "#F6EFE4" : "#1F3A1A";
  const quiet = dark ? "#CDBBA6" : "#6B6258";
  const line = dark ? "#CDBBA6" : "#1F3A1A";
  const link = { background: "none", border: "none", padding: "8px 0", minHeight: 36, color: ink, fontFamily: "inherit", fontWeight: 800, fontSize: 14, textDecoration: "underline", cursor: "pointer" };
  const outlineBtn = { flex: 1, height: 44, borderRadius: 14, border: `2px solid ${line}`, background: "none", color: ink, fontFamily: "inherit", fontWeight: 900, fontSize: 15, cursor: "pointer" };
  const save = (e) => {
    e.preventDefault();
    if (!isWaitlistEmail(email) || !updateReservationEmail(email.trim())) { setInvalid(true); return; }
    setRes(readReservation()); setMode("view"); setInvalid(false);
  };
  return (
    <div data-testid="perfil-reservation" style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 16, border: `2px solid ${dark ? "#3A3D45" : "#E6DCCB"}`, background: dark ? "#1E2026" : "#F6EFE4", color: ink }}>
      <div data-testid="perfil-reservation-title" style={{ fontWeight: 900, fontSize: 15 }}>{w.title}</div>
      <div data-testid="perfil-reservation-line" style={{ fontWeight: 700, fontSize: 13, color: quiet, marginTop: 2, overflowWrap: "anywhere" }}>{perfilReserveLine(uiLang, res.email)}</div>
      {mode === "view" && (
        <div style={{ display: "flex", gap: 18 }}>
          <button type="button" data-testid="perfil-reservation-change" style={link} onClick={() => { setEmail(res.email); setInvalid(false); setMode("edit"); }}>{w.change}</button>
          <button type="button" data-testid="perfil-reservation-remove" style={link} onClick={() => setMode("confirm")}>{w.remove}</button>
        </div>
      )}
      {mode === "edit" && (
        <form data-testid="perfil-reservation-form" noValidate onSubmit={save} style={{ marginTop: 6 }}>
          <input data-testid="perfil-reservation-email" className={dark ? "reserve-email dark" : "reserve-email"} type="email" inputMode="email" autoComplete="email" autoFocus
            aria-label={rw.placeholder} aria-invalid={invalid ? "true" : undefined} placeholder={rw.placeholder} value={email}
            onChange={(e) => { setEmail(e.target.value); if (invalid) setInvalid(false); }}
            style={{ display: "block", width: "100%", height: 48, boxSizing: "border-box", padding: "0 12px", borderRadius: 12, border: `2px solid ${line}`, background: dark ? "#15171C" : "#FFFDF8", color: ink, fontFamily: "inherit", fontSize: 16, fontWeight: 700 }} />
          <div data-testid="perfil-reservation-error-slot" style={{ height: 17, marginTop: 2, overflow: "hidden" }}>
            {invalid ? <div data-testid="perfil-reservation-error" role="alert" style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: ink }}>{rw.error}</div> : null}
          </div>
          <button type="submit" data-testid="perfil-reservation-save" style={{ ...outlineBtn, width: "100%", marginTop: 4 }}>{w.save}</button>
        </form>
      )}
      {mode === "confirm" && (
        <div data-testid="perfil-reservation-confirm" role="alertdialog" aria-label={w.confirm} style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{w.confirm}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" data-testid="perfil-reservation-confirm-remove" style={outlineBtn} onClick={() => { removeReservation(); setRes(null); }}>{w.confirmRemove}</button>
            <button type="button" data-testid="perfil-reservation-confirm-keep" style={outlineBtn} onClick={() => setMode("view")}>{w.confirmKeep}</button>
          </div>
        </div>
      )}
    </div>
  );
}
