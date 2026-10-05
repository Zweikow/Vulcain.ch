interface OriginBadgeProps {
  origin?: 'CH' | 'FR' | string | null
  className?: string
  showLabel?: boolean
  labelClassName?: string
}

export function OriginBadge({
  origin,
  className = 'w-4 h-4',
  showLabel = false,
  labelClassName = 'text-xs text-text-secondary dark:text-text-secondary-dark font-medium',
}: OriginBadgeProps) {
  const isFR = origin === 'FR'
  const label = isFR ? 'France' : 'Suisse'

  return (
    <span className="inline-flex items-center gap-1.5 align-middle shrink-0" title={label}>
      {isFR ? (
        <svg
          viewBox="0 0 48 48"
          className={`${className} rounded-full shrink-0 shadow-sm`}
          aria-hidden="true"
        >
          <defs>
            <clipPath id="fr-flag-circle">
              <circle cx="24" cy="24" r="24" />
            </clipPath>
          </defs>
          <g clipPath="url(#fr-flag-circle)">
            <rect x="0" y="0" width="16" height="48" fill="#002654" />
            <rect x="16" y="0" width="16" height="48" fill="#FFFFFF" />
            <rect x="32" y="0" width="16" height="48" fill="#ED2939" />
          </g>
          <circle cx="24" cy="24" r="23.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 48 48"
          className={`${className} rounded-full shrink-0 shadow-sm`}
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="24" fill="#D52B1E" />
          <rect x="20" y="10" width="8" height="28" rx="2" fill="#FFFFFF" />
          <rect x="10" y="20" width="28" height="8" rx="2" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="23.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        </svg>
      )}
      {showLabel && <span className={labelClassName}>{label}</span>}
    </span>
  )
}
