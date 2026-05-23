import type { LucideIcon } from 'lucide-react'
import { Badge } from './Badge'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, badge, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div className="page-title-bar" style={{ flexShrink: 0 }} />
        {Icon && <Icon size={16} style={{ color: '#FF8A1F', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#E6EDF3', lineHeight: 1,
          }}>{title}</h1>
          {subtitle && (
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: '#66778B',
              marginTop: 5, letterSpacing: '0.12em',
            }}>{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

export function OnlineBadge({ online }: { online: boolean }) {
  return (
    <Badge variant={online ? 'nominal' : 'warning'} dot pulse={!online}>
      {online ? 'SYSTEM ONLINE' : 'TRYB DEGRADED'}
    </Badge>
  )
}
