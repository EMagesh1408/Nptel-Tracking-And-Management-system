import * as XLSX from "xlsx";
import { KNOWN_SESSIONS } from "../data/hierarchy";

// Reads the college's NPTEL sheet:
// S.No. | Batch | Academic Year | Year | Semester | Programme | Reg. Number | Section |
// Name of the student | Online Platform | Session | Duration (Start Date, End Date) |
// No. of Weeks | Name of the Course | Date of Examination | Credit
// The header has two rows ("Duration" sits above "Start Date" / "End Date"), which is handled here.

const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const COLUMNS = {
  batch: ["batch", "batchyear", "admissionbatch"],
  academicYear: ["academicyear", "acadyear", "ay"],
  year: ["year", "yearofstudy", "studyyear"],
  semester: ["semester", "sem"],
  programme: ["programme", "program", "programmename", "degree"],
  registerNumber: ["regnumber", "registernumber", "regno", "registerno", "regdno", "regdnumber", "rollnumber", "rollno", "registrationnumber", "universityregno", "regnum"],
  section: ["section", "sec"],
  name: ["nameofthestudent", "studentname", "name", "namestudent"],
  onlinePlatform: ["onlineplatform", "platform", "platformname"],
  session: ["session", "nptelsession", "term"],
  courseStartDate: ["startdate", "coursestartdate", "fromdate"],
  courseEndDate: ["enddate", "courseenddate", "todate"],
  courseDuration: ["noofweeks", "weeks", "durationweeks", "numberofweeks"],
  courseName: ["nameofthecourse", "coursename", "course", "coursetitle", "nptelcourse"],
  examDate: ["dateofexamination", "examdate", "examinationdate", "dateofexam"],
  credit: ["credit", "credits", "creditpoints"],
};
const REQUIRED = { registerNumber: "Reg. Number", name: "Name of the student", programme: "Programme", academicYear: "Academic Year", year: "Year", courseName: "Name of the Course" };

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Slash and dash dates are month-first (7/20/2026, 09-11-2026 = 11 Sep). A dash date whose first
// number is above 12 (e.g. 25-10-2026) can only be day-first, so that is handled too.
function parseDate(v) {
  if (v === "" || v == null) return "";
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? iso(d.y, d.m, d.d) : "";
  }
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return iso(m[3], +m[1], +m[2]);
  if ((m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) return +m[1] > 12 ? iso(m[3], +m[2], +m[1]) : iso(m[3], +m[1], +m[2]);
  return "";
}

const YEAR_WORDS = { 1: "I", 2: "II", 3: "III" };
const cleanYear = (v) => {
  const t = String(v ?? "").replace(/year/i, "").trim().toUpperCase();
  return YEAR_WORDS[t] || t;
};

// Jan-Apr 2026 belongs to "2025-26 Jan-April"; Jul-Dec 2026 to "2026-27 July-December".
function sessionFromDate(isoDate) {
  const [y, m] = isoDate.split("-").map(Number);
  if (!y) return "";
  const start = m >= 7 ? y : m <= 4 ? y - 1 : null;
  if (start === null) return "";
  return `${start}-${String(start + 1).slice(2)} ${m >= 7 ? "July-December" : "Jan-April"}`;
}
const cleanSession = (raw, startIso) => {
  const t = String(raw ?? "").trim();
  if (!t) return sessionFromDate(startIso);
  return KNOWN_SESSIONS.find((s) => norm(s) === norm(t)) || t;
};

export function parseNptelSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: true });

  const h = grid.findIndex((row) => row.some((c) => COLUMNS.registerNumber.includes(norm(c))));
  if (h === -1) return { rows: [], error: 'Could not find the header row. The sheet needs a "Reg. Number" column.' };

  const sub = grid[h + 1] || [];
  const col = {};
  grid[h].forEach((_, c) => {
    for (const key of [norm(grid[h][c]), norm(sub[c])]) {
      for (const [field, variants] of Object.entries(COLUMNS)) {
        if (col[field] === undefined && key && variants.includes(key)) col[field] = c;
      }
    }
  });

  const missing = Object.entries(REQUIRED).filter(([f]) => col[f] === undefined).map(([, label]) => label);
  if (missing.length) return { rows: [], error: `Missing column(s): ${missing.join(", ")}. Please use the downloaded template.` };

  const hasSubHeader = sub.some((c) => ["startdate", "enddate"].includes(norm(c)));
  const cell = (row, f) => (col[f] === undefined ? "" : row[col[f]]);
  const text = (row, f) => String(cell(row, f) ?? "").trim();

  const rows = grid
    .slice(h + (hasSubHeader ? 2 : 1))
    .filter((row) => text(row, "registerNumber") || text(row, "name"))
    .map((row) => {
      const start = parseDate(cell(row, "courseStartDate"));
      const weeks = cell(row, "courseDuration");
      return {
        registerNumber: text(row, "registerNumber"),
        name: text(row, "name"),
        programme: text(row, "programme"),
        academicYear: text(row, "academicYear"),
        batch: text(row, "batch"),
        year: cleanYear(cell(row, "year")),
        section: text(row, "section").replace(/^section\s*/i, "").toUpperCase(),
        semester: text(row, "semester"),
        onlinePlatform: text(row, "onlinePlatform"),
        session: cleanSession(cell(row, "session"), start),
        courseName: text(row, "courseName"),
        courseDuration: typeof weeks === "number" ? `${weeks} Weeks` : String(weeks ?? "").trim(),
        courseStartDate: start,
        courseEndDate: parseDate(cell(row, "courseEndDate")),
        examDate: parseDate(cell(row, "examDate")),
        credit: text(row, "credit"),
      };
    });

  return rows.length ? { rows, error: "" } : { rows: [], error: "No student rows found under the header." };
}
