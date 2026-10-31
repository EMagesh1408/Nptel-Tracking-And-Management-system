import { useEffect, useState } from "react";

// Returns `value`, but only after it has stopped changing for `delay` ms -- so typing in a search
// box sends one request when you pause instead of one per keystroke.
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
