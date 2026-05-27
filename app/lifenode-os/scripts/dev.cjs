const { spawn } = require("node:child_process");
const path = require("node:path");
const loadEnv = require("./load-env.cjs");

const appRoot = path.join(__dirname, "..");
loadEnv(appRoot);
process.chdir(appRoot);

const killPort = require("kill-port");

void (async () => {
  try {
    await killPort(3000, "tcp");
    console.log("Process on port 3000 killed");
  } catch {
    // Port already free or nothing to kill — continue.
  }

  if (!process.env.AUTH_SECRET?.trim()) {
    console.error(
      "\n[LifeNode OS] AUTH_SECRET is missing. Copy app/lifenode-os/.env.local (see .env.example) and restart.\n",
    );
    process.exit(1);
  }

  // Turbopack on Windows + Desktop/synced folders often stalls 30–60s on first compile.
  // Use webpack by default on Windows; opt in with LIFENODE_USE_TURBOPACK=1.
  const port = process.env.PORT?.trim() || "3000";
  const nextArgs = ["next", "dev", "-p", port];
  if (process.env.LIFENODE_USE_TURBOPACK === "1") {
    nextArgs.push("--turbopack");
  } else if (process.platform === "win32") {
    nextArgs.push("--webpack");
    console.log(
      "[LifeNode OS] Dev server: http://localhost:" +
        port +
        " (webpack on Windows — first page load may take 20–40s). Set LIFENODE_USE_TURBOPACK=1 for Turbopack.\n",
    );
  }

  const child = spawn("npx", nextArgs, {
    stdio: "inherit",
    cwd: appRoot,
    shell: process.platform === "win32",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on("spawn", () => {
    console.log(
      "[LifeNode OS] Open http://localhost:" +
        port +
        " — wait for “Ready”, then allow ~30s on first compile.\n",
    );
  });
})();
