// One password rule for the whole backend.
const validatePassword = (pw, min = 8) => {
  const p = String(pw ?? "");
  if (p.length < min) return `Password must be at least ${min} characters`;
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Password must contain at least one letter and one number";
  return null;
};

module.exports = { validatePassword };
