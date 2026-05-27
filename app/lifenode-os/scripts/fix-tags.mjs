import { readFileSync, writeFileSync } from "fs";

const path = process.argv[2] || "src/components/VitalNode.jsx";
let c = readFileSync(path, "utf8");
const bad = "motion-safe-content";
const good = "d" + "iv";
const before = (c.match(new RegExp(bad, "g")) || []).length;
c = c.split(bad).join(good);
writeFileSync(path, c);
console.log(`${path}: fixed ${before} occurrences`);
