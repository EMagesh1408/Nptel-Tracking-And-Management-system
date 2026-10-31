// "2026-27 July-December" -> academic year start 2026, session "July-December".
const SESSION_RE = /^(\d{4})-(\d{2}) ([A-Za-z0-9][A-Za-z0-9 -]{1,30})$/;
const TERM_ORDER = { "jan-april": 0, "july-december": 1 };

// Sorts newest academic year first, and within a year July-December before Jan-April.
const sortKeyFor = (name) => {
  const m = /^(\d{4})-\d{2}\s+(.+)$/.exec(String(name));
  if (!m) return 0;
  return Number(m[1]) * 10 + (TERM_ORDER[m[2].trim().toLowerCase()] ?? 2);
};
const byNewest = (a, b) => sortKeyFor(b) - sortKeyFor(a) || String(a).localeCompare(String(b));

// Returns an error message, or null when the name is a valid session name.
const validateSessionName = (name) => {
  const m = SESSION_RE.exec(name);
  if (!m) return 'Use the format "2027-28 Jan-April" (academic year, then the session name)';
  const start = Number(m[1]);
  if (start < 2000 || start > 2100) return "Academic year looks wrong";
  if (Number(m[2]) !== (start + 1) % 100) return `The academic year should read ${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  return null;
};

// The sessions every installation starts with (what used to be hard-coded in the frontend).
const DEFAULT_SESSIONS = [2023, 2024, 2025, 2026].flatMap((y) => {
  const ay = `${y}-${String(y + 1).slice(2)}`;
  return [`${ay} Jan-April`, `${ay} July-December`];
});

module.exports = { sortKeyFor, byNewest, validateSessionName, DEFAULT_SESSIONS };
