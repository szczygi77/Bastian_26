import { useState } from 'react'
import { cn } from '@/utils/cn'
import { getVoivodeshipBrand } from '@/data/voivodeshipBranding'
import { RegionEmblem } from '@/components/national/RegionEmblem'

interface RegionHeroImageProps {
  regionId: string
  className?: string
  live?: boolean
  /** Pełnoekranowe tło spotlight vs miniatura karty */
  variant?: 'spotlight' | 'banner'
}

export function RegionHeroImage({
  regionId,
  className,
  live,
  variant = 'spotlight',
}: RegionHeroImageProps) {
  const brand = getVoivodeshipBrand(regionId)
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={cn('region-hero-fallback', className)}
        style={{
          background: `linear-gradient(135deg, ${brand.crestFrom} 0%, ${brand.crestTo} 55%, rgba(5,7,10,0.92) 100%)`,
        }}
        aria-hidden
      >
        <RegionEmblem regionId={regionId} size={variant === 'banner' ? 48 : 88} live={live} />
      </div>
    )
  }

  return (
    <img
      src={brand.heroImage}
      alt=""
      className={cn('region-hero-image', className)}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  )
}
