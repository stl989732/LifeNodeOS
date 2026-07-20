import type { Metadata } from "next";

/**
 * Keep auth out of the Google index. Query variants like
 * `/auth/signin?callbackUrl=/vital` are treated as duplicates otherwise.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
