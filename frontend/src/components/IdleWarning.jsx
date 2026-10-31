import React from "react";
import Modal from "./Modal";
import { ClockIcon, LogoutIcon } from "./Icons";

// "Still there?" -- appears one minute before the automatic sign-out, with a ring that drains.
export default function IdleWarning({ secondsLeft, total = 60, onStay, onLogout }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, secondsLeft / total));

  return (
    <Modal
      headless
      dismissable={false}
      size="sm"
      z="z-[90]"
      title="Still there?"
      onClose={onStay}
      footer={
        <>
          <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2" onClick={onLogout}><LogoutIcon size={16} /> Log out now</button>
          <button type="button" className="btn-primary" onClick={onStay} autoFocus>Stay signed in</button>
        </>
      }
    >
      <div className="text-center py-1">
        <div className="relative mx-auto w-24 h-24">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="6" className="text-amber-500" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-amber-500" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: "stroke-dashoffset 0.5s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-slate-800">{secondsLeft}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">seconds</span>
          </div>
        </div>
        <h3 className="mt-4 text-xl font-semibold tracking-tight inline-flex items-center gap-2"><span className="text-amber-500"><ClockIcon size={20} /></span> Still there?</h3>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">You have been inactive for a while. For your security you will be signed out automatically.</p>
      </div>
    </Modal>
  );
}
