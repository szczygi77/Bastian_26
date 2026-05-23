import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  xs: { padding: '4px 10px', fontSize: 9,  borderRadius: 6  },
  sm: { padding: '6px 12px', fontSize: 10, borderRadius: 8  },
  md: { padding: '8px 16px', fontSize: 11, borderRadius: 10 },
  lg: { padding: '10px 22px', fontSize: 12, borderRadius: 12 },
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: {
    background: 'rgba(255,138,31,0.10)',
    color: '#FF8A1F',
    border: '1px solid rgba(255,138,31,0.30)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.05)',
    color: '#94A3B8',
    border: '1px solid rgba(255,255,255,0.09)',
  },
  danger: {
    background: 'rgba(239,68,68,0.09)',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.25)',
  },
  ghost: {
    background: 'transparent',
    color: '#66778B',
    border: '1px solid transparent',
  },
}

const VARIANT_HOVER: Record<string, React.CSSProperties> = {
  primary: {
    background: 'rgba(255,138,31,0.18)',
    border: '1px solid rgba(255,138,31,0.55)',
    boxShadow: '0 0 18px rgba(255,138,31,0.30), 0 0 5px rgba(255,138,31,0.20)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.09)',
    color: '#E6EDF3',
    border: '1px solid rgba(255,138,31,0.22)',
  },
  danger: {
    background: 'rgba(239,68,68,0.16)',
    border: '1px solid rgba(239,68,68,0.50)',
    boxShadow: '0 0 18px rgba(239,68,68,0.28)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.05)',
    color: '#94A3B8',
  },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, style, ...props }, ref) => {
    const isDisabled = disabled || loading

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.10em',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.40 : 1,
      pointerEvents: isDisabled ? 'none' : undefined,
      transition: 'all 0.18s ease',
      outline: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      ...SIZE_STYLES[size],
      ...VARIANT_STYLES[variant],
      ...style,
    }

    function applyHover(e: React.MouseEvent<HTMLButtonElement>) {
      if (isDisabled) return
      Object.assign(e.currentTarget.style, VARIANT_HOVER[variant])
      e.currentTarget.style.transform = 'translateY(-0.5px)'
    }

    function removeHover(e: React.MouseEvent<HTMLButtonElement>) {
      Object.assign(e.currentTarget.style, VARIANT_STYLES[variant])
      e.currentTarget.style.transform = ''
      e.currentTarget.style.boxShadow = ''
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(className)}
        style={baseStyle}
        onMouseEnter={applyHover}
        onMouseLeave={removeHover}
        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0px) scale(0.99)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-0.5px)' }}
        {...props}
      >
        {loading && (
          <span
            style={{
              width: 12,
              height: 12,
              border: '1.5px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              display: 'block',
              flexShrink: 0,
            }}
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
