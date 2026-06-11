import {
  isNodeWidgetKey,
  NODE_WIDGET_KEYS,
  type NodeWidgetKey,
} from "@/lib/node-widget-keys";

/** Every registered Supabase widget key (for bulk fetch / cross-device sync). */
export function listAllNodeWidgetKeys(): NodeWidgetKey[] {
  const out: NodeWidgetKey[] = [];
  for (const group of Object.values(NODE_WIDGET_KEYS)) {
    for (const key of Object.values(group)) {
      if (isNodeWidgetKey(key)) out.push(key);
    }
  }
  return out;
}
