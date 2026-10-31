import React, { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import { useRefreshSessions } from "../context/SessionsContext";
import { PlusIcon, TrashIcon, CalendarIcon } from "./Icons";
import ConfirmDialog from "./ConfirmDialog";
import { Bar } from "./Skeleton";


// Academic year as typed by the admin: "2026-27", "2026-2027" or just "2026" all become "2026-27".
const parseYear = (raw) => {
  const m = /^(\d{4})(?:\s*[-\u2013/]\s*(\d{2}|\d{4}))?$/.exec(String(raw).trim());
  if (!m) return { error: "Enter the academic year like 2026-27" };
  const start = Number(m[1]);
  if (start < 2000 || start > 2100) return { error: "Academic year looks wrong" };
  const label = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  if (m[2] && Number(m[2].slice(-2)) !== (start + 1) % 100) return { error: `The academic year should read ${label}` };
  return { label };
};
const SESSION_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,30}$/;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

// Admin → Sessions tab. A session added here is saved in the database and immediately becomes
// available in every session filter, course form, chart and export for Staff, HOD and Admin.
export default function SessionManagement() {
  const { showToast } = useToast();
  const refreshEverywhere = useRefreshSessions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/sessions/manage");
      setRows(data);
    } catch (err) {
      showToast(err.response?.data?.message || "Could not load sessions", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const yearInfo = year.trim() ? parseYear(year) : null;
  const cleanSession = sessionName.trim().replace(/\s+/g, " ");
  const preview = yearInfo?.label && SESSION_NAME_RE.test(cleanSession) ? `${yearInfo.label} ${cleanSession}` : "";

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!year.trim()) return setError("Enter the academic year, e.g. 2026-27");
    if (yearInfo.error) return setError(yearInfo.error);
    if (!cleanSession) return setError("Enter the session, e.g. Jan-April");
    if (!SESSION_NAME_RE.test(cleanSession)) return setError("The session can use letters, numbers, spaces and hyphens (2\u201331 characters)");
    setSaving(true);
    try {
      await api.post("/sessions", { name: preview });
      showToast(`Session "${preview}" added — it now appears on every dashboard`, "success");
      setSessionName("");
      await Promise.all([load(), refreshEverywhere()]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the session");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const s = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/sessions/${s.id}`);
      showToast(`Session "${s.name}" deleted`, "success");
      await Promise.all([load(), refreshEverywhere()]);
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete the session", "error");
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-lg font-semibold">NPTEL sessions</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Add a session once and it appears in the session filters, course forms, charts and reports on the Staff, HOD and Admin dashboards.
        </p>
      </div>

      <form onSubmit={add} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 mb-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Academic year</span>
            <input className="field w-full" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2026-27" maxLength={9} inputMode="numeric" autoComplete="off" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Session</span>
            <input className="field w-full" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g. Jan-April" maxLength={31} autoComplete="off" />
          </label>
          <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 h-[42px]" disabled={saving}>
            <PlusIcon /> {saving ? "Adding…" : "Add session"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Will be saved as</span>
          {preview ? <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{preview}</span> : <span className="text-slate-400">—</span>}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="p-4 flex items-center justify-between"><Bar className="h-4 w-40" /><Bar className="h-4 w-16" /></div>)}
          </div>
        ) : !rows.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3"><CalendarIcon /></div>
            <p className="font-medium text-slate-700">No sessions yet</p>
            <p className="text-sm text-slate-500 mt-1">Add the first session above.</p>
          </div>
        ) : (
          <>
            {/* Phones: one row per session */}
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((s) => (
                <li key={s.name} className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {s.courses} course{s.courses !== 1 ? "s" : ""} · {s.students} student{s.students !== 1 ? "s" : ""} · {s.id ? fmtDate(s.createdAt) : "From student records"}
                    </div>
                  </div>
                  {s.id && (
                    <button
                      type="button"
                      disabled={s.courses > 0}
                      aria-label={`Delete ${s.name}`}
                      onClick={() => setDeleteTarget(s)}
                      className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-500 active:bg-rose-50 active:text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* Tablets and up: table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  {["Session", "Courses", "Students", "Added", ""].map((h, i) => <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.name} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3">{s.courses}</td>
                    <td className="px-4 py-3">{s.students}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.id ? fmtDate(s.createdAt) : "From student records"}</td>
                    <td className="px-4 py-3 text-right">
                      {s.id && (
                        <button
                          type="button"
                          disabled={s.courses > 0}
                          title={s.courses > 0 ? "In use by student records, so it cannot be deleted" : "Delete session"}
                          aria-label={`Delete ${s.name}`}
                          onClick={() => setDeleteTarget(s)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this session?"
          message={`"${deleteTarget.name}" will disappear from every dropdown. No student has courses in it, so no records are affected.`}
          confirmLabel="Delete session"
          onConfirm={remove}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
