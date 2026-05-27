const { spawn } = require("node:child_process");
const path = require("node:path");
const loadEnv = require("./load-env.cjs");

const appRoot = path.join(__dirname, "..");
loadEnv(appRoot);
process.chdir(appRoot);

const child = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  cwd: appRoot,
  shell: process.platform === "win32",
  env: process.env,
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
