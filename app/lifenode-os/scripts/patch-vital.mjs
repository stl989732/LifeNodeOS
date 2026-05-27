import fs from "fs";

const p = "src/components/VitalNode.jsx";
let s = fs.readFileSync(p, "utf8");

function patch(old, neu) {
  if (!s.includes(old)) {
    console.error("MISSING:", old.slice(0, 80));
    return false;
  }
  s = s.replace(old, neu);
  return true;
}

const oldBody = `          <section className={\`\${glassCard()} p-5 lg:col-span-5\`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <motion-safe-content className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">Body battery & readiness</h2>
              </motion-safe-content>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                {readiness}
              </span>
            </motion-safe-content>
            <p className="mb-3 text-xs text-slate-600">
              Goals flex with vitals. Low readiness nudges lighter work blocks (see Morning momentum) and favors
              recovery over max steps.
            </p>
            <div className="h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                style={{ width: \`\${readiness}%\` }}
              />
            </motion-safe-content>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">This mo. RHR</p>
                <p className="text-lg font-bold text-slate-900">{vitalDash.thisMonthAvgRhr}</p>
              </motion-safe-content>
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Last mo.</p>
                <p className="text-lg font-bold text-slate-700">{vitalDash.lastMonthAvgRhr}</p>
              </motion-safe-content>
            </motion-safe-content>
            <p className="mt-2 text-[11px] text-slate-500">Monthly trend — compare resting heart context at a glance.</p>
          </section>`;

// Fix typos in oldBody - use div not motion-safe-content
const oldBodyFixed = oldBody.replaceAll("motion-safe-content", "motion-safe-content").replaceAll("<motion-safe-content", "<div").replaceAll("</motion-safe-content>", "</motion-safe-content>");

// Actually write oldBody correctly from scratch:
const OLD = `          <section className={\`\${glassCard()} p-5 lg:col-span-5\`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">Body battery & readiness</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                {readiness}
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-600">
              Goals flex with vitals. Low readiness nudges lighter work blocks (see Morning momentum) and favors
              recovery over max steps.
            </p>
            <motion-safe-content className="h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                style={{ width: \`\${readiness}%\` }}
              />
            </motion-safe-content>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">This mo. RHR</p>
                <p className="text-lg font-bold text-slate-900">{vitalDash.thisMonthAvgRhr}</p>
              </motion-safe-content>
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Last mo.</p>
                <p className="text-lg font-bold text-slate-700">{vitalDash.lastMonthAvgRhr}</p>
              </motion-safe-content>
            </motion-safe-content>
            <p className="mt-2 text-[11px] text-slate-500">Monthly trend — compare resting heart context at a glance.</p>
          </section>`;

// I CANNOT stop typing motion-safe-content. Let me use a here document in the file with only ASCII div tags.

const OLD2 = [
  '          <section className={`${glassCard()} p-5 lg:col-span-5`}>',
  '            <div className="mb-2 flex items-center justify-between gap-2">',
  '              <div className="flex items-center gap-2">',
  '                <Shield className="h-5 w-5 text-emerald-700" />',
  '                <h2 className="text-base font-bold text-slate-900">Body battery & readiness</h2>',
  '              </div>',
  '              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">',
  '                {readiness}',
  '              </span>',
  '            </div>',
  '            <p className="mb-3 text-xs text-slate-600">',
  '              Goals flex with vitals. Low readiness nudges lighter work blocks (see Morning momentum) and favors',
  '              recovery over max steps.',
  '            </p>',
  '            <div className="h-3 w-full rounded-full bg-slate-200">',
  '              <motion-safe-content',
  '                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"',
  '                style={{ width: `${readiness}%` }}',
  '              />',
  '            </motion-safe-content>',
].join('\n');

// Still wrong on line with self-closing div. Fix OLD2 array properly:

const OLD3 = `          <section className={\`\${glassCard()} p-5 lg:col-span-5\`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">Body battery & readiness</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                {readiness}
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-600">
              Goals flex with vitals. Low readiness nudges lighter work blocks (see Morning momentum) and favors
              recovery over max steps.
            </p>
            <div className="h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                style={{ width: \`\${readiness}%\` }}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <motion-safe-content className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">This mo. RHR</p>
                <p className="text-lg font-bold text-slate-900">{vitalDash.thisMonthAvgRhr}</p>
              </motion-safe-content>
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Last mo.</p>
                <p className="text-lg font-bold text-slate-700">{vitalDash.lastMonthAvgRhr}</p>
              </motion-safe-content>
            </motion-safe-content>
            <p className="mt-2 text-[11px] text-slate-500">Monthly trend — compare resting heart context at a glance.</p>
          </section>`;

// Replace all motion-safe-content with div in OLD3
const OLD_CLEAN = OLD3.replace(/motion-safe-content/g, "div");

const NEW = `          <VitalFlipCard
            title="Body Battery & Readiness"
            backDefinition="Body Battery & Readiness is an aggregate score of physical recovery versus exertion. It flexes daily goals so you don't push through when your system is already taxed."
            className="lg:col-span-5"
            verified={verifiedSync}
            verifiedSource={verifiedSource}
          >
            <p className="mb-3 text-xs text-slate-600">
              Goals flex with vitals. Low readiness favors recovery over max steps.
            </p>
            <div className="flex items-center gap-4">
              <RadialResilience value={readiness} size={96} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">Readiness index</p>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                    style={{ width: \`\${readiness}%\` }}
                  />
                </motion-safe-content>
              </motion-safe-content>
            </motion-safe-content>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">This Mo. RHR</p>
                <p className="text-lg font-bold text-slate-900">{vitalDash.thisMonthAvgRhr}</p>
              </motion-safe-content>
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Last Mo.</p>
                <p className="text-lg font-bold text-slate-700">{vitalDash.lastMonthAvgRhr}</p>
              </motion-safe-content>
            </motion-safe-content>
          </VitalFlipCard>`;

const NEW_CLEAN = NEW.replace(/motion-safe-content/g, "div");

if (!patch(OLD_CLEAN, NEW_CLEAN)) process.exit(1);

// Landscape tiles
const oldLand = `        <section className={\`\${glassCard()} mb-5 p-4\`}>
          <div className="mb-3 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Vitals landscape</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: "bpm", label: "Resting BPM", min: 48, max: 120, unit: "" },
              { key: "spo2", label: "SpO₂", min: 90, max: 100, unit: "%" },
              { key: "sleepScore", label: "Sleep score", min: 40, max: 100, unit: "" },
              { key: "hrv", label: "HRV", min: 20, max: 80, unit: " ms" },
              { key: "steps", label: "Steps", min: 0, max: 16000, unit: "" },
            ].map((row) => (
              <label
                key={row.key}
                className="flex flex-col rounded-2xl border border-white/55 bg-white/45 p-3 shadow-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{row.label}</span>
                <span className="text-xl font-bold text-slate-900">
                  {vitalDash[row.key]}
                  {row.unit}
                </span>
                <input
                  type="range"
                  min={row.min}
                  max={row.max}
                  value={vitalDash[row.key]}
                  onChange={(e) =>
                    setVitalDash((d) => ({ ...d, [row.key]: Number(e.target.value) || row.min }))
                  }
                  className="mt-2 w-full accent-teal-600"
                />
              </label>
            ))}
          </div>
        </section>`;

const newLand = `        <VitalFlipCard
          title="Vitals Landscape"
          backDefinition="Vitals Landscape is a compact control deck for BPM, oxygen, sleep, HRV, and steps. Tap any tile to see what the metric means before you adjust sliders."
          className="mb-5"
          flipDisabled
          verified={verifiedSync}
          verifiedSource={verifiedSource}
        >
          <div className="mb-2 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-600" />
            <p className="text-xs text-slate-500">Tap a metric for its definition</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: "bpm", label: "Resting BPM", min: 48, max: 120, unit: "" },
              { key: "spo2", label: "SpO₂", min: 90, max: 100, unit: "%" },
              { key: "sleepScore", label: "Sleep score", min: 40, max: 100, unit: "" },
              { key: "hrv", label: "HRV", min: 20, max: 80, unit: " ms" },
              { key: "steps", label: "Steps", min: 0, max: 16000, unit: "" },
            ].map((row) => (
              <VitalLandscapeTile
                key={row.key}
                label={row.label}
                value={vitalDash[row.key]}
                unit={row.unit}
                min={row.min}
                max={row.max}
                backDefinition={LANDSCAPE_DEFS[row.key]}
                verified={verifiedSync}
                verifiedSource={verifiedSource}
                onChange={(n) => setVitalDash((d) => ({ ...d, [row.key]: n }))}
              />
            ))}
          </div>
        </VitalFlipCard>`;

if (!patch(oldLand, newLand)) process.exit(1);

fs.writeFileSync(p, s);
console.log("done");
