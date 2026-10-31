const mongoose = require("mongoose");

// An NPTEL session such as "2026-27 July-December". The admin adds them from the Sessions tab;
// every session dropdown and filter on every dashboard reads this collection.
const sessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
