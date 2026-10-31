import React from "react";
import { useCountUp } from "../hooks/useCountUp";

const TONES = {
  blue: { bar: "border-t-blue-500", text: "text-blue-700", glow: "59,130,246" },
  amber: { bar: "border-t-amber-500", text: "text-amber-600", glow: "245,158,11" },
  violet: { bar: "border-t-violet-500", text: "text-violet-700", glow: "139,92,246" },
  sky: { bar: "border-t-sky-500", text: "text-sky-700", glow: "14,165,233" },
  emerald: { bar: "border-t-emerald-500", text: "text-emerald-700", glow: "16,185,129" },
};

// tone: coloured top accent + value colour. glow: adds a soft tone-coloured halo that
// brightens on hover -- used on the Admin dashboard for a livelier, "lit up" feel.
// highlight: emphasised border for a standout metric.
export default function StatCard({ label, value, subtitle, accent = "ink", highlight = false, right, tone, glow = false }) {
  const accentClass = { ink: "text-ink", brass: "text-brass-dark", teal: "text-teal", brick: "text-brick" }[accent];
  const t = TONES[tone];
  const shown = useCountUp(value);

  return (
    <div
      className={`stat-card border bg-white p-3 sm:p-5 min-w-0 transition-all duration-300 hover:-translate-y-0.5 ${
        t ? `border-t-[3px] ${t.bar}` : ""
      } ${highlight ? "border-teal/50 ring-1 ring-teal/20" : "border-line"} ${glow && t ? "hover:shadow-lg" : "hover:shadow-md"}`}
      style={{
        ...(glow && t ? { boxShadow: `0 4px 20px -4px rgba(${t.glow},0.35)` } : null),
        ...(t ? { backgroundImage: `linear-gradient(135deg, rgba(${t.glow},0.08), transparent 60%)` } : null),
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs sm:text-sm text-navy-light">{label}</div>
          <div className={`text-2xl sm:text-3xl font-semibold tabular-nums mt-1 ${t ? t.text : accentClass}`}>{shown}</div>
          {subtitle && <div className="text-[11px] sm:text-xs text-navy-light mt-1 break-words">{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}
