const express = require("express");
const Session = require("../models/Session");
const Student = require("../models/Student");
const { protect, authorize } = require("../middleware/authMiddleware");
const { sendError } = require("../utils/errors");
const { byNewest, validateSessionName } = require("../utils/sessions");

const router = express.Router();
router.use(protect);

// How many course records / students use each session name.
const usageBySession = async () => {
  const rows = await Student.aggregate([
    { $unwind: "$nptelRecords" },
    { $group: { _id: "$nptelRecords.session", courses: { $sum: 1 }, students: { $addToSet: "$registerNumber" } } },
  ]);
  return new Map(rows.map((r) => [r._id, { courses: r.courses, students: r.students.length }]));
};

// GET /api/sessions   (everyone signed in)
// The session names every dropdown shows, newest first. Sessions that already appear on
// student records are always included, so nothing can ever go missing from a filter.
router.get("/", async (req, res) => {
  try {
    const [defined, used] = await Promise.all([Session.find().select("name"), Student.distinct("nptelRecords.session")]);
    const names = new Set([...defined.map((s) => s.name), ...used.filter(Boolean)]);
    res.json([...names].sort(byNewest));
  } catch (err) {
    sendError(err, res);
  }
});

// GET /api/sessions/manage   (admin) -- same list with usage counts for the Sessions tab
router.get("/manage", authorize("admin"), async (req, res) => {
  try {
    const [defined, usage] = await Promise.all([Session.find(), usageBySession()]);
    const byName = new Map(defined.map((s) => [s.name, s]));
    const names = new Set([...byName.keys(), ...[...usage.keys()].filter(Boolean)]);
    res.json(
      [...names].sort(byNewest).map((name) => ({
        name,
        id: byName.get(name)?._id || null, // null = only exists because records use it
        createdAt: byName.get(name)?.createdAt || null,
        courses: usage.get(name)?.courses || 0,
        students: usage.get(name)?.students || 0,
      }))
    );
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/sessions   (admin)   body: { name: "2027-28 Jan-April" }
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
    const problem = validateSessionName(name);
    if (problem) return res.status(400).json({ message: problem });

    const existing = await Session.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (existing) return res.status(409).json({ message: `"${existing.name}" already exists` });

    const session = await Session.create({ name, createdBy: req.user._id });
    res.status(201).json(session);
  } catch (err) {
    sendError(err, res);
  }
});

// DELETE /api/sessions/:id   (admin) -- only when no student record uses it
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const inUse = await Student.countDocuments({ "nptelRecords.session": session.name });
    if (inUse) {
      return res.status(409).json({ message: `Cannot delete: ${inUse} student${inUse !== 1 ? "s have" : " has"} courses in this session` });
    }
    await session.deleteOne();
    res.json({ message: "Session deleted" });
  } catch (err) {
    sendError(err, res);
  }
});

module.exports = router;
