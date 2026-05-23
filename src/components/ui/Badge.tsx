type BadgeVariant = 'orange' | 'cyan' | 'green' | 'danger' | 'warning' | 'muted'

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string; dot: string }> = {
  orange:  { bg: 'rgba(255,138,31,0.12)',  color: '#FF8A1F', border: 'rgba(255,138,31,0.30)',  dot: '#FF8A1F' },
  cyan:    { bg: 'rgba(0,229,255,0.08)',   color: '#00E5FF', border: 'rgba(0,229,255,0.24)',   dot: '#00E5FF' },
  green:   { bg: 'rgba(34,197,94,0.10)',   color: '#22C55E', border: 'rgba(34,197,94,0.26)',   dot: '#22C55E' },
  danger:  { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', border: 'rgba(239,68,68,0.30)',   dot: '#EF4444' },
  warning: { bg: 'rgba(245,158,11,0.10)',  color: '#F59E0B', border: 'rgba(245,158,11,0.26)',  dot: '#F59E0B' },
  muted:   { bg: 'rgba(255,255,255,0.04)', color: '#66778B', border: 'rgba(255,255,255,0.09)', dot: '#3D5060' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  pulse?: boolean
  dot?: boolean
  className?: string
}

export function Badge({ variant = 'muted', children, pulse, dot }: BadgeProps) {
  const s = BADGE_STYLES[variant]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 6,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: '0.13em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {dot && (
        <span
          className={pulse ? 'animate-pulse-dot' : undefined}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: s.dot,
            flexShrink: 0,
            display: 'block',
          }}
        />
      )}
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    critical: 'danger',
    high:     'orange',
    medium:   'warning',
    low:      'green',
    info:     'cyan',
  }
  return <Badge variant={map[severity] ?? 'muted'} dot>{severity.toUpperCase()}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    operational:    'green',
    degraded:       'warning',
    offline:        'danger',
    under_attack:   'danger',
    unknown:        'muted',
    active:         'danger',
    acknowledged:   'warning',
    assigned:       'cyan',
    resolved:       'green',
    escalated:      'orange',
    available:      'green',
    on_mission:     'cyan',
    charging:       'warning',
    maintenance:    'muted',
    connected:      'green',
    compliant:      'green',
    partial:        'warning',
    non_compliant:  'danger',
    pending_review: 'muted',
  }
  return (
    <Badge variant={map[status] ?? 'muted'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
