// Makes sure the administrator login exists in the database. Run with:  npm run seed
//
// The admin username/password come from backend/.env (ADMIN_USERNAME / ADMIN_PASSWORD). If no
// password is set, a random one is generated and printed ONCE below. Nothing else is created:
// Staff and HOD logins are made by the admin from the Accounts tab, student data is not touched.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { migrateUsers } = require("../utils/migrate");

const run = async () => {
  await connectDB();
  await migrateUsers();
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
