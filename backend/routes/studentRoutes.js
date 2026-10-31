const express = require("express");
const fs = require("fs");
const path = require("path");
const Student = require("../models/Student");
const { protect, authorize } = require("../middleware/authMiddleware");
const { validYearsFor, academicYearFromSession } = require("../utils/academic");
const { sendError } = require("../utils/errors");
const { buildScopedFilter } = require("../utils/scopedFilter");
const { str, escapeRegex } = require("../utils/query");
const { uploadCertificate, UPLOAD_DIR, MAX_FILE_SIZE, hasValidSignature, removeCertificateFile } = require("../middleware/upload");

const router = express.Router();
router.use(protect);

const MAX_BULK_ROWS = 2000;

// Only these fields can ever be written from the browser. Everything else (ids, who created the
// record, verification, certificate file, derived status ...) is ignored, however it is sent.
const STUDENT_FIELDS = ["registerNumber", "name", "programme", "academicYear", "batch", "year", "section"];
const RECORD_FIELDS = [
  "courseName", "courseId", "courseDuration", "session", "onlinePlatform", "semester", "examDate", "credit",
  "courseStartDate", "courseEndDate", "instructorInstitute", "enrollmentStatus", "assignmentStatus",
  "examRegistrationStatus", "examStatus", "certificateStatus", "score", "grade", "remarks",
];
const pick = (source, keys) => {
  const out = {};
  keys.forEach((k) => { if (source && source[k] !== undefined) out[k] = source[k]; });
  return out;
};

// Excel cells rarely come through as real booleans -- "Yes", "TRUE", "1", "Y" etc. all count as true.
const parseBoolLike = (v) => ["true", "yes", "y", "1"].includes(String(v ?? "").trim().toLowerCase());

// Admin: always. Staff/HOD: only students of their own school + department.
const canAccessStudent = (user, student) => {
  if (user.role === "admin") return true;
  return student.school === user.school && student.department === user.department;
};

// Enforces the college's 3-year UG / 2-year PG structure.
const checkYearValidity = (programme, year) => {
  const allowed = validYearsFor(programme);
  if (!allowed.includes(year)) {
    return `Year "${year}" is not valid for "${programme}" -- this programme only has years: ${allowed.join(", ")}`;
  }
  return null;
};

// Loads a student and checks the visitor may touch it. Sends the error response itself and
// returns null when the request must stop.
const loadAccessible = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return null;
  }
  if (!canAccessStudent(req.user, student)) {
    res.status(403).json({ message: "Forbidden: this student belongs to another programme" });
    return null;
  }
  return student;
};

// GET /api/students
router.get("/", async (req, res) => {
  try {
    const filter = buildScopedFilter(req);
    const search = str(req.query.search, 60);
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: rx }, { registerNumber: rx }];
    }
    const students = await Student.find(filter).sort({ createdAt: -1 });
    // With a Session selected, return only that session's courses for each student.
    const session = str(req.query.session);
    if (session) {
      return res.json(
        students.map((s) => {
          const o = s.toObject();
          o.nptelRecords = o.nptelRecords.filter((r) => r.session === session);
          return o;
        })
      );
    }
    res.json(students);
  } catch (err) {
    sendError(err, res);
  }
});

// GET /api/students/:id
router.get("/:id", async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (student) res.json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/students  -- create a new student (Staff, HOD)
// School and department are always forced to the account's own.
router.post("/", authorize("staff", "hod"), async (req, res) => {
  try {
    const payload = {
      ...pick(req.body, STUDENT_FIELDS),
      createdBy: req.user._id,
      school: req.user.school,
      department: req.user.department,
    };
    if (!payload.academicYear && req.body.session) payload.academicYear = academicYearFromSession(String(req.body.session));

    const yearError = checkYearValidity(payload.programme, payload.year);
    if (yearError) return res.status(400).json({ message: yearError });

    // One person = one student entry, so a repeat register number is refused (extra courses go on
    // the existing student instead).
    if (payload.registerNumber) {
      const dup = await Student.findOne({ registerNumber: String(payload.registerNumber).trim().toUpperCase() });
      if (dup) {
        return res.status(409).json({
          message: "This register number already exists. Search for the student and use \"+ Add Course\" to give them another course.",
        });
      }
    }

    const records = req.body.records;
    if (Array.isArray(records) && records.length) {
      payload.nptelRecords = records
        .slice(0, 20)
        .filter((r) => r && String(r.courseName || "").trim())
        .map((r) => ({ ...pick(r, RECORD_FIELDS), addedBy: req.user._id }));
    }

    const student = await Student.create(payload);
    res.status(201).json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/students/bulk  -- bulk create from an uploaded Excel/CSV sheet (Staff, HOD)
// One sheet row = one student + (optionally) one NPTEL course. Staff and HOD can only upload into
// their own school/department, whatever the sheet says.
router.post("/bulk", authorize("staff", "hod"), async (req, res) => {
  try {
    const rows = Array.isArray(req.body.students) ? req.body.students : [];
    if (!rows.length) return res.status(400).json({ message: "No student rows were provided" });
    if (rows.length > MAX_BULK_ROWS) return res.status(400).json({ message: `Please upload at most ${MAX_BULK_ROWS} rows at a time` });

    const created = [];
    const updated = [];
    const skipped = [];
    const has = (v) => v !== undefined && v !== null && String(v).trim() !== "";
    const text = (v) => String(v ?? "").trim();
    const toDate = (v) => {
      if (!has(v)) return null;
      const d = new Date(v);
      return isNaN(d) ? null : d;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const regNo = text(row.registerNumber).toUpperCase();
      const rowLabel = regNo ? `${regNo} (row ${i + 1})` : `row ${i + 1}`;

      try {
        const payload = {
          registerNumber: regNo,
          name: text(row.name),
          programme: text(row.programme),
          academicYear: text(row.academicYear),
          batch: text(row.batch),
          year: text(row.year),
          section: text(row.section),
          createdBy: req.user._id,
          school: req.user.school,
          department: req.user.department,
        };

        if (!payload.registerNumber || !payload.name || !payload.programme || !payload.academicYear || !payload.year) {
          skipped.push({ row: rowLabel, reason: "Missing required field(s)" });
          continue;
        }
        const yearError = checkYearValidity(payload.programme, payload.year);
        if (yearError) {
          skipped.push({ row: rowLabel, reason: yearError });
          continue;
        }

        let record = null;
        if (has(row.courseName)) {
          const examDate = toDate(row.examDate);
          const examRegistered = has(row.examRegistrationStatus) ? parseBoolLike(row.examRegistrationStatus) : !!examDate;
          record = {
            courseName: text(row.courseName),
            courseId: text(row.courseId),
            courseDuration: text(row.courseDuration),
            courseStartDate: toDate(row.courseStartDate),
            courseEndDate: toDate(row.courseEndDate),
            examDate,
            credit: has(row.credit) && !isNaN(Number(row.credit)) ? Number(row.credit) : null,
            session: text(row.session),
            onlinePlatform: text(row.onlinePlatform) || "SWAYAM-NPTEL",
            semester: text(row.semester),
            enrollmentStatus: has(row.enrollmentStatus) ? parseBoolLike(row.enrollmentStatus) : true,
            examRegistrationStatus: examRegistered,
            addedBy: req.user._id,
          };
        }

        const existing = await Student.findOne({ registerNumber: regNo });
        if (existing) {
          if (!canAccessStudent(req.user, existing)) {
            skipped.push({ row: rowLabel, reason: "Register number belongs to another programme" });
            continue;
          }
          if (!record) {
            skipped.push({ row: rowLabel, reason: "Register number already exists" });
            continue;
          }
          const duplicate = existing.nptelRecords.some(
            (r) => r.courseName.toLowerCase() === record.courseName.toLowerCase() && (r.session || "") === record.session
          );
          if (duplicate) {
            skipped.push({ row: rowLabel, reason: "This course is already recorded for this session" });
            continue;
          }
          existing.nptelRecords.push(record);
          await existing.save();
          updated.push(regNo);
        } else {
          if (record) payload.nptelRecords = [record];
          await Student.create(payload);
          created.push(regNo);
        }
      } catch (err) {
        const reason = err.name === "ValidationError" ? Object.values(err.errors)[0]?.message || "Invalid data" : "Could not save this row";
        skipped.push({ row: rowLabel, reason });
      }
    }

    res.status(201).json({
      createdCount: created.length,
      updatedCount: updated.length,
      created,
      updated,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (err) {
    sendError(err, res);
  }
});

// PUT /api/students/:id  -- update a student's basic details, including register number.
// Staff and HOD are locked to their own department and can never move a student elsewhere.
router.put("/:id", authorize("staff", "hod"), async (req, res) => {
  try {
    const existing = await loadAccessible(req, res);
    if (!existing) return;

    const update = pick(req.body, STUDENT_FIELDS);
    if (update.registerNumber !== undefined) {
      update.registerNumber = String(update.registerNumber).trim().toUpperCase();
      const dup = await Student.findOne({ registerNumber: update.registerNumber, _id: { $ne: existing._id } }).select("_id");
      if (dup) return res.status(409).json({ message: "Another student already has this register number" });
    }

    // Validate against the *effective* programme/year so a partial update can't leave a student
    // on a year their (possibly new) programme doesn't have.
    const yearError = checkYearValidity(update.programme ?? existing.programme, update.year ?? existing.year);
    if (yearError) return res.status(400).json({ message: yearError });

    const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    res.json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// DELETE /api/students/:id  (Staff, own department only) -- e.g. to remove a duplicate entry.
router.delete("/:id", authorize("staff"), async (req, res) => {
  try {
    const existing = await loadAccessible(req, res);
    if (!existing) return;
    existing.nptelRecords.forEach((r) => removeCertificateFile(r.certificateDocUrl));
    await existing.deleteOne();
    res.json({ message: "Student deleted" });
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/students/:id/records  -- add an NPTEL course record (Staff)
router.post("/:id/records", authorize("staff"), async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (!student) return;
    // A student can hold many courses (even in the same session), but not the same course twice in one session.
    const newName = String(req.body.courseName || "").trim().toLowerCase();
    const newSession = String(req.body.session || "").trim();
    const duplicate = student.nptelRecords.some(
      (r) => r.courseName.trim().toLowerCase() === newName && (r.session || "") === newSession
    );
    if (duplicate) {
      return res.status(409).json({ message: "This course is already recorded for this student in this session" });
    }
    student.nptelRecords.push({ ...pick(req.body, RECORD_FIELDS), addedBy: req.user._id });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// PUT /api/students/:id/records/:recordId  -- update an NPTEL course record (Staff)
router.put("/:id/records/:recordId", authorize("staff"), async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (!student) return;
    const record = student.nptelRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ message: "NPTEL record not found" });
    Object.assign(record, pick(req.body, RECORD_FIELDS));
    await student.save();
    res.json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// DELETE /api/students/:id/records/:recordId  (Staff)
router.delete("/:id/records/:recordId", authorize("staff"), async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (!student) return;
    const record = student.nptelRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ message: "NPTEL record not found" });
    removeCertificateFile(record.certificateDocUrl);
    record.deleteOne();
    await student.save();
    res.json(student);
  } catch (err) {
    sendError(err, res);
  }
});

// GET /api/students/:id/records/:recordId/certificate[?download=1]
// The ONLY way to read a certificate file. The visitor must be signed in and allowed to see this
// student (Admin: any; Staff/HOD: their own department), so a copied link is useless to anyone else.
const CONTENT_TYPES = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
router.get("/:id/records/:recordId/certificate", async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (!student) return;
    const record = student.nptelRecords.id(req.params.recordId);
    if (!record || !record.certificateDocUrl) return res.status(404).json({ message: "No certificate uploaded for this course" });

    const file = path.join(UPLOAD_DIR, path.basename(record.certificateDocUrl));
    if (!file.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(file)) {
      return res.status(404).json({ message: "The certificate file could not be found" });
    }

    const ext = path.extname(file).toLowerCase();
    const shownName = (record.certificateFileName || path.basename(file)).replace(/[\r\n"]/g, "");
    res.setHeader("Content-Type", CONTENT_TYPES[ext] || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `${req.query.download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(shownName)}`);
    res.sendFile(file);
  } catch (err) {
    sendError(err, res);
  }
});

// POST /api/students/:id/records/:recordId/certificate
// Uploads (or replaces) the certificate file for one course. Staff (own department) only -- HOD
// and Admin view and verify but do not upload.
router.post("/:id/records/:recordId/certificate", authorize("staff"), (req, res) => {
  uploadCertificate.single("certificate")(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
      }
      return res.status(400).json({ message: "Upload failed. Use a PDF, JPG or PNG file up to 10MB." });
    }

    const discard = () => req.file && fs.unlink(req.file.path, () => {});
    try {
      if (!req.file) return res.status(400).json({ message: "No file was uploaded" });

      if (!hasValidSignature(req.file.path)) {
        discard();
        return res.status(400).json({ message: "This file is not a genuine PDF, JPG or PNG." });
      }

      const student = await loadAccessible(req, res);
      if (!student) return discard();
      const record = student.nptelRecords.id(req.params.recordId);
      if (!record) {
        discard();
        return res.status(404).json({ message: "NPTEL record not found" });
      }

      // The certificate upload is locked until the course is marked Qualified.
      if (record.certificateStatus !== "Qualified" && record.certificateStatus !== "Received") {
        discard();
        return res.status(400).json({ message: "Certificate upload is locked. Set the Certificate Status to Qualified first." });
      }

      // Replacing a certificate removes the old file so uploads don't pile up.
      removeCertificateFile(record.certificateDocUrl);

      record.certificateDocUrl = `/uploads/certificates/${req.file.filename}`;
      record.certificateFileName = path.basename(req.file.originalname).slice(0, 150);
      record.certificateReceivedDate = new Date();
      // A newly uploaded certificate goes back to unverified -- the reviewer must look at the new file.
      record.verified = false;
      record.verifiedAt = null;

      await student.save();
      res.json(student);
    } catch (err) {
      discard();
      sendError(err, res);
    }
  });
});

// PUT /api/students/:id/records/:recordId/verify
// Marks (or un-marks) a certificate as verified. Only HOD (own department) and Admin can verify.
router.put("/:id/records/:recordId/verify", authorize("hod", "admin"), async (req, res) => {
  try {
    const student = await loadAccessible(req, res);
    if (!student) return;
    const record = student.nptelRecords.id(req.params.recordId);
    if (!record) return res.status(404).json({ message: "NPTEL record not found" });

    const verified = req.body.verified === true || req.body.verified === "true";
    if (verified && !record.certificateDocUrl) {
      return res.status(400).json({ message: "Upload the certificate file before verifying it" });
    }
    record.verified = verified;
    record.verifiedAt = verified ? new Date() : null;

    await student.save();
    res.json(student);
  } catch (err) {
    sendError(err, res);
  }
});

module.exports = router;
