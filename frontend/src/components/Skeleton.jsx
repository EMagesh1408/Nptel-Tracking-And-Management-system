import React from "react";

// Grey pulsing placeholders shown while data loads, so the page doesn't jump when it arrives.
export const Bar = ({ className = "" }) => <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6" aria-busy="true" aria-label="Loading figures">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border border-line bg-white rounded-xl p-3 sm:p-5">
          <Bar className="h-3 w-20" />
          <Bar className="h-8 w-14 mt-3" />
          <Bar className="h-3 w-24 mt-3" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex justify-between gap-4">
            <div className="space-y-2 flex-1"><Bar className="h-4 w-1/2" /><Bar className="h-3 w-1/3" /></div>
            <Bar className="h-5 w-20 rounded-full" />
          </div>
          <Bar className="h-3 w-3/4 mt-3" />
        </div>
      ))}
    </div>
  );
}
