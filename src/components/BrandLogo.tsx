import { cn } from '@/utils/cn'
import { APP_ICON, APP_LOGO, APP_NAME } from '@/config/app'

interface BrandLogoProps {
  variant?: 'full' | 'icon'
  height?: number
  emphasis?: 'default' | 'hero'
  className?: string
  style?: React.CSSProperties
}

export function BrandLogo({
  variant = 'full',
  height = 32,
  emphasis = 'default',
  className,
  style,
}: BrandLogoProps) {
  return (
    <img
      src={variant === 'full' ? APP_LOGO : APP_ICON}
      alt={APP_NAME}
      draggable={false}
      className={cn('brand-logo', emphasis === 'hero' && 'brand-logo--hero', className)}
      style={{
        height,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  )
}
