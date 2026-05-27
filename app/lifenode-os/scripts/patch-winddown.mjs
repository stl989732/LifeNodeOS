import { readFileSync, writeFileSync } from "fs";

const path = "src/components/VitalNode.jsx";
let c = readFileSync(path, "utf8");

c = c.replace(
  /\s*if \(isWindDown\) \{\s*return \([\s\S]*?Exit Protocol[\s\S]*?\);\s*\}\s*\n/,
  "\n",
);

const insert = `
      <WindDownSanctuary
        open={isWindDown}
        onExit={() => setIsWindDown(false)}
        flareActive={flareActive}
        resilience={resilience}
        readiness={readiness}
        recentSymptoms={vitalDash.symptomLogs}
        momentumMode={momentumMode}
        onLogRestless={submitRestless}
      />`;

if (!c.includes("<WindDownSanctuary")) {
  c = c.replace(
    /(\) : null\}\s*\n)(\s*<\/motion-safe-content>\s*\n\s*\);\s*\n\}\s*$)/,
    `$1${insert}$2`,
  );
  c = c.replace(
    /(\) : null\}\s*\n)(\s*<\/div>\s*\n\s*\);\s*\n\}\s*$)/,
    `$1${insert}$2`,
  );
}

writeFileSync(path, c);
console.log("patched", path);
