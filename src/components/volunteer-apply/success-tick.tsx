import "./success-tick.css";

export function SuccessTick({ className }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 56 56" className={`success-tick ${className ?? ""}`} aria-hidden="true">
      <g className="success-tick__mark">
        <circle className="success-tick__disc" cx="28" cy="28" r="24" fill="#25D366" fillOpacity="0.14" />
        <circle
          className="success-tick__ring"
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke="#128C7E"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
        <path
          className="success-tick__check"
          d="M18 28.5l6.5 6.5L38.5 21"
          fill="none"
          stroke="#128C7E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
