"use client";

import { useEffect, useState } from "react";

const EMBED_SCRIPT = "https://scale.verpexxsystems.dev/js/form_embed.js";

type Props = {
  surveyId: string;
  title: string;
  minHeight?: number;
};

/**
 * Embeds Scale / Verpexx survey forms. Uses a tall scrollable iframe so all
 * fields and the submit button stay visible (scrolling="no" was clipping forms).
 */
export default function ScaleSurveyEmbed({
  surveyId,
  title,
  minHeight = 900,
}: Props) {
  const [frameHeight, setFrameHeight] = useState(minHeight);

  useEffect(() => {
    setFrameHeight(minHeight);
  }, [minHeight]);

  useEffect(() => {
    if (!document.querySelector(`script[src="${EMBED_SCRIPT}"]`)) {
      const script = document.createElement("script");
      script.src = EMBED_SCRIPT;
      script.async = true;
      document.body.appendChild(script);
    }

    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== "object" || event.data === null) return;
      const data = event.data as Record<string, unknown>;
      const next =
        typeof data.height === "number"
          ? data.height
          : typeof data.frameHeight === "number"
            ? data.frameHeight
            : typeof data.iframeHeight === "number"
              ? data.iframeHeight
              : null;
      if (next && next > frameHeight) {
        setFrameHeight(Math.min(next + 48, 2400));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameHeight]);

  return (
    <iframe
      src={`https://scale.verpexxsystems.dev/widget/survey/${surveyId}`}
      style={{
        border: "none",
        width: "100%",
        height: frameHeight,
        minHeight,
        display: "block",
      }}
      scrolling="yes"
      id={surveyId}
      title={title}
      className="w-full rounded-xl bg-white"
      allow="clipboard-write"
    />
  );
}
