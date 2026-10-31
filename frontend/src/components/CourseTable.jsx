import React from "react";
import { isQualified } from "../data/hierarchy";

// Certificate status is only ever "Qualified" or "Not Qualified".
export function CertBadge({ status }) {
  const qualified = isQualified(status);
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${qualified ? "bg-teal/15 text-teal" : "bg-line text-navy-light"}`}>
      {qualified ? "Qualified" : "Not Qualified"}
    </span>
  );
}

// The verify button only comes alive once a certificate FILE has been uploaded.
// Until then it is shown greyed out and disabled.
function VerifyBadge({ hasCertificate, verified, verifying, onToggle }) {
  const disabled = verifying || !hasCertificate;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
      disabled={disabled}
      title={hasCertificate ? (verified ? "Click to remove verification" : "Mark this certificate as verified") : "Upload the certificate first to enable verification"}
      className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
        !hasCertificate
          ? "bg-line/60 text-navy-light/50 border-line cursor-not-allowed"
          : verified
          ? "bg-teal/15 text-teal border-teal/30 hover:bg-teal/25"
          : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
      }`}
    >
      {verifying ? "..." : verified && hasCertificate ? "✓ Verified" : "Verify"}
    </button>
  );
}

// One row per (student, NPTEL course) pair -- students with no course yet still get a
// single row so they aren't hidden, with a prompt to add their first course.
function ExamCell({ record: r }) {
  if (!r) return "—";
  if (!r.examRegistrationStatus) return <span className="text-navy-light">Not registered</span>;
  const scoreText = [r.score !== null && r.score !== undefined ? `Score ${r.score}` : "", r.grade].filter(Boolean).join(" · ");
  return (
    <div className="leading-tight">
      <div>{r.examStatus}</div>
      {scoreText && <div className="text-xs text-navy-light mt-0.5">{scoreText}</div>}
    </div>
  );
}

// showExam: HOD/Admin views add an "Exam & score" column; the Staff view omits it.
// bare: no outer border/rounding, for when the table sits inside another card.
// onAddRecord: only Staff/Admin can add courses; without it, empty rows just offer "View".
// showVerification: Staff never verify, so their table hides the Verification column entirely.
// How many distinct people / course rows a list represents -- used for the "Showing ..." line
// so it always matches the table (one row per course) and the Total Students card.
export const countStudents = (students) => new Set(students.map((s) => String(s.registerNumber).toUpperCase())).size;
export const countCourseRows = (students) => students.reduce((n, s) => n + s.nptelRecords.length, 0);

export default function CourseTable({ students, onViewStudent, onAddRecord, onToggleVerify, verifyingRecordId, showExam = false, showVerification = true, bare = false }) {
  const rows = students.flatMap((s) =>
    s.nptelRecords.length
      ? s.nptelRecords.map((r) => ({ student: s, record: r }))
      : [{ student: s, record: null }]
  );

  if (!rows.length) {
    return (
      <div className={`${bare ? "" : "rounded-xl border border-line bg-white"} p-10 text-center text-navy-light`}>
        No student records found for the selected filters.
      </div>
    );
  }

  const actionBtn = "text-xs text-brass-dark font-medium px-3 py-2 -my-1 rounded-md hover:bg-slate-50";

  return (
    <>
      {/* Phones & small tablets: one card per course row, no sideways scrolling */}
      <ul className={`md:hidden divide-y divide-line ${bare ? "" : "rounded-xl border border-line bg-white"}`}>
        {rows.map(({ student: s, record: r }) => (
          <li
            key={r ? r._id : `${s._id}-empty`}
            className="p-4 active:bg-paper/70 cursor-pointer"
            onClick={() => onViewStudent(s)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm break-words">{s.name}</div>
                <div className="text-xs text-navy-light">{s.registerNumber}</div>
              </div>
              {r && <div className="shrink-0"><CertBadge status={r.certificateStatus} /></div>}
            </div>
            <div className="mt-2 text-sm break-words">
              {r ? r.courseName : <span className="text-navy-light italic">No course added yet</span>}
            </div>
            {r && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-light">
                <span>{r.session || "—"}</span>
                {showExam && <span><ExamCell record={r} /></span>}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {r && showVerification && (
                <VerifyBadge
                  hasCertificate={!!r.certificateDocUrl}
                  verified={r.verified}
                  verifying={verifyingRecordId === r._id}
                  onToggle={() => onToggleVerify(s, r, !r.verified)}
                />
              )}
              <button className={actionBtn} onClick={() => onViewStudent(s)}>View</button>
              {onAddRecord && (
                <button className={actionBtn} onClick={() => onAddRecord(s)}>{r ? "+ Add course" : "+ Add Course"}</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets landscape / laptops / desktops: full table */}
    <div className={`hidden md:block ${bare ? "" : "rounded-xl border border-line bg-white"} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-left text-navy-light">
            <th className="px-4 py-3 font-medium whitespace-nowrap">Reg. number</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">Student</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">Course</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">Session</th>
            {showExam && <th className="px-4 py-3 font-medium whitespace-nowrap">Exam &amp; score</th>}
            <th className="px-4 py-3 font-medium whitespace-nowrap">Certificate</th>
            {showVerification && <th className="px-4 py-3 font-medium whitespace-nowrap">Verification</th>}
            <th className="px-4 py-3 font-medium whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student: s, record: r }) => (
            <tr
              key={r ? r._id : `${s._id}-empty`}
              className="border-b border-line last:border-b-0 hover:bg-paper/70 cursor-pointer"
              onClick={() => onViewStudent(s)}
            >
              <td className="px-4 py-3 font-medium whitespace-nowrap">{s.registerNumber}</td>
              <td className="px-4 py-3 whitespace-nowrap">{s.name}</td>
              <td className="px-4 py-3">
                {r ? r.courseName : <span className="text-navy-light italic">No course added yet</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{r?.session || "—"}</td>
              {showExam && <td className="px-4 py-3 whitespace-nowrap"><ExamCell record={r} /></td>}
              <td className="px-4 py-3 whitespace-nowrap">{r ? <CertBadge status={r.certificateStatus} /> : "—"}</td>
              {showVerification && (
                <td className="px-4 py-3 whitespace-nowrap">
                  {r ? (
                    <VerifyBadge
                      hasCertificate={!!r.certificateDocUrl}
                      verified={r.verified}
                      verifying={verifyingRecordId === r._id}
                      onToggle={() => onToggleVerify(s, r, !r.verified)}
                    />
                  ) : "—"}
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap">
                {r || !onAddRecord ? (
                  <span className="inline-flex items-center gap-3">
                    <button className="text-xs text-brass-dark hover:underline" onClick={(e) => { e.stopPropagation(); onViewStudent(s); }}>
                      View
                    </button>
                    {r && onAddRecord && (
                      <button className="text-xs text-brass-dark hover:underline" onClick={(e) => { e.stopPropagation(); onAddRecord(s); }}>
                        + Add course
                      </button>
                    )}
                  </span>
                ) : (
                  <button className="text-xs text-brass-dark hover:underline" onClick={(e) => { e.stopPropagation(); onAddRecord(s); }}>
                    + Add Course
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
