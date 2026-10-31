// One place that decides how a signed-in person is named across the app.
// `fullName` is the real person's name set by the admin (e.g. "Dr. S. Ramesh").
// Older accounts do not have one yet, so every helper falls back gracefully.

export const ROLE_LABEL = { admin: "Administrator", hod: "Head of Programme", staff: "Staff" };

// Name to show for a person; falls back to the account label (never empty).
export const personName = (user) => (user?.fullName || "").trim() || (user?.name || "").trim() || "User";

// True when the admin has entered the person's real name.
export const hasPersonName = (user) => !!(user?.fullName || "").trim();

// Honorifics and bare initials are skipped so "Dr. S. Ramesh" gives "R", not "DS".
const SKIP = /^(dr|prof|mr|mrs|ms|miss|sri|smt|er)\.?$/i;
export const initialsOf = (user) => {
  const words = personName(user)
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((w) => !SKIP.test(w));
  const real = words.filter((w) => w.replace(/\./g, "").length > 1);
  const pool = real.length ? real : words;
  const pick = pool.length > 1 ? [pool[0], pool[pool.length - 1]] : pool.slice(0, 1);
  return pick.map((w) => w[0].toUpperCase()).join("") || "?";
};

// Name for greetings ("Good afternoon, Dr. S. Ramesh"). Empty when an HOD / staff account has no
// real name yet, so the app never greets someone with an account label like "Hod-Computer science".
export const greetName = (user) => {
  if ((user?.fullName || "").trim()) return user.fullName.trim();
  return user?.role === "admin" ? (user?.name || "").trim() : "";
};

// "Good morning" / "Good afternoon" ... for a given hour (0-23).
export const greetingFor = (h) => (h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night");
