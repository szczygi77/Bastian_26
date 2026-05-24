import { cn } from '@/utils/cn'
import { getVoivodeshipBrand, getVoivodeshipEmblem } from '@/data/voivodeshipBranding'

interface RegionEmblemProps {
  regionId: string
  size?: number
  className?: string
  live?: boolean
}

export function RegionEmblem({ regionId, size = 56, className, live }: RegionEmblemProps) {
  const brand = getVoivodeshipBrand(regionId)
  const crestSrc = getVoivodeshipEmblem(regionId)

  return (
    <div
      className={cn('region-emblem', live && 'region-emblem--live', className)}
      style={{ width: size, height: Math.round(size * 1.15) }}
      aria-hidden
    >
      <img
        src={crestSrc}
        alt=""
        className="region-emblem__img"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget.nextElementSibling
          if (fallback instanceof HTMLElement) fallback.style.display = 'flex'
        }}
      />
      <div
        className="region-emblem__fallback"
        style={{
          background: `linear-gradient(160deg, ${brand.crestFrom} 0%, ${brand.crestTo} 100%)`,
        }}
      >
        <span className="region-emblem__initials">{brand.initials}</span>
      </div>
    </div>
  )
}
