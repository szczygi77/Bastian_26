import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Map, GitBranch, Play, Bell, Cpu, Radio,
  FileText, Shield, Activity, FileOutput, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/useAppStore'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { id: 'map', label: 'TACTICAL MAP', icon: Map },
  { id: 'graph', label: 'DEPENDENCY GRAPH', icon: GitBranch },
  { id: 'scenarios', label: 'SCENARIOS', icon: Play },
  { id: 'alerts', label: 'ALERT CENTER', icon: Bell },
  { id: 'ai', label: 'DECISION SUPPORT', icon: Cpu },
  { id: 'skymarshal', label: 'SKYMARSHAL', icon: Radio },
  { id: 'audit', label: 'AUDIT LOG', icon: FileText },
  { id: 'compliance', label: 'COMPLIANCE', icon: Shield },
  { id: 'system', label: 'SYSTEM STATUS', icon: Activity },
  { id: 'reports', label: 'REPORTS', icon: FileOutput },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarExpanded, setSidebarExpanded, alerts } = useAppStore()
  const activeAlerts = alerts.filter(a => a.status === 'active').length

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 272 : 72 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex-shrink-0 flex flex-col glass-strong border-r border-white/[0.06] h-full z-20 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-[8px] bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center glow-cyan">
            <span className="text-[10px] font-mono font-bold text-[#00E5FF]">B</span>
          </div>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="text-[13px] font-mono font-bold text-[#E6EDF3] tracking-wider">BASTION</div>
                <div className="text-[9px] font-mono text-[#66778B] tracking-[0.15em]">ENTERPRISE v1.0</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id
          const hasBadge = id === 'alerts' && activeAlerts > 0

          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              title={!sidebarExpanded ? label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all duration-150 group text-left',
                isActive
                  ? 'bg-[#00E5FF]/10 text-[#00E5FF]'
                  : 'text-[#66778B] hover:text-[#94A3B8] hover:bg-white/[0.04]'
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon size={16} className={cn('transition-colors', isActive && 'drop-shadow-[0_0_4px_rgba(0,229,255,0.6)]')} />
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#EF4444] rounded-full text-[8px] font-mono text-white flex items-center justify-center">
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
                    transition={{ duration: 0.15 }}
                    className="text-[11px] font-mono font-medium tracking-wider whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="w-full flex items-center justify-center py-2 rounded-[14px] text-[#66778B] hover:text-[#94A3B8] hover:bg-white/[0.04] transition-all"
        >
          {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </motion.aside>
  )
}
