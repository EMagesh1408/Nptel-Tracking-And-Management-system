import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { DownloadIcon } from "./Icons";
import { useSessions } from "../context/SessionsContext";
import { EXPORT_SCOPES, filterForScope, exportExcel, exportPdf } from "../utils/exportReport";
import { useToast } from "../context/ToastContext";
import Modal from "./Modal";

const countOf = (list) => ({
  students: new Set(list.map((s) => String(s.registerNumber).toUpperCase())).size,
  courses: list.reduce((n, s) => n + s.nptelRecords.length, 0),
});

const OPTIONS = [
  { key: "all", text: "Every student with all of their NPTEL courses." },
  { key: "session", text: "Courses taken in one session you choose." },
  { key: "qualified", text: "Only students who are Qualified, with score and grade." },
  { key: "notqualified", text: "Students who have not qualified, including those with no course yet." },
];

// "Export report" button. It opens a dialog that first asks WHAT to export (all students,
// one session, qualified or not qualified students) and in which format (Excel or PDF).
// The data is fetched fresh for the department/school in scope, so the result never depends
// on whatever filter happens to be applied on the page.
//
//   scope:   { school, department } for Admin (empty = everything). Staff/HOD are limited to
//            their own department by the server, so they pass nothing.
//   options: { title, subtitle, fileBase, showOrg, showVerified }
export default function ExportMenu({ scope = {}, options, label = "Export report", primary = false, open: openProp, onOpenChange, mobileHidden = false }) {
  const { showToast } = useToast();
  const allSessions = useSessions();
  // Normally opens from its own button; the pages can also control it (the phone bottom bar opens it).
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [students, setStudents] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [choice, setChoice] = useState("all");
  const [session, setSession] = useState("");
  const [format, setFormat] = useState("excel");
  const [busy, setBusy] = useState(false);

  const scopeKey = `${scope.school || ""}|${scope.department || ""}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStudents(null);
    setLoadError("");
    const params = {};
    if (scope.school) params.school = scope.school;
    if (scope.department) params.department = scope.department;
    api.get("/students", { params })
      .then(({ data }) => { if (!cancelled) setStudents(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.response?.data?.message || "Could not load the records"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scopeKey]);

  // Sessions that really have data come first in the dropdown; the full list is still available.
  const sessionsWithData = useMemo(() => {
    const used = new Set((students || []).flatMap((s) => s.nptelRecords.map((r) => r.session)));
    return [...allSessions.filter((x) => used.has(x)), ...allSessions.filter((x) => !used.has(x))];
  }, [students, allSessions]);

  useEffect(() => {
    if (students && !session) setSession(sessionsWithData[0] || "");
  }, [students, session, sessionsWithData]);

  const counts = useMemo(() => {
    if (!students) return {};
    return Object.fromEntries(Object.keys(EXPORT_SCOPES).map((k) => [k, countOf(filterForScope(students, k, session))]));
  }, [students, session]);

  const selected = counts[choice] || { students: 0, courses: 0 };
  const canDownload = !!students && !busy && (selected.students > 0) && (choice !== "session" || !!session);

  const download = async () => {
    const data = filterForScope(students, choice, session);
    const label = choice === "session" ? `Session ${session}` : EXPORT_SCOPES[choice].short;
    setBusy(true);
    try {
      const opts = {
        ...options,
        title: `${options.title.replace(/ - NPTEL Report$/, "")} - ${EXPORT_SCOPES[choice].short} Report`,
        subtitle: [options.subtitle, choice === "session" ? `Session: ${session}` : null].filter(Boolean).join(" | "),
        fileBase: `${options.fileBase.replace(/_nptel_report$/, "")}_${choice === "session" ? `session_${session}` : EXPORT_SCOPES[choice].short}`,
      };
      await (format === "excel" ? exportExcel : exportPdf)(data, opts);
      showToast(`${label} report downloaded (${format === "excel" ? "Excel" : "PDF"})`, "success");
      setOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Could not create the report. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={`${primary ? "btn-primary" : "btn-secondary"} ${mobileHidden ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-2`} onClick={() => setOpen(true)}>
        <DownloadIcon /> {label}
      </button>

      {open && (
        <Modal
          title="Export report"
          subtitle="Choose which students to include, then pick a file format."
          onClose={() => !busy && setOpen(false)}
          dismissable={!busy}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={download} disabled={!canDownload}>
                <DownloadIcon /> {busy ? "Preparing…" : `Download ${format === "excel" ? "Excel" : "PDF"}`}
              </button>
            </>
          }
        >
          <div className="space-y-5">
              {loadError && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">{loadError}</div>}

              <fieldset>
                <legend className="text-xs font-medium text-slate-600 mb-2">What do you want to export?</legend>
                <div className="space-y-2">
                  {OPTIONS.map(({ key, text }) => {
                    const on = choice === key;
                    const c = counts[key];
                    return (
                      <label key={key} className={`block rounded-xl border px-4 py-3 cursor-pointer transition ${on ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300"}`}>
                        <span className="flex items-start gap-3">
                          <input type="radio" name="export-scope" className="mt-1 w-4 h-4 accent-blue-700" checked={on} onChange={() => setChoice(key)} />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-slate-900">{EXPORT_SCOPES[key].label}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${on ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {students ? (key === "session" && !session ? "—" : c ? `${c.students} student${c.students !== 1 ? "s" : ""}` : "0 students") : "…"}
                              </span>
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">{text}</span>
                            {key === "session" && on && (
                              <select className="field !w-full mt-2.5" value={session} onChange={(e) => setSession(e.target.value)} aria-label="Session">
                                {sessionsWithData.map((x) => <option key={x} value={x}>{x}</option>)}
                              </select>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-medium text-slate-600 mb-2">File format</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[["excel", "Excel sheet", ".xlsx"], ["pdf", "PDF document", ".pdf"]].map(([k, name, ext]) => (
                    <button key={k} type="button" onClick={() => setFormat(k)} aria-pressed={format === k}
                      className={`rounded-xl border px-4 py-2.5 text-left transition ${format === k ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="block text-sm font-medium text-slate-900">{name}</span>
                      <span className="block text-xs text-slate-500">{ext}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3.5 py-2.5" aria-live="polite">
                {!students && !loadError ? "Loading records…"
                  : students && selected.students === 0 ? "No records match this choice, so there is nothing to download."
                  : students ? <>This report will contain <strong>{selected.students}</strong> student{selected.students !== 1 ? "s" : ""}{selected.courses ? <> and <strong>{selected.courses}</strong> course record{selected.courses !== 1 ? "s" : ""}</> : null}.</>
                  : null}
              </p>
          </div>
        </Modal>
      )}
    </>
  );
}
