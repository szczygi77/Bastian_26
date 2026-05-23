import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Map, GitBranch, Play, Bell, Cpu, Radio,
  FileText, Shield, Activity, FileOutput, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'DASHBOARD',        icon: LayoutDashboard },
  { id: 'map',         label: 'TACTICAL MAP',      icon: Map             },
  { id: 'graph',       label: 'DEP. GRAPH',        icon: GitBranch       },
  { id: 'scenarios',   label: 'SCENARIOS',         icon: Play            },
  { id: 'alerts',      label: 'ALERT CENTER',      icon: Bell            },
  { id: 'ai',          label: 'DECISION SUPPORT',  icon: Cpu             },
  { id: 'skymarshal',  label: 'SKYMARSHAL',        icon: Radio           },
  { id: 'audit',       label: 'AUDIT LOG',         icon: FileText        },
  { id: 'compliance',  label: 'COMPLIANCE',        icon: Shield          },
  { id: 'system',      label: 'SYSTEM STATUS',     icon: Activity        },
  { id: 'reports',     label: 'REPORTS',           icon: FileOutput      },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarExpanded, setSidebarExpanded, alerts } = useAppStore()
  const activeAlerts = alerts.filter(a => a.status === 'active').length

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 260 : 64 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex-shrink-0 flex flex-col h-full z-20 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(11,17,23,0.98) 0%, rgba(5,7,10,0.98) 100%)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3.5 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Tactical hexagon logo */}
          <div className="flex-shrink-0 w-8 h-8 relative flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{
                background: 'rgba(255,138,31,0.10)',
                border: '1px solid rgba(255,138,31,0.35)',
                boxShadow: '0 0 12px rgba(255,138,31,0.20), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            />
            <span className="relative font-mono text-[12px] font-bold text-[#FF8A1F] tracking-tight">B</span>
          </div>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="text-[12px] font-mono font-bold text-[#E6EDF3] tracking-[0.18em]">BASTION</div>
                <div className="text-[8px] font-mono text-[#3D5060] tracking-[0.20em] mt-px">ENTERPRISE v1.0</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-px">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id
          const hasBadge = id === 'alerts' && activeAlerts > 0

          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              title={!sidebarExpanded ? label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px]',
                'transition-all duration-150 group text-left relative',
                isActive
                  ? 'text-[#FF8A1F]'
                  : 'text-[#3D5060] hover:text-[#94A3B8]'
              )}
              style={isActive ? {
                background: 'rgba(255,138,31,0.09)',
                border: '1px solid rgba(255,138,31,0.20)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}
            >
              {/* Active left bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.3) 100%)',
                    boxShadow: '0 0 6px rgba(255,138,31,0.5)',
                  }}
                />
              )}

              <div className="relative flex-shrink-0 w-4 flex items-center justify-center">
                <Icon
                  size={15}
                  className="transition-all"
                  style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(255,138,31,0.55))' } : undefined}
                />
                {hasBadge && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] rounded-full font-mono text-[8px] text-white flex items-center justify-center"
                    style={{
                      background: '#EF4444',
                      boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                    }}
                  >
                    {activeAlerts > 9 ? '9+' : activeAlerts}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="text-[10px] font-mono font-medium tracking-[0.10em] whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Collapse btn */}
      <div
        className="p-2 border-t border-[rgba(255,255,255,0.05)] flex-shrink-0"
      >
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className={cn(
            'w-full flex items-center justify-center py-2 rounded-[8px]',
            'text-[#3D5060] hover:text-[#66778B] transition-all duration-150',
            'hover:bg-[rgba(255,255,255,0.04)]'
          )}
        >
          {sidebarExpanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>
    </motion.aside>
  )
}
