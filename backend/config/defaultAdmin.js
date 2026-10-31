// The administrator login that is stored in the database the first time the server starts.
// Every Staff and HOD login is created by this admin from the Accounts tab.
//
// Set both in backend/.env:
//   ADMIN_USERNAME=...   (not case-sensitive)
//   ADMIN_PASSWORD=...   (at least 10 characters, with letters and numbers)
//
// There is NO built-in password. If ADMIN_PASSWORD is not set when the admin is first created,
// a random one is generated and printed once in the server console (see utils/migrate.js).
module.exports = {
  name: "System Admin",
  username: (process.env.ADMIN_USERNAME || "Admin@gurunanakedu.com").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "",
};
