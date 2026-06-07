/**
 * Linos brand mark — speech bubble + L + sparkle (inspired by LifeNode Linos avatar).
 */
export default function LinosSparkIcon({ className = "", size = 20, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M7 7.5h14.5a3.5 3.5 0 0 1 3.5 3.5v9.5a3.5 3.5 0 0 1-3.5 3.5H15.2L11.5 27v-3H7a3.5 3.5 0 0 1-3.5-3.5V11a3.5 3.5 0 0 1 3.5-3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 12.5v7.5M10.5 20h5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 15.5h1.2l.8-1.6.9 2.4.8-1.6h1.3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path
        d="M23.2 6.8l.9 1.8 1.9.9-1.9.9-.9 1.8-.9-1.8-1.9-.9 1.9-.9.9-1.8Z"
        fill="currentColor"
      />
      <circle cx="26.5" cy="10.5" r="0.9" fill="currentColor" opacity="0.85" />
      <circle cx="21.8" cy="5.8" r="0.6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
