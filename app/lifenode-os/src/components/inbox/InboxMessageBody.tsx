"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import DOMPurify from "isomorphic-dompurify";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";

type Props = {
  item: InboxClientItem;
  loading?: boolean;
};

function renderSlackMrkdwn(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const linkMatch = remaining.match(/^<([^|>]+)\|([^>]+)>/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${lineIdx}-${key++}`}
            href={linkMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline"
          >
            {linkMatch[2]}
          </a>,
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      const urlMatch = remaining.match(/^<(https?:\/\/[^>]+)>/);
      if (urlMatch) {
        parts.push(
          <a
            key={`${lineIdx}-${key++}`}
            href={urlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-sky-600 underline"
          >
            {urlMatch[1]}
          </a>,
        );
        remaining = remaining.slice(urlMatch[0].length);
        continue;
      }

      const boldMatch = remaining.match(/^\*([^*]+)\*/);
      if (boldMatch) {
        parts.push(
          <strong key={`${lineIdx}-${key++}`}>{boldMatch[1]}</strong>,
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      const italicMatch = remaining.match(/^_([^_]+)_/);
      if (italicMatch) {
        parts.push(<em key={`${lineIdx}-${key++}`}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      const nextSpecial = remaining.search(/[<_*]/);
      if (nextSpecial === -1) {
        parts.push(<span key={`${lineIdx}-${key++}`}>{remaining}</span>);
        break;
      }
      if (nextSpecial > 0) {
        parts.push(
          <span key={`${lineIdx}-${key++}`}>{remaining.slice(0, nextSpecial)}</span>,
        );
        remaining = remaining.slice(nextSpecial);
        continue;
      }

      parts.push(<span key={`${lineIdx}-${key++}`}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }

    return (
      <p key={lineIdx} className="mb-2 last:mb-0">
        {parts}
      </p>
    );
  });
}

export default function InboxMessageBody({ item, loading }: Props) {
  const bodyHtml =
    typeof item.providerPayload?.bodyHtml === "string"
      ? item.providerPayload.bodyHtml
      : null;

  const sanitizedHtml = useMemo(() => {
    if (!bodyHtml?.trim()) return null;
    return DOMPurify.sanitize(bodyHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target"],
    });
  }, [bodyHtml]);

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Loading full content…</p>
    );
  }

  if (item.source === "gmail" && sanitizedHtml) {
    return (
      <div
        className="inbox-email-body max-w-none text-xs leading-relaxed text-slate-800 md:text-sm [&_a]:break-all [&_a]:text-sky-600 [&_a]:underline [&_img]:max-w-full [&_p]:mb-2 [&_table]:max-w-full [&_table]:text-xs"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  if (item.source === "slack" && item.body?.trim()) {
    return (
      <div className="text-xs leading-relaxed text-slate-800 md:text-sm">
        {renderSlackMrkdwn(item.body)}
      </div>
    );
  }

  const plain = item.body?.trim() || item.snippet || "No content.";
  return (
    <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 md:text-sm">
      {plain}
    </div>
  );
}
