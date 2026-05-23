import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'hero'
    | 'secondary'
    | 'outline'
    | 'glass'
    | 'ghost'
    | 'link'
    | 'success'
    | 'danger'
    | 'destructive'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  xs: { padding: '4px 10px', fontSize: 9,  borderRadius: 6,  gap: 4 },
  sm: { padding: '6px 12px', fontSize: 10, borderRadius: 8,  gap: 6 },
  md: { padding: '8px 16px', fontSize: 11, borderRadius: 10, gap: 7 },
  lg: { padding: '10px 22px', fontSize: 12, borderRadius: 12, gap: 8 },
  icon: { padding: 0, width: 36, height: 36, fontSize: 11, borderRadius: 10, gap: 0 },
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  default: {
    background: '#FF8A1F',
    color: '#0d0f12',
    border: '1px solid rgba(255,138,31,0.5)',
    boxShadow: 'var(--glow-primary)',
  },
  primary: {
    background: 'rgba(255,138,31,0.10)',
    color: '#FF8A1F',
    border: '1px solid rgba(255,138,31,0.30)',
  },
  hero: {
    background: 'linear-gradient(135deg, #FF8A1F, #ff9f47)',
    color: '#0d0f12',
    border: '1px solid rgba(255,138,31,0.5)',
    boxShadow: 'var(--glow-primary)',
    fontWeight: 600,
  },
  secondary: {
    background: 'var(--gradient-surface)',
    backdropFilter: 'blur(20px) saturate(140%)',
    color: '#E6EDF3',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  outline: {
    background: 'rgba(20,28,38,0.4)',
    backdropFilter: 'blur(12px)',
    color: '#E6EDF3',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  glass: {
    background: 'var(--gradient-surface)',
    backdropFilter: 'blur(20px) saturate(140%)',
    color: '#E6EDF3',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  ghost: {
    background: 'transparent',
    color: '#66778B',
    border: '1px solid transparent',
  },
  link: {
    background: 'transparent',
    color: '#FF8A1F',
    border: '1px solid transparent',
    textDecoration: 'underline',
    textUnderlineOffset: 4,
  },
  success: {
    background: 'rgba(34,197,94,0.15)',
    color: '#78d99a',
    border: '1px solid rgba(34,197,94,0.4)',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.4)',
  },
  destructive: {
    background: '#EF4444',
    color: '#fff',
    border: '1px solid rgba(239,68,68,0.5)',
    boxShadow: '0 0 20px rgba(239,68,68,0.35)',
  },
}

const VARIANT_HOVER: Record<string, React.CSSProperties> = {
  default: { background: '#ff9f47', boxShadow: '0 0 32px rgba(255,138,31,0.55)' },
  primary: { background: 'rgba(255,138,31,0.18)', borderColor: 'rgba(255,138,31,0.55)', boxShadow: 'var(--glow-orange-sm)' },
  hero: { boxShadow: '0 0 32px rgba(255,138,31,0.55)' },
  secondary: { background: 'rgba(38,46,56,0.8)' },
  outline: { background: 'rgba(255,138,31,0.08)', borderColor: 'rgba(255,138,31,0.35)', color: '#FF8A1F' },
  glass: { borderColor: 'rgba(255,138,31,0.35)', color: '#FF8A1F' },
  ghost: { background: 'rgba(255,255,255,0.05)', color: '#94A3B8' },
  link: { color: '#ffb366' },
  success: { background: 'rgba(34,197,94,0.25)' },
  danger: { background: 'rgba(239,68,68,0.25)' },
  destructive: { background: '#dc2626', boxShadow: '0 0 24px rgba(239,68,68,0.5)' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, style, ...props }, ref) => {
    const isDisabled = disabled || loading
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.10em',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.4 : 1,
      pointerEvents: isDisabled ? 'none' : undefined,
      transition: 'all 0.18s ease',
      outline: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      ...SIZE_STYLES[size],
      ...VARIANT_STYLES[variant],
      ...style,
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(className)}
        style={baseStyle}
        onMouseEnter={e => { if (!isDisabled) Object.assign(e.currentTarget.style, VARIANT_HOVER[variant]) }}
        onMouseLeave={e => { Object.assign(e.currentTarget.style, VARIANT_STYLES[variant], { transform: '' }) }}
        {...props}
      >
        {loading && (
          <span style={{
            width: 12, height: 12,
            border: '1.5px solid currentColor', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block', flexShrink: 0,
          }} />
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
