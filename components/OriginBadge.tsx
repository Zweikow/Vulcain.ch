import Image from 'next/image'

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
  const src = isFR ? '/flags/fr.svg' : '/flags/ch.svg'

  return (
    <span className="inline-flex items-center gap-1.5 align-middle shrink-0" title={label}>
      <Image
        src={src}
        alt={label}
        width={20}
        height={20}
        className={`${className} rounded-full object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]`}
      />
      {showLabel && <span className={labelClassName}>{label}</span>}
    </span>
  )
}
