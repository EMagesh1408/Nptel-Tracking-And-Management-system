import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = "success") => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="app-shell fixed inset-x-0 sm:inset-x-auto top-[calc(4.75rem+env(safe-area-inset-top))] sm:top-auto sm:bottom-4 sm:right-4 z-[100] flex flex-col gap-2 sm:max-w-sm sm:w-full px-3 sm:px-0 pointer-events-none" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-card pointer-events-auto relative overflow-hidden border rounded-2xl pl-3 pr-2 py-3 text-sm shadow-xl shadow-slate-900/10 flex items-start gap-3 bg-white ${
              t.type === "error" ? "border-rose-200 text-slate-800" : "border-emerald-200 text-slate-800"
            }`}
          >
            <span className={`toast-icon mt-px w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${t.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`} aria-hidden="true">
              {t.type === "error" ? "!" : "✓"}
            </span>
            <span className="flex-1 pt-0.5">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-700 text-lg leading-none w-7 h-7 shrink-0 rounded-full hover:bg-slate-100">×</button>
            <span className={`toast-bar absolute left-0 bottom-0 h-[3px] ${t.type === "error" ? "bg-rose-400" : "bg-emerald-400"}`} aria-hidden="true" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
