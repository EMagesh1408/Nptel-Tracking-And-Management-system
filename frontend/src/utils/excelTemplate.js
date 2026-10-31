import * as XLSX from "xlsx";

// Blank template in the college's NPTEL sheet layout (two-row header, "Duration" over Start/End Date).
// Used by the top-level "Download template" button and by the Excel upload modal.
export function downloadStudentTemplate() {
  const top = ["S.No.", "Batch", "Academic Year", "Year", "Semester", "Programme", "Reg. Number", "Section", "Name of the student", "Online Platform", "Session", "Duration", "", "No. of Weeks", "Name of the Course", "Date of Examination", "Credit"];
  const sub = ["", "", "", "", "", "", "", "", "", "", "", "Start Date", "End Date", "", "", "", ""];
  const sample = [1, 2024, "2026-2027", "III Year", "V", "Visual Communication", "2413141090016", "A", "Student Name", "SWAYAM-NPTEL", "2026-27 July-December", "7/20/2026", "09-11-2026", "8 Weeks", "Film Appreciation and Analysis", "10/25/2026", 3];

  const ws = XLSX.utils.aoa_to_sheet([top, sub, sample]);
  ws["!merges"] = [
    ...top.map((_, c) => c).filter((c) => c !== 11 && c !== 12).map((c) => ({ s: { r: 0, c }, e: { r: 1, c } })),
    { s: { r: 0, c: 11 }, e: { r: 0, c: 12 } },
  ];
  ws["!cols"] = top.map((_, c) => ({ wch: [8, 8, 14, 10, 10, 24, 18, 9, 24, 16, 24, 12, 12, 12, 32, 18, 8][c] }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NPTEL");
  XLSX.writeFile(wb, "nptel_upload_template.xlsx");
}
