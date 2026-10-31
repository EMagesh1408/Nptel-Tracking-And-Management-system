import React, { useEffect, useState } from "react";
import ProgressRing from "./ProgressRing";
import { ShieldIcon, TargetIcon, ClockIcon } from "./Icons";
import { greetName, initialsOf, greetingFor } from "../utils/person";

// Header card at the top of every dashboard. It greets the person by their real name
// (e.g. "Dr. S. Ramesh"); if an account has no name yet it shows the greeting alone rather than
// an account label. Also shows today's date and time, a ring with the share of courses that are
// "Qualified", and (for reviewers) how many certificates are waiting to be verified.
export default function WelcomeBanner({ user, roleLabel, scope, summary, showPending = false, onPendingClick }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const who = greetName(user);
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  // Counted in students (people), like the Export report: a student counts once if any course is Qualified.
  const total = summary?.totalStudents || 0;
  const qualified = summary?.qualifiedStudents ?? 0;
  const rate = total ? (qualified / total) * 100 : 0;
  const pending = Math.max(0, (summary?.certificatesReceived || 0) - (summary?.certificatesVerified || 0));
  const hello = greetingFor(now.getHours());

  const ring = (size) => summary && <ProgressRing value={rate} label="Qualified" size={size} stroke={size > 70 ? 8 : 6} color="#FBBF24" track="rgba(255,255,255,0.18)" />;

  return (
    <section className="welcome-banner relative overflow-hidden rounded-3xl p-4 sm:p-6 mb-5 sm:mb-6 text-white" aria-label="Welcome">
      <div className="relative">
        <p className="text-xs sm:text-[13px] text-white/70 flex items-center gap-1.5"><ClockIcon size={14} /> <span>{date}</span><span aria-hidden="true">·</span><span className="whitespace-nowrap">{time}</span></p>

        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <span className="wb-avatar shrink-0" aria-hidden="true">{initialsOf(user)}</span>
            <div className="min-w-0">
              {who ? (
                <>
                  <p className="text-sm sm:text-base text-white/80 leading-tight">{hello},</p>
                  <h2 className="mt-0.5 text-[1.4rem] sm:text-[1.9rem] leading-tight font-bold tracking-tight break-words" style={{ color: "#fff" }}>{who}</h2>
                </>
              ) : (
                <h2 className="text-[1.4rem] sm:text-[1.9rem] leading-tight font-bold tracking-tight" style={{ color: "#fff" }}>{hello}</h2>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-white/85">
                <span className="wb-role">{roleLabel}</span>
                {scope && <span className="min-w-0">{scope}</span>}
              </p>
            </div>
          </div>
          <div className="hidden sm:block">{ring(96)}</div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2 min-w-0">
            <span className="wb-chip">
              <TargetIcon size={14} /> {qualified} of {total} students qualified
            </span>
            {showPending && summary && (
              onPendingClick && pending > 0 ? (
                <button type="button" onClick={onPendingClick} className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-amber-950 px-3 py-1 text-xs font-semibold shadow-sm active:scale-95 transition hover:bg-amber-300">
                  <ShieldIcon size={14} /> {pending} awaiting verification
                </button>
              ) : (
                <span className="wb-chip">
                  <ShieldIcon size={14} /> {pending === 0 ? "All certificates verified" : `${pending} awaiting verification`}
                </span>
              )
            )}
          </div>
          <div className="sm:hidden shrink-0">{ring(64)}</div>
        </div>
      </div>
    </section>
  );
}
