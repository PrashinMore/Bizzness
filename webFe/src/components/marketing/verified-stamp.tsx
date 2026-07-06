type VerifiedStampProps = {
  className?: string;
  size?: number;
};

export function VerifiedStamp({ className = '', size = 72 }: VerifiedStampProps) {
  const r = size / 2;
  const outer = r - 6;
  const inner = r - 12;

  return (
    <div className={className} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <circle
          cx={r}
          cy={r}
          r={outer}
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          fill="var(--paper)"
          fillOpacity="0.92"
        />
        <circle
          cx={r}
          cy={r}
          r={inner}
          stroke="var(--success)"
          strokeWidth="0.75"
          strokeOpacity="0.55"
        />
        <text
          x={r}
          y={r + 2}
          textAnchor="middle"
          fill="var(--success)"
          fontSize={size * 0.11}
          fontWeight="600"
          letterSpacing="2"
          fontFamily="var(--font-body), sans-serif"
        >
          VERIFIED
        </text>
      </svg>
    </div>
  );
}
