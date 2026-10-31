import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import WelcomeScreen from "../components/WelcomeScreen";
import { useAuth } from "../context/AuthContext";
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, AlertIcon } from "../components/Icons";

const REMEMBER_KEY = "nptel_remembered_username";
const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Messages (error / notice / Caps Lock) used to pop in and out of the card instantly. Because the page is
// vertically centred, every pop re-centred the WHOLE page (logo, title, card) in one frame -- that was the
// "shake". This wrapper does two things:
//   1. eases its own height open/closed (and keeps the last message on screen while it closes);
//   2. tells the page column the message's natural height through a CSS variable. The column turns that into
//      a negative bottom margin that is animated with the SAME duration/easing, so the centring never "sees"
//      the message: the card just grows downward while the logo, title and top of the card stay put.
// The side padding gives the error banner's horizontal shake room so it isn't clipped.
const SLIDE = "duration-300 ease-out motion-reduce:transition-none";

function Collapse({ open, children, columnRef, cssVar }) {
  const inner = useRef(null);
  const held = useRef(null);
  const [keep, setKeep] = useState(false); // still mounted (open, or fading closed)
  if (open) held.current = children;
  const content = open ? children : keep ? held.current : null;

  useEffect(() => {
    if (open) { setKeep(true); return undefined; }
    const t = setTimeout(() => setKeep(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  // Runs before paint, in the same commit that flips the height, so both animations start together.
  useLayoutEffect(() => {
    const col = columnRef.current;
    const el = inner.current;
    if (!col || !el) return undefined;
    const apply = () => col.style.setProperty(cssVar, open ? String(el.scrollHeight) : "0");
    apply();
    if (!open || typeof ResizeObserver === "undefined" || !el.firstElementChild) return undefined;
    const ro = new ResizeObserver(apply); // e.g. the text wraps differently after a window resize
    ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [open, content, columnRef, cssVar]);

  useEffect(() => () => columnRef.current?.style.removeProperty(cssVar), [columnRef, cssVar]);

  return (
    <div className={`grid transition-[grid-template-rows] ${SLIDE} ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div ref={inner} className="min-h-0 overflow-hidden -mx-2 px-2">{content}</div>
    </div>
  );
}

export default function Login() {
  const { login, commitLogin } = useAuth();
  const navigate = useNavigate();

  // The username box starts EMPTY. It is only pre-filled when the person ticked
  // The form always starts empty (this app never stores or pre-fills a username itself). Tapping the
  // username field lets the browser offer its own saved logins for quick sign-in.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState(null); // set after a successful sign-in; plays the welcome screen first
  const [shakeKey, setShakeKey] = useState(0);
  const passwordRef = useRef(null);
  const columnRef = useRef(null);

  // Why was the person sent back here? (expired session, account disabled, password reset...)
  useEffect(() => {
    localStorage.removeItem(REMEMBER_KEY); // erase a username remembered by an older version
    const flash = sessionStorage.getItem("nptel_flash");
    if (flash) { setNotice(flash); sessionStorage.removeItem("nptel_flash"); }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (loading || welcomeUser) return;
    setError("");
    setNotice("");
    setLoading(true);
    try {
      // The session is committed by the welcome screen when its animation ends (see WelcomeScreen).
      const user = await login(username.trim(), password, { commit: false });
      setWelcomeUser(user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? "Cannot reach the server. Check your connection and try again." : "Sign in failed. Please try again.")
      );
      setPassword("");
      setShakeKey((k) => k + 1);
      passwordRef.current?.focus({ preventScroll: true });
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => setCapsOn(!!(e.getModifierState && e.getModifierState("CapsLock")));

  // Everything is sized with clamp() against the window HEIGHT, so the whole page (logo, name,
  // card and footer) always fits on one screen without scrolling -- from a small laptop to a
  // large monitor. The scroll container is only a safety net for extremely short windows.
  return (
    <div className="modern fixed inset-0 overflow-hidden bg-[#F2F4FF]">
      {/* Static colour washes + rings that echo the round logo */}
      <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-indigo-300/30 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-sky-300/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-48 left-1/4 w-[30rem] h-[30rem] rounded-full bg-rose-200/40 blur-3xl" aria-hidden="true" />
      <svg className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-1/2 w-[64rem] max-w-none opacity-50" viewBox="0 0 800 800" fill="none" aria-hidden="true">
        {[120, 190, 270, 360].map((r) => <circle key={r} cx="400" cy="400" r={r} stroke="#303A8D" strokeOpacity="0.09" />)}
      </svg>

      {/* The entrance animation lives on the scroll container itself (not on the content inside it), so the
          10px rise can never count as scrollable overflow -- that used to flash a scrollbar on every load. */}
      <div className="login-scroll relative z-10 h-full overflow-y-auto animate-fade-in-up">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-3">
          {/* Negative bottom margin = the height of the open message areas (see <Collapse>). The centred layout
              therefore never "sees" them, so opening/closing a message can't move the logo, title or card top. */}
          <div
            ref={columnRef}
            className={`w-full max-w-[25rem] flex flex-col items-center transition-[margin-bottom] ${SLIDE}`}
            style={{ marginBottom: "calc((var(--lift-msg, 0) + var(--lift-caps, 0)) * -1px)" }}
          >
            {/* ---------- College identity ---------- */}
            <div className="rounded-full p-1 bg-white shadow-xl shadow-indigo-900/25 ring-1 ring-indigo-100">
              <img
                src="/logo.png"
                alt="Guru Nanak College (Autonomous), Chennai - 600 042 logo"
                width="96"
                height="96"
                className="rounded-full object-cover block h-[clamp(60px,12vh,96px)] w-[clamp(60px,12vh,96px)]"
              />
            </div>
            <h2 className="mt-[clamp(0.4rem,1.6vh,0.9rem)] leading-tight font-bold text-center text-[#1B2260] text-[length:clamp(1.25rem,3.6vh,1.7rem)]" style={SERIF}>
              Guru Nanak College
            </h2>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500 text-center">Autonomous &middot; Chennai</p>

            {/* ---------- Sign-in card ---------- */}
            {/* The wrapper lets the travelling light sit NEXT TO the frosted card instead of inside it: an animation
                inside a backdrop-blur element forces the blur to be recomputed on every frame, which is what made the
                card flicker. Same look, same position -- see .beam-* in index.css. */}
            <div className="relative mt-[clamp(0.5rem,2vh,1.1rem)] w-full">
            <main className="relative w-full rounded-3xl bg-white/85 backdrop-blur-xl border border-white shadow-2xl shadow-indigo-900/10 p-[clamp(1rem,3vh,1.75rem)]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h1 className="text-lg font-bold text-slate-900">Welcome back</h1>
                <span className="text-[11px] font-medium text-[#303A8D] bg-indigo-50 rounded-full px-2.5 py-1 whitespace-nowrap">NPTEL Tracking &amp; Management</span>
              </div>

              <div aria-live="polite">
                <Collapse open={!!error || !!notice} columnRef={columnRef} cssVar="--lift-msg">
                  {error ? (
                    <div key={shakeKey} className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 animate-shake" role="alert">
                      <span className="mt-0.5 shrink-0"><AlertIcon /></span>{error}
                    </div>
                  ) : notice ? (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800" role="status">
                      <span className="mt-0.5 shrink-0"><AlertIcon /></span>{notice}
                    </div>
                  ) : null}
                </Collapse>
              </div>

              <form onSubmit={submit} className="mt-[clamp(0.6rem,2vh,1.1rem)] space-y-[clamp(0.55rem,1.8vh,1rem)]" noValidate>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#303A8D] transition pointer-events-none"><UserIcon /></span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      enterKeyHint="next"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      aria-invalid={!!error}
                      placeholder="Enter your username"
                      className="w-full h-[clamp(2.5rem,5.8vh,3rem)] rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-[#303A8D] focus:ring-4 focus:ring-[#303A8D]/15 aria-[invalid=true]:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#303A8D] transition pointer-events-none"><LockIcon size={15} /></span>
                    <input
                      id="password"
                      name="password"
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      enterKeyHint="go"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={onKey}
                      onKeyDown={onKey}
                      onBlur={() => setCapsOn(false)}
                      required
                      aria-invalid={!!error}
                      placeholder="Enter your password"
                      className="w-full h-[clamp(2.5rem,5.8vh,3rem)] rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-[#303A8D] focus:ring-4 focus:ring-[#303A8D]/15 aria-[invalid=true]:border-rose-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#303A8D] hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#303A8D]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <Collapse open={capsOn} columnRef={columnRef} cssVar="--lift-caps"><p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5" role="status"><AlertIcon /> Caps Lock is on</p></Collapse>
                </div>


                <button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="w-full h-[clamp(2.5rem,5.8vh,3rem)] rounded-xl font-semibold text-white bg-gradient-to-r from-[#303A8D] to-[#4B58C9] hover:from-[#262F78] hover:to-[#3F4CB8] shadow-lg shadow-indigo-800/30 transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#303A8D]/30 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {loading ? <><Spinner /> Signing in…</> : "Sign in"}
                </button>
              </form>

              <p className="mt-[clamp(0.5rem,1.8vh,1rem)] text-center text-xs text-slate-500">
                Need an account or forgot your password? Contact your administrator.
              </p>
            </main>
            {/* Light line that travels around the card border (pure CSS) */}
            <span className="beam-glow" aria-hidden="true"><span className="beam-ring"><span className="beam-light" /></span></span>
            </div>

            <p className="mt-[clamp(0.4rem,1.6vh,1rem)] text-[11px] text-slate-400 text-center">
              &copy; {new Date().getFullYear()} Guru Nanak College (Autonomous), Chennai
            </p>
          </div>
        </div>
      </div>
      {welcomeUser && (
        <WelcomeScreen
          user={welcomeUser}
          onDone={() => { commitLogin(welcomeUser); navigate(`/${welcomeUser.role}`, { replace: true }); }}
        />
      )}
    </div>
  );
}
