// Checks backend/.env once at start-up and refuses to run with an unsafe configuration,
// instead of silently running with weak defaults.
const fail = (message) => {
  console.error(`\n[config] ${message}\n`);
  process.exit(1);
};

const validateEnv = () => {
  if (!process.env.MONGO_URI) fail("MONGO_URI is missing in backend/.env");

  const secret = process.env.JWT_SECRET || "";
  if (secret.length < 32 || /change_this|secret123|example/i.test(secret)) {
    fail(
      "JWT_SECRET must be a random string of at least 32 characters.\n" +
        "Generate one with:\n  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }

  const origins = String(process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!origins.length || origins.includes("*")) {
    fail("CLIENT_ORIGIN must be the exact address of your website, e.g. https://nptel.yourcollege.edu (\"*\" is not allowed).");
  }

  return {
    port: Number(process.env.PORT) || 5000,
    origins,
    // Set TRUST_PROXY=1 when the app runs behind nginx / Render / Railway so rate limits see the real visitor IP.
    trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
  };
};

module.exports = { validateEnv };
