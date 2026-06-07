import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Briefcase,
  HeartPulse,
  Home,
  LayoutDashboard,
  MessageSquare,
  Scale,
  TrendingUp,
} from "lucide-react";

export type HatNavItem = {
  id: string;
  label: string;
  route: string;
  Icon: LucideIcon;
  /** Prefix match for active detection */
  pathPrefix: string;
};

/**
 * Hat rail entries — Hub removed from sidebar; order applied via `sortBySidebarHatOrder`.
 * LifePulse → BizNode → VANode → HomeNode → VitalNode → ProNode → TraderNode.
 */
export const HAT_NAV_ITEMS: HatNavItem[] = [
  {
    id: "pulse",
    label: "LifePulse",
    route: "/pulse",
    Icon: Activity,
    pathPrefix: "/pulse",
  },
  {
    id: "work",
    label: "BizNode",
    route: "/work",
    Icon: Briefcase,
    pathPrefix: "/work",
  },
  {
    id: "va",
    label: "VANode",
    route: "/vanode",
    Icon: MessageSquare,
    pathPrefix: "/vanode",
  },
  {
    id: "home",
    label: "HomeNode",
    route: "/home",
    Icon: Home,
    pathPrefix: "/home",
  },
  {
    id: "vital",
    label: "VitalNode",
    route: "/vital",
    Icon: HeartPulse,
    pathPrefix: "/vital",
  },
  {
    id: "pro",
    label: "ProNode",
    route: "/pro",
    Icon: Scale,
    pathPrefix: "/pro",
  },
  {
    id: "trader",
    label: "TraderNode",
    route: "/trader",
    Icon: TrendingUp,
    pathPrefix: "/trader",
  },
  {
    id: "shell",
    label: "Hub",
    route: "/shell",
    Icon: LayoutDashboard,
    pathPrefix: "/shell",
  },
];

export function isHatNavActive(pathname: string | null, pathPrefix: string) {
  if (!pathname) return false;
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

/** TraderNode uses a single-sidebar layout (no feature rail). */
export function isTraderNodePath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/trader" || pathname.startsWith("/trader/");
}
