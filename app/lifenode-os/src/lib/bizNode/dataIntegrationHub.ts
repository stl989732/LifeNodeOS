export const DATA_HUB_TOOLS = ["Monday.com", "Trello", "Airtable"] as const;

export type DataHubTool = (typeof DATA_HUB_TOOLS)[number];

export const DATA_HUB_STORAGE_KEY = "lifenode.biznode.data-hub.v1";

export function readPrimaryDataTool(): DataHubTool | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DATA_HUB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { primary?: string };
    if (DATA_HUB_TOOLS.includes(parsed.primary as DataHubTool)) {
      return parsed.primary as DataHubTool;
    }
  } catch {
    // ignore
  }
  return null;
}

export function writePrimaryDataTool(tool: DataHubTool): void {
  window.localStorage.setItem(DATA_HUB_STORAGE_KEY, JSON.stringify({ primary: tool }));
}

/** Hide non-primary hub tools from calm UI surfaces. */
export function filterAppsForDataHub(apps: string[], primary: DataHubTool | null): string[] {
  if (!primary) {
    return apps.filter((a) => !DATA_HUB_TOOLS.includes(a as DataHubTool));
  }
  return apps.filter((app) => {
    if (!DATA_HUB_TOOLS.includes(app as DataHubTool)) return true;
    return app === primary;
  });
}

export function reconcileHubSelection(
  selectedApps: string[],
  primary: DataHubTool,
): string[] {
  const withoutHub = selectedApps.filter(
    (a) => !DATA_HUB_TOOLS.includes(a as DataHubTool),
  );
  if (!withoutHub.includes(primary)) return [...withoutHub, primary];
  return [...withoutHub, primary];
}
