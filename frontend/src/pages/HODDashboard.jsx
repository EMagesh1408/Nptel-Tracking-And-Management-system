import { programmeLabel } from "../data/hierarchy";
import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import Breadcrumb from "../components/Breadcrumb";
import ModernFilters from "../components/ModernFilters";
import CourseTable, { countStudents, countCourseRows } from "../components/CourseTable";
import { PlusIcon, UploadIcon, NavDashboardIcon, NavRecordsIcon, NavAddIcon, NavUploadIcon, NavExportIcon } from "../components/Icons";
import Tabs from "../components/Tabs";
import WelcomeBanner from "../components/WelcomeBanner";
import { StatCardsSkeleton, ListSkeleton } from "../components/Skeleton";
import ExportMenu from "../components/ExportMenu";
import StudentDetailPanel from "../components/StudentDetailPanel";
import StudentFormModal from "../components/StudentFormModal";
import ExcelUploadModal from "../components/ExcelUploadModal";
import StatCard from "../components/StatCard";
import { StatusPieChart, SessionBarChart } from "../components/Charts";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../api";
import { useDebounced } from "../hooks/useDebounced";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: (on) => <NavDashboardIcon active={on} /> },
  { key: "records", label: "Records", icon: (on) => <NavRecordsIcon active={on} /> },
];

// Only certificates that have really been uploaded can be waiting for verification.
const isPendingVerification = (s) => s.nptelRecords.some((r) => r.certificateDocUrl && !r.verified);

export default function HODDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const lockedFilters = { school: user.school, department: user.department };

  const [activeTab, setActiveTab] = useState("records"); // "dashboard" | "records"
  const [recordsSubTab, setRecordsSubTab] = useState("all"); // all | pending

  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ ...lockedFilters, session: "", status: "", search: "" });
  const query = useDebounced(filters); // what is actually sent to the server (waits for typing to pause)

  const [viewStudentId, setViewStudentId] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [verifyingRecordId, setVerifyingRecordId] = useState(null);

  const viewStudent = students.find((s) => s._id === viewStudentId) || null;

  const scopedParams = useCallback(() => {
    const params = { ...query };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    return params;
  }, [query]);

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

  // HOD's department is already a bounded, reasonably-sized scope (unlike Admin's
  // whole-college view), so records show immediately rather than requiring further
  // narrowing -- matching the reference design.
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

  const saveStudent = async (form) => {
    await api.post("/students", form);
    setShowAddStudent(false);
    showToast("Student record added", "success");
    loadStudents();
    loadSummary();
  };

  const saveStudentEdit = async (form) => {
    await api.put(`/students/${editStudent._id}`, form);
    setEditStudent(null);
    showToast("Student details updated", "success");
    loadStudents();
  };

  const handleToggleVerify = async (student, record, verified) => {
    setVerifyingRecordId(record._id);
    try {
      await api.put(`/students/${student._id}/records/${record._id}/verify`, { verified });
      showToast(verified ? "Certificate marked as verified" : "Verification removed", "success");
      loadStudents();
      loadSummary();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update verification", "error");
    } finally {
      setVerifyingRecordId(null);
    }
  };

  const subTabs = [
    { key: "all", label: "All Records", count: countStudents(students) },
    { key: "pending", label: "Pending Verification", count: countStudents(students.filter(isPendingVerification)), hint: "Certificate uploaded but not yet verified" },
  ];

  const visibleStudents = students.filter((s) => {
    if (recordsSubTab === "all") return true;
    if (recordsSubTab === "pending") return isPendingVerification(s);
    return true;
  });

  const exportOptions = () => ({
    title: `${programmeLabel(user.department)} - NPTEL Report`,
    subtitle: user.school,
    fileBase: `${programmeLabel(user.department)}_nptel_report`,
    showVerified: true,
  });

  const statCards =
    summaryLoading && !summary ? (
      <StatCardsSkeleton />
    ) : summary ? (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <StatCard label="Total students" tone="blue" value={summary.totalStudents} subtitle="Unique register numbers" />
        <StatCard
          label="Enrollments" tone="amber"
          value={summary.totalEnrollments}
          subtitle={`Courses · ${summary.enrolledStudentsCount} student${summary.enrolledStudentsCount !== 1 ? "s" : ""} (${summary.enrollmentRate}%)`}
        />
        <StatCard label="Exam registrations" tone="violet" value={summary.examRegistrations} subtitle={`Courses, of ${summary.totalEnrollments} enrolled`} />
        <StatCard label="Qualified" tone="emerald" value={summary.certificatesReceived} subtitle={`${summary.certificatesVerified} verified`} accent="teal" highlight />
      </div>
    ) : null;

  return (
    <Layout>
      <Breadcrumb items={["Schools of Excellence", user.school, user.department]} />

      <div className="mb-5">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Programme dashboard</h2>
        <p className="text-navy-light text-sm mt-1.5">Manages student records and certificate reviews for the {programmeLabel(user.department)}.</p>
      </div>

      <WelcomeBanner
        user={user}
        roleLabel="Head of Programme"
        scope={programmeLabel(user.department)}
        summary={summary}
        showPending
        onPendingClick={() => { setActiveTab("records"); setRecordsSubTab("pending"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />

      <div className="action-bar hidden sm:flex flex-wrap gap-3 mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAddStudent(true)}><PlusIcon /> Add student record</button>
        <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setShowUpload(true)}><UploadIcon /> Upload Excel</button>
        <ExportMenu options={exportOptions()} open={showExport} onOpenChange={setShowExport} />
      </div>

      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        mobileItems={[
          { type: "tab", ...TABS[0] },
          { type: "tab", ...TABS[1] },
          { type: "action", key: "add", label: "Add", primary: true, icon: <NavAddIcon />, onClick: () => setShowAddStudent(true) },
          { type: "action", key: "upload", label: "Upload", icon: (on) => <NavUploadIcon active={on} />, onClick: () => setShowUpload(true) },
          { type: "action", key: "export", label: "Export", icon: (on) => <NavExportIcon active={on} />, onClick: () => setShowExport(true) },
        ]}
      />

      {loadError && (
        <div className="mb-6 text-sm text-brick bg-brick/10 border border-brick/30 px-3 py-2">{loadError}</div>
      )}

      {activeTab === "dashboard" && (
        <>
          {statCards}
          {summary && (
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <StatusPieChart summary={summary} />
              <SessionBarChart students={students} />
            </div>
          )}
        </>
      )}

      {activeTab === "records" && (
        <>
          <div className="mb-6">
            <ModernFilters value={filters} onChange={setFilters} lockedFilters={lockedFilters} />
          </div>

          {statCards}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4">
              <h3 className="text-lg font-semibold">
                Student records <span className="text-navy-light font-sans text-sm font-normal">({countStudents(visibleStudents)} students · {countCourseRows(visibleStudents)} courses)</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 sm:px-5 border-b border-line">
              {subTabs.map((t) => (
                <button key={t.key} className={`pill-tab ${recordsSubTab === t.key ? "active" : ""}`} onClick={() => setRecordsSubTab(t.key)} title={t.hint}>
                  {t.label} <span className="count">{t.count}</span>
                </button>
              ))}
            </div>
            {loading && !students.length ? (
              <div className="border-t border-line"><ListSkeleton /></div>
            ) : (
              <div className="border-t border-line">
                <CourseTable
                  bare
                  showExam
                  students={visibleStudents}
                  onViewStudent={(s) => setViewStudentId(s._id)}
                  onToggleVerify={handleToggleVerify}
                  verifyingRecordId={verifyingRecordId}
                />
              </div>
            )}
          </div>
        </>
      )}

      {viewStudent && (
        <StudentDetailPanel
          student={viewStudent}
          onClose={() => setViewStudentId(null)}
          canManageRecords={false}
          canUploadCertificate={false}
          canVerify
          onEditStudent={(s) => setEditStudent(s)}
          onToggleVerify={(record, verified) => handleToggleVerify(viewStudent, record, verified)}
          verifyingRecordId={verifyingRecordId}
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
    </Layout>
  );
}
