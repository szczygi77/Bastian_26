import { Clock, ChevronRight } from 'lucide-react'
import { Button } from './Button'

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'info'

const DOT_COLORS: Record<IncidentSeverity, string> = {
  critical: '#EF4444',
  high: '#eeb400',
  medium: '#FF8A1F',
  info: '#66778B',
}

export function IncidentRow({
  id, title, severity, time, selected, onClick, onAction,
}: {
  id: string; title: string; severity: IncidentSeverity; time: string
  selected?: boolean; onClick?: () => void; onAction?: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
        background: selected ? 'rgba(255,138,31,0.08)' : 'transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#66778B', width: 72, flexShrink: 0 }}>{id}</span>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: DOT_COLORS[severity] }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#66778B', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={12} />{time}
      </span>
      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onAction?.() }}>
        <ChevronRight size={14} />
      </Button>
    </div>
  )
}
