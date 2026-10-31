import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useBodyLock } from "../hooks/useBodyLock";
import { ROLE_LABEL, greetName } from "../utils/person";
import { programmeLabel } from "../data/hierarchy";

// Full-screen welcome shown for about three seconds after a successful sign-in (pages/Login.jsx):
// a circle of colour opens from the middle, the college seal pops in inside a gold ring that draws itself,
// "Signing you in..." gives way to "Welcome back, <name>", gold sparks rise, and a progress line runs out.
// The dashboard only opens when the line finishes (onDone), so the person always sees the whole thing.
const SPARKS = [8, 17, 26, 35, 44, 53, 62, 71, 80, 89];

export default function WelcomeScreen({ user, ms = 3000, onDone }) {
  useBodyLock();
  const done = useRef(onDone);
  done.current = onDone;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const run = reduce ? 700 : ms;

  useEffect(() => {
    const t = setTimeout(() => done.current?.(), run);
    return () => clearTimeout(t);
  }, [run]);

  const who = greetName(user);
  const where = user?.department ? programmeLabel(user.department) : user?.role === "admin" ? "All Schools of Excellence" : "";

  return createPortal(
    <div className="welcome-screen fixed inset-0 z-[200] flex items-center justify-center overflow-hidden" role="status" aria-live="polite">
      <div className="ws-bg absolute inset-0" aria-hidden="true" />
      {SPARKS.map((left, i) => (
        <span key={left} className="ws-spark" style={{ left: `${left}%`, animationDelay: `${0.9 + (i % 5) * 0.22}s`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2 }} aria-hidden="true" />
      ))}

      <div className="relative text-center px-6 text-white w-full max-w-md">
        <div className="ws-badge mx-auto w-32 h-32 relative">
          <svg viewBox="0 0 128 128" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" />
            <circle className="ws-ring" cx="64" cy="64" r="60" fill="none" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" pathLength="100" />
          </svg>
          <div className="absolute inset-3 rounded-full bg-white p-1 shadow-2xl ws-seal">
            <img src="/logo.png" alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
        </div>

        {/* Both messages share one grid cell: the first fades out as the second rises in. */}
        <div className="mt-8 grid place-items-center">
          <h2 className="ws-t1 col-start-1 row-start-1 text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: "#fff" }}>Signing you in…</h2>
          <div className="ws-t2 col-start-1 row-start-1">
            <p className="text-base sm:text-lg text-white/80">Welcome back{who ? "," : ""}</p>
            {who && <h2 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight break-words" style={{ color: "#fff" }}>{who}</h2>}
          </div>
        </div>

        <div className="ws-t3 mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm text-white/85">
          <span className="wb-role">{ROLE_LABEL[user?.role] || ""}</span>
          {where && <span>{where}</span>}
        </div>

        <div className="mt-9 mx-auto h-1 w-44 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
          <div className="ws-progress h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ animationDuration: `${run}ms` }} />
        </div>
      </div>
    </div>,
    document.body
  );
}
