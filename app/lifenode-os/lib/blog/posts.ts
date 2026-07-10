export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  keywords: string[];
  readingMinutes: number;
};

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "life-os-vs-productivity-apps",
    title: "Life OS vs Productivity Apps: When You Need Orchestration, Not Another Task List",
    description:
      "Notion, ClickUp, and Todoist solve pieces of your stack — but multi-hat operators need a life OS. Learn when a productivity app is enough and when tool orchestration wins.",
    publishedAt: "2026-07-10",
    keywords: [
      "life OS",
      "productivity apps",
      "tool orchestration",
      "ClickUp alternative",
      "Notion alternative",
      "multi-hat operator",
      "unified dashboard",
    ],
    readingMinutes: 7,
  },
  {
    slug: "app-fragmentation",
    title: "What Is App Fragmentation? How to Orchestrate Your Tools in One Dashboard",
    description:
      "App fragmentation costs multi-hat operators hours every week. Learn what it is, why calendar apps alone do not fix it, and how a life orchestration platform unifies Gmail, Slack, and client work.",
    publishedAt: "2026-07-10",
    keywords: [
      "app fragmentation",
      "tool orchestration",
      "life OS",
      "productivity app overload",
      "unified dashboard",
      "multi-hat operator",
    ],
    readingMinutes: 6,
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
