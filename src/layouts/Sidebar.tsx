import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, GitBranch, Play, Bell, Cpu, Radio,
  FileText, Shield, Activity, ChevronLeft, ChevronRight, Command, Globe,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { BrandLogo } from '@/components/BrandLogo'
import { useAppStore } from '@/store/useAppStore'
import { useElectronShell } from '@/hooks/useElectronShell'

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { id: 'command', label: 'COMMAND', icon: Command },
      { id: 'national', label: 'NATIONAL', icon: Globe },
      { id: 'map', label: 'MAP', icon: Map },
      { id: 'graph', label: 'GRAPH', icon: GitBranch },
      { id: 'incidents', label: 'INCIDENTS', icon: Play },
      { id: 'ai', label: 'DECISION SUPPORT', icon: Cpu },
    ],
  },
  {
    label: 'Response',
    items: [
      { id: 'skymarshal', label: 'SKYMARSHAL', icon: Radio },
      { id: 'alerts', label: 'ALERTS', icon: Bell },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'audit', label: 'AUDIT', icon: FileText },
      { id: 'compliance', label: 'COMPLIANCE', icon: Shield },
      { id: 'system', label: 'SYSTEM', icon: Activity },
    ],
  },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarExpanded, setSidebarExpanded, alerts, incidents } = useAppStore()
  const { chromeHeaderHeight, sidebarCollapsedWidth } = useElectronShell()
  const activeAlerts = alerts.filter(a => a.status === 'active').length
  const openIncidents = incidents.filter(i => i.status === 'open').length

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 280 : sidebarCollapsedWidth }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 20,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(11,17,23,0.98) 0%, rgba(5,7,10,0.99) 100%)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div
        className="window-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: chromeHeaderHeight,
          padding: '0 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <BrandLogo
          className="window-no-drag"
          variant={sidebarExpanded ? 'full' : 'icon'}
          height={sidebarExpanded ? 64 : 42}
          style={{ maxWidth: sidebarExpanded ? 220 : 46 }}
        />
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {/* Group label — only when expanded */}
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: '#3D5060',
                    padding: gi === 0 ? '4px 10px 8px' : '18px 10px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.label}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider when collapsed */}
            {!sidebarExpanded && gi > 0 && (
              <div
                style={{
                  height: 1,
                  background: 'rgba(255,255,255,0.05)',
                  margin: '8px 0',
                }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.items.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id
                const hasBadge = (id === 'alerts' && activeAlerts > 0) || (id === 'command' && openIncidents > 0)
                const badgeCount = id === 'alerts' ? activeAlerts : openIncidents

                return (
                  <button
                    key={id}
                    onClick={() => setActiveView(id)}
                    title={!sidebarExpanded ? label : undefined}
                    className={cn('nav-item', isActive && 'active')}
                    style={{
                      color: isActive ? '#FF8A1F' : '#66778B',
                    }}
                  >
                    {/* Active left-edge indicator */}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 2,
                          borderRadius: '0 1px 1px 0',
                          background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.3) 100%)',
                          boxShadow: '0 0 8px rgba(255,138,31,0.55)',
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Icon
                        size={17}
                        style={
                          isActive
                            ? { filter: 'drop-shadow(0 0 5px rgba(255,138,31,0.60))' }
                            : undefined
                        }
                      />
                      {hasBadge && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -6,
                            minWidth: 14,
                            height: 14,
                            borderRadius: 7,
                            background: '#EF4444',
                            boxShadow: '0 0 7px rgba(239,68,68,0.65)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 8,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 3px',
                          }}
                        >
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    <AnimatePresence>
                      {sidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.14 }}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: '0.08em',
                            whiteSpace: 'nowrap',
                            color: isActive ? '#FF8A1F' : '#66778B',
                          }}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ──────────────────────────────────────────── */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarExpanded ? 'flex-end' : 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid transparent',
            color: '#3D5060',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.04)'
            el.style.borderColor = 'rgba(255,255,255,0.06)'
            el.style.color = '#66778B'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = 'transparent'
            el.style.borderColor = 'transparent'
            el.style.color = '#3D5060'
          }}
        >
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                style={{ textTransform: 'uppercase' }}
              >
                ZWIŃ
              </motion.span>
            )}
          </AnimatePresence>
          {sidebarExpanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>
    </motion.aside>
  )
}
