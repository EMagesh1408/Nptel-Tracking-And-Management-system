import React, { useState } from "react";
import { SCHOOLS, getDepartments, programmeLabel } from "../data/hierarchy";
import { useSessions } from "../context/SessionsContext";
import { LockIcon, SearchIcon, ResetIcon, FilterIcon } from "./Icons";

// Filter card used on the Admin, HOD and Staff dashboards.
//   Admin: School + Programme (editable) + Session.
//   HOD:   School + Programme (locked) + Session.
//   Staff: Session only (School/Department are hidden).
// Search is always on screen. On phones the other filters fold away behind a "Filters" button
// (with a badge showing how many are active) so the records stay in view.
// The backend forces school/department from the account for HOD and Staff anyway.
export default function ModernFilters({ value, onChange, lockedFilters = {}, hideOrg = false, editableOrg = false }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const sessions = useSessions();
  const [open, setOpen] = useState(false);

  const activeCount = [value.session, ...(editableOrg ? [value.school, value.department] : [])].filter(Boolean).length;
  const anyActive = activeCount > 0 || !!value.search;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none"><SearchIcon /></span>
          <input
            className="field search-input w-full"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Search by register number or name"
            aria-label="Search by register number or name"
            value={value.search || ""}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="sm:hidden btn-secondary relative inline-flex items-center gap-1.5 !px-3.5"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <FilterIcon /> Filters
          {activeCount > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-[11px]">{activeCount}</span>}
        </button>
      </div>

      <div className={`${open ? "block" : "hidden"} sm:block mt-3 sm:mt-4`}>
        <div className="filters-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
          {!hideOrg && (
            <>
              <Field label="School" locked={!editableOrg}>
                <select
                  className="field"
                  disabled={!editableOrg}
                  value={value.school || ""}
                  onChange={(e) => set({ school: e.target.value, department: "" })}
                >
                  {editableOrg ? (
                    <>
                      <option value="">All schools</option>
                      {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </>
                  ) : (
                    <option value={value.school || ""}>{value.school}</option>
                  )}
                </select>
              </Field>
              <Field label="Programme" locked={!editableOrg}>
                <select
                  className="field"
                  disabled={!editableOrg || !value.school}
                  value={value.department || ""}
                  onChange={(e) => set({ department: e.target.value })}
                >
                  {editableOrg ? (
                    <>
                      <option value="">{value.school ? "All programmes" : "Pick a school first"}</option>
                      {getDepartments(value.school).map((d) => <option key={d} value={d}>{programmeLabel(d)}</option>)}
                    </>
                  ) : (
                    <option value={value.department || ""}>{programmeLabel(value.department)}</option>
                  )}
                </select>
              </Field>
            </>
          )}
          <Field label="Session">
            <select className="field" value={value.session || ""} onChange={(e) => set({ session: e.target.value })}>
              <option value="">All sessions</option>
              {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap" disabled={!anyActive} onClick={() => onChange({ ...lockedFilters })}>
            <ResetIcon /> Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, locked = false, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
      <span className="inline-flex items-center gap-1">{label}{locked && <LockIcon />}</span>
      {children}
    </label>
  );
}
