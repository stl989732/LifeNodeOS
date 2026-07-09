"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { signOutWithClientCleanup } from "@/src/lib/sessionClientIsolation";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";
import SupportChromeMenu from "@/src/components/SupportChromeMenu";
import {
  LANDING_EXPLORE_LINKS,
  LANDING_NODE_LINKS,
  LANDING_POLICY_LINKS,
  LANDING_DOC_LINKS,
  LANDING_SUPPORT_ACTION_LINKS,
} from "./landingPublicNav";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

type Theme = "light" | "dark";

type Props = {
  theme?: Theme;
  className?: string;
};

function themeClasses(theme: Theme) {
  if (theme === "dark") {
    return {
      brand: "text-[#1F1E24]",
      brandMuted: "text-[#67707E]",
      navLink: "text-[#67707E] transition hover:text-white",
      signInPill:
        "rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20",
      signOut: "text-slate-300 transition hover:text-white",
      menuBtn: "text-slate-200 hover:bg-white/10",
    };
  }
  return {
    brand: "text-slate-900",
    brandMuted: "text-slate-400",
    navLink: "text-slate-600 transition hover:text-slate-900",
    signInPill:
      "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50",
    signOut: "text-slate-600 transition hover:text-slate-900",
    menuBtn: "text-slate-700 hover:bg-slate-100",
  };
}

function MobileNavDrawer({
  open,
  onClose,
  signedIn,
  userId,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  userId?: string;
  theme: Theme;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted || typeof document === "undefined") return null;

  const panelBg = theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900";
  const sectionLabel =
    theme === "dark"
      ? "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
      : "text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400";
  const itemClass =
    theme === "dark"
      ? "block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
      : "block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100";
  const divider = theme === "dark" ? "border-slate-800" : "border-slate-200";

  return createPortal(
    <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className={`${FONT_OUTFIT} absolute inset-x-3 top-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${panelBg} ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b px-4 py-4 ${divider}`}
        >
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <Image
              src="/lifenode-os-logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              unoptimized
            />
            <span className="font-bold tracking-wide">
              LifeNode <span className="font-light text-slate-400">OS</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void signOutWithClientCleanup(userId, { callbackUrl: "/" });
                }}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                onClick={onClose}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900"
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {signedIn ? (
            <div className="mb-4">
              <p className={`mb-2 px-3 ${sectionLabel}`}>Your nodes</p>
              <ul className="space-y-0.5">
                {LANDING_NODE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={itemClass} onClick={onClose}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={signedIn ? `mb-4 border-t pt-4 ${divider}` : "mb-4"}>
            <p className={`mb-2 px-3 ${sectionLabel}`}>Explore</p>
            <ul className="space-y-0.5">
              {LANDING_EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={itemClass} onClick={onClose}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`mb-4 border-t pt-4 ${divider}`}>
            <p className={`mb-2 px-3 ${sectionLabel}`}>Policies</p>
            <ul className="space-y-0.5">
              {LANDING_POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={itemClass} onClick={onClose}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <ConsentPreferencesLink
                  className={`${itemClass} w-full text-left`}
                />
              </li>
            </ul>
          </div>

          <div className={`border-t pt-4 ${divider}`}>
            <p className={`mb-2 px-3 ${sectionLabel}`}>Documentation</p>
            <ul className="space-y-0.5">
              {LANDING_DOC_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={itemClass} onClick={onClose}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={`border-t pt-4 ${divider}`}>
            <p className={`mb-2 px-3 ${sectionLabel}`}>Support</p>
            <ul className="space-y-0.5">
              {LANDING_SUPPORT_ACTION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={itemClass} onClick={onClose}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}

export default function LandingPublicHeader({ theme = "light", className = "" }: Props) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(session?.user);
  const t = themeClasses(theme);

  return (
    <>
      <header
        className={`${FONT_OUTFIT} relative z-50 flex w-full items-center justify-between gap-3 px-4 py-5 md:px-6 ${className}`}
      >
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <Image
            src="/lifenode-os-logo.png"
            alt="LifeNode OS"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
            priority
            unoptimized
          />
          <span className={`truncate font-bold tracking-wide text-xl ${t.brand}`}>
            LifeNode <span className={`font-light ${t.brandMuted}`}>OS</span>
          </span>
        </Link>

        <nav
          className={`${FONT_OUTFIT} hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-sm font-semibold`}
        >
          {LANDING_EXPLORE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={t.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {signedIn ? (
            <>
              <nav className="hidden lg:flex items-center gap-4 text-sm font-semibold">
                {LANDING_NODE_LINKS.slice(0, 4).map((link) => (
                  <Link key={link.href} href={link.href} className={t.navLink}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                onClick={() =>
                  void signOutWithClientCleanup(session?.user?.id, {
                    callbackUrl: "/",
                  })
                }
                className={`hidden md:inline text-sm font-semibold ${t.signOut}`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className={`hidden md:inline text-sm font-semibold ${t.navLink}`}>
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="hidden md:inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
              >
                Sign up
              </Link>
              <Link href="/auth/signin" className={`md:hidden ${t.signInPill}`}>
                Sign In
              </Link>
            </>
          )}

          {signedIn ? (
            <button
              type="button"
              onClick={() =>
                void signOutWithClientCleanup(session?.user?.id, {
                  callbackUrl: "/",
                })
              }
              className={`md:hidden text-sm font-semibold ${t.signOut}`}
            >
              Sign out
            </button>
          ) : null}

          <SupportChromeMenu
            variant={theme}
            className="hidden md:inline-flex shrink-0"
          />

          <button
            type="button"
            className={`inline-flex rounded-lg p-2 md:hidden ${t.menuBtn}`}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        signedIn={signedIn}
        userId={session?.user?.id}
        theme={theme}
      />
    </>
  );
}
