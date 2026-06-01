"use client";

type Props = {
  className?: string;
};

/**
 * Opens Termly's consent preference center when the CMP script is loaded
 * (see TermlyCMP in root layout). Class name must stay `termly-display-preferences`.
 */
export default function ConsentPreferencesLink({ className = "" }: Props) {
  return (
    <a
      href="#"
      className={["termly-display-preferences", className].filter(Boolean).join(" ")}
      onClick={(e) => e.preventDefault()}
    >
      Consent Preferences
    </a>
  );
}
