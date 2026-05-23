import { cn } from '@/utils/cn'

type BadgeVariant = 'cyan' | 'orange' | 'green' | 'danger' | 'warning' | 'muted' | 'critical'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  pulse?: boolean
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  cyan: 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/25',
  orange: 'bg-[#FF8A1F]/10 text-[#FF8A1F] border-[#FF8A1F]/25',
  green: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25',
  danger: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
  warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
  critical: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40 animate-pulse-danger',
  muted: 'bg-white/5 text-[#66778B] border-white/10',
}

export function Badge({ variant = 'muted', children, pulse, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider rounded-[8px] border',
        variants[variant],
        pulse && 'animate-pulse-danger',
        className
      )}
    >
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    critical: 'critical',
    high: 'orange',
    medium: 'warning',
    low: 'green',
    info: 'cyan',
  }
  return <Badge variant={map[severity] ?? 'muted'}>{severity}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    operational: 'green',
    degraded: 'warning',
    offline: 'danger',
    under_attack: 'critical',
    unknown: 'muted',
    active: 'danger',
    acknowledged: 'warning',
    assigned: 'cyan',
    resolved: 'green',
    escalated: 'critical',
    available: 'green',
    on_mission: 'cyan',
    charging: 'orange',
    maintenance: 'warning',
  }
  return <Badge variant={map[status] ?? 'muted'}>{status.replace('_', ' ')}</Badge>
}
