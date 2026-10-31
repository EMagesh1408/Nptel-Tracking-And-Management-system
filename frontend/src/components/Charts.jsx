import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { isQualified, programmeLabel } from "../data/hierarchy";
import { useSessions } from "../context/SessionsContext";

const tooltipStyle = { border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.12)" };
const cardClass = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";

// Each course record is counted exactly once, in the furthest stage it has reached, so the
// slices add up to the number of course rows in the table -- the earlier version mixed
// students with courses, which is why the numbers never lined up.
const STAGE_COLORS = {
  "Not Enrolled": "#CBD5E1",
  "Enrolled": "#F59E0B",
  "Course Completed": "#14B8A6",
  "Exam Registered": "#8B5CF6",
  "Exam Attended": "#3B82F6",
  "Qualified": "#0EA5E9",
};

export function StatusPieChart({ summary }) {
  const data = Object.entries(summary.statusCounts || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  return (
    <div className={cardClass}>
      <h3 className="text-base font-semibold">NPTEL progress overview</h3>
      <p className="text-xs text-slate-500 mb-2">Every course record counted once, at the stage it has reached</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="44%" innerRadius={62} outerRadius={98} paddingAngle={2} cornerRadius={6}>
              {data.map((d) => (
                <Cell key={d.name} fill={STAGE_COLORS[d.name] || "#94A3B8"} stroke="#FFFFFF" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center" style={{ top: "44%", transform: "translate(-50%, -50%)" }}>
          <div className="text-2xl font-bold text-slate-900 leading-none">{summary.totalCourses}</div>
          <div className="text-[11px] text-slate-500 mt-1">course records</div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentBarChart({ byDepartment }) {
  return (
    <div className={cardClass}>
      <h3 className="text-base font-semibold">Students &amp; certificates by programme</h3>
      <p className="text-xs text-slate-500 mb-3">Certificates received compared with total students</p>
      {/* With dozens of programmes the bars would be unreadable on a phone, so the chart gets its own
          width and scrolls sideways inside the card (the page itself never scrolls sideways). */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div style={{ minWidth: Math.max(300, (byDepartment?.length || 0) * 56) }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={byDepartment} margin={{ left: -10 }} barGap={6}>
          <defs>
            <linearGradient id="gStudents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="gCerts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="department" tickFormatter={programmeLabel} tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-25} textAnchor="end" height={90} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F5F3FF" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />
          <Bar dataKey="students" name="Students" fill="url(#gStudents)" radius={[8, 8, 0, 0]} maxBarSize={38} />
          <Bar dataKey="certificates" name="Certificates" fill="url(#gCerts)" radius={[8, 8, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}

// HOD dashboard: students, enrollments and certificates recorded for each NPTEL session,
// from the HOD's own already-scoped list of students.
//   students     = distinct students who have any course in that session
//   enrollments  = that session's courses that have progressed past "Not Enrolled"
//   certificates = that session's courses with Certificate Status "Qualified"
export function SessionBarChart({ students }) {
  const shortLabel = (s) => s.replace(/^(\d{4}-\d{2}) (\w+)-\w+$/, "$1 $2");
  const allSessions = useSessions();
  // Oldest to newest, left to right; only sessions that have data (or the latest few when nothing does yet).
  const chronological = [...allSessions].reverse();
  const withData = chronological.filter((x) => students.some((s) => s.nptelRecords.some((r) => r.session === x)));
  const shown = withData.length ? withData : chronological.slice(-4);
  const data = shown.map((session) => {
    const inSession = students.filter((s) => s.nptelRecords.some((r) => r.session === session));
    const records = inSession.flatMap((s) => s.nptelRecords.filter((r) => r.session === session));
    return {
      session: shortLabel(session),
      fullSession: session,
      students: new Set(inSession.map((s) => String(s.registerNumber).toUpperCase())).size,
      // A received certificate or an exam registration always implies enrollment.
      enrollments: records.filter((r) => r.enrollmentStatus || r.examRegistrationStatus || isQualified(r.certificateStatus)).length,
      certificates: records.filter((r) => isQualified(r.certificateStatus)).length,
    };
  });

  return (
    <div className={cardClass}>
      <h3 className="text-base font-semibold">Students, enrollments &amp; certificates by session</h3>
      <p className="text-xs text-slate-500 mb-3">How each NPTEL session is doing, in the current selection</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ left: -10 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="session" tick={{ fontSize: 10, fill: "#64748B" }} interval={0} angle={-25} textAnchor="end" height={70} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F8FAFC" }} labelFormatter={(_, p) => p?.[0]?.payload?.fullSession || ""} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />
          <Bar dataKey="students" name="Students" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="enrollments" name="Enrollments" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="certificates" name="Certificates" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
