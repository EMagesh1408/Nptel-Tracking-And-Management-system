import React, { useRef, useState } from "react";
import Modal from "./Modal";
import { CertBadge } from "./CourseTable";
import { isQualified } from "../data/hierarchy";
import { openCertificate } from "../api";
import { useToast } from "../context/ToastContext";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

const Detail = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-sm break-words">{value === "" || value === null || value === undefined ? "—" : String(value)}</div>
  </div>
);

// Pill showing verification state. Toggling it is the "Verification" review step, separate from
// whether a certificate file has been uploaded at all.
function VerificationBadge({ hasCertificate, verified, verifying, onToggle }) {
  const disabled = verifying || !hasCertificate;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={hasCertificate ? "" : "Upload the certificate first to enable verification"}
      className={`text-xs px-3 py-1.5 min-h-[36px] rounded-full font-medium border transition-colors active:scale-95 ${
        !hasCertificate
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          : verified
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
      }`}
    >
      {verifying ? "Saving..." : verified && hasCertificate ? "✓ Verified" : "Verify"}
    </button>
  );
}

const linkBtn = "text-sm text-blue-700 font-medium px-3 py-2 -my-1 rounded-lg hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50";

function CertificateBlock({ studentId, record, canUpload, uploading, onUpload, canVerify, verifying, onToggleVerify }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [opening, setOpening] = useState("");
  const hasCertificate = !!record.certificateDocUrl;
  // Upload is locked until the course is Qualified.
  const uploadUnlocked = canUpload && isQualified(record.certificateStatus);
  const lockedTip = "Locked — unlocks when the Certificate Status is Qualified";

  const handlePick = (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // allow picking the same file again later (e.g. re-upload after a fix)
    if (file) onUpload(record, file);
  };

  const open = async (download) => {
    setOpening(download ? "download" : "view");
    try {
      await openCertificate(studentId, record, { download });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setOpening("");
    }
  };

  return (
    <div className="border-t border-slate-100 mt-3 pt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-slate-500">Certificate</div>
        {/* Only roles that can verify (HOD/Admin) see this; it stays disabled until a file is uploaded. */}
        {canVerify && (
          <VerificationBadge hasCertificate={hasCertificate} verified={record.verified} verifying={verifying} onToggle={() => onToggleVerify(record, !record.verified)} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {hasCertificate ? (
          <>
            <span className="text-sm w-full break-all mb-1">{record.certificateFileName || "Certificate on file"}</span>
            <button type="button" className={`${linkBtn} -ml-3`} onClick={() => open(false)} disabled={!!opening}>{opening === "view" ? "Opening…" : "View"}</button>
            <button type="button" className={linkBtn} onClick={() => open(true)} disabled={!!opening}>{opening === "download" ? "Downloading…" : "Download"}</button>
            {canUpload && (
              <button
                type="button"
                className={`text-sm px-3 py-2 -my-1 rounded-lg ${uploadUnlocked ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 cursor-not-allowed"}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !uploadUnlocked}
                title={uploadUnlocked ? "" : lockedTip}
              >
                {!uploadUnlocked ? "🔒 Replace" : uploading ? "Uploading..." : "Replace"}
              </button>
            )}
          </>
        ) : canUpload ? (
          <button
            type="button"
            className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !uploadUnlocked}
            title={uploadUnlocked ? "" : lockedTip}
          >
            {!uploadUnlocked ? "🔒 Upload certificate" : uploading ? "Uploading..." : "Upload certificate"}
          </button>
        ) : (
          <span className="text-sm text-slate-500">No certificate uploaded yet.</span>
        )}
        {canUpload && <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handlePick} />}
      </div>
      {canUpload && (
        <p className="text-[11px] text-slate-500 mt-1.5">
          {uploadUnlocked ? "PDF, JPG, JPEG or PNG. Max 10MB." : "Locked: set the Certificate Status to Qualified (Update Course Details) to upload the certificate."}
        </p>
      )}
    </div>
  );
}

// Student details + every NPTEL course. A right-hand drawer on tablets/desktops, a full bottom
// sheet on phones (drag the handle down to close).
export default function StudentDetailPanel({
  student, onClose,
  canManageRecords, canUploadCertificate, canVerify,
  onEditStudent, onDeleteStudent, onAddRecord, onEditRecord, onUploadCertificate, onToggleVerify,
  uploadingRecordId, verifyingRecordId,
}) {
  if (!student) return null;
  const qualifiedOf = (r) => isQualified(r.certificateStatus);

  return (
    <Modal variant="drawer" z="z-50" title={student.name} subtitle={student.registerNumber} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Detail label="Programme" value={student.programme} />
        <Detail label="School" value={student.school} />
        <Detail label="Academic Year" value={student.academicYear} />
        <Detail label="Year" value={student.year} />
        <Detail label="Section" value={student.section} />
      </div>
      {(onEditStudent || onDeleteStudent) && (
        <div className="flex items-center gap-3 mt-4">
          {onEditStudent && <button className="btn-secondary text-sm" onClick={() => onEditStudent(student)}>Edit details</button>}
          {onDeleteStudent && <button className="text-sm text-rose-600 font-medium px-3 py-2 rounded-lg hover:bg-rose-50 active:bg-rose-100 ml-auto" onClick={() => onDeleteStudent(student)}>Delete student</button>}
        </div>
      )}

      <div className="border-t border-slate-100 mt-5 pt-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="text-base font-semibold">
            NPTEL courses <span className="text-slate-500 text-xs font-normal">({student.nptelRecords.length})</span>
          </h4>
          {canManageRecords && <button className="btn-secondary text-sm" onClick={() => onAddRecord(student)}>+ Add course</button>}
        </div>

        {student.nptelRecords.length === 0 && <p className="text-sm text-slate-500">No NPTEL courses recorded yet.</p>}

        <div className="space-y-4">
          {student.nptelRecords.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm break-words">{r.courseName}</div>
                  <div className="text-xs text-slate-500">{r.courseId}</div>
                </div>
                <CertBadge status={r.certificateStatus} />
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <Detail label="Institution" value={r.instructorInstitute} />
                <Detail label="Duration" value={r.courseDuration} />
                <Detail label="Start Date" value={fmtDate(r.courseStartDate)} />
                <Detail label="End Date" value={fmtDate(r.courseEndDate)} />
                <Detail label="Enrollment" value={r.enrollmentStatus ? "Enrolled" : "Not Enrolled"} />
                <Detail label="Assignments" value={qualifiedOf(r) ? "Completed" : r.assignmentStatus} />
                <Detail label="Exam Registration" value={r.examRegistrationStatus ? "Registered" : "Not Registered"} />
                <Detail label="Exam Status" value={r.examStatus} />
                <Detail label="Certificate" value={qualifiedOf(r) ? "Qualified" : "Not Qualified"} />
                <Detail label="Score" value={qualifiedOf(r) ? r.score : ""} />
                <Detail label="Grade" value={qualifiedOf(r) ? r.grade : ""} />
                <Detail label="Certificate Received" value={fmtDate(r.certificateReceivedDate)} />
              </div>

              {r.remarks && <div className="mt-3"><Detail label="Remarks" value={r.remarks} /></div>}

              <CertificateBlock
                studentId={student._id}
                record={r}
                canUpload={canUploadCertificate}
                uploading={uploadingRecordId === r._id}
                onUpload={onUploadCertificate}
                canVerify={canVerify}
                verifying={verifyingRecordId === r._id}
                onToggleVerify={onToggleVerify}
              />

              {canManageRecords && (
                <button className="text-sm text-blue-700 font-medium mt-3 px-3 py-2 -ml-3 rounded-lg hover:bg-blue-50 active:bg-blue-100" onClick={() => onEditRecord(student, r)}>
                  Update course details
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
