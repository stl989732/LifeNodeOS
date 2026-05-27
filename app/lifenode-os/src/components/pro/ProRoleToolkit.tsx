"use client";

import type { ProRoleConfig } from "@/src/lib/proNode/roles";

type ProRoleToolkitProps = {
  config: ProRoleConfig;
};

export default function ProRoleToolkit({ config }: ProRoleToolkitProps) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
        {config.nodeName}
      </p>
      <h3 className="mt-1 text-sm font-bold text-[#1E293B]">{config.specialtyTitle}</h3>
      <ul className="mt-3 space-y-2">
        {config.specialtyFeatures.map((f) => (
          <li key={f.title} className="rounded-lg border border-indigo-100/80 bg-white/80 p-2.5">
            <p className="text-xs font-semibold text-slate-900">{f.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{f.description}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-indigo-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
          Integration Hooks
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {config.integrationHooks.map((hook) => (
            <span
              key={hook}
              className="rounded-md border border-indigo-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700"
            >
              {hook}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
