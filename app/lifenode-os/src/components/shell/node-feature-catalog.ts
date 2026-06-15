import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  Briefcase,
  Calculator,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Clock,
  FolderArchive,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Mail,
  MessageSquare,
  Mic,
  NotebookPen,
  Receipt,
  Scale,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";

export type CatalogFeature = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/** Static feature menus per hat — used in sidebar dropdowns and deep links (`?ln-feature=`). */
export const NODE_FEATURE_CATALOG: Record<string, CatalogFeature[]> = {
  calendar: [
    { id: "overview", label: "Calendar", icon: LayoutDashboard },
    { id: "integrations", label: "Connect Apps", icon: CalendarCheck },
  ],
  inbox: [
    { id: "overview", label: "Unified Inbox", icon: Inbox },
    { id: "gmail", label: "Gmail", icon: Mail },
    { id: "slack", label: "Slack", icon: MessageSquare },
    { id: "google_calendar", label: "Calendar", icon: CalendarRange },
  ],
  pulse: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "calm-wheel", label: "Calm Wheel", icon: Activity },
    { id: "trackers", label: "Trackers", icon: Target },
    { id: "linos-chat", label: "Linos Chat", icon: Sparkles },
  ],
  work: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline Velocity", icon: TrendingUp },
    { id: "deal-triage", label: "Deal Triage", icon: Briefcase },
    { id: "connected-apps", label: "Connected Apps", icon: LayoutGrid },
    { id: "unified-brain", label: "Unified Node Brain", icon: Bot },
    { id: "founder-utils", label: "Founder Utilities", icon: Calculator },
  ],
  va: [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "eod", label: "EOD Log", icon: ClipboardList },
    { id: "vault", label: "Smart Vault", icon: FolderArchive },
    { id: "ai", label: "AI Assistant", icon: Bot },
    { id: "rhythm", label: "Chaos & Timezones", icon: Calculator },
    { id: "meeting", label: "Meeting Recorder", icon: Mic },
    { id: "waiting", label: "Waiting On", icon: Clock },
    { id: "clients", label: "Clients", icon: Users },
    { id: "invoice", label: "Invoicing", icon: Receipt },
  ],
  home: [
    { id: "home-overview", label: "Home Overview", icon: LayoutDashboard },
    { id: "chef-node", label: "ChefNode", icon: Utensils },
    { id: "smart-cart", label: "Smart Cart", icon: ShoppingCart },
    { id: "chore-hub", label: "Chore & Reward Hub", icon: CalendarCheck },
  ],
  vital: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "momentum", label: "Momentum Mode", icon: HeartPulse },
    { id: "sleep", label: "Sleep & Nutrition", icon: Activity },
    { id: "architect", label: "Vital Architect", icon: Sparkles },
  ],
  pro: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "focus", label: "Focus Discovery", icon: Target },
    { id: "cases", label: "Cases & Projects", icon: Scale },
    { id: "editor", label: "Deep Focus Editor", icon: NotebookPen },
    { id: "timeline", label: "Auto-Timeline", icon: Clock },
    { id: "command", label: "Command Center", icon: LayoutGrid },
  ],
  trader: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "watchlist", label: "Watchlist", icon: LineChart },
    { id: "journal", label: "Trading Journal", icon: NotebookPen },
    { id: "risk", label: "Risk Guardrails", icon: BarChart3 },
  ],
};

export function catalogForHat(hatId: string): CatalogFeature[] {
  return NODE_FEATURE_CATALOG[hatId] ?? [{ id: "overview", label: "Overview", icon: LayoutDashboard }];
}

export function hatIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) return "calendar";
  if (pathname === "/inbox" || pathname.startsWith("/inbox/")) return "inbox";
  if (pathname === "/pulse" || pathname.startsWith("/pulse/")) return "pulse";
  if (pathname === "/work" || pathname.startsWith("/work/")) return "work";
  if (pathname === "/vanode" || pathname.startsWith("/vanode/")) return "va";
  if (pathname === "/home" || pathname.startsWith("/home/")) return "home";
  if (pathname === "/vital" || pathname.startsWith("/vital/")) return "vital";
  if (pathname === "/pro" || pathname.startsWith("/pro/")) return "pro";
  if (pathname === "/trader" || pathname.startsWith("/trader/")) return "trader";
  return null;
}
