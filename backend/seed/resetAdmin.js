// Sets a new password for the administrator login. Run with:  npm run reset-admin
// Use it if you forgot the admin password, or to replace the old public default.
//
//   Windows (PowerShell):  $env:NEW_ADMIN_PASSWORD="YourNewPass123"; npm run reset-admin
//   Mac / Linux:           NEW_ADMIN_PASSWORD="YourNewPass123" npm run reset-admin
// Or run `npm run reset-admin` alone and type the password when asked.
require("dotenv").config();
const readline = require("readline");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const defaultAdmin = require("../config/defaultAdmin");
const { validatePassword } = require("../utils/password");

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); resolve(a); });
  });

const run = async () => {
  const password = process.env.NEW_ADMIN_PASSWORD || (await ask("New admin password (10+ characters, letters and numbers): ")).trim();
  const problem = validatePassword(password, 10);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  await connectDB();
  const admin = await User.findOne({ role: "admin", username: defaultAdmin.username });
  if (!admin) {
    console.error(`No admin named "${defaultAdmin.username}" exists. Check ADMIN_USERNAME in backend/.env, or start the server once to create it.`);
    await mongoose.connection.close();
    process.exit(1);
  }
  admin.password = password; // hashed by the pre-save hook; also signs out every old session
  await admin.save();
  console.log(`Password updated for ${admin.username}. Every old admin session has been signed out.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
