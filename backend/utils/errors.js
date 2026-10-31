// Maps a thrown error to the right HTTP status + a useful message. Unknown errors are logged on
// the server and the visitor only sees a generic message (internal details are never sent out).
const sendError = (err, res) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || { registerNumber: 1 })[0];
    if (field === "registerNumber") {
      return res.status(409).json({
        message: "This register number already exists. Search for the student and use \"+ Add Course\" to give them another course.",
      });
    }
    if (field === "username") return res.status(409).json({ message: "That username is already taken" });
    return res.status(409).json({ message: `A record with this ${field} already exists` });
  }
  if (err.name === "ValidationError") {
    const firstMessage = Object.values(err.errors)[0]?.message || "Validation failed";
    return res.status(400).json({ message: firstMessage });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  console.error(err);
  return res.status(500).json({ message: "Something went wrong on the server. Please try again." });
};

module.exports = { sendError };
