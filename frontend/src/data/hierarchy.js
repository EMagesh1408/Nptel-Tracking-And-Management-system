// Complete School -> Department -> Programme hierarchy, exactly as defined
// in the NPTEL Tracking & Management System project document.

export const HIERARCHY = [
  {
    school: "School of Languages",
    departments: [{ department: "Department of Languages", programmes: ["Language Programmes"] }],
  },
  {
    school: "School of Sciences",
    departments: [
      { department: "Department of Mathematics", programmes: ["B.Sc. Mathematics", "M.Sc. Mathematics"] },
      { department: "Department of Physics", programmes: ["B.Sc. Physics"] },
      { department: "Department of Chemistry", programmes: ["B.Sc. Chemistry", "M.Sc. Chemistry"] },
      {
        department: "Department of Plant Biology & Plant Biotechnology",
        programmes: ["B.Sc. Plant Biology and Plant Biotechnology"],
      },
      {
        department: "Department of Zoology",
        programmes: ["B.Sc. Advanced Zoology and Biotechnology", "M.Sc. Zoology"],
      },
      { department: "Department of Biotechnology", programmes: ["B.Sc. Biotechnology"] },
    ],
  },
  {
    school: "School of Humanities",
    departments: [
      { department: "Department of Economics", programmes: ["B.A. Economics", "M.A. Economics"] },
      {
        department: "Department of Defence & Strategic Studies",
        programmes: ["B.A. Defence & Strategic Studies", "M.A. Defence and Strategic Studies"],
      },
      { department: "Department of Sociology", programmes: ["B.A. Sociology"] },
      { department: "Department of Political Science", programmes: ["B.A. Political Science"] },
      { department: "Department of Social Work", programmes: ["MSW – Master of Social Work"] },
    ],
  },
  {
    school: "School of Commerce",
    departments: [
      { department: "Department of Commerce", programmes: ["B.Com. General", "M.Com. General"] },
      { department: "Department of Corporate Secretaryship", programmes: ["B.Com. Corporate Secretaryship"] },
      { department: "Department of Accounting & Finance", programmes: ["B.Com. Accounting & Finance"] },
      { department: "Department of Commerce / Honours", programmes: ["B.Com. Honours"] },
      { department: "Department of Professional Accounting", programmes: ["B.Com. Professional Accounting"] },
      { department: "Department of Commerce – Computer Applications", programmes: ["B.Com. Computer Application"] },
      {
        department: "Department of Information System Management",
        programmes: ["B.Com. Information System Management"],
      },
    ],
  },
  {
    school: "School of Management",
    departments: [
      {
        department: "Department of Business Administration",
        programmes: ["B.B.A. – Bachelor of Business Administration", "MBA – Master of Business Administration"],
      },
      { department: "Department of Retail Management", programmes: ["B.B.A. Retail Management"] },
      { department: "Department of Bank Management", programmes: ["B.Com. Bank Management"] },
      { department: "Department of Marketing Management", programmes: ["B.Com. Marketing Management"] },
    ],
  },
  {
    school: "School of Information Technology",
    departments: [
      { department: "Department of Computer Applications", programmes: ["BCA", "MCA"] },
      { department: "Department of Computer Science", programmes: ["B.Sc. Computer Science"] },
      { department: "Department of Information Technology", programmes: ["B.Sc. Information Technology"] },
      { department: "Department of Data Analytics", programmes: ["B.Sc. Data Analytics"] },
      { department: "Department of Visual Communication", programmes: ["B.Sc. Visual Communication"] },
      {
        department: "Department of Computer Science with AI",
        programmes: ["B.Sc. Computer Science with AI", "M.Sc. Computer Science with AI"],
      },
    ],
  },
];

// The college now calls a "Department" a "Programme". Stored data keeps the original names
// (so nothing in the database has to change); everything shown on screen goes through this
// helper: "Department of Computer Science" -> "Programme of Computer Science".
export const programmeLabel = (name = "") => String(name || "").replace(/^Department of\b/i, "Programme of");

export const SCHOOLS = HIERARCHY.map((h) => h.school);

export const getDepartments = (schoolName) =>
  HIERARCHY.find((h) => h.school === schoolName)?.departments.map((d) => d.department) || [];

export const getProgrammes = (schoolName, deptName) =>
  HIERARCHY.find((h) => h.school === schoolName)?.departments.find((d) => d.department === deptName)?.programmes || [];

// Mirrors backend/seed/seed.js's slugify() exactly -- turns a department name into the
// login-email slug the seed script generated for it (e.g. "Department of Computer
// Science" -> "computer-science" -> staff.computer-science@college.edu).
export const slugifyDepartment = (name = "") =>
  name
    .replace(/^Department of\s*/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");


// Works out a course's real current stage from its actual fields, the same way the
// backend does for the status pie chart -- so "Defaulters" and "Pending Verification"
// can never disagree with what the record's own fields say.
// Certificate status is "Qualified" or "Not Qualified". Records saved before this change
// may still say "Received", which means the same as Qualified.
export const isQualified = (status) => status === "Qualified" || status === "Received";

export const deriveStage = (r) => {
  if (isQualified(r.certificateStatus)) return "Qualified";
  if (r.examStatus === "Attended") return "Exam Attended";
  if (r.examRegistrationStatus) return "Exam Registered";
  if (r.assignmentStatus === "Completed") return "Course Completed";
  if (r.enrollmentStatus) return "Enrolled";
  return "Not Enrolled";
};

export const NPTEL_STATUS_FLOW = [
  "Not Enrolled",
  "Enrolled",
  "Course Completed",
  "Exam Registered",
  "Exam Attended",
  "Qualified",
];

// This college runs 3-year UG programmes and 2-year PG programmes -- there is no
// Year IV anywhere. YEARS is the full range used for generic filtering (covers both).
export const YEARS = ["I", "II", "III"];
export const UG_YEARS = ["I", "II", "III"];
export const PG_YEARS = ["I", "II"];
export const SECTIONS = ["A", "B", "C"];

// Academic years offered in the student form.
export const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];

// NPTEL sessions: two per academic year (Jan-April and July-December).
export const SESSIONS = [2023, 2024, 2025, 2026].flatMap((y) => {
  const ay = `${y}-${String(y + 1).slice(2)}`;
  return [`${ay} Jan-April`, `${ay} July-December`];
});

// Live list of session names, kept up to date by SessionsContext from the database. Code that
// runs outside React components (like the Excel parser) reads it from here.
export let KNOWN_SESSIONS = SESSIONS;
export const setKnownSessions = (list) => { KNOWN_SESSIONS = list; };

// A programme counts as postgraduate if its name starts with a master's-level prefix
// (M.Sc., M.A., M.Com., MBA, MCA, MSW, etc.) -- everything else is treated as UG (3 years).
export const isPostGraduate = (programme = "") => /^(M\.|MBA|MCA|MSW)/i.test(programme.trim());

export const getYearOptions = (programme) => (isPostGraduate(programme) ? PG_YEARS : UG_YEARS);
