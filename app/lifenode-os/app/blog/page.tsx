import type { Metadata } from "next";
import Link from "next/link";
import LandingPublicHeader from "@/components/landing/LandingPublicHeader";
import LandingSiteFooter from "@/components/landing/LandingSiteFooter";
import { BLOG_INDEX_SUBTITLE_CLASS } from "@/components/blog/blogProseClasses";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — LifeNode OS",
  description:
    "Guides on app fragmentation, tool orchestration, and building a life OS — for founders, VAs, and multi-hat operators.",
  alternates: { canonical: "https://lifenodeos.com/blog" },
};

export default function BlogIndexPage() {
  return (
    <main className="landing-dark-zone min-h-screen bg-gradient-to-b from-[#f8fafc] via-slate-900/95 to-[#0B0F17] text-slate-50">
      <LandingPublicHeader theme="dark" />
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#17C4B3]">
          Blog
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Life Orchestration &amp; Productivity
        </h1>
        <p className={BLOG_INDEX_SUBTITLE_CLASS}>
          Practical guides for operators fighting app fragmentation — how to unify
          tools without adding another subscription tab.
        </p>

        <ul className="mt-10 space-y-6">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-slate-800/80 bg-slate-950/50 p-6 transition hover:border-[#17C4B3]/50"
              >
                <time
                  dateTime={post.publishedAt}
                  className="text-xs font-medium text-slate-500"
                >
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {post.readingMinutes} min read
                </time>
                <h2 className="mt-2 text-xl font-bold text-white hover:text-[#00ffc8]">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {post.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <LandingSiteFooter variant="dark" />
    </main>
  );
}
