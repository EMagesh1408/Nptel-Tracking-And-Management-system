import { isQualified, programmeLabel } from "../data/hierarchy";

// Builds one table (header + rows) from a list of students -- one row per NPTEL course,
// or a single row for a student with no course yet -- then saves it as Excel or PDF.
// Score and Grade only appear for Qualified courses, matching what the dashboard shows.
//
//   showOrg:      add School / Programme / Academic Year columns (Admin)
//   showVerified: add a Verified column (HOD / Admin; Staff never verify)

// What the person can choose to export. Each choice keeps only the matching course rows:
//   all           every student with all of their courses (also students with no course yet)
//   session       every course taken in one chosen session
//   qualified     only courses where the student is Qualified
//   notqualified  only courses that are Not Qualified, plus students with no course yet
export const EXPORT_SCOPES = {
  all: { label: "All students", short: "All Students" },
  session: { label: "Session wise", short: "Session" },
  qualified: { label: "Qualified students", short: "Qualified Students" },
  notqualified: { label: "Not qualified students", short: "Not Qualified Students" },
};

export function filterForScope(students, scope, session) {
  if (scope === "all") return students;
  const keep = (r) =>
    scope === "session" ? r.session === session
    : scope === "qualified" ? isQualified(r.certificateStatus)
    : !isQualified(r.certificateStatus);

  const out = [];
  for (const s of students) {
    const rows = s.nptelRecords.filter(keep);
    if (rows.length) out.push({ ...s, nptelRecords: rows });
    // A student with no course at all has not qualified yet.
    else if (scope === "notqualified" && s.nptelRecords.length === 0) out.push(s);
  }
  return out;
}

const yesNo = (v) => (v ? "Yes" : "No");

function buildTable(students, { showOrg = false, showVerified = false } = {}) {
  const columns = [
    { header: "S.No", get: (_s, _r, i) => i + 1, width: 6 },
    { header: "Register No", get: (s) => s.registerNumber, width: 17 },
    { header: "Student Name", get: (s) => s.name, width: 22 },
    ...(showOrg
      ? [
          { header: "School", get: (s) => s.school, width: 28 },
          { header: "Programme", get: (s) => programmeLabel(s.department), width: 28 },
          { header: "Academic Year", get: (s) => s.academicYear, width: 14 },
        ]
      : []),
    { header: "Programme", get: (s) => s.programme, width: 16 },
    { header: "Year", get: (s) => s.year, width: 6 },
    { header: "Course", get: (_s, r) => r?.courseName || "No course added", width: 32 },
    { header: "Session", get: (_s, r) => r?.session, width: 22 },
    { header: "Enrolled", get: (_s, r) => (r ? yesNo(r.enrollmentStatus || r.examRegistrationStatus || isQualified(r.certificateStatus)) : ""), width: 10 },
    { header: "Exam Registered", get: (_s, r) => (r ? yesNo(r.examRegistrationStatus || isQualified(r.certificateStatus)) : ""), width: 15 },
    { header: "Exam Status", get: (_s, r) => (r ? (isQualified(r.certificateStatus) ? "Attended" : r.examStatus) : ""), width: 14 },
    { header: "Certificate Status", get: (_s, r) => (r ? (isQualified(r.certificateStatus) ? "Qualified" : "Not Qualified") : ""), width: 17 },
    { header: "Score", get: (_s, r) => (r && isQualified(r.certificateStatus) && r.score !== null && r.score !== undefined ? r.score : "-"), width: 8 },
    { header: "Grade", get: (_s, r) => (r && isQualified(r.certificateStatus) && r.grade ? r.grade : "-"), width: 12 },
    ...(showVerified
      ? [{ header: "Verified", get: (_s, r) => (r ? yesNo(r.verified && r.certificateDocUrl) : ""), width: 10 }]
      : []),
  ];

  const flat = students.flatMap((s) => (s.nptelRecords.length ? s.nptelRecords.map((r) => [s, r]) : [[s, null]]));
  const rows = flat.map(([s, r], i) => columns.map((c) => {
    const v = c.get(s, r, i);
    return v === undefined || v === null || v === "" ? "-" : v;
  }));

  const studentCount = new Set(students.map((s) => String(s.registerNumber).toUpperCase())).size;
  return { columns, header: columns.map((c) => c.header), rows, studentCount, courseCount: students.reduce((n, s) => n + s.nptelRecords.length, 0) };
}

const stamp = () => new Date().toISOString().slice(0, 10);
const safe = (s) => String(s || "NPTEL").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");

export async function exportExcel(students, { title, fileBase, ...opts }) {
  const XLSX = await import("xlsx");
  const t = buildTable(students, opts);
  const ws = XLSX.utils.aoa_to_sheet([t.header, ...t.rows]);
  ws["!cols"] = t.columns.map((c) => ({ wch: c.width }));
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NPTEL Report");
  XLSX.writeFile(wb, `${safe(fileBase || title)}_${stamp()}.xlsx`);
}

export async function exportPdf(students, { title, subtitle, fileBase, ...opts }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const t = buildTable(students, opts);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title || "NPTEL Report", 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  const meta = [subtitle, `${t.studentCount} student${t.studentCount !== 1 ? "s" : ""} · ${t.courseCount} course record${t.courseCount !== 1 ? "s" : ""}`, `Generated ${new Date().toLocaleDateString("en-GB")}`]
    .filter(Boolean)
    .join("   |   ");
  doc.text(meta, 40, 56);

  autoTable(doc, {
    head: [t.header],
    body: t.rows,
    startY: 68,
    margin: { left: 40, right: 40, bottom: 36 },
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });

  doc.save(`${safe(fileBase || title)}_${stamp()}.pdf`);
}
