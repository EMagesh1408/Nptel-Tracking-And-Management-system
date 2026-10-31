import React from "react";
import { createPortal } from "react-dom";
import { useBodyLock } from "../hooks/useBodyLock";

// Full-screen farewell shown for about two seconds between "Log out" and the login page:
// a circle of colour grows from the corner of the screen, a ring closes around a tick that draws
// itself, the door icon slides away, and a progress line runs out. The actual sign-out happens
// when the line finishes (Layout.jsx), so the person always sees the whole thing.
export default function SignOutScreen({ name, ms = 2000 }) {
  useBodyLock();
  const first = (name || "").trim(); // full name, e.g. "Dr. S. Ramesh"

  return createPortal(
    <div className="signout-screen fixed inset-0 z-[200] flex items-center justify-center overflow-hidden" role="status" aria-live="polite">
      <div className="signout-bg absolute inset-0" aria-hidden="true" />
      <span className="signout-bubble signout-bubble-a" aria-hidden="true" />
      <span className="signout-bubble signout-bubble-b" aria-hidden="true" />

      <div className="relative text-center px-6 text-white">
        <div className="signout-badge mx-auto w-28 h-28 relative">
          <svg viewBox="0 0 112 112" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
            <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
            <circle className="signout-ring" cx="56" cy="56" r="50" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" pathLength="100" />
          </svg>
          <svg viewBox="0 0 112 112" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path className="signout-tick" d="M36 58l15 15 26-31" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pathLength="100" />
          </svg>
        </div>

        {/* Both lines share one grid cell: the first fades out as the second fades in. */}
        <div className="mt-7 grid place-items-center">
          <h2 className="signout-text-1 col-start-1 row-start-1 text-2xl sm:text-3xl font-semibold tracking-tight" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
            Signing you out…
          </h2>
          <h2 className="signout-text-2 col-start-1 row-start-1 text-2xl sm:text-3xl font-semibold tracking-tight" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
            {first ? `See you soon, ${first}` : "See you soon"}
          </h2>
        </div>
        <p className="signout-text-3 mt-3 text-sm text-white/70">Thanks for keeping NPTEL records up to date.</p>

        <div className="mt-8 mx-auto w-48 h-1 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
          <div className="signout-progress h-full rounded-full bg-white" style={{ animationDuration: `${ms}ms` }} />
        </div>
      </div>
    </div>,
    document.body
  );
}
