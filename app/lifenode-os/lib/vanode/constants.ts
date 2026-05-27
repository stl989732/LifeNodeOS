import type { LucideIcon } from "lucide-react";
import type { VanodePersisted } from "./types";
import {
  MessageSquare,
  Video,
  Wallet,
  Share2,
  Cloud,
  Hash,
  Users,
  Phone,
  Send,
  LayoutGrid,
  Kanban,
  MousePointerClick,
  CalendarDays,
  FileText,
  Landmark,
  CreditCard,
  CircleDollarSign,
  Palette,
  HardDrive,
  Monitor,
  Headset,
  PhoneCall,
  Timer,
  Calendar,
  LifeBuoy,
  MessageCircle,
  Briefcase,
  Mail,
  ScrollText,
  Workflow,
  Image as ImageIcon,
  Receipt,
} from "lucide-react";

export type WorkspaceTool = {
  id: string;
  name: string;
  category: string;
  Icon: LucideIcon;
};

export const WORKSPACE_TOOL_CATEGORIES: {
  label: string;
  tools: WorkspaceTool[];
}[] = [
  {
    label: "Communication",
    tools: [
      { id: "slack", name: "Slack", category: "Communication", Icon: Hash },
      { id: "teams", name: "Teams", category: "Communication", Icon: Users },
      { id: "zoom", name: "Zoom", category: "Communication", Icon: Video },
      { id: "whatsapp", name: "WhatsApp", category: "Communication", Icon: Phone },
      { id: "discord", name: "Discord", category: "Communication", Icon: MessageSquare },
      { id: "gmail", name: "Gmail", category: "Communication", Icon: Mail },
      { id: "loom", name: "Loom", category: "Communication", Icon: Video },
    ],
  },
  {
    label: "Telephony & Helpdesk",
    tools: [
      { id: "twilio", name: "Twilio", category: "Telephony & Helpdesk", Icon: PhoneCall },
      { id: "ringcentral", name: "RingCentral", category: "Telephony & Helpdesk", Icon: Headset },
      { id: "zendesk", name: "Zendesk", category: "Telephony & Helpdesk", Icon: LifeBuoy },
      { id: "intercom", name: "Intercom", category: "Telephony & Helpdesk", Icon: MessageCircle },
    ],
  },
  {
    label: "Project management",
    tools: [
      { id: "asana", name: "Asana", category: "Project management", Icon: LayoutGrid },
      { id: "trello", name: "Trello", category: "Project management", Icon: Kanban },
      { id: "clickup", name: "ClickUp", category: "Project management", Icon: MousePointerClick },
      { id: "monday", name: "Monday", category: "Project management", Icon: CalendarDays },
      { id: "notion", name: "Notion", category: "Project management", Icon: FileText },
      { id: "smartsheet", name: "Smartsheet", category: "Project management", Icon: ScrollText },
      { id: "linear", name: "Linear", category: "Project management", Icon: Workflow },
    ],
  },
  {
    label: "CRM & Scheduling",
    tools: [
      { id: "hubspot", name: "HubSpot", category: "CRM & Scheduling", Icon: Briefcase },
      { id: "salesforce", name: "Salesforce", category: "CRM & Scheduling", Icon: Briefcase },
      { id: "calendly", name: "Calendly", category: "CRM & Scheduling", Icon: Calendar },
      { id: "toggl", name: "Toggl Track", category: "CRM & Scheduling", Icon: Timer },
    ],
  },
  {
    label: "Finance",
    tools: [
      { id: "quickbooks", name: "QuickBooks", category: "Finance", Icon: Landmark },
      { id: "xero", name: "Xero", category: "Finance", Icon: Wallet },
      { id: "wave", name: "Wave", category: "Finance", Icon: CircleDollarSign },
      { id: "stripe", name: "Stripe", category: "Finance", Icon: CreditCard },
      { id: "paypal", name: "PayPal", category: "Finance", Icon: Wallet },
      { id: "freshbooks", name: "FreshBooks", category: "Finance", Icon: Receipt },
    ],
  },
  {
    label: "Social",
    tools: [
      { id: "hootsuite", name: "Hootsuite", category: "Social", Icon: Share2 },
      { id: "buffer", name: "Buffer", category: "Social", Icon: Send },
      { id: "canva", name: "Canva", category: "Social", Icon: Palette },
      { id: "figma", name: "Figma", category: "Social", Icon: ImageIcon },
    ],
  },
  {
    label: "Storage",
    tools: [
      { id: "gdrive", name: "Google Drive", category: "Storage", Icon: Cloud },
      { id: "dropbox", name: "Dropbox", category: "Storage", Icon: HardDrive },
      { id: "onedrive", name: "OneDrive", category: "Storage", Icon: Monitor },
    ],
  },
];

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const VANODE_STORAGE_KEY = "lifenode_vanode_v1";

export const defaultVanodePersisted = (): VanodePersisted => ({
  discoveryComplete: false,
  syncedToolIds: [],
  nativeTools: {
    aiTask: true,
    eod: true,
    chaosCalc: true,
    smartNotes: true,
  },
  settings: {
    cloudSyncRecording: false,
    vaEmailNotifications: true,
    vaSlackNotifications: false,
    defaultClientTimezone: "America/New_York",
  },
  scratchPad: { text: "", tags: [] },
  scratchPadSaves: [],
  activeClientId: null,
  valueMetrics: {
    inboxTriaged: 0,
    inboxReplied: 0,
    hoursSavedThisMonth: 0,
  },
  liveTranscripts: [],
  clients: [],
  notes: [],
  eodLogs: [],
  waitingTasks: [],
  invoices: [],
});
