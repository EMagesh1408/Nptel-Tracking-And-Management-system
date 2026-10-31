import { programmeLabel } from "../data/hierarchy";
import React, { useRef, useState } from "react";
import { parseNptelSheet } from "../utils/parseNptelSheet";
import api from "../api";
import { downloadStudentTemplate } from "../utils/excelTemplate";
import Modal from "./Modal";

export default function ExcelUploadModal({ school, department, onClose, onDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseNptelSheet(evt.target.result);
        setRows(parsed.rows);
        setError(parsed.error);
      } catch (err) {
        setError("Could not read this file. Make sure it's a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const submit = async () => {
    setUploading(true);
    setError("");
    try {
      const { data } = await api.post("/students/bulk", { students: rows });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      size="xl"
      z="z-[60]"
      title="Upload students from Excel"
      subtitle={`All uploaded students are added to ${programmeLabel(department)} (${school}).`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={result ? () => { onDone(); onClose(); } : onClose}>
            {result ? "Done" : "Cancel"}
          </button>
          {!result && (
            <button className="btn-primary" onClick={submit} disabled={!rows.length || uploading}>
              {uploading ? "Uploading..." : `Upload ${rows.length || ""} row(s)`}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Use the NPTEL sheet format (download the template below). Each row adds one student and one course; the same register number can appear in several rows, and a student already in the system just gets the extra course.
        </p>
        <button className="btn-secondary text-xs inline-flex items-center gap-2" onClick={downloadStudentTemplate}>Download a blank template (.xlsx)</button>

        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Select your .xlsx or .csv file
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="field w-full" />
        </label>

        {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">{error}</div>}

        {rows.length > 0 && !result && (
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="max-h-56 overflow-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Reg. Number", "Name", "Sec", "Session", "Course", "Start", "End", "Exam"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{r.registerNumber}</td>
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5">{r.section}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.session || "—"}</td>
                      <td className="px-2 py-1.5">{r.courseName}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.courseStartDate || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.courseEndDate || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.examDate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-2 py-1.5 bg-slate-50 text-slate-500">{rows.length} row(s) read from {fileName}</div>
          </div>
        )}

        {result && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-sm">
            <div className="font-medium text-emerald-700">{result.createdCount} new student(s) added, {result.updatedCount} existing student(s) got a new course.</div>
            {result.skippedCount > 0 && (
              <div className="mt-2">
                <div className="text-rose-700">{result.skippedCount} row(s) skipped:</div>
                <ul className="list-disc list-inside text-xs text-slate-600">
                  {result.skipped.map((s, i) => (
                    <li key={i}>{s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
