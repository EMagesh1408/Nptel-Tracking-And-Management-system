import React, { useMemo, useState } from "react";
import { SCHOOLS, getDepartments, programmeLabel } from "../data/hierarchy";
import { UserIcon, LockIcon, SparkIcon, AlertIcon } from "./Icons";
import Modal from "./Modal";

const USERNAME_RE = /^[a-z0-9][a-z0-9._@-]{2,39}$/;

// Random 10-character password using the browser's secure generator. Skips look-alike
// characters (0/O, 1/l/I) and always includes at least one letter and one number.
export function generatePassword(length = 10) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(letters), pick(digits), ...Array.from({ length: length - 2 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function strengthOf(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 11) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too weak", "Weak", "Fair", "Good", "Strong"][score];
  const color = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"][score];
  return { score, label, color };
}

// Create (no `user`) or edit (`user`) a Staff / HOD login. In edit mode the username can be
// renamed and a new password can be set; leaving the password blank keeps the current one.
export default function UserFormModal({ user, onClose, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState({
    role: user?.role || "staff",
    school: user?.school || "",
    department: user?.department || "",
    fullName: user?.fullName || "",
    name: user?.name || "",
    username: user?.username || "",
    password: "", // passwords are stored as hashes -- the current one can never be shown
    active: user ? user.active !== false : true,
  });
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

  const username = form.username.trim().toLowerCase();
  const errors = useMemo(() => {
    const e = {};
    if (!form.school) e.school = "Choose a school";
    if (!form.department) e.department = "Choose a programme";
    // The person's real name is needed for new accounts; older accounts can be filled in later.
    if (!editing && !form.fullName.trim()) e.fullName = "Enter the person's name";
    if (!form.name.trim()) e.name = "Enter an account label";
    if (!USERNAME_RE.test(username)) e.username = "3–40 characters: letters, numbers, dot, underscore, hyphen";
    // Creating needs a password; editing only checks one when a new one is typed.
    if (form.password || !editing) {
      if (form.password.length < 8) e.password = "At least 8 characters";
      else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = "Include a letter and a number";
    }
    return e;
  }, [form, username, editing]);

  const strength = strengthOf(form.password);
  const show = (k) => (touched[k] || touched.__submit) && errors[k];

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ __submit: true });
    if (Object.keys(errors).length) return;
    setError("");
    setSaving(true);
    try {
      const payload = { role: form.role, school: form.school, department: form.department, fullName: form.fullName.trim(), name: form.name.trim(), username, active: form.active };
      // Only send a password when one was typed; a new one also signs the person out of old sessions.
      if (form.password) payload.password = form.password;
      await onSave(payload, form.password);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this account");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (k) =>
    `w-full h-11 sm:h-10 rounded-lg border bg-white px-3 text-sm transition focus:outline-none focus:ring-4 ${
      show(k) ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/15"
    }`;

  return (
    <Modal
      size="lg"
      title={editing ? "Edit account" : "Create account"}
      subtitle={editing ? "Rename the login, change the programme or set a new password." : "This person will sign in with the username and password you set here."}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create account"}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {error && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            <span className="mt-0.5"><AlertIcon /></span>{error}
          </div>
        )}

        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-slate-600 mb-1.5">Account type</div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100" role="radiogroup" aria-label="Account type">
            {[["staff", "Staff", "Adds and updates student records"], ["hod", "HOD", "Reviews records and verifies certificates"]].map(([val, label, hint]) => (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={form.role === val}
                onClick={() => set({ role: val })}
                className={`text-left rounded-md px-3 py-2 transition ${form.role === val ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-white/60"}`}
              >
                <div className={`text-sm font-medium ${form.role === val ? "text-blue-700" : "text-slate-700"}`}>{label}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="School" error={show("school")}>
          <select className={inputCls("school")} value={form.school} onBlur={() => touch("school")} onChange={(e) => set({ school: e.target.value, department: "" })}>
            <option value="">Select school…</option>
            {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Programme" error={show("department")}>
          <select className={inputCls("department")} value={form.department} disabled={!form.school} onBlur={() => touch("department")} onChange={(e) => set({ department: e.target.value })}>
            <option value="">{form.school ? "Select programme…" : "Pick a school first"}</option>
            {getDepartments(form.school).map((d) => <option key={d} value={d}>{programmeLabel(d)}</option>)}
          </select>
        </Field>

        <Field label={form.role === "hod" ? "HOD name" : "Staff name"} error={show("fullName")} span2 hint="Shown in the greeting and the top bar, e.g. Dr. E. Magesh kumar or Mrs. E. Abinaya">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon size={15} /></span>
            <input className={`${inputCls("fullName")} pl-9`} value={form.fullName} onBlur={() => touch("fullName")} onChange={(e) => set({ fullName: e.target.value })} placeholder={form.role === "hod" ? "e.g. Dr. E. Magesh kumar" : "e.g. Mrs. E. Abinaya"} maxLength={80} />
          </div>
        </Field>

        <Field label="Account label" error={show("name")} span2 hint="Shown in the accounts list only">
          <input className={inputCls("name")} value={form.name} onBlur={() => touch("name")} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Staff - Computer Science" maxLength={80} />
        </Field>

        <Field label="Username" error={show("username")} span2 hint="What they type to sign in. You can rename it any time.">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon size={15} /></span>
            <input
              className={`${inputCls("username")} pl-9 font-mono`}
              value={form.username}
              onBlur={() => touch("username")}
              onChange={(e) => set({ username: e.target.value.replace(/\s/g, "").toLowerCase() })}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="e.g. staff.computer-science"
            />
          </div>
        </Field>

        <Field label="Password" error={show("password")} span2 hint={editing ? "Leave blank to keep the current password. Type or generate a new one to reset it (they will be signed out of old sessions)." : "At least 8 characters with a letter and a number."}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><LockIcon size={14} /></span>
              <input
                className={`${inputCls("password")} pl-9 font-mono`}
                type="text"
                autoComplete="off"
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={form.password}
                onBlur={() => touch("password")}
                onChange={(e) => set({ password: e.target.value.replace(/\s/g, "") })}
                placeholder={editing ? "Leave blank to keep current" : "Type or generate a password"}
              />
            </div>
            <button type="button" className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap !px-3 h-11 sm:h-10" onClick={() => set({ password: generatePassword() })}>
              <SparkIcon /> Generate
            </button>
          </div>
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${strength.score >= i ? strength.color : "bg-slate-200"}`} />)}
              </div>
              <span className="text-[11px] text-slate-500 w-14 text-right">{strength.label}</span>
            </div>
          )}
        </Field>

        {editing && (
          <label className="sm:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer">
            <span>
              <span className="block text-sm font-medium text-slate-800">Account active</span>
              <span className="block text-xs text-slate-500">Turn off to block sign-in without deleting the account.</span>
            </span>
            <button type="button" role="switch" aria-checked={form.active} onClick={() => set({ active: !form.active })}
              className={`relative w-11 h-6 rounded-full transition shrink-0 ${form.active ? "bg-blue-700" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : ""}`} />
            </button>
          </label>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, error, hint, span2, children }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-slate-600 mb-1.5">{label}</div>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
