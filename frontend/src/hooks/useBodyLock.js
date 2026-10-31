import { useEffect } from "react";

// Stops the page behind a modal/sheet from scrolling. Counted, so a dialog opened on top of
// another one (e.g. a confirmation over the student panel) doesn't unlock the page early.
let locks = 0;

export function useBodyLock() {
  useEffect(() => {
    if (locks === 0) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
  }, []);
}
