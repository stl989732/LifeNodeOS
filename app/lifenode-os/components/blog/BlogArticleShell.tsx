import type { ReactNode } from "react";
import Link from "next/link";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

type Props = {
  children: ReactNode;
};

export default function BlogArticleShell({ children }: Props) {
  return (
    <main
      className={`${FONT_OUTFIT} landing-dark-zone min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50`}
    >
      <LandingPublicHeader theme="dark" />
      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">{children}</article>
      <div className="mx-auto max-w-3xl px-4 pb-8 md:px-6">
        <Link
          href="/blog"
          className="text-sm font-semibold text-[#17C4B3] hover:text-[#00ffc8] hover:underline"
        >
          ← All articles
        </Link>
      </div>
      <LandingSiteFooter variant="dark" />
    </main>
  );
}
