import { cn } from '@/lib/ui';

type BrandLogoProps = {
  className?: string;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  wordmarkClassName?: string;
  /** Ink tile (default) or light surface for dark backgrounds */
  variant?: 'default' | 'onDark';
  title?: string;
};

/**
 * Bizzness brand mark — storefront awning + counter/receipt,
 * for restaurant & retail shop management.
 */
export function BrandLogo({
  className,
  withWordmark = false,
  wordmarkClassName,
  variant = 'default',
  title = 'Bizzness',
}: BrandLogoProps) {
  const tile = variant === 'onDark' ? '#faf7f2' : '#1c2333';
  const tileInner = variant === 'onDark' ? '#ffffff' : '#2a3347';
  const awning = '#b8894a';
  const awningLight = '#c9a06a';
  const scallop = variant === 'onDark' ? '#1c2333' : '#1c2333';
  const counter = variant === 'onDark' ? '#1c2333' : '#faf7f2';
  const receipt = variant === 'onDark' ? '#2a3347' : '#f3ebdd';
  const lines = '#b8894a';
  const wordmarkColor = variant === 'onDark' ? 'text-paper' : 'text-ink';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className="h-8 w-8 shrink-0"
        role="img"
        aria-hidden={withWordmark ? true : undefined}
        aria-label={withWordmark ? undefined : title}
      >
        <rect width="64" height="64" rx="14" fill={tile} />
        <rect x="6" y="6" width="52" height="52" rx="10" fill={tileInner} />
        <path
          d="M14 22h36v4.5c0 1.2-.5 2.3-1.4 3.1L44 34H20l-4.6-4.4A4.2 4.2 0 0 1 14 26.5V22z"
          fill={awning}
        />
        <path d="M14 18h36v5H14z" fill={awningLight} />
        <circle cx="20" cy="22.5" r="2.2" fill={scallop} />
        <circle cx="28" cy="22.5" r="2.2" fill={scallop} />
        <circle cx="36" cy="22.5" r="2.2" fill={scallop} />
        <circle cx="44" cy="22.5" r="2.2" fill={scallop} />
        <rect x="18" y="36" width="28" height="12" rx="2" fill={counter} />
        <path
          d="M30 30h12v22l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V30z"
          fill={receipt}
        />
        <path
          d="M32.5 35h7M32.5 39h7M32.5 43h5"
          stroke={lines}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark ? (
        <span className={cn('font-display text-lg font-semibold', wordmarkColor, wordmarkClassName)}>
          {title}
        </span>
      ) : null}
    </span>
  );
}
