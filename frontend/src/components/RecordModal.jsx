import React, { useState } from "react";
import { isQualified } from "../data/hierarchy";
import { useSessions } from "../context/SessionsContext";
import Modal from "./Modal";

const EMPTY = {
  courseName: "",
  courseId: "",
  courseDuration: "",
  session: "",
  examDate: "",
  credit: "",
  courseStartDate: "",
  courseEndDate: "",
  instructorInstitute: "",
  enrollmentStatus: false,
  assignmentStatus: "Not Started",
  examRegistrationStatus: false,
  examStatus: "Not Attended",
  certificateStatus: "Not Qualified",
  score: "",
  grade: "",
  remarks: "",
};

// Mongo returns dates as full ISO strings; an <input type="date"> needs just YYYY-MM-DD.
const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");

export default function RecordModal({ student, record, onClose, onSave }) {
  const sessionList = useSessions(); // managed by the admin (Sessions tab)
  // record.score can be `null` in the database (its schema default). Putting `null`
  // straight into a controlled <input> causes React "controlled/uncontrolled" warnings
  // and unreliable typing, so it's normalized to "" here just like every other field.
  const [form, setForm] = useState(
    record
      ? { ...EMPTY, ...record, assignmentStatus: isQualified(record.certificateStatus) ? "Completed" : record.assignmentStatus || "Not Started", certificateStatus: isQualified(record.certificateStatus) ? "Qualified" : "Not Qualified", score: record.score ?? "", courseStartDate: toDateInput(record.courseStartDate), courseEndDate: toDateInput(record.courseEndDate), examDate: toDateInput(record.examDate), credit: record.credit ?? "" }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const received = form.certificateStatus === "Qualified"; // Qualified unlocks Score and Grade

  // A qualified student must have enrolled, registered and attended
  // the exam, so those are filled in for them; going back to Not Qualified clears the
  // score and grade, which only exist once a certificate has been received.
  const changeCertificateStatus = (v) =>
    v === "Qualified"
      ? set({ certificateStatus: v, enrollmentStatus: true, examRegistrationStatus: true, examStatus: "Attended", assignmentStatus: "Completed" })
      : set({
          certificateStatus: v,
          score: "",
          grade: "",
          // Assignment status is locked to Completed while Qualified -- unlock it again.
          assignmentStatus: record && !isQualified(record.certificateStatus) ? record.assignmentStatus || "Not Started" : "In Progress",
        });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { status, ...payload } = form; // overall status is worked out by the server
      await onSave({
        ...payload,
        assignmentStatus: received ? "Completed" : form.assignmentStatus,
        score: !received || form.score === "" ? null : Number(form.score),
        grade: received ? form.grade : "",
        courseStartDate: form.courseStartDate || null,
        courseEndDate: form.courseEndDate || null,
        examDate: form.examDate || null,
        credit: form.credit === "" ? null : Number(form.credit),
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      size="lg"
      title={`${record ? "Update" : "Add"} NPTEL course`}
      subtitle={`${student.name} (${student.registerNumber})`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save record"}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {error && <div className="sm:col-span-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">{error}</div>}

        <Text label="Course Name" value={form.courseName} onChange={(v) => set({ courseName: v })} required span2 />
        <Select label="Session" value={form.session} onChange={(v) => set({ session: v })} options={["", ...sessionList]} required />
        <Text label="Duration" value={form.courseDuration} onChange={(v) => set({ courseDuration: v })} placeholder="e.g. 8 Weeks" />
        <Text label="Course ID / Code (optional)" value={form.courseId} onChange={(v) => set({ courseId: v })} />
        <Text label="Credit" value={form.credit} onChange={(v) => set({ credit: v })} type="number" inputMode="decimal" min="0" />
        <Text label="Course Start Date" value={form.courseStartDate} onChange={(v) => set({ courseStartDate: v })} type="date" />
        <Text label="Course End Date" value={form.courseEndDate} onChange={(v) => set({ courseEndDate: v })} type="date" />
        <Text label="Date of Examination" value={form.examDate} onChange={(v) => set({ examDate: v })} type="date" />
        <Text label="IIT / Institution" value={form.instructorInstitute} onChange={(v) => set({ instructorInstitute: v })} span2 />

        <Check label="Enrollment Status (Enrolled)" checked={form.enrollmentStatus} disabled={received || form.examRegistrationStatus} onChange={(v) => set({ enrollmentStatus: v })} />
        <Select label="Assignment Status" value={received ? "Completed" : form.assignmentStatus} onChange={(v) => set({ assignmentStatus: v })} disabled={received}
          options={["Not Started", "In Progress", "Completed"]} />

        <Check label="Exam Registration Status" checked={form.examRegistrationStatus} disabled={received} onChange={(v) => set({ examRegistrationStatus: v, ...(v ? { enrollmentStatus: true } : {}) })} />
        <Select label="Exam Status" value={form.examStatus} onChange={(v) => set({ examStatus: v })} disabled={received}
          options={["Not Attended", "Attended", "Absent"]} />

        <Select label="Certificate Status" value={form.certificateStatus} onChange={changeCertificateStatus}
          options={["Not Qualified", "Qualified"]} />
        <Text label="Score" value={form.score} onChange={(v) => set({ score: v })} type="number" inputMode="decimal" min="0" max="100"
          disabled={!received} placeholder={received ? "" : "Unlocks when Qualified"} />
        <Text label="Grade" value={form.grade} onChange={(v) => set({ grade: v })}
          disabled={!received} placeholder={received ? "Elite, Silver, Success..." : "Unlocks when Qualified"} />
        <Text label="Remarks" value={form.remarks} onChange={(v) => set({ remarks: v })} span2 />

        <p className="sm:col-span-2 text-xs text-slate-500 -mt-1">
          The certificate file itself is uploaded separately from the student's detail panel, not typed in here.
        </p>
      </div>
    </Modal>
  );
}

function Text({ label, value, onChange, span2, ...rest }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-slate-500 ${span2 ? "sm:col-span-2" : ""}`}>
      {label}
      <input className="field w-full disabled:bg-slate-100 disabled:cursor-not-allowed" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

function Select({ label, value, onChange, options, span2, required, disabled }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-slate-500 ${span2 ? "sm:col-span-2" : ""}`}>
      {label}
      <select className="field w-full" value={value} required={required} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o || "Select..."}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-2.5 text-sm sm:mt-5 min-h-[44px] sm:min-h-0 ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" className="w-5 h-5 accent-blue-700" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
