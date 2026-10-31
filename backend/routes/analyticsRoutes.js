const express = require("express");
const Student = require("../models/Student");
const { protect } = require("../middleware/authMiddleware");
const { sendError } = require("../utils/errors");
const { buildScopedFilter } = require("../utils/scopedFilter");
const { normalizeRecord } = require("../utils/academic");
const { str } = require("../utils/query");

const router = express.Router();
router.use(protect);

// GET /api/analytics/summary
// Returns totals + status breakdown, scoped to the logged-in user's role AND to
// whatever School/Department/Programme/Year/Section/Status the dashboard currently
// has selected -- so picking a Department on the Admin dashboard narrows the stat
// cards and charts to that department, not the whole college.
router.get("/summary", async (req, res) => {
  try {
    const matchStage = buildScopedFilter(req);
    const sessionName = str(req.query.session);
    const students = await Student.find(matchStage);

    // ONE counting rule for every card and chart:
    //   totalStudents        = distinct register numbers in the current selection
    //   totalEnrollments     = course records where the student is enrolled
    //   examRegistrations    = course records with exam registration
    //   certificatesReceived = course records whose student is Qualified (certificate status)
    //   certificatesVerified = course records whose uploaded certificate was verified
    // The first is a count of people, the rest are counts of courses -- exactly the rows
    // the table below shows. Every record is normalised first (see normalizeRecord) so old
    // inconsistent data (e.g. certificate received but "not enrolled") counts correctly.
    const seenStudents = new Set();
    const enrolledStudents = new Set();
    const qualifiedStudents = new Set(); // people with at least one Qualified course
    let totalEnrollments = 0;
    let examRegistrations = 0;
    let certificatesReceived = 0;
    let certificatesVerified = 0;
    let totalCourses = 0;

    const statusCounts = {
      "Not Enrolled": 0,
      "Enrolled": 0,
      "Course Completed": 0,
      "Exam Registered": 0,
      "Exam Attended": 0,
      "Qualified": 0,
    };
    const byDepartment = {};

    students.forEach((s) => {
      const key = String(s.registerNumber).toUpperCase();
      const isNewStudent = !seenStudents.has(key);
      seenStudents.add(key);

      const dep = (byDepartment[s.department] = byDepartment[s.department] || {
        department: s.department, students: 0, certificates: 0, _seen: new Set(),
      });
      if (!dep._seen.has(key)) { dep._seen.add(key); dep.students += 1; }

      // With a Session selected, only that session's courses are counted.
      const records = sessionName ? s.nptelRecords.filter((r) => r.session === sessionName) : s.nptelRecords;
      records.forEach((raw) => {
        const r = normalizeRecord({ ...raw.toObject() });
        totalCourses += 1;
        if (r.enrollmentStatus) { totalEnrollments += 1; enrolledStudents.add(key); }
        if (r.examRegistrationStatus) examRegistrations += 1;
        if (r.certificateStatus === "Qualified") { certificatesReceived += 1; dep.certificates += 1; qualifiedStudents.add(key); }
        if (r.verified) certificatesVerified += 1;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });
    });

    const totalStudents = seenStudents.size;
    const enrolledStudentsCount = enrolledStudents.size;

    res.json({
      totalStudents,
      totalCourses,
      totalEnrollments,
      examRegistrations,
      certificatesReceived,
      certificatesVerified,
      qualifiedStudents: qualifiedStudents.size,
      enrolledStudentsCount,
      enrollmentRate: totalStudents ? Math.round((enrolledStudentsCount / totalStudents) * 100) : 0,
      pending: certificatesReceived - certificatesVerified,
      completionRate: totalEnrollments ? Math.round((certificatesReceived / totalEnrollments) * 100) : 0,
      statusCounts,
      byDepartment: Object.values(byDepartment).map(({ _seen, ...d }) => d),
    });
  } catch (err) {
    sendError(err, res);
  }
});

module.exports = router;
