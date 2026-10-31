import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyLock } from "../hooks/useBodyLock";

const WIDTH = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-3xl" };

// The one shell every dialog, form and side panel uses.
//   Phones:   a bottom sheet -- slides up, rounded top, grab handle, drag it down to close,
//             footer buttons stay pinned above the home bar.
//   Tablets+: a centred dialog (variant "dialog") or a right-hand drawer (variant "drawer").
// Escape and a tap on the dim background also close it. The page behind is locked.
//
//   onSubmit: when given, the body + footer are wrapped in a <form> so Enter / the submit button work.
//   footer:   buttons, pinned at the bottom.
export default function Modal({
  title, subtitle, onClose, children, footer, onSubmit,
  size = "md", variant = "dialog", z = "z-[55]", dismissable = true, headless = false,
}) {
  useBodyLock();
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const drawer = variant === "drawer";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && dismissable && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, dismissable]);

  const down = (e) => {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => dragging && setDragY(Math.max(0, e.clientY - startY.current));
  const up = () => {
    if (dragY > 110 && dismissable) onClose();
    setDragging(false);
    setDragY(0);
  };

  const Wrapper = onSubmit ? "form" : "div";

  // Rendered straight into <body>: a dialog opened from inside a hidden or clipped parent (for example
  // a toolbar that is display:none on phones) still shows up instead of silently locking the page.
  return createPortal(
    <div className={`fixed inset-0 ${z} flex ${drawer ? "justify-end items-end sm:items-stretch" : "justify-center items-end sm:items-center sm:p-4"}`}>
      <div className="absolute inset-0 bg-slate-900/50 animate-fade" onClick={() => dismissable && onClose()} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : undefined } : undefined}
        className={`app-shell modern relative bg-white w-full flex flex-col shadow-2xl overscroll-contain rounded-t-2xl
          ${drawer
            ? `h-[94dvh] sm:h-full sm:max-w-lg sm:rounded-none sm:rounded-l-2xl modal-anim modal-drawer`
            : `max-h-[92dvh] ${WIDTH[size]} sm:rounded-2xl modal-anim`}`}
      >
        {/* Grab handle (phones only) */}
        <div
          className="sm:hidden flex justify-center pt-2.5 pb-1.5 touch-none cursor-grab shrink-0"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          aria-hidden="true"
        >
          <span className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        {!headless && (
        <div className="px-4 sm:px-6 pt-1 sm:pt-5 pb-3 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold break-words">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5 break-words">{subtitle}</p>}
          </div>
          {dismissable && (
            <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 -mr-2 -mt-1 shrink-0 rounded-full text-2xl leading-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center">
              ×
            </button>
          )}
        </div>
        )}

        <Wrapper onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">{children}</div>
          {footer && (
            <div className="shrink-0 px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-100 bg-slate-50/80 sm:rounded-b-2xl flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              {footer}
            </div>
          )}
        </Wrapper>
      </div>
    </div>,
    document.body
  );
}
