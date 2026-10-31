import React, { useState } from "react";
import { SCHOOLS, getDepartments, programmeLabel } from "../data/hierarchy";
import { useSessions } from "../context/SessionsContext";
import Modal from "./Modal";

const EMPTY = {
  registerNumber: "",
  name: "",
  school: "",
  department: "",
  session: "",
  year: "",
  section: "",
};

const EMPTY_COURSE = { courseName: "", session: "", courseDuration: "" };

// student: pass an existing student object to edit it. Omit it to add a new one.
// School and Department are always locked (either to lockSchool/lockDepartment for
// new students, or to the student's existing school/department when editing) --
// a staff account can never move a student into another department this way.
//
// The register number is not required to be unique: the same student can be re-added
// for a later NPTEL session, so no "already exists" check happens here.
export default function StudentFormModal({ student, onClose, onSave, lockSchool, lockDepartment }) {
  const isEdit = !!student;
  const sessionList = useSessions(); // managed by the admin (Sessions tab)
  const [form, setForm] = useState(
    isEdit
      ? { ...EMPTY, ...student, session: student.nptelRecords?.[0]?.session || "" }
      : { ...EMPTY, school: lockSchool || "", department: lockDepartment || "" }
  );
  // One or more courses the student is being enrolled in right now. Only used when adding
  // a new student -- editing basic details doesn't touch their existing courses.
  const [courses, setCourses] = useState(isEdit ? [] : [{ ...EMPTY_COURSE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const schoolLocked = isEdit || !!lockSchool;
  const departmentLocked = isEdit || !!lockDepartment;

  const setCourse = (i, patch) => setCourses((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const addCourseRow = () => setCourses((cs) => [...cs, { ...EMPTY_COURSE, session: form.session }]);
  const removeCourseRow = (i) => setCourses((cs) => cs.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const records = courses
        .filter((c) => c.courseName.trim())
        .map((c) => ({ ...c, session: c.session || form.session }));
      await onSave(isEdit ? form : { ...form, records });
    } catch (err) {
      setError(err.response?.data?.message || "Could not save student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit student details" : "Add student"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add student"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {error && <div className="sm:col-span-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">{error}</div>}

        <Text label="Register Number" value={form.registerNumber} onChange={(v) => set({ registerNumber: v })} required span2 autoCapitalize="characters" inputMode="text" />
        <Text label="Student Name" value={form.name} onChange={(v) => set({ name: v })} required span2 autoCapitalize="words" />

        <Select label="School" value={form.school} onChange={(v) => set({ school: v, department: "" })}
          options={SCHOOLS} disabled={schoolLocked} span2 />
        <Select label="Programme" value={form.department} onChange={(v) => set({ department: v })}
          options={getDepartments(form.school)} optionLabel={programmeLabel} disabled={departmentLocked || !form.school} span2 />

        <Select label="Session" value={form.session} onChange={(v) => set({ session: v })} options={sessionList} required />
        <Select label="Year" value={form.year} onChange={(v) => set({ year: v })} options={["I", "II", "III"]} required />
        <Text label="Section" value={form.section} onChange={(v) => set({ section: v })} />

        {isEdit && (
          <p className="sm:col-span-2 text-xs text-slate-500 -mt-1">
            School and Programme cannot be changed here — only an Admin can move a student between programmes.
          </p>
        )}

        {!isEdit && (
          <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-1">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-medium text-slate-600">NPTEL course(s) — add one or more</span>
              <button type="button" className="text-sm text-blue-700 font-medium px-2 py-2 -my-2 rounded-lg active:bg-blue-50" onClick={addCourseRow}>+ Add another</button>
            </div>
            <div className="space-y-3">
              {courses.map((c, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                  <Text label={`Course ${i + 1} name`} value={c.courseName} onChange={(v) => setCourse(i, { courseName: v })} placeholder="e.g. Python for Data Science" />
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <Select label="Session" value={c.session || form.session} onChange={(v) => setCourse(i, { session: v })} options={sessionList} />
                    </div>
                    {courses.length > 1 && (
                      <button type="button" className="text-sm text-rose-600 font-medium px-3 min-h-[44px] sm:min-h-0 sm:py-2 rounded-lg active:bg-rose-50" onClick={() => removeCourseRow(i)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Leave the course name blank to add the student with no course yet.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Text({ label, value, onChange, span2, disabled, ...rest }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-slate-500 ${span2 ? "sm:col-span-2" : ""}`}>
      {label}
      <input className="field w-full" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...rest} />
    </label>
  );
}

function Select({ label, value, onChange, options, span2, disabled, required, optionLabel }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-slate-500 ${span2 ? "sm:col-span-2" : ""}`}>
      {label}
      <select className="field w-full" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={required}>
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>{optionLabel ? optionLabel(o) : o}</option>
        ))}
      </select>
    </label>
  );
}
