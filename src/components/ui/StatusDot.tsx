type DotColor = 'orange' | 'cyan' | 'green' | 'danger' | 'warning' | 'muted'

const DOT_COLORS: Record<DotColor, { bg: string; shadow: string }> = {
  orange:  { bg: '#FF8A1F', shadow: '0 0 7px rgba(255,138,31,0.65)' },
  cyan:    { bg: '#00E5FF', shadow: '0 0 7px rgba(0,229,255,0.55)'  },
  green:   { bg: '#22C55E', shadow: '0 0 7px rgba(34,197,94,0.55)'  },
  danger:  { bg: '#EF4444', shadow: '0 0 7px rgba(239,68,68,0.65)'  },
  warning: { bg: '#F59E0B', shadow: '0 0 7px rgba(245,158,11,0.55)' },
  muted:   { bg: '#3D5060', shadow: 'none'                          },
}

const DOT_SIZES: Record<string, number> = { xs: 6, sm: 8, md: 10 }

interface StatusDotProps {
  color?: DotColor
  pulse?: boolean
  size?: 'xs' | 'sm' | 'md'
  label?: string
  className?: string
}

export function StatusDot({ color = 'muted', pulse, size = 'sm', label }: StatusDotProps) {
  const { bg, shadow } = DOT_COLORS[color]
  const px = DOT_SIZES[size]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        className={pulse ? 'animate-pulse-dot' : undefined}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          background: bg,
          boxShadow: shadow,
          display: 'block',
          flexShrink: 0,
        }}
      />
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#94A3B8',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}

export function OperationalStatus({ status }: { status: string }) {
  const map: Record<string, DotColor> = {
    operational:  'green',
    degraded:     'warning',
    offline:      'danger',
    under_attack: 'danger',
    unknown:      'muted',
    active:       'danger',
    acknowledged: 'warning',
    assigned:     'cyan',
    resolved:     'green',
    escalated:    'orange',
    available:    'green',
    on_mission:   'cyan',
    charging:     'warning',
    maintenance:  'muted',
    connected:    'green',
  }
  const dotColor = map[status] ?? 'muted'
  const shouldPulse = ['active', 'under_attack'].includes(status)

  return (
    <StatusDot
      color={dotColor}
      pulse={shouldPulse}
      label={status.replace(/_/g, ' ')}
    />
  )
}
