"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LANDING_FAQ_ITEMS } from "./landingFaqData";
import { SUPPORT_ROUTES } from "@/lib/support/routes";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

const CATEGORY_ORDER = [
  "Nodes",
  "Integrations",
  "Features",
  "Subscription",
  "Cancellation & refunds",
  "Contact us",
] as const;

export default function LandingFaqSection() {
  const [openId, setOpenId] = useState<string | null>(LANDING_FAQ_ITEMS[0]?.id ?? null);
  const [activeCategory, setActiveCategory] = useState<string>("Nodes");

  const categories = useMemo(() => {
    const fromData = [...new Set(LANDING_FAQ_ITEMS.map((item) => item.category))];
    return CATEGORY_ORDER.filter((c) => fromData.includes(c));
  }, []);

  const visibleItems = useMemo(() => {
    return LANDING_FAQ_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  return (
    <section
      id="faq"
      className={`${FONT_OUTFIT} relative z-10 mx-auto w-full max-w-3xl px-4 pb-16 pt-4 md:px-6`}
      aria-labelledby="landing-faq-heading"
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
        FAQ
      </p>
      <h2
        id="landing-faq-heading"
        className="mt-3 text-center text-3xl font-bold text-white md:text-4xl"
      >
        Answers before you commit
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-[#76808F] md:text-base">
        Nodes, integrations, billing, and support — including why some mobile apps
        cannot connect yet.
      </p>

      <div
        className="mt-8 flex flex-wrap justify-center gap-2"
        role="tablist"
        aria-label="FAQ categories"
      >
        {categories.map((category) => {
          const selected = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActiveCategory(category);
                const firstInCategory = LANDING_FAQ_ITEMS.find(
                  (item) => item.category === category,
                );
                setOpenId(firstInCategory?.id ?? null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                selected
                  ? "bg-[#00ffc8]/20 text-[#00ffc8] ring-1 ring-[#00ffc8]/40"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <ul className="mt-8 space-y-3">
        {visibleItems.map((item) => {
          const open = openId === item.id;
          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm"
            >
              <button
                type="button"
                id={`faq-q-${item.id}`}
                aria-expanded={open}
                aria-controls={`faq-a-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left md:px-5"
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[#17C4B3]">
                    {item.category}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-slate-100 md:text-base">
                    {item.question}
                  </span>
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              <div
                id={`faq-a-${item.id}`}
                role="region"
                aria-labelledby={`faq-q-${item.id}`}
                hidden={!open}
                className="border-t border-slate-800/60 px-4 pb-4 pt-0 md:px-5"
              >
                <p className="text-sm leading-relaxed text-[#90A1B9]">{item.answer}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-sm text-slate-500">
        Still stuck?{" "}
        <Link
          href={SUPPORT_ROUTES.ticket}
          className="font-semibold text-[#17C4B3] hover:underline"
        >
          Open a support ticket
        </Link>{" "}
        or{" "}
        <Link
          href={SUPPORT_ROUTES.feedback}
          className="font-semibold text-[#17C4B3] hover:underline"
        >
          send feedback
        </Link>
        .
      </p>
    </section>
  );
}
