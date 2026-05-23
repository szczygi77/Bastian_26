import type { LucideIcon } from 'lucide-react'

type AlertVariant = 'critical' | 'high' | 'info' | 'success' | 'default'

const VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; title: string }> = {
  critical: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.40)', title: '#EF4444' },
  high:     { bg: 'rgba(238,180,0,0.10)', border: 'rgba(238,180,0,0.40)', title: '#eeb400' },
  info:     { bg: 'rgba(255,138,31,0.10)', border: 'rgba(255,138,31,0.40)', title: '#FF8A1F' },
  success:  { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.40)', title: '#78d99a' },
  default:  { bg: 'rgba(20,28,38,0.4)', border: 'rgba(255,255,255,0.08)', title: '#E6EDF3' },
}

interface AlertProps {
  variant?: AlertVariant
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function Alert({ variant = 'default', title, description, icon: Icon }: AlertProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <div role="alert" style={{
      display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 14,
      border: `1px solid ${s.border}`, background: s.bg,
    }}>
      {Icon && <Icon size={16} style={{ color: s.title, flexShrink: 0, marginTop: 2 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h5 style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', color: s.title, marginBottom: description ? 6 : 0,
        }}>{title}</h5>
        {description && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#94A3B8', lineHeight: 1.55 }}>{description}</p>
        )}
      </div>
    </div>
  )
}
