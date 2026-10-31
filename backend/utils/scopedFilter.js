const { str, escapeRegex } = require("./query");

// Builds a Mongo filter that scopes results to what the logged-in user is allowed to see.
// CRITICAL: for staff and hod, school/department are forced from the user's own account and
// CANNOT be overridden by query params. Only admin may filter freely across the whole hierarchy.
//
// Shared by /api/students and /api/analytics/summary so a selection narrows the list AND the
// dashboard stats identically. Every query value is turned into plain text first (see utils/query.js)
// so nothing a visitor sends can become a database operator or a runaway regular expression.
const buildScopedFilter = (req) => {
  const filter = {};
  const { role, school, department, programme } = req.user;
  const q = req.query;

  if (role === "staff" || role === "hod") {
    if (school) filter.school = school;
    if (department) filter.department = department;
    // A programme-locked account keeps that programme; otherwise the Programme filter may narrow
    // within the account's own department.
    const qProg = str(q.programme);
    if (programme) filter.programme = programme;
    else if (qProg) filter.programme = qProg;
  } else if (role === "admin") {
    if (str(q.school)) filter.school = str(q.school);
    if (str(q.department)) filter.department = str(q.department);
    if (str(q.programme)) filter.programme = str(q.programme);
  }

  if (str(q.academicYear)) filter.academicYear = str(q.academicYear);
  if (str(q.year)) filter.year = str(q.year);
  if (str(q.section)) filter.section = str(q.section);
  if (str(q.session)) filter["nptelRecords.session"] = str(q.session);
  if (str(q.status)) filter["nptelRecords.status"] = str(q.status);
  if (str(q.course, 80)) filter["nptelRecords.courseName"] = { $regex: escapeRegex(str(q.course, 80)), $options: "i" };

  return filter;
};

module.exports = { buildScopedFilter };
