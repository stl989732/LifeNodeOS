const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const loadEnv = require("./load-env.cjs");

const appRoot = path.join(__dirname, "..");
loadEnv(appRoot);
process.chdir(appRoot);

const killPort = require("kill-port");

function probePort(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (busy) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(busy);
    };
    socket.setTimeout(500);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForPortFreeOnAny(hosts, port, maxMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const results = await Promise.all(hosts.map((h) => probePort(h, port)));
    if (!results.some(Boolean)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function waitForPortBusyOnAny(hosts, port, maxMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const results = await Promise.all(hosts.map((h) => probePort(h, port)));
    if (results.some(Boolean)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

void (async () => {
  try {
    await killPort(3000, "tcp");
    console.log("Process on port 3000 killed");
  } catch {
    // Port already free or nothing to kill — continue.
  }

  const port = process.env.PORT?.trim() || "3000";
  /** Browser / OAuth URL (default localhost so http://localhost:3000 works). */
  const publicHost = process.env.LIFENODE_DEV_HOST?.trim() || "localhost";
  /**
   * Bind address for Next.js. 0.0.0.0 accepts both localhost and 127.0.0.1 on Windows
   * (binding only 127.0.0.1 breaks when the browser resolves localhost to ::1).
   */
  const bindHost = process.env.LIFENODE_DEV_BIND_HOST?.trim() || "0.0.0.0";
  const portNum = Number(port);
  const probeHosts = ["127.0.0.1", "localhost"];

  let portFree = await waitForPortFreeOnAny(probeHosts, portNum, 30_000);
  if (!portFree) {
    try {
      await killPort(3000, "tcp");
      console.log("[LifeNode OS] Retried killing port 3000");
    } catch {
      /* ignore */
    }
    portFree = await waitForPortFreeOnAny(probeHosts, portNum, 30_000);
  }
  if (!portFree) {
    console.error(
      "\n[LifeNode OS] Port " +
        port +
        " is still in use. Close other `npm run dev` terminals and retry.\n",
    );
    process.exit(1);
  }

  if (!process.env.AUTH_SECRET?.trim()) {
    console.error(
      "\n[LifeNode OS] AUTH_SECRET is missing. Copy app/lifenode-os/.env.local (see .env.example) and restart.\n",
    );
    process.exit(1);
  }

  // Turbopack can hang on some Windows setups; webpack is slower but reliable.
  // Opt in to turbopack with LIFENODE_USE_TURBOPACK=1.
  const nextArgs = ["dev", "-p", port, "-H", bindHost];
  const publicUrl = `http://${publicHost}:${port}`;
  if (process.env.LIFENODE_USE_TURBOPACK === "1") {
    nextArgs.push("--turbopack");
    console.log(
      "[LifeNode OS] Dev server warming up on " +
        publicUrl +
        " (turbopack).\n",
    );
  } else if (process.platform === "win32") {
    nextArgs.push("--webpack");
    console.log(
      "[LifeNode OS] Dev server warming up on " +
        publicUrl +
        " (webpack on Windows — first `/` compile can take several minutes; wait for “✓ Home page compiled”).\n",
    );
  }

  const child = spawn("npx", ["next", ...nextArgs], {
    stdio: "inherit",
    cwd: appRoot,
    shell: process.platform === "win32",
    env: process.env,
  });

  child.on("error", (err) => {
    console.error("[LifeNode OS] Failed to start Next.js:", err);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on("spawn", () => {
    const homeUrl = `${publicUrl}/`;
    console.log(
      "[LifeNode OS] Wait for “Ready” below, then open:\n" +
        "  " +
        homeUrl +
        "\n" +
        "  (Also works at http://127.0.0.1:" +
        port +
        "/ — pre-compiling / in the background.)\n",
    );
    void warmDevServer(publicHost, portNum, probeHosts);
  });
})();

/** Pre-compile key routes after Next binds to the port. */
async function warmDevServer(publicHost, port, probeHosts) {
  const routes = ["/", "/pricing", "/compare/notion"];
  const base = `http://${publicHost}:${port}`;
  const warmed = new Set();

  const listening = await waitForPortBusyOnAny(probeHosts, port);
  if (!listening) {
    console.warn(
      "\n[LifeNode OS] Dev server did not start listening on " +
        base +
        ". Check the terminal for errors.\n",
    );
    return;
  }

  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const pending = routes.filter((route) => !warmed.has(route));
    if (pending.length === 0) {
      console.log("\n[LifeNode OS] ✓ Dev server ready — open " + base + "/\n");
      return;
    }

    await Promise.allSettled(
      pending.map((route) =>
        fetch(base + route, { signal: AbortSignal.timeout(300_000) }).then(
          (res) => {
            if (res.ok) warmed.add(route);
          },
        ),
      ),
    );

    if (warmed.has("/")) {
      console.log("\n[LifeNode OS] ✓ Home page compiled — open " + base + "/\n");
    }

    if (warmed.size === routes.length) {
      console.log("\n[LifeNode OS] ✓ Dev server ready — open " + base + "/\n");
      return;
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  console.warn(
    "\n[LifeNode OS] Warmup timed out. If the browser shows “connection failed”, wait and retry " +
      base +
      "/ (first compile may still be running).\n",
  );
}
