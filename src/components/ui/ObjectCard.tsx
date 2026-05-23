import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ExternalLink, GitBranch, MapPin, MoreHorizontal, AlertTriangle, Play } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { Badge } from './Badge'
import { Button } from './Button'

type ObjectStatus = 'critical' | 'warning' | 'ok' | 'nominal'

interface ObjectCardProps {
  objectId: string
  label: string
  title: string
  status: ObjectStatus
  icon: LucideIcon
}

const STATUS_BADGE: Record<ObjectStatus, React.ReactNode> = {
  critical: <Badge variant="critical">CRITICAL</Badge>,
  warning: <Badge variant="high">HIGH</Badge>,
  ok: <Badge variant="nominal">NOMINAL</Badge>,
  nominal: <Badge variant="nominal">NOMINAL</Badge>,
}

const MENU_ITEMS = [
  { id: 'map' as const, label: 'Mapa taktyczna', icon: MapPin },
  { id: 'graph' as const, label: 'Graf zależności', icon: GitBranch },
  { id: 'alerts' as const, label: 'Powiązane alerty', icon: AlertTriangle },
  { id: 'scenarios' as const, label: 'Scenariusze', icon: Play },
]

export function ObjectCard({ objectId, label, title, status, icon: Icon }: ObjectCardProps) {
  const {
    openIkObjectOnMap,
    openIkObjectOnGraph,
    openIkObjectAlerts,
    openScenarios,
  } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  function handleMenuAction(action: typeof MENU_ITEMS[number]['id']) {
    setMenuOpen(false)
    switch (action) {
      case 'map':
        openIkObjectOnMap(objectId)
        break
      case 'graph':
        openIkObjectOnGraph(objectId)
        break
      case 'alerts':
        openIkObjectAlerts(objectId)
        break
      case 'scenarios':
        openScenarios()
        break
    }
  }

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
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: '#E6EDF3' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <Button
          size="sm"
          variant="glass"
          style={{ flex: 1 }}
          onClick={() => openIkObjectOnMap(objectId)}
        >
          <ExternalLink size={12} /> Podgląd
        </Button>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button
            size="sm"
            variant="outline"
            aria-label="Więcej akcji"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            <MoreHorizontal size={12} />
          </Button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 'calc(100% + 8px)',
                minWidth: 196,
                padding: 6,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(11,17,23,0.96)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                zIndex: 20,
              }}
            >
              {MENU_ITEMS.map(({ id, label: itemLabel, icon: ItemIcon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleMenuAction(id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    color: '#E6EDF3',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <ItemIcon size={13} style={{ color: '#66778B', flexShrink: 0 }} />
                  {itemLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
