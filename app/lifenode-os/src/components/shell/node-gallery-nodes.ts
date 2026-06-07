import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  HeartPulse,
  Home,
  MessageSquare,
  Scale,
  TrendingUp,
} from "lucide-react";
import type { ActiveNode } from "@/src/context/LifeNodeContext";

export type NodeGalleryEntry = {
  node: ActiveNode;
  label: string;
  Icon: LucideIcon;
};

/** Gallery order: BizNode → VANode → HomeNode → VitalNode → ProNode → TraderNode */
export const NODE_GALLERY_ENTRIES: NodeGalleryEntry[] = [
  { node: "BizNode", label: "BizNode", Icon: Briefcase },
  { node: "VANode", label: "VANode", Icon: MessageSquare },
  { node: "HomeNode", label: "HomeNode", Icon: Home },
  { node: "VitalNode", label: "VitalNode", Icon: HeartPulse },
  { node: "ProNode", label: "ProNode", Icon: Scale },
  { node: "TraderNode", label: "TraderNode", Icon: TrendingUp },
];
