import { programmeLabel } from "../data/hierarchy";
import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import ModernFilters from "../components/ModernFilters";
import CourseTable, { countStudents, countCourseRows } from "../components/CourseTable";
import Breadcrumb from "../components/Breadcrumb";
import { CalendarIcon, NavDashboardIcon, NavRecordsIcon, NavAccountsIcon, NavSessionsIcon } from "../components/Icons";
import Tabs from "../components/Tabs";
import WelcomeBanner from "../components/WelcomeBanner";
import { useAuth } from "../context/AuthContext";
import { StatCardsSkeleton, ListSkeleton } from "../components/Skeleton";
import ExportMenu from "../components/ExportMenu";
import UserManagement from "../components/UserManagement";
import StudentDetailPanel from "../components/StudentDetailPanel";
import StatCard from "../components/StatCard";
import { StatusPieChart, DepartmentBarChart } from "../components/Charts";
import { useSessions } from "../context/SessionsContext";
import SessionManagement from "../components/SessionManagement";
import { useToast } from "../context/ToastContext";
import api from "../api";
import { useDebounced } from "../hooks/useDebounced";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: (on) => <NavDashboardIcon active={on} /> },
  { key: "records", label: "Records", icon: (on) => <NavRecordsIcon active={on} /> },
  { key: "accounts", label: "Accounts", icon: (on) => <NavAccountsIcon active={on} /> },
  { key: "sessions", label: "Sessions", icon: (on) => <NavSessionsIcon active={on} /> },
];

export default function AdminDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const sessions = useSessions();
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({});
  const query = useDebounced(filters); // what is actually sent to the server (waits for typing to pause)
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "records" | "accounts" | "sessions"

  const [viewStudentId, setViewStudentId] = useState(null);
  const [verifyingRecordId, setVerifyingRecordId] = useState(null);

  const requiredFiltersMet = !!filters.department;
  const viewStudent = students.find((s) => s._id === viewStudentId) || null;

  const scopedParams = useCallback(() => {
    const params = { ...query };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    return params;
  }, [query]);

  // Analytics is aggregate and scopes to whatever's selected so far (even just a
  // School), independent of the stricter Department+Year+Section gate that governs
  // the raw student list below.
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
    if (!requiredFiltersMet) {
      setStudents([]);
      return;
    }
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
  }, [scopedParams, requiredFiltersMet]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

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

  const scopeLabel = [programmeLabel(filters.department), filters.school].filter(Boolean).join(" · ")
    || "All Schools of Excellence · full hierarchy view";

  return (
    <Layout>
      <Breadcrumb items={["Schools of Excellence", filters.school || "All schools", filters.department || "All programmes"]} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Admin dashboard</h2>
          <p className="text-navy-light text-sm mt-1.5">{scopeLabel}</p>
        </div>
        <ExportMenu
          scope={{ school: filters.school, department: filters.department }}
          options={{
            title: `${programmeLabel(filters.department) || filters.school || "All Schools"} - NPTEL Report`,
            subtitle: filters.school || "",
            fileBase: `${programmeLabel(filters.department) || filters.school || "All"}_nptel_report`,
            showOrg: true,
            showVerified: true,
          }}
        />
      </div>

      <WelcomeBanner user={user} roleLabel="Administrator" scope={scopeLabel} summary={summary} showPending />

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {loadError && (
        <div className="mb-6 text-sm text-brick bg-brick/10 border border-brick/30 rounded-lg px-3 py-2">{loadError}</div>
      )}

      {activeTab === "dashboard" && (summary ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-sm text-navy-light">
              {programmeLabel(filters.department) || filters.school || "All schools of excellence"}
            </p>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 w-full sm:w-auto">
              <span className="inline-flex items-center gap-1.5 text-blue-600"><CalendarIcon /> Session</span>
              <select
                className="field"
                value={filters.session || ""}
                onChange={(e) => setFilters({ ...filters, session: e.target.value })}
              >
                <option value="">All sessions</option>
                {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            <StatCard glow label="Total students" tone="blue" value={summary.totalStudents} subtitle="Unique register numbers" />
            <StatCard glow label="Enrollments" tone="amber" value={summary.totalEnrollments} subtitle={`Courses, of ${summary.totalCourses} added`} />
            <StatCard glow label="Exam registrations" tone="violet" value={summary.examRegistrations} subtitle={`Courses, of ${summary.totalEnrollments} enrolled`} />
            <StatCard glow label="Qualified" tone="sky" value={summary.certificatesReceived} subtitle={`${summary.certificatesVerified} verified`} highlight />
          </div>
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="chart-glow chart-glow-violet"><StatusPieChart summary={summary} /></div>
            <div className="chart-glow chart-glow-blue"><DepartmentBarChart byDepartment={summary.byDepartment} /></div>
          </div>
        </>
      ) : summaryLoading ? (
        <StatCardsSkeleton />
      ) : null)}

      {activeTab === "records" && (
        <>
          <div className="mb-6">
            <ModernFilters value={filters} onChange={setFilters} editableOrg />
          </div>

          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
              <StatCard glow label="Total students" tone="blue" value={summary.totalStudents} subtitle={filters.department ? "In this programme" : filters.school ? "In this school" : "Across all schools"} />
              <StatCard glow label="Enrollments" tone="amber" value={summary.totalEnrollments} subtitle={`Courses · ${summary.enrolledStudentsCount} student${summary.enrolledStudentsCount !== 1 ? "s" : ""} (${summary.enrollmentRate}%)`} />
              <StatCard glow label="Exam registrations" tone="violet" value={summary.examRegistrations} subtitle={`Courses, of ${summary.totalEnrollments} enrolled`} />
              <StatCard glow label="Qualified" tone="sky" value={summary.certificatesReceived} subtitle={`${summary.certificatesVerified} verified`} highlight />
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-line">
              <h3 className="text-lg font-semibold">
                Student records{requiredFiltersMet && <span className="text-navy-light text-sm font-normal"> ({countStudents(students)} students · {countCourseRows(students)} courses)</span>}
              </h3>
            </div>
            {!requiredFiltersMet ? (
              <p className="p-10 text-center text-navy-light">Select a school and programme to view student records.</p>
            ) : loading && !students.length ? (
              <ListSkeleton />
            ) : (
              <CourseTable
                bare
                showExam
                students={students}
                onViewStudent={(s) => setViewStudentId(s._id)}
                onToggleVerify={handleToggleVerify}
                verifyingRecordId={verifyingRecordId}
              />
            )}
          </div>
        </>
      )}

      {activeTab === "accounts" && <UserManagement />}
      {activeTab === "sessions" && <SessionManagement />}

      {viewStudent && (
        <StudentDetailPanel
          student={viewStudent}
          onClose={() => setViewStudentId(null)}
          canVerify
          onToggleVerify={(record, verified) => handleToggleVerify(viewStudent, record, verified)}
          verifyingRecordId={verifyingRecordId}
        />
      )}
    </Layout>
  );
}
