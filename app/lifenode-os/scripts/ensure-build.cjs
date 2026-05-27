const fs = require("node:fs");
const path = require("node:path");

const buildIdPath = path.join(__dirname, "..", ".next", "BUILD_ID");

if (!fs.existsSync(buildIdPath)) {
  console.error("\n[LifeNode OS] No production build found in .next/\n");
  console.error("  Development:  npm run dev");
  console.error("  Production:   npm run build && npm run start\n");
  process.exit(1);
}
