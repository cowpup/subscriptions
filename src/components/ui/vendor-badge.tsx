interface VendorBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function VendorBadge({ size = 'md', className = '' }: VendorBadgeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${sizeClasses[size]} ${className}`}
      aria-label="Verified Vendor"
    >
      <circle cx="12" cy="12" r="10" fill="#16a34a" />
      <path
        d="M8 12l3 3 5-6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface VendorAvatarWithBadgeProps {
  avatarUrl?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
}

const avatarSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

const badgePositions = {
  sm: '-bottom-0.5 -right-0.5',
  md: '-bottom-1 -right-1',
  lg: '-bottom-1 -right-1',
}

const badgeSizeMap = {
  sm: 'sm' as const,
  md: 'md' as const,
  lg: 'lg' as const,
}

export function VendorAvatarWithBadge({
  avatarUrl,
  name,
  size = 'md',
  showBadge = true,
}: VendorAvatarWithBadgeProps) {
  return (
    <div className="relative inline-block">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${avatarSizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${avatarSizes[size]} flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {showBadge && (
        <div className={`absolute ${badgePositions[size]}`}>
          <VendorBadge size={badgeSizeMap[size]} />
        </div>
      )}
    </div>
  )
}
