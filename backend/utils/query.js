// Helpers that make sure values from the URL are plain text before they reach a database query.
// (Express can turn ?year[$ne]=x into an object -- these make that impossible to exploit.)
const str = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { str, escapeRegex };
