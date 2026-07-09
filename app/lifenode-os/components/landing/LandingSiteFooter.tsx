"use client";

import Link from "next/link";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";
import { FOOTER_COLUMNS } from "./landingPublicNav";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

type Variant = "light" | "dark";

type Props = {
  variant?: Variant;
  className?: string;
};

export default function LandingSiteFooter({ variant = "dark", className = "" }: Props) {
  const isDark = variant === "dark";

  return (
    <footer
      className={`${FONT_OUTFIT} relative z-10 w-full border-t px-6 py-12 md:px-8 md:py-14 ${
        isDark
          ? "border-slate-800 bg-[#0B0F17] text-[#90A1B9]"
          : "border-slate-200 bg-white text-slate-600"
      } ${className}`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-10">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3
                className={`text-sm font-semibold ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    {"consent" in link && link.consent ? (
                      <ConsentPreferencesLink
                        className={`text-sm transition ${
                          isDark
                            ? "text-[#90A1B9] hover:text-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      />
                    ) : (
                      <Link
                        href={link.href}
                        className={`text-sm transition ${
                          isDark
                            ? "text-[#90A1B9] hover:text-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p
          className={`mt-10 border-t pt-8 text-center text-xs ${
            isDark ? "border-slate-800 text-[#677589]" : "border-slate-200 text-slate-500"
          }`}
        >
          &copy; {new Date().getFullYear()} LifeNode OS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
