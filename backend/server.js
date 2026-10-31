require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { validateEnv } = require("./config/env");
const connectDB = require("./config/db");
const { sanitizeRequest, apiLimiter } = require("./middleware/security");

const env = validateEnv(); // stops here with a clear message if .env is unsafe or incomplete

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const { migrateUsers } = require("./utils/migrate");

const app = express();
app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", env.trustProxy);

app.use(helmet()); // security headers (no sniffing, no framing, strict transport, ...)
app.use(
  cors({
    // Only the website listed in CLIENT_ORIGIN may call this API from a browser.
    origin: (origin, cb) => cb(null, !origin || env.origins.includes(origin)),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(sanitizeRequest);

// Certificate files are NOT public: they are only available through the signed-in route
// GET /api/students/:id/records/:recordId/certificate (see routes/studentRoutes.js).

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Fallback error handler -- details go to the server log, never to the visitor.
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ message: "That request is too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid request" });
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

connectDB()
  .then(migrateUsers)
  .then(() => app.listen(env.port, () => console.log(`NPTEL backend running on port ${env.port}`)));
