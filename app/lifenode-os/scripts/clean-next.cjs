const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(__dirname, "..", ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
} catch (err) {
  console.warn("Could not fully remove .next:", err.message);
  console.warn("Stop the dev server, then run this again.");
  process.exit(1);
}
