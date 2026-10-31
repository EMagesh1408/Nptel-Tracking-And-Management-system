import { useEffect, useRef, useState } from "react";

// Counts a number up from its previous value to the new one (about 0.8s, eased).
// Non-numbers are returned untouched; people who prefer reduced motion get the final value at once.
export function useCountUp(target, ms = 800) {
  const isNum = typeof target === "number" && Number.isFinite(target);
  const [val, setVal] = useState(isNum ? 0 : target);
  const from = useRef(0);

  useEffect(() => {
    if (!isNum) { setVal(target); return undefined; }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { from.current = target; setVal(target); return undefined; }
    const start = performance.now();
    const begin = from.current;
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(begin + (target - begin) * eased);
      from.current = next;
      setVal(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, isNum, ms]);

  return val;
}
