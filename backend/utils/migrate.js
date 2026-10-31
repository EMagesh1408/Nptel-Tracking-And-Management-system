const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Session = require("../models/Session");
const defaultAdmin = require("../config/defaultAdmin");
const { validatePassword } = require("./password");
const { DEFAULT_SESSIONS } = require("./sessions");

// Runs on every server start; safe to run repeatedly.
//  1. Drops the old unique index on `email` (admin-created accounts have no email).
//  2. Gives every pre-existing account a username (its old email), so nobody is locked out.
//  3. Permanently erases the old "viewable password" copies that earlier versions kept
//     (passwords are now stored ONLY as one-way bcrypt hashes).
//  4. Makes sure the administrator login exists.
//  5. Adds the default NPTEL sessions on the very first start.
const migrateUsers = async () => {
  try {
    const indexes = await User.collection.indexes();
    if (indexes.some((i) => i.name === "email_1")) {
      await User.collection.dropIndex("email_1");
      console.log("Migration: dropped legacy unique index on users.email");
    }
  } catch (err) {
    console.warn("Migration (email index) skipped:", err.message);
  }

  try {
    const legacy = await User.find({ $or: [{ username: { $exists: false } }, { username: null }, { username: "" }] });
    for (const u of legacy) {
      const candidate = (u.email || "").toLowerCase();
      if (candidate) await User.updateOne({ _id: u._id }, { $set: { username: candidate } });
    }
    if (legacy.length) console.log(`Migration: gave ${legacy.length} existing account(s) a username`);
    await User.init();
  } catch (err) {
    console.warn("Migration (usernames) skipped:", err.message);
  }

  try {
    // Native driver on purpose: the field no longer exists in the schema.
    const wiped = await User.collection.updateMany({ passwordCipher: { $exists: true } }, { $unset: { passwordCipher: "" } });
    if (wiped.modifiedCount) console.log(`Security: erased stored recoverable passwords of ${wiped.modifiedCount} account(s)`);
  } catch (err) {
    console.warn("Migration (password copies) skipped:", err.message);
  }

  await ensureDefaultAdmin();
  await ensureDefaultSessions();
};

async function ensureDefaultSessions() {
  try {
    if ((await Session.countDocuments()) > 0) return;
    await Session.insertMany(DEFAULT_SESSIONS.map((name) => ({ name })), { ordered: false });
    console.log(`Sessions: added ${DEFAULT_SESSIONS.length} default sessions`);
  } catch (err) {
    console.warn("Could not add default sessions:", err.message);
  }
}

// 16 random characters, always containing letters and digits.
const randomPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  while (p.length < 16) p += chars[crypto.randomInt(chars.length)];
  return /\d/.test(p) && /[A-Za-z]/.test(p) ? p : randomPassword();
};

const LEGACY_ADMIN_USERNAMES = ["admin@college.edu", "admin"];
// Old versions shipped with this well-known password. If it still works, the admin is told to change it.
const OLD_PUBLIC_PASSWORD = "Admin123";

const ensureDefaultAdmin = async () => {
  try {
    const existing = await User.findOne({ username: defaultAdmin.username });
    if (existing) {
      if (await bcrypt.compare(OLD_PUBLIC_PASSWORD, existing.password)) {
        const fromEnv = defaultAdmin.password;
        if (fromEnv && fromEnv !== OLD_PUBLIC_PASSWORD && !validatePassword(fromEnv, 10)) {
          // The admin still has the old public password but a strong one is waiting in .env: swap it in.
          existing.password = fromEnv; // hashed by the pre-save hook; also signs out old sessions
          await existing.save();
          console.log(`Security: the old public admin password was replaced with ADMIN_PASSWORD from backend/.env (${existing.username}).`);
        } else {
          console.warn(
            "\n!!! SECURITY WARNING !!!\n" +
              `The admin password (${existing.username}) is still the old public default; anyone who has seen the source code can sign in.\n` +
              "Fix in 1 minute: open backend/.env, set  ADMIN_PASSWORD=<10+ characters, letters and numbers>  and restart the server.\n" +
              "(Or run:  npm run reset-admin)\n"
          );
        }
      }
      return;
    }

    let password = defaultAdmin.password;
    let generated = false;
    if (!password || validatePassword(password, 10)) {
      if (password) console.warn("ADMIN_PASSWORD in .env is too weak (need 10+ characters with letters and numbers); generating a random one instead.");
      password = randomPassword();
      generated = true;
    }

    const legacy = await User.findOne({ role: "admin", username: { $in: LEGACY_ADMIN_USERNAMES } });
    if (legacy) {
      legacy.username = defaultAdmin.username;
      legacy.password = password; // hashed by the pre-save hook
      legacy.email = undefined;
      await legacy.save();
    } else {
      await User.create({ name: defaultAdmin.name, username: defaultAdmin.username, password, role: "admin" });
    }
    console.log(`Admin login created -> ${defaultAdmin.username}`);
    if (generated) {
      console.log(
        "\n================ ADMIN LOGIN (shown only once) ================\n" +
          `  Username : ${defaultAdmin.username}\n` +
          `  Password : ${password}\n` +
          "  Save it now. After signing in, create Staff/HOD accounts from the Accounts tab.\n" +
          "===============================================================\n"
      );
    }
  } catch (err) {
    console.warn("Could not ensure the admin account:", err.message);
  }
};

module.exports = { migrateUsers, ensureDefaultAdmin };
