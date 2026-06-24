"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, X } from "lucide-react";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";
import type { ActiveNodeName } from "@/lib/node-mappings";

type Notification = {
  id: string;
  bridgeId: string;
  triggerSource: string;
  message: string;
  targetNode: ActiveNodeName | null;
  primaryActionLabel: string | null;
  createdAt: string;
  read: boolean;
};

const NOTIFICATIONS_CHANGED = "notifications:changed";
const NOTIFICATIONS_EPHEMERAL = "lino:notification:ephemeral";

/**
 * Header bell that surfaces out-of-scope Lino alerts. Pulls from
 * `/api/notifications` in normal mode, listens for `notifications:changed`
 * (fired by the LifeNodeContext after a successful POST). In
 * `DEV_FRESH_SESSION` mode it consumes the synthetic
 * `lino:notification:ephemeral` event so the bell still works locally with
 * no server writes.
 *
 * The popover is **portaled** into `document.body` because the shell header
 * uses `backdrop-blur` (creates a stacking context), which would otherwise
 * cause Node cards on `/shell` to overlap the dropdown.
 */
export default function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchItems = useCallback(async () => {
    if (DEV_FRESH_SESSION) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: Notification[] };
      setItems(data.notifications ?? []);
    } catch {
      /* ignore — bell stays empty */
    }
  }, []);

  useEffect(() => {
    void fetchItems();
    const onChange = () => void fetchItems();
    const onEphemeral = (event: Event) => {
      const detail = (event as CustomEvent<Notification[]>).detail;
      if (!Array.isArray(detail)) return;
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.bridgeId));
        const additions = detail.filter((d) => !seen.has(d.bridgeId));
        return [...prev, ...additions].slice(-200);
      });
    };
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    window.addEventListener(NOTIFICATIONS_EPHEMERAL, onEphemeral);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      window.removeEventListener(NOTIFICATIONS_EPHEMERAL, onEphemeral);
    };
  }, [fetchItems]);

  // Recalculate anchor rect whenever the popover opens (or the user scrolls/resizes).
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (buttonRef.current) {
        setAnchorRect(buttonRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on outside click — the popover is portaled, so we have to consider
  // both the button and the portal root.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideButton && !insidePopover) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const markRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (DEV_FRESH_SESSION) return;
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      /* optimistic update stands */
    }
  }, []);

  const clearAll = useCallback(async () => {
    setItems([]);
    if (DEV_FRESH_SESSION) return;
    try {
      await fetch("/api/notifications", { method: "DELETE" });
    } catch {
      /* will refetch next mount if user reopens */
    }
  }, []);

  const popover =
    open && mounted && anchorRect
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: Math.round(anchorRect.bottom + 8),
              // Right-align with the bell, but keep an 8px breathing room from the viewport edge.
              right: Math.max(
                8,
                Math.round(window.innerWidth - anchorRect.right)
              ),
              zIndex: 9999,
            }}
            className="w-[min(360px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-white/15 bg-[#0f172a]/95 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Notifications
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Quiet alerts from nodes you&apos;re not currently wearing.
                </p>
              </div>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition hover:bg-white/[0.07]"
                >
                  Clear
                </button>
              ) : null}
            </header>

            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-400">
                  <BellOff className="h-5 w-5 text-slate-500" />
                  <p>You&apos;re caught up.</p>
                  <p className="text-xs text-slate-500">
                    Out-of-scope alerts will land here so they don&apos;t interrupt
                    you.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {[...items].reverse().map((n) => (
                    <li
                      key={n.id}
                      className={`px-4 py-3 transition ${
                        n.read ? "opacity-70" : "bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {n.triggerSource || "Linos"}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-100">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!n.read ? (
                          <button
                            type="button"
                            onClick={() => void markRead(n.id)}
                            aria-label="Mark as read"
                            className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-slate-300 transition hover:bg-white/[0.08]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-slate-200 transition hover:bg-white/[0.07]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {popover}
    </>
  );
}
