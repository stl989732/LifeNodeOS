import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Catalog — LifeNode OS",
  description:
    "Full catalog of LifeNode OS Nodes and shell surfaces — BizNode, HomeNode, VANode, VitalNode, TraderNode, ProNode, and more.",
  alternates: { canonical: `${SITE_URL}/catalog` },
};

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
