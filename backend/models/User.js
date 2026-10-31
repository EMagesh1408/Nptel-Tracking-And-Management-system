const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Letters, digits and . _ - @ (the @ keeps accounts that used to log in with an email working).
const USERNAME_RE = /^[a-z0-9][a-z0-9._@-]{2,39}$/;
const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    // Account label shown in the accounts list, e.g. "Staff - Computer Science".
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // The real person's name, e.g. "Dr. S. Ramesh". Used in the greeting, header and profile card.
    fullName: { type: String, trim: true, maxlength: 80, default: "" },
    // What the person types to sign in. Admin can create and rename it at any time.
    username: {
      type: String,
      lowercase: true,
      trim: true,
      match: [USERNAME_RE, "Username must be 3-40 characters: letters, numbers, dot, underscore or hyphen"],
      index: { unique: true, sparse: true },
    },
    // Legacy: older accounts signed in with an email. Kept only so they still work.
    email: { type: String, lowercase: true, trim: true },
    // ONLY a bcrypt hash is ever stored -- the real password cannot be read back by anyone.
    password: { type: String, required: true },
    role: { type: String, enum: ["staff", "hod", "admin"], required: true },
    school: { type: String, default: null },
    department: { type: String, default: null },
    programme: { type: String, default: null },
    // Admin can switch an account off without deleting it (e.g. staff on leave).
    active: { type: Boolean, default: true },
    // Sessions issued before this moment are rejected, so a password reset logs the user out.
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);
User.USERNAME_RE = USERNAME_RE;
module.exports = User;
