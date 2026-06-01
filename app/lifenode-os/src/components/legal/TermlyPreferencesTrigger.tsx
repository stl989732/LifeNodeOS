import {
  TERMLY_PREFERENCES_TRIGGER_ID,
  TERMLY_WEBSITE_UUID,
} from "@/src/components/legal/termlyConfig";

/**
 * Hidden control Termly binds on first paint. Footer/auth links programmatically
 * click this element (see ConsentPreferencesLink).
 */
export default function TermlyPreferencesTrigger() {
  if (!TERMLY_WEBSITE_UUID) return null;

  return (
    <button
      type="button"
      id={TERMLY_PREFERENCES_TRIGGER_ID}
      className="termly-display-preferences fixed -left-[9999px] h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
      tabIndex={-1}
    >
      Consent Preferences
    </button>
  );
}
