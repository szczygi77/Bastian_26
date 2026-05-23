import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: '#E6EDF3',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  letterSpacing: '0.04em',
  boxSizing: 'border-box',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, iconRight, style, onFocus, onBlur, ...props }, ref) => {
    const padLeft = icon ? 40 : undefined
    const padRight = iconRight ? 44 : undefined

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: '#66778B', pointerEvents: 'none', display: 'flex',
          }}>{icon}</span>
        )}
        <input
          ref={ref}
          style={{
            ...baseInputStyle,
            paddingLeft: padLeft ?? baseInputStyle.padding,
            paddingRight: padRight ?? baseInputStyle.padding,
            ...style,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(255,138,31,0.42)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,138,31,0.08)'
            onFocus?.(e)
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.boxShadow = 'none'
            onBlur?.(e)
          }}
          {...props}
        />
        {iconRight && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center',
          }}>{iconRight}</span>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
