import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { NavSlotContext } from "../context/NavSlot";
import { SunIcon, MoonIcon, ChevronDownIcon, ShieldIcon, WifiOffIcon, ArrowUpIcon, PowerIcon, UserIcon } from "./Icons";
import LogoutDialog from "./LogoutDialog";
import SignOutScreen from "./SignOutScreen";
import IdleWarning from "./IdleWarning";
import { programmeLabel } from "../data/hierarchy";
import { ROLE_LABEL, personName, initialsOf, greetName } from "../utils/person";

const SIGN_OUT_MS = 2000;

function ThemeToggle({ className = "" }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`theme-toggle nav-icon-btn relative inline-flex items-center justify-center w-10 h-10 rounded-xl active:scale-90 transition ${className}`}
    >
      <span key={dark ? "moon" : "sun"} className="theme-spin">{dark ? <MoonIcon /> : <SunIcon />}</span>
    </button>
  );
}

// Person chip: avatar + real name + role. Opens a card with school, programme, username and the theme switch.
function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const name = personName(user);
  const showAccount = user.fullName && user.name && user.name !== user.fullName;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="who-chip flex items-center gap-2.5 h-11 pl-1 pr-1 sm:pr-3 rounded-full active:scale-95 transition"
      >
        <span className="who-avatar w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center" aria-hidden="true">{initialsOf(user)}</span>
        <span className="hidden sm:block text-left leading-tight max-w-[12rem]">
          <span className="block text-[13px] font-semibold truncate who-name">{name}</span>
          <span className="block text-[11px] truncate who-role">{ROLE_LABEL[user.role]}</span>
        </span>
        <span className={`hidden sm:block who-role transition-transform duration-200 ${open ? "rotate-180" : ""}`}><ChevronDownIcon /></span>
      </button>

      {open && (
        <div role="menu" className="menu-pop absolute right-0 mt-2.5 w-[19rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 overflow-hidden">
          <div className="profile-hero px-4 pt-4 pb-4 text-white">
            <div className="flex items-center gap-3">
              <span className="who-avatar w-12 h-12 rounded-2xl text-base font-bold flex items-center justify-center">{initialsOf(user)}</span>
              <div className="min-w-0 leading-tight">
                <div className="font-semibold truncate" style={{ color: "#fff" }}>{name}</div>
                <span className="mt-1.5 inline-block rounded-full bg-amber-300/20 border border-amber-200/30 px-2 py-0.5 text-[11px] font-medium text-amber-100">{ROLE_LABEL[user.role]}</span>
              </div>
            </div>
            {(user.school || user.department) && (
              <div className="mt-3 text-[12px] leading-snug text-white/80 space-y-0.5">
                {user.department && <div className="truncate font-medium text-white">{programmeLabel(user.department)}</div>}
                {user.school && <div className="truncate">{user.school}</div>}
              </div>
            )}
          </div>

          <div className="p-2">
            {(user.username || showAccount) && (
              <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500">
                <span className="text-slate-400"><UserIcon size={16} /></span>
                <span className="min-w-0 truncate">Signed in as <span className="font-mono text-slate-700">{user.username || user.name}</span></span>
              </div>
            )}
            <button type="button" role="menuitem" onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition">
              <span className="text-slate-500">{dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}</span>
              <span className="flex-1 text-left">{dark ? "Light mode" : "Dark mode"}</span>
              <span className={`relative w-9 h-5 rounded-full transition-colors ${dark ? "bg-indigo-600" : "bg-slate-300"}`} aria-hidden="true">
                <span className={`knob absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-4" : ""}`} />
              </span>
            </button>
            <div className="flex items-start gap-3 px-3 py-2.5 text-xs text-slate-500 leading-relaxed">
              <span className="text-emerald-600 mt-0.5"><ShieldIcon size={18} /></span>
              <span>Your session is protected: you are signed out automatically after 30 minutes without activity.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One shared shell for Admin, HOD and Staff. Styles are scoped under .modern / .app-shell in index.css.
// The header is `fixed` so it stays pinned while the page scrolls: brand on the left, the page sections
// (Dashboard / Records / ...) in the middle on large screens, and the person + log out on the right.
// On phones the sections move to the floating bottom dock (see Tabs.jsx).
export default function Layout({ children }) {
  const { user, logout, idleLeft, staySignedIn } = useAuth();
  const { showToast } = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [navEl, setNavEl] = useState(null);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  const outTimer = useRef(null);
  const wasOffline = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 6);
      setShowTop(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const goOffline = () => { wasOffline.current = true; setOffline(true); };
    const goOnline = () => {
      setOffline(false);
      if (wasOffline.current) { wasOffline.current = false; showToast("You are back online", "success"); }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, [showToast]);

  useEffect(() => () => clearTimeout(outTimer.current), []);

  const startSignOut = () => {
    setConfirmLogout(false);
    setSigningOut(true);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    outTimer.current = setTimeout(logout, reduce ? 500 : SIGN_OUT_MS);
  };

  return (
    <NavSlotContext.Provider value={navEl}>
      <div className="app-shell modern min-h-screen bg-slate-50">
        <header className="app-header fixed top-0 inset-x-0 z-30 pt-[env(safe-area-inset-top)] pointer-events-none">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-2 sm:pt-3">
            <div className={`island pointer-events-auto ${scrolled ? "island-up" : ""}`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 lg:w-[16.5rem]">
                <span className="brand-mark shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </span>
                <div className="min-w-0 leading-tight">
                  <h1 className="text-[15px] sm:text-base font-bold tracking-tight truncate">
                    <span className="sm:hidden">NPTEL Tracking</span>
                    <span className="hidden sm:inline">NPTEL Tracking &amp; Management</span>
                  </h1>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">Guru Nanak College</p>
                </div>
              </div>

              {/* Page sections are rendered here by Tabs.jsx (large screens). */}
              <nav ref={setNavEl} aria-label="Sections" className="hidden lg:flex flex-1 items-center justify-center min-w-0" />
              <div className="flex-1 lg:hidden" />

              {user && (
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                  <ThemeToggle className="hidden sm:inline-flex" />
                  <ProfileMenu user={user} />
                  <button type="button" onClick={() => setConfirmLogout(true)} aria-label="Log out" title="Log out" className="logout-pill">
                    <span className="lp-dot"><PowerIcon size={17} /></span>
                    <span className="lp-label">Log out</span>
                  </button>
                </div>
              )}
            </div>
            {offline && (
              <div className="offline-bar pointer-events-auto mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-amber-950 text-xs font-semibold py-1.5 px-3">
                <WifiOffIcon size={14} /> You are offline. Changes cannot be saved until the connection is back.
              </div>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-[calc(5rem+env(safe-area-inset-top))] sm:pt-[calc(6rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-8 overflow-x-clip">
          {children}
        </main>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className={`fixed right-4 z-30 w-11 h-11 rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/30 flex items-center justify-center transition-all duration-300 active:scale-90 bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:right-auto sm:left-6 sm:bottom-6 ${showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
          tabIndex={showTop ? 0 : -1}
        >
          <ArrowUpIcon />
        </button>

        {confirmLogout && <LogoutDialog user={user} onConfirm={startSignOut} onCancel={() => setConfirmLogout(false)} />}
        {typeof idleLeft === "number" && !signingOut && <IdleWarning secondsLeft={idleLeft} onStay={staySignedIn} onLogout={startSignOut} />}
        {signingOut && <SignOutScreen name={greetName(user)} ms={SIGN_OUT_MS} />}
      </div>
    </NavSlotContext.Provider>
  );
}
