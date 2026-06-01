"use client";

import { TERMLY_PREFERENCES_TRIGGER_ID } from "@/src/components/legal/termlyConfig";

type Props = {
  className?: string;
};

/**
 * Opens Termly's consent preference center. Visible link uses the required
 * `termly-display-preferences` class; click delegates to the static hidden
 * trigger in root layout so Termly's handler works in React/Next.js SPAs.
 */
export default function ConsentPreferencesLink({ className = "" }: Props) {
  const openPreferences = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const trigger = document.getElementById(TERMLY_PREFERENCES_TRIGGER_ID);
    if (trigger instanceof HTMLElement) {
      trigger.click();
      return;
    }
    document.querySelector<HTMLElement>(".termly-display-preferences")?.click();
  };

  return (
    <a
      href="#"
      className={["termly-display-preferences", className].filter(Boolean).join(" ")}
      onClick={openPreferences}
    >
      Consent Preferences
    </a>
  );
}
