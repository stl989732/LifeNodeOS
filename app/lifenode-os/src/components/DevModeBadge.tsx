import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

/**
 * Tiny corner pill that reminds the operator they're running in
 * `NEXT_PUBLIC_LIFENODE_DEV_FRESH_SESSION=1` mode (no persistence). Returns
 * `null` in production builds — the entire branch is dead-code-eliminated
 * because the flag is inlined at build time.
 */
export default function DevModeBadge() {
  if (!DEV_FRESH_SESSION) return null;
  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[120] select-none rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur md:right-4 md:top-4"
      suppressHydrationWarning
    >
      Dev · Fresh Session (no persistence)
    </div>
  );
}
