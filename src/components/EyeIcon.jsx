// Inline SVG rather than an emoji: 👁 and 🙈 render as full-colour pictures
// that differ on every platform, and a monkey is not a "hide" control.
// currentColor so the button decides the colour.
export default function EyeIcon({ off = false }) {
  return (
    <svg
      className="eye-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}
