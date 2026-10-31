import { programmeLabel } from "../data/hierarchy";
import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import ModernFilters from "../components/ModernFilters";
import Breadcrumb from "../components/Breadcrumb";
import { PlusIcon, UploadIcon, NavDashboardIcon, NavRecordsIcon, NavAddIcon, NavUploadIcon, NavExportIcon } from "../components/Icons";
import Tabs from "../components/Tabs";
import WelcomeBanner from "../components/WelcomeBanner";
import { StatusPieChart } from "../components/Charts";
import { StatCardsSkeleton, ListSkeleton } from "../components/Skeleton";
import CourseTable, { countStudents, countCourseRows } from "../components/CourseTable";
import StudentDetailPanel from "../components/StudentDetailPanel";
import RecordModal from "../components/RecordModal";
import StudentFormModal from "../components/StudentFormModal";
import ExcelUploadModal from "../components/ExcelUploadModal";
import ConfirmDialog from "../components/ConfirmDialog";
import StatCard from "../components/StatCard";
import ExportMenu from "../components/ExportMenu";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../api";
import { useDebounced } from "../hooks/useDebounced";

const ALLOWED_CERT_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_CERT_SIZE = 10 * 1024 * 1024; // 10MB

export default function StaffDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const lockedFilters = { school: user.school, department: user.department };

  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ ...lockedFilters, session: "", status: "", search: "" });
  const query = useDebounced(filters); // what is actually sent to the server (waits for typing to pause)

  const [viewStudentId, setViewStudentId] = useState(null);
  const [recordTarget, setRecordTarget] = useState(null); // { student, record? }
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Phones only: the bottom bar switches between these two parts of the page. Tablets and desktops show both.
  const [mobileTab, setMobileTab] = useState("dashboard");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadingRecordId, setUploadingRecordId] = useState(null);

  // Staff's department is always locked to their own, so -- like HOD -- the list shows
  // by default; Session and search only narrow it further.
  const viewStudent = students.find((s) => s._id === viewStudentId) || null;

  const scopedParams = useCallback(() => {
    const params = { ...query };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    return params;
  }, [query]);

  // Analytics reflects the whole department by default (Staff's department is always
  // locked), independent of whether Year/Section have been picked -- only the raw
  // student list below is gated behind those.
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get("/analytics/summary", { params: scopedParams() });
      setSummary(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load analytics");
    } finally {
      setSummaryLoading(false);
    }
  }, [scopedParams]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/students", { params: scopedParams() });
      setStudents(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [scopedParams]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const saveRecord = async (form) => {
    const { student, record } = recordTarget;
    if (record) {
      await api.put(`/students/${student._id}/records/${record._id}`, form);
    } else {
      await api.post(`/students/${student._id}/records`, form);
    }
    setRecordTarget(null);
    showToast(record ? "NPTEL course updated" : "NPTEL course added", "success");
    loadStudents();
    loadSummary();
  };

  const saveStudent = async (form) => {
    await api.post("/students", form);
    setShowAddStudent(false);
    showToast("Student added", "success");
    loadStudents();
    loadSummary();
  };

  const saveStudentEdit = async (form) => {
    await api.put(`/students/${editStudent._id}`, form);
    setEditStudent(null);
    showToast("Student details updated", "success");
    loadStudents();
  };

  const confirmDelete = async () => {
    const s = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/students/${s._id}`);
      if (viewStudentId === s._id) setViewStudentId(null);
      showToast(`${s.name} removed`, "success");
      loadStudents();
      loadSummary();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete this student", "error");
    }
  };

  const handleUploadCertificate = async (record, file) => {
    if (!ALLOWED_CERT_TYPES.includes(file.type)) {
      showToast("Only PDF, JPG, JPEG, or PNG files are allowed", "error");
      return;
    }
    if (file.size > MAX_CERT_SIZE) {
      showToast("File is too large. Maximum size is 10MB.", "error");
      return;
    }
    setUploadingRecordId(record._id);
    try {
      const formData = new FormData();
      formData.append("certificate", file);
      await api.post(`/students/${viewStudent._id}/records/${record._id}/certificate`, formData);
      showToast("Certificate uploaded successfully", "success");
      loadStudents();
      loadSummary();
    } catch (err) {
      showToast(err.response?.data?.message || "Certificate upload failed", "error");
    } finally {
      setUploadingRecordId(null);
    }
  };

  return (
    <Layout>
      <div className={mobileTab === "dashboard" ? "" : "hidden sm:block"}>
      <Breadcrumb items={["Schools of Excellence", user.school, user.department]} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Staff dashboard</h2>
          <p className="text-navy-light text-sm mt-1.5">Collect and update NPTEL information for the students of the {programmeLabel(user.department)}.</p>
        </div>
        <div className="action-bar hidden sm:flex flex-wrap gap-3">
          <ExportMenu
            open={showExport}
            onOpenChange={setShowExport}
            options={{
              title: `${programmeLabel(user.department)} - NPTEL Report`,
              subtitle: user.school,
              fileBase: `${programmeLabel(user.department)}_nptel_report`,
            }}
          />
          <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setShowUpload(true)}><UploadIcon /> Upload Excel</button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAddStudent(true)}><PlusIcon /> Add student</button>
        </div>
      </div>

      <WelcomeBanner user={user} roleLabel="Staff" scope={programmeLabel(user.department)} summary={summary} />

      {summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <StatCard label="Total Students" tone="blue" value={summary.totalStudents} subtitle="Unique register numbers" />
          <StatCard label="Enrollments" tone="amber" value={summary.totalEnrollments} accent="brass" subtitle={`Courses, of ${summary.totalCourses} added`} />
          <StatCard label="Exam Registrations" tone="violet" value={summary.examRegistrations} accent="teal" subtitle={`Courses, of ${summary.totalEnrollments} enrolled`} />
          <StatCard label="Qualified" tone="sky" value={summary.certificatesReceived} accent="teal" subtitle={`Courses, of ${summary.totalEnrollments} enrolled`} />
        </div>
      ) : summaryLoading ? (
        <StatCardsSkeleton />
      ) : null}

      {/* Phones: the progress chart fills the Dashboard tab (on larger screens the page stays as before). */}
      {summary && <div className="sm:hidden mb-4"><StatusPieChart summary={summary} /></div>}
      </div>

      <div className={mobileTab === "records" ? "" : "hidden sm:block"}>
      <div className="mb-4">
        {/* School/Department are hidden: a staff account can never browse into another
            school or department, only filter within their own. */}
        <ModernFilters value={filters} onChange={setFilters} lockedFilters={lockedFilters} hideOrg />
      </div>

      {loadError && (
        <div className="mb-6 text-sm text-brick bg-brick/10 border border-brick/30 px-3 py-2">{loadError}</div>
      )}

      <p className="text-xs text-navy-light mb-3">
        {loading
          ? "Loading records..."
          : `Showing ${countStudents(students)} student${countStudents(students) !== 1 ? "s" : ""} · ${countCourseRows(students)} course record${countCourseRows(students) !== 1 ? "s" : ""}`}
      </p>

      {loading && !students.length ? (
        <div className="rounded-xl border border-line bg-white overflow-hidden"><ListSkeleton /></div>
      ) : (
        <CourseTable
          students={students}
          onViewStudent={(s) => setViewStudentId(s._id)}
          onAddRecord={(s) => setRecordTarget({ student: s })}
          showVerification={false}
        />
      )}

      </div>

      <Tabs
        desktop={false}
        active={mobileTab}
        onChange={setMobileTab}
        mobileItems={[
          { type: "tab", key: "dashboard", label: "Dashboard", icon: (on) => <NavDashboardIcon active={on} /> },
          { type: "tab", key: "records", label: "Records", icon: (on) => <NavRecordsIcon active={on} /> },
          { type: "action", key: "add", label: "Add", primary: true, icon: <NavAddIcon />, onClick: () => setShowAddStudent(true) },
          { type: "action", key: "upload", label: "Upload", icon: (on) => <NavUploadIcon active={on} />, onClick: () => setShowUpload(true) },
          { type: "action", key: "export", label: "Export", icon: (on) => <NavExportIcon active={on} />, onClick: () => setShowExport(true) },
        ]}
      />

      {viewStudent && (
        <StudentDetailPanel
          student={viewStudent}
          onClose={() => setViewStudentId(null)}
          canManageRecords
          canUploadCertificate
          onEditStudent={(s) => setEditStudent(s)}
          onDeleteStudent={(s) => setDeleteTarget(s)}
          onAddRecord={(s) => setRecordTarget({ student: s })}
          onEditRecord={(s, r) => setRecordTarget({ student: s, record: r })}
          onUploadCertificate={handleUploadCertificate}
          uploadingRecordId={uploadingRecordId}
        />
      )}

      {recordTarget && (
        <RecordModal
          student={recordTarget.student}
          record={recordTarget.record}
          onClose={() => setRecordTarget(null)}
          onSave={saveRecord}
        />
      )}

      {showAddStudent && (
        <StudentFormModal
          lockSchool={user.school}
          lockDepartment={user.department}
          onClose={() => setShowAddStudent(false)}
          onSave={saveStudent}
        />
      )}

      {editStudent && (
        <StudentFormModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSave={saveStudentEdit}
        />
      )}

      {showUpload && (
        <ExcelUploadModal
          school={user.school}
          department={user.department}
          onClose={() => setShowUpload(false)}
          onDone={() => { loadStudents(); loadSummary(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete student?"
          message={`Remove ${deleteTarget.name} (${deleteTarget.registerNumber})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}
