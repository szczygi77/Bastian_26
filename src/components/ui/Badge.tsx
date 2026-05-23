import type { LucideIcon } from 'lucide-react'

type BadgeVariant =
  | 'default' | 'secondary' | 'outline' | 'orange' | 'cyan' | 'green' | 'danger' | 'warning' | 'muted'
  | 'critical' | 'high' | 'medium' | 'low' | 'nominal' | 'classified' | 'sensor' | 'cascade' | 'skymarshal' | 'mesh'

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default:    { bg: '#FF8A1F', color: '#0d0f12', border: 'transparent' },
  secondary:  { bg: 'rgba(38,46,56,0.6)', color: '#E6EDF3', border: 'transparent' },
  outline:    { bg: 'transparent', color: '#E6EDF3', border: 'rgba(255,255,255,0.08)' },
  orange:     { bg: 'rgba(255,138,31,0.12)', color: '#FF8A1F', border: 'rgba(255,138,31,0.30)' },
  cyan:       { bg: 'rgba(0,229,255,0.08)', color: '#00E5FF', border: 'rgba(0,229,255,0.24)' },
  green:      { bg: 'rgba(34,197,94,0.10)', color: '#22C55E', border: 'rgba(34,197,94,0.26)' },
  danger:     { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.30)' },
  warning:    { bg: 'rgba(245,158,11,0.10)', color: '#F59E0B', border: 'rgba(245,158,11,0.26)' },
  muted:      { bg: 'rgba(255,255,255,0.04)', color: '#66778B', border: 'rgba(255,255,255,0.09)' },
  critical:   { bg: '#EF4444', color: '#fff', border: 'transparent' },
  high:       { bg: '#eeb400', color: '#0d0f12', border: 'transparent' },
  medium:     { bg: '#FF8A1F', color: '#0d0f12', border: 'transparent' },
  low:        { bg: 'rgba(38,46,56,0.6)', color: '#E6EDF3', border: 'transparent' },
  nominal:    { bg: 'transparent', color: '#78d99a', border: 'rgba(34,197,94,0.4)' },
  classified: { bg: 'transparent', color: '#E6EDF3', border: 'rgba(255,255,255,0.08)' },
  sensor:     { bg: 'rgba(255,138,31,0.10)', color: '#FF8A1F', border: 'rgba(255,138,31,0.35)' },
  cascade:    { bg: 'rgba(245,158,11,0.10)', color: '#F59E0B', border: 'rgba(245,158,11,0.35)' },
  skymarshal: { bg: 'rgba(0,229,255,0.08)', color: '#00E5FF', border: 'rgba(0,229,255,0.30)' },
  mesh:       { bg: 'rgba(32,40,50,0.5)', color: '#94A3B8', border: 'rgba(255,255,255,0.08)' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  pulse?: boolean
  dot?: boolean
  icon?: LucideIcon
  className?: string
}

export function Badge({ variant = 'muted', children, pulse, dot, icon: Icon }: BadgeProps) {
  const s = BADGE_STYLES[variant]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6,
      border: `1px solid ${s.border}`, background: s.bg, color: s.color,
      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
      letterSpacing: '0.13em', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1,
    }}>
      {Icon && <Icon size={12} style={{ flexShrink: 0 }} />}
      {dot && !Icon && (
        <span className={pulse ? 'animate-pulse-dot' : undefined}
          style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0, display: 'block' }} />
      )}
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    critical: 'critical', high: 'high', medium: 'medium', low: 'low', info: 'cyan',
  }
  return <Badge variant={map[severity] ?? 'muted'}>{severity.toUpperCase()}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    operational: 'nominal', degraded: 'warning', offline: 'danger', under_attack: 'critical',
    unknown: 'muted', active: 'critical', acknowledged: 'warning', assigned: 'cyan',
    resolved: 'green', escalated: 'orange', available: 'green', on_mission: 'cyan',
    charging: 'warning', maintenance: 'muted', connected: 'green', compliant: 'green',
    partial: 'warning', non_compliant: 'danger', pending_review: 'muted',
  }
  return <Badge variant={map[status] ?? 'muted'}>{status.replace(/_/g, ' ')}</Badge>
}
