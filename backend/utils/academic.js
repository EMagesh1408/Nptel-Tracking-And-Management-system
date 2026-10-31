// Single source of truth for the college's year structure:
// 3-year UG programmes, 2-year PG programmes. Mirrors the same rule used in
// frontend/src/data/hierarchy.js -- keep both in sync if this ever changes.

const isPostGraduate = (programme = "") => /^(M\.|MBA|MCA|MSW)/i.test(String(programme).trim());

const validYearsFor = (programme) => (isPostGraduate(programme) ? ["I", "II"] : ["I", "II", "III"]);

// "2026-27 July-December" -> "2026-2027". Falls back to "" if the session
// string doesn't start with a recognisable "yyyy-yy" pair.
const academicYearFromSession = (session = "") => {
  const m = String(session).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[1].slice(0, 2)}${m[2]}` : "";
};

// Works out where a course record actually stands from its real fields, so the
// dashboard's status breakdown can never disagree with the enrollment/exam/certificate
// data shown right next to it.
const deriveLifecycleStage = (r) => {
  if (r.certificateStatus === "Qualified") return "Qualified";
  if (r.examStatus === "Attended") return "Exam Attended";
  if (r.examRegistrationStatus) return "Exam Registered";
  if (r.assignmentStatus === "Completed") return "Course Completed";
  if (r.enrollmentStatus) return "Enrolled";
  return "Not Enrolled";
};

// One rule-set that keeps every record internally consistent, used both when saving
// (schema pre-validate hook) and when counting (analytics), so old bad data and new data
// are always counted the same way:
//   - Certificate status is only "Qualified" or "Not Qualified". Older data saying "Received"
//     means Qualified; "Not Issued" / "Processing" / "Not Received" mean Not Qualified.
//   - Qualified implies the student enrolled, registered, attended the exam and completed the assignments.
//   - Exam attended implies exam registration; exam registration implies enrollment.
//   - Score and grade only exist when the student is Qualified (otherwise they are cleared).
//   - Verified only makes sense once a certificate file has actually been uploaded.
//   - The overall status is always derived, never typed in.
const normalizeRecord = (r) => {
  r.certificateStatus = r.certificateStatus === "Qualified" || r.certificateStatus === "Received" ? "Qualified" : "Not Qualified";
  if (r.certificateStatus === "Qualified") {
    r.enrollmentStatus = true;
    r.examRegistrationStatus = true;
    r.examStatus = "Attended";
    r.assignmentStatus = "Completed"; // Qualified always means the assignments are done
  } else {
    r.score = null;
    r.grade = "";
  }
  if (r.examStatus === "Attended") r.examRegistrationStatus = true;
  if (r.examRegistrationStatus) r.enrollmentStatus = true;
  if (!r.certificateDocUrl) {
    r.verified = false;
    r.verifiedAt = null;
  }
  r.status = deriveLifecycleStage(r);
  return r;
};

module.exports = { isPostGraduate, validYearsFor, academicYearFromSession, deriveLifecycleStage, normalizeRecord };
