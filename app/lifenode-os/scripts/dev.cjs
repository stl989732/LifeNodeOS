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
  // Bind IPv4 explicitly — on Windows, `localhost` can resolve to ::1 while Next listens on 127.0.0.1.
  const host = process.env.LIFENODE_DEV_HOST?.trim() || "127.0.0.1";
  const nextArgs = ["next", "dev", "-p", port, "-H", host];
  if (process.env.LIFENODE_USE_TURBOPACK === "1") {
    nextArgs.push("--turbopack");
  } else if (process.platform === "win32") {
    nextArgs.push("--webpack");
    console.log(
      "[LifeNode OS] Dev server warming up on http://" +
        host +
        ":" +
        port +
        " (webpack on Windows — first compile can take ~60s on Desktop/synced folders).\n",
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
    const pricingUrl = `http://${host}:${port}/pricing`;
    console.log(
      "[LifeNode OS] Wait for “Ready” below, then open:\n" +
        "  " +
        pricingUrl +
        "\n" +
        "  (Pre-compiling in the background — do not refresh if the tab is still loading.)\n",
    );
    warmDevServer(host, port);
  });
})();

/** Hit /pricing once Next is ready so the browser is not stuck on a 60s first compile. */
function warmDevServer(host, port) {
  const url = `http://${host}:${port}/pricing`;
  let attempts = 0;
  const maxAttempts = 90;

  const tryFetch = () => {
    attempts += 1;
    fetch(url, { signal: AbortSignal.timeout(120_000) })
      .then((res) => {
        if (res.ok) {
          console.log(
            "\n[LifeNode OS] ✓ Dev server ready — open " + url + "\n",
          );
          return;
        }
        retry();
      })
      .catch(() => {
        if (attempts < maxAttempts) retry();
        else {
          console.warn(
            "\n[LifeNode OS] Warmup timed out. If the browser shows “connection failed”, wait and retry " +
              url +
              " (first compile may still be running).\n",
          );
        }
      });
  };

  const retry = () => setTimeout(tryFetch, 2000);
  setTimeout(tryFetch, 5000);
}
