import React from "react";
import { programmeLabel } from "../data/hierarchy";

// A trail like: Schools of Excellence > School of Languages > Programme of Languages
// The last item is the current page, shown active (navy + brass underline chip).
export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-sm mb-4 sm:mb-5 min-w-0" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-navy-light/50">›</span>}
            {isLast ? (
              <span className="font-medium text-navy px-2.5 break-words py-1 bg-brass-light/25 border border-brass/30 rounded-sm">
                {programmeLabel(item)}
              </span>
            ) : (
              <span className="text-navy-light">{programmeLabel(item)}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
