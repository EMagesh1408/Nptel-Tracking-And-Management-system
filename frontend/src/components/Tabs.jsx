import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavSlot } from "../context/NavSlot";

// True when the screen is at least 1024px wide (the header has room for the section links).
function useWide() {
  const q = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

// Section switcher.
//   Large screens:      section links inside the header navigation bar, with a sliding underline
//                       (skipped when desktop={false}).
//   Tablets:            a segmented control under the page title with a sliding highlight.
//   Phones: a floating bottom dock with icons. A soft highlight glides to the chosen section and
//           its icon pops. Always within thumb reach.
//
// tabs:        [{ key, label, icon }]   shown as desktop tabs, and in the bar unless mobileItems is given.
// mobileItems: optional list for the bar only. Each item is either
//                { type: "tab",    key, label, icon }
//                { type: "action", key, label, icon, onClick, primary }   (primary = raised centre button)
// icon may be a node or a function (active) => node.
export default function Tabs({ tabs = [], active, onChange, mobileItems, desktop = true }) {
  const items = mobileItems || tabs.map((t) => ({ ...t, type: "tab" }));
  const pick = (key) => {
    onChange(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const draw = (icon, on) => (typeof icon === "function" ? icon(on) : icon);

  // ---- desktop: sliding highlight measured from the active button ----
  const listRef = useRef(null);
  const [thumb, setThumb] = useState(null);
  const navEl = useNavSlot();
  const wide = useWide();
  const inHeader = desktop && wide && !!navEl;
  useLayoutEffect(() => {
    if (!desktop) return undefined;
    const measure = () => {
      const el = listRef.current?.querySelector('[aria-selected="true"]');
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    document.fonts?.ready?.then(measure); // web fonts change label widths once they load
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, tabs.length, desktop, inHeader]);

  // ---- phones: which grid slot holds the active tab ----
  const activeIndex = items.findIndex((it) => it.type !== "action" && it.key === active);

  return (
    <>
      {desktop && tabs.length > 0 && inHeader && createPortal(
        <div ref={listRef} role="tablist" className="hnav relative flex items-center gap-0.5">
          {thumb && <span className="hnav-thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
          {tabs.map((t) => {
            const on = active === t.key;
            return (
              <button key={t.key} role="tab" aria-selected={on} onClick={() => pick(t.key)} className={`hnav-item ${on ? "on" : ""}`}>
                {t.icon && <span className="seg-icon">{draw(t.icon, on)}</span>}
                {t.label}
              </button>
            );
          })}
        </div>,
        navEl
      )}

      {desktop && tabs.length > 0 && !inHeader && (
        <div className="hidden sm:block mb-6">
          <div ref={listRef} role="tablist" className="seg relative inline-flex gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            {thumb && <span className="seg-thumb absolute top-1 bottom-1 rounded-xl bg-white shadow-md shadow-slate-900/10" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />}
            {tabs.map((t) => {
              const on = active === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={on}
                  onClick={() => pick(t.key)}
                  className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${on ? "text-blue-700 font-semibold" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {t.icon && <span className="seg-icon">{draw(t.icon, on)}</span>}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav aria-label="Main navigation" className="dock sm:hidden fixed inset-x-3 z-40 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] rounded-[1.6rem] bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_34px_-6px_rgba(15,23,42,0.28)]">
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {activeIndex >= 0 && (
            <span
              className="dock-glide absolute top-0 bottom-0 pointer-events-none flex items-center justify-center"
              style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
              aria-hidden="true"
            >
              <span className="block w-[3.6rem] h-[3rem] rounded-2xl bg-gradient-to-b from-blue-100 to-blue-50" />
            </span>
          )}
          {items.map((item) => {
            if (item.type === "action" && item.primary) {
              return (
                <button key={item.key} type="button" onClick={item.onClick} aria-label={item.label} className="relative flex flex-col items-center justify-end min-h-[62px] text-[11px] font-semibold text-blue-700">
                  <span className="dock-fab absolute -top-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white ring-4 ring-slate-50 shadow-lg shadow-indigo-700/40 flex items-center justify-center transition active:scale-90">
                    {draw(item.icon, true)}
                  </span>
                  <span className="pb-2">{item.label}</span>
                </button>
              );
            }
            const isTab = item.type !== "action";
            const on = isTab && active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={isTab ? () => pick(item.key) : item.onClick}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[62px] text-[11px] transition-colors active:scale-95 ${on ? "text-blue-700 font-semibold" : "text-slate-500 font-medium active:text-slate-800"}`}
              >
                <span key={on ? "on" : "off"} className={on ? "nav-pop" : ""}>{draw(item.icon, on)}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
