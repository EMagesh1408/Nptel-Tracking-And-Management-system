const express = require("express");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const { sendError } = require("../utils/errors");
const { publicUser } = require("../utils/userDto");
const { validatePassword } = require("../utils/password");
const { str, escapeRegex } = require("../utils/query");
const { HIERARCHY } = require("../data/hierarchy");

// Account management: ONLY the admin can create, rename, reset or remove Staff / HOD logins.
// Passwords are stored as one-way bcrypt hashes and are never sent back to the browser.
const router = express.Router();
router.use(protect, authorize("admin"));

const MANAGED_ROLES = ["staff", "hod"];

const validateUsername = (raw) => {
  const username = String(raw ?? "").trim().toLowerCase();
  if (!User.USERNAME_RE.test(username)) {
    return { error: "Username must be 3-40 characters and use only letters, numbers, dot, underscore, hyphen or @" };
  }
  return { username };
};

const validOrg = (school, department) => {
  const s = HIERARCHY.find((h) => h.school === school);
  return !!s && s.departments.some((d) => d.department === department);
};

const usernameTaken = async (username, exceptId) => {
  const existing = await User.findOne({ $or: [{ username }, { email: username }] }).select("_id");
  return !!existing && String(existing._id) !== String(exceptId || "");
};

// GET /api/users?search=&role=&school=&department=
router.get("/", async (req, res) => {
  try {
    const role = str(req.query.role);
    const school = str(req.query.school);
    const department = str(req.query.department);
    const search = str(req.query.search, 60);

    const filter = { role: { $in: MANAGED_ROLES } };
    if (MANAGED_ROLES.includes(role)) filter.role = role;
    if (school) filter.school = school;
    if (department) filter.department = department;
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: rx }, { fullName: rx }, { username: rx }, { email: rx }, { department: rx }];
    }
    const users = await User.find(filter).select("-password").sort({ school: 1, department: 1, role: 1, name: 1 });
    res.json(users.map(publicUser));
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/users   body: { name, username, password, role: "staff"|"hod", school, department }
router.post("/", async (req, res) => {
  try {
    const name = str(req.body.name, 80);
    const fullName = str(req.body.fullName, 80);
    const { role, school, department, password } = req.body;
    if (!fullName) return res.status(400).json({ message: "Enter the person's name" });
    if (!name) return res.status(400).json({ message: "Account label is required" });
    if (!MANAGED_ROLES.includes(role)) return res.status(400).json({ message: "Role must be Staff or HOD" });
    if (!validOrg(school, department)) return res.status(400).json({ message: "Pick a valid school and programme" });

    const u = validateUsername(req.body.username);
    if (u.error) return res.status(400).json({ message: u.error });
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });
    if (await usernameTaken(u.username)) {
      return res.status(409).json({ message: `The username "${u.username}" is already taken` });
    }

    const user = await User.create({ name, fullName, username: u.username, password: String(password), role, school, department });
    res.status(201).json(publicUser(user));
  } catch (err) {
    sendError(err, res);
  }
});

// PUT /api/users/:id   any of: name, username (rename), password (reset), role, school,
// department, active. A blank/missing password leaves the current one unchanged.
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!MANAGED_ROLES.includes(user.role)) {
      return res.status(403).json({ message: "Admin accounts cannot be changed from here" });
    }

    const { role, school, department, password, active } = req.body;

    if (req.body.name !== undefined) {
      const name = str(req.body.name, 80);
      if (!name) return res.status(400).json({ message: "Name is required" });
      user.name = name;
    }
    if (req.body.fullName !== undefined) user.fullName = str(req.body.fullName, 80);
    if (req.body.username !== undefined) {
      const u = validateUsername(req.body.username);
      if (u.error) return res.status(400).json({ message: u.error });
      if (u.username !== user.username) {
        if (await usernameTaken(u.username, user._id)) {
          return res.status(409).json({ message: `The username "${u.username}" is already taken` });
        }
        user.username = u.username;
      }
    }
    if (role !== undefined) {
      if (!MANAGED_ROLES.includes(role)) return res.status(400).json({ message: "Role must be Staff or HOD" });
      user.role = role;
    }
    if (school !== undefined || department !== undefined) {
      const s = school ?? user.school;
      const d = department ?? user.department;
      if (!validOrg(s, d)) return res.status(400).json({ message: "Pick a valid school and programme" });
      user.school = s;
      user.department = d;
    }
    if (active !== undefined) user.active = !!active;
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) return res.status(400).json({ message: pwError });
      user.password = String(password); // hashed by the pre-save hook
    }

    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    sendError(err, res);
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!MANAGED_ROLES.includes(user.role)) return res.status(403).json({ message: "Admin accounts cannot be deleted" });
    await user.deleteOne();
    res.json({ message: "Account deleted" });
  } catch (err) {
    sendError(err, res);
  }
});

module.exports = router;
