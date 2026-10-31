const mongoose = require("mongoose");
const { normalizeRecord } = require("../utils/academic");

// One NPTEL course entry for a student. A student can have multiple NPTEL courses.
const nptelRecordSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true },
    courseId: { type: String, default: "" },
    courseDuration: { type: String, default: "" }, // e.g. "8 Weeks", "12 Weeks"
    // Fields that come from the college's NPTEL Excel sheet
    session: { type: String, default: "" }, // e.g. "2026-27 July-December"
    onlinePlatform: { type: String, default: "SWAYAM-NPTEL" },
    semester: { type: String, default: "" }, // e.g. "V"
    examDate: { type: Date, default: null },
    credit: { type: Number, default: null },
    courseStartDate: { type: Date, default: null },
    courseEndDate: { type: Date, default: null },
    instructorInstitute: { type: String, default: "" },

    // Progress & Status
    enrollmentStatus: { type: Boolean, default: false },
    assignmentStatus: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed"],
      default: "Not Started",
    },
    examRegistrationStatus: { type: Boolean, default: false },
    examStatus: {
      type: String,
      enum: ["Not Attended", "Attended", "Absent"],
      default: "Not Attended",
    },

    // Result & Certificate
    certificateStatus: {
      type: String,
      enum: ["Not Qualified", "Qualified"],
      default: "Not Qualified",
    },
    score: { type: Number, default: null },
    grade: { type: String, default: "" }, // e.g. Elite, Elite+Gold, Silver, Success
    certificateDocUrl: { type: String, default: "" }, // servable path to the uploaded certificate file
    certificateFileName: { type: String, default: "" }, // original filename, shown in the UI
    certificateReceivedDate: { type: Date, default: null },
    // Verification is a separate review step from certificateStatus: a certificate can
    // be "Qualified" (uploaded) but not yet reviewed/confirmed by staff, HOD or admin.
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    remarks: { type: String, default: "" },

    // Overall status flow (Step 1-6 from the PDF)
    status: {
      type: String,
      enum: [
        "Not Enrolled",
        "Enrolled",
        "Course Completed",
        "Exam Registered",
        "Exam Attended",
        "Qualified",
      ],
      default: "Not Enrolled",
    },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Runs before every save/validation of a course record, so bad combinations (a score
// without a certificate, "Verified" without an uploaded file, a stale overall status...)
// can never be stored.
nptelRecordSchema.pre("validate", function (next) {
  normalizeRecord(this);
  if (this.certificateStatus === "Qualified" && !this.certificateReceivedDate) {
    this.certificateReceivedDate = new Date();
  }
  next();
});

const studentSchema = new mongoose.Schema(
  {
    // Not unique: the same register number can appear again for a later NPTEL session
    // (each Add Student / Excel row becomes its own entry).
    registerNumber: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    school: { type: String, required: true },
    department: { type: String, required: true },
    programme: { type: String, default: "" },
    academicYear: { type: String, required: true }, // e.g. "2026-2027"
    batch: { type: String, default: "" }, // joining year from the sheet, e.g. "2024"
    year: { type: String, required: true }, // e.g. "I", "II", "III"
    section: { type: String, default: "" },

    nptelRecords: [nptelRecordSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

studentSchema.index({ school: 1, department: 1, programme: 1, academicYear: 1, year: 1 });

module.exports = mongoose.model("Student", studentSchema);
