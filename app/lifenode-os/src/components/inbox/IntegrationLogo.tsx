import Image from "next/image";
import type { InboxSource } from "@/src/lib/orchestrator/types";

const LOGO_SRC: Record<InboxSource, string> = {
  gmail: "/integrations/gmail.svg",
  slack: "/integrations/slack.svg",
  google_calendar: "/integrations/google-calendar.svg",
};

const LOGO_ALT: Record<InboxSource, string> = {
  gmail: "Gmail",
  slack: "Slack",
  google_calendar: "Google Calendar",
};

type Props = {
  source: InboxSource | string;
  size?: number;
  className?: string;
};

export default function IntegrationLogo({ source, size = 18, className = "" }: Props) {
  const key = source as InboxSource;
  const src = LOGO_SRC[key];
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={LOGO_ALT[key] ?? source}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      unoptimized
    />
  );
}

export function integrationLabel(source: string): string {
  if (source === "gmail") return "Gmail";
  if (source === "slack") return "Slack";
  if (source === "google_calendar") return "Google Calendar";
  return source;
}
