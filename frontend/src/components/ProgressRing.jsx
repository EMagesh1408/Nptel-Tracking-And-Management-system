import React, { useEffect, useState } from "react";

// Circular progress with the percentage in the middle. The ring fills in once when it appears.
export default function ProgressRing({ value = 0, size = 88, stroke = 8, label, track = "rgba(255,255,255,0.22)", color = "#fff", textClass = "text-white" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const small = size < 72; // tiny rings show just the number
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label || "Progress"}: ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center leading-none ${textClass}`}>
        <span className={`${small ? "text-sm" : "text-xl"} font-bold tabular-nums`}>{pct}%</span>
        {label && !small && <span className="mt-1 text-[10px] uppercase tracking-wider opacity-80">{label}</span>}
      </div>
    </div>
  );
}
