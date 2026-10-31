import React from "react";

// Floating round action button for phones (hidden from tablets up, where the normal toolbar shows).
// raised: lift it above the bottom navigation bar when the page has one.
export default function Fab({ label, icon, onClick, raised = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`sm:hidden fixed right-4 z-30 inline-flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-900/30 active:scale-95 active:bg-blue-800 transition ${
        raised ? "bottom-[calc(4.9rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
