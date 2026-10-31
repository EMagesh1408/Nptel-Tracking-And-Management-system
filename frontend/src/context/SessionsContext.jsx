import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "./AuthContext";
import { SESSIONS as DEFAULT_SESSIONS, setKnownSessions } from "../data/hierarchy";

// The NPTEL sessions (e.g. "2026-27 July-December") live in the database and are managed by the
// admin. This is the single place the app reads them from, so every dropdown, filter, chart and
// export on the Staff, HOD and Admin dashboards always shows the same, current list.
//
// It re-reads the list when the tab becomes visible again and once a minute, so a session the
// admin just added shows up on other people's dashboards without them signing in again.
const SessionsContext = createContext({ sessions: [], refresh: () => {} });

export function SessionsProvider({ children }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(() => [...DEFAULT_SESSIONS].reverse()); // newest first, until the server answers

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/sessions");
      if (Array.isArray(data) && data.length) {
        setSessions(data);
        setKnownSessions(data);
      }
    } catch {
      // Keep whatever list we already have; a failed refresh must never empty the dropdowns.
    }
  }, []);

  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn) return undefined;
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(onVisible, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [signedIn, refresh]);

  return <SessionsContext.Provider value={{ sessions, refresh }}>{children}</SessionsContext.Provider>;
}

// Session names, newest first.
export const useSessions = () => useContext(SessionsContext).sessions;
export const useRefreshSessions = () => useContext(SessionsContext).refresh;
