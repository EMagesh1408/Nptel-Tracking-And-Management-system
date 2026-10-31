import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

// Signs the person out after this long without touching the page -- protects against a staff
// member walking away from a shared college computer or lending their phone.
const IDLE_LIMIT_MS = 30 * 60 * 1000;
// A countdown dialog ("Still there?") appears this long before the automatic sign-out.
const WARN_BEFORE_MS = 60 * 1000;

const clearStored = () => {
  localStorage.removeItem("nptel_token");
  localStorage.removeItem("nptel_user");
  localStorage.removeItem("nptel_remembered_username"); // older versions kept the last username here
};

const readStoredUser = () => {
  try {
    const stored = localStorage.getItem("nptel_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    // Corrupted localStorage value -- fall back to logged-out instead of crashing the app.
    clearStored();
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  // Re-read the account from the server on load: if the admin renamed it, moved it to another
  // department or disabled it, the app reflects that straight away. A disabled or deleted account
  // gets a 401 here, and the api interceptor signs the person out.
  useEffect(() => {
    if (!localStorage.getItem("nptel_token")) return;
    api.get("/auth/me")
      .then(({ data }) => {
        localStorage.setItem("nptel_user", JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // `commit: false` stores the token but does not switch the app to the dashboard yet, so the login page
  // can play its welcome animation first and then call commitLogin(user).
  const login = async (username, password, { commit = true } = {}) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("nptel_token", data.token);
    localStorage.setItem("nptel_user", JSON.stringify(data.user));
    if (commit) setUser(data.user);
    return data.user;
  };
  const commitLogin = useCallback((u) => setUser(u), []);

  const logout = useCallback(() => {
    clearStored();
    setUser(null);
  }, []);

  // Idle sign-out, with a one-minute "Still there?" countdown first. Touching the page during the
  // countdown does not silently cancel it: the person chooses "Stay signed in" (or logs out).
  const [idleLeft, setIdleLeft] = useState(null); // seconds left while the warning is showing, else null
  const resumeRef = useRef(() => {});
  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn) { setIdleLeft(null); return undefined; }
    let warnTimer;
    let tick;
    let deadline = 0;
    let warning = false;
    const clearAll = () => { clearTimeout(warnTimer); clearInterval(tick); };
    const startWarning = () => {
      warning = true;
      deadline = Date.now() + WARN_BEFORE_MS;
      setIdleLeft(Math.ceil(WARN_BEFORE_MS / 1000));
      tick = setInterval(() => {
        const left = Math.ceil((deadline - Date.now()) / 1000);
        if (left <= 0) {
          clearAll();
          sessionStorage.setItem("nptel_flash", "You were signed out after 30 minutes of inactivity.");
          logout();
        } else {
          setIdleLeft(left);
        }
      }, 500);
    };
    const arm = () => {
      if (warning) return;
      clearTimeout(warnTimer);
      warnTimer = setTimeout(startWarning, IDLE_LIMIT_MS - WARN_BEFORE_MS);
    };
    resumeRef.current = () => {
      warning = false;
      clearAll();
      setIdleLeft(null);
      arm();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [signedIn, logout]);

  const staySignedIn = useCallback(() => resumeRef.current(), []);

  return <AuthContext.Provider value={{ user, login, commitLogin, logout, idleLeft, staySignedIn }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
