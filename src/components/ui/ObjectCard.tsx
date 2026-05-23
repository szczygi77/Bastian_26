import type { LucideIcon } from 'lucide-react'
import { ExternalLink, MoreHorizontal } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'

type ObjectStatus = 'critical' | 'warning' | 'ok' | 'nominal'

interface ObjectCardProps {
  id: string
  title: string
  status: ObjectStatus
  icon: LucideIcon
  onPreview?: () => void
}

const STATUS_BADGE: Record<ObjectStatus, React.ReactNode> = {
  critical: <Badge variant="critical">CRITICAL</Badge>,
  warning: <Badge variant="high">HIGH</Badge>,
  ok: <Badge variant="nominal">NOMINAL</Badge>,
  nominal: <Badge variant="nominal">NOMINAL</Badge>,
}

export function ObjectCard({ id, title, status, icon: Icon, onPreview }: ObjectCardProps) {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(255,138,31,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: '#FF8A1F' }} />
        </div>
        {STATUS_BADGE[status]}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: '#E6EDF3' }}>{id}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <Button size="sm" variant="glass" style={{ flex: 1 }} onClick={onPreview}>
          <ExternalLink size={12} /> Podgląd
        </Button>
        <Button size="sm" variant="outline"><MoreHorizontal size={12} /></Button>
      </div>
    </div>
  )
}
