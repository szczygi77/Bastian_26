interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
  accent?: 'orange' | 'green' | 'cyan'
  className?: string
}

const ACCENT_ON: Record<string, { track: string; trackBorder: string; trackShadow: string; thumb: string; thumbShadow: string }> = {
  orange: {
    track: 'rgba(255,138,31,0.16)',
    trackBorder: 'rgba(255,138,31,0.48)',
    trackShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 9px rgba(255,138,31,0.18)',
    thumb: '#FF8A1F',
    thumbShadow: '0 0 7px rgba(255,138,31,0.65)',
  },
  green: {
    track: 'rgba(34,197,94,0.16)',
    trackBorder: 'rgba(34,197,94,0.48)',
    trackShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 9px rgba(34,197,94,0.18)',
    thumb: '#22C55E',
    thumbShadow: '0 0 7px rgba(34,197,94,0.60)',
  },
  cyan: {
    track: 'rgba(0,229,255,0.10)',
    trackBorder: 'rgba(0,229,255,0.40)',
    trackShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 9px rgba(0,229,255,0.16)',
    thumb: '#00E5FF',
    thumbShadow: '0 0 7px rgba(0,229,255,0.55)',
  },
}

const NOTCH_ACTIVE: Record<string, string> = {
  orange: 'rgba(255,138,31,0.50)',
  green:  'rgba(34,197,94,0.50)',
  cyan:   'rgba(0,229,255,0.50)',
}

export function Switch({ checked, onChange, label, disabled, accent = 'orange' }: SwitchProps) {
  const on = ACCENT_ON[accent]

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.40 : 1,
      }}
    >
      {/* Track */}
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: 40,
          height: 20,
          borderRadius: 5,
          border: `1px solid ${checked ? on.trackBorder : 'rgba(255,255,255,0.13)'}`,
          background: checked ? on.track : 'rgba(255,255,255,0.04)',
          boxShadow: checked ? on.trackShadow : 'inset 0 1px 3px rgba(0,0,0,0.5)',
          transition: 'all 0.20s ease',
          flexShrink: 0,
        }}
      >
        {/* Notch ticks */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '0 6px',
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              style={{
                width: 1,
                height: 7,
                borderRadius: 1,
                flexShrink: 0,
                background: checked && i < 2 ? NOTCH_ACTIVE[accent] : 'rgba(255,255,255,0.10)',
                transition: 'background 0.20s ease',
              }}
            />
          ))}
        </span>

        {/* Thumb */}
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 'calc(100% - 17px)' : 3,
            width: 14,
            height: 14,
            borderRadius: 3,
            border: '1px solid rgba(0,0,0,0.30)',
            background: checked ? on.thumb : '#3D5060',
            boxShadow: checked ? on.thumbShadow : '0 1px 3px rgba(0,0,0,0.5)',
            transition: 'left 0.20s ease, background 0.20s ease, box-shadow 0.20s ease',
          }}
        />
      </span>

      {label && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
          }}
        >
          {label}
        </span>
      )}
    </label>
  )
}
