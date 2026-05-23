import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Map, GitBranch, Play, Bell, Cpu, Radio,
  FileText, Shield, Activity, FileOutput, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

const NAV_GROUPS = [
  {
    label: 'Operacyjne',
    items: [
      { id: 'dashboard',  label: 'DASHBOARD',       icon: LayoutDashboard },
      { id: 'map',        label: 'TACTICAL MAP',     icon: Map             },
      { id: 'graph',      label: 'DEP. GRAPH',       icon: GitBranch       },
      { id: 'scenarios',  label: 'SCENARIOS',        icon: Play            },
      { id: 'alerts',     label: 'ALERT CENTER',     icon: Bell            },
    ],
  },
  {
    label: 'Analityka',
    items: [
      { id: 'ai',         label: 'DECISION SUPPORT', icon: Cpu             },
      { id: 'skymarshal', label: 'SKYMARSHAL',        icon: Radio           },
    ],
  },
  {
    label: 'Administracja',
    items: [
      { id: 'audit',      label: 'AUDIT LOG',        icon: FileText        },
      { id: 'compliance', label: 'COMPLIANCE',       icon: Shield          },
      { id: 'system',     label: 'SYSTEM STATUS',    icon: Activity        },
      { id: 'reports',    label: 'REPORTS',          icon: FileOutput      },
    ],
  },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarExpanded, setSidebarExpanded, alerts } = useAppStore()
  const activeAlerts = alerts.filter(a => a.status === 'active').length

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 280 : 64 }}
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
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 48,
          padding: sidebarExpanded ? '0 16px' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          gap: 12,
          overflow: 'hidden',
        }}
      >
        {/* Hexagonal badge */}
        <div
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,138,31,0.10)',
            border: '1px solid rgba(255,138,31,0.35)',
            boxShadow: '0 0 14px rgba(255,138,31,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: '#FF8A1F',
              letterSpacing: '-0.01em',
              textShadow: '0 0 8px rgba(255,138,31,0.6)',
            }}
          >B</span>
          {/* Corner notches */}
          {[
            'top: -1px; left: -1px; border-top-left-radius: 3px;',
            'top: -1px; right: -1px; border-top-right-radius: 3px;',
            'bottom: -1px; left: -1px; border-bottom-left-radius: 3px;',
            'bottom: -1px; right: -1px; border-bottom-right-radius: 3px;',
          ].map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                border: '1px solid rgba(255,138,31,0.45)',
                borderRadius: 2,
                ...(i === 0 && { top: -1, left: -1 }),
                ...(i === 1 && { top: -1, right: -1 }),
                ...(i === 2 && { bottom: -1, left: -1 }),
                ...(i === 3 && { bottom: -1, right: -1 }),
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#E6EDF3',
                  letterSpacing: '0.20em',
                  lineHeight: 1,
                }}
              >
                BASTION
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  color: '#3D5060',
                  letterSpacing: '0.22em',
                  marginTop: 3,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                }}
              >
                ENTERPRISE v1.0
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
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
                    padding: gi === 0 ? '2px 10px 6px' : '14px 10px 6px',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id
                const hasBadge = id === 'alerts' && activeAlerts > 0

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
                        width: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Icon
                        size={15}
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
                          {activeAlerts > 9 ? '9+' : activeAlerts}
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
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: '0.10em',
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
            padding: '7px 10px',
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
