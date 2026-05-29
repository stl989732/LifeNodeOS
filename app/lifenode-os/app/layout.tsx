import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Playfair_Display, DM_Sans } from "next/font/google";
import LinoAlert from "@/src/components/LinoAlert";
import LinoAssistantDynamic from "@/src/components/LinoAssistantDynamic";
import { AuthProviders } from "@/src/components/AuthProviders";
import NodeNavChrome from "@/src/components/NodeNavChrome";
import { LifeNodeProvider } from "@/src/context/LifeNodeContext";
import { WhiteboardVaultBridgeProvider } from "@/src/context/WhiteboardVaultBridgeContext";
import { LoadingOverlayProvider } from "@/src/context/LoadingOverlayContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeNode OS",
  description: "The operating system for your whole life — LifeNode OS.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/lifenode-os-logo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.png",
    apple: "/lifenode-os-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${playfair.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <AuthProviders>
          <LifeNodeProvider>
            <LoadingOverlayProvider>
              <WhiteboardVaultBridgeProvider>
                {children}
                <NodeNavChrome />
                <LinoAlert />
                <LinoAssistantDynamic />
              </WhiteboardVaultBridgeProvider>
            </LoadingOverlayProvider>
          </LifeNodeProvider>
        </AuthProviders>
      </body>
    </html>
  );
}
