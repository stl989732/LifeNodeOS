"use client";

import dynamic from "next/dynamic";

/**
 * Loaded client-only so the root layout stays a Server Component and the heavy
 * assistant bundle does not block the initial `/` dev compile.
 */
const LinoAssistant = dynamic(() => import("@/src/components/LinoAssistant"), {
  ssr: false,
  loading: () => null,
});

export default function LinoAssistantDynamic() {
  return <LinoAssistant />;
}
