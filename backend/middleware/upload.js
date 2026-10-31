const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Certificates are stored on local disk under backend/uploads/certificates. They are NOT served
// as public files: the only way to read one is GET /api/students/:id/records/:recordId/certificate,
// which checks the visitor's login and department first (see routes/studentRoutes.js).
//
// NOTE: on hosts with an ephemeral filesystem (serverless, free tiers that wipe the disk on
// redeploy) local files do not survive a redeploy -- use a persistent disk or object storage.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "certificates");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random, unguessable file name (the visitor's original name is kept separately for display).
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
  }
  cb(null, true);
};

const uploadCertificate = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
});

// The name and MIME type come from the visitor and can be faked, so also check the real first
// bytes of the saved file: %PDF, a JPEG (FF D8 FF) or a PNG signature.
const hasValidSignature = (filePath) => {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") return buf.slice(0, 4).toString("latin1") === "%PDF";
    if (ext === ".png") return buf.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff; // .jpg / .jpeg
  } catch {
    return false;
  }
};

const removeCertificateFile = (storedUrl) => {
  if (!storedUrl) return;
  const target = path.join(UPLOAD_DIR, path.basename(storedUrl));
  if (target.startsWith(UPLOAD_DIR + path.sep)) fs.unlink(target, () => {});
};

module.exports = { uploadCertificate, UPLOAD_DIR, MAX_FILE_SIZE, hasValidSignature, removeCertificateFile };
