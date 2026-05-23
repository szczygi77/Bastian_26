import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/utils/cn'

export function ObjectHeroImage({
  src,
  alt,
  loading = false,
  available = true,
  className,
  badge,
}: {
  src: string | null
  alt: string
  loading?: boolean
  available?: boolean
  className?: string
  badge?: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const showPlaceholder = loading || !available || !src || failed

  return (
    <div className={cn('object-hero', className)}>
      {!showPlaceholder && src && (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
        />
      )}

      {showPlaceholder && (
        <div className={`object-hero__placeholder${loading ? ' object-hero__placeholder--loading' : ''}`}>
          <ImageOff size={loading ? 22 : 28} strokeWidth={1.5} />
          <span>{loading ? 'Ładowanie zdjęcia…' : 'Brak zdjęcia obiektu'}</span>
          {!loading && (
            <small>Nie znaleziono zweryfikowanego zdjęcia tego obiektu w dostępnych źródłach.</small>
          )}
        </div>
      )}

      {badge && <span className="object-hero__badge">{badge}</span>}
    </div>
  )
}
