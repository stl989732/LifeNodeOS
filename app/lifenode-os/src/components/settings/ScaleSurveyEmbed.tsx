"use client";

import { useEffect } from "react";

const EMBED_SCRIPT = "https://scale.verpexxsystems.dev/js/form_embed.js";

type Props = {
  surveyId: string;
  title: string;
  minHeight?: number;
};

export default function ScaleSurveyEmbed({
  surveyId,
  title,
  minHeight = 480,
}: Props) {
  useEffect(() => {
    if (document.querySelector(`script[src="${EMBED_SCRIPT}"]`)) return;
    const script = document.createElement("script");
    script.src = EMBED_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <iframe
      src={`https://scale.verpexxsystems.dev/widget/survey/${surveyId}`}
      style={{ border: "none", width: "100%", minHeight }}
      scrolling="no"
      id={surveyId}
      title={title}
      className="w-full rounded-xl bg-white dark:bg-slate-900"
    />
  );
}
