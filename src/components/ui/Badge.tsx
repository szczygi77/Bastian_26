import { cn } from '@/utils/cn'

type BadgeVariant = 'orange' | 'cyan' | 'green' | 'danger' | 'warning' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  pulse?: boolean
  dot?: boolean
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  orange:  'bg-[rgba(255,138,31,0.12)] text-[#FF8A1F] border-[rgba(255,138,31,0.28)]',
  cyan:    'bg-[rgba(0,229,255,0.08)] text-[#00E5FF] border-[rgba(0,229,255,0.22)]',
  green:   'bg-[rgba(34,197,94,0.10)] text-[#22C55E] border-[rgba(34,197,94,0.25)]',
  danger:  'bg-[rgba(239,68,68,0.12)] text-[#EF4444] border-[rgba(239,68,68,0.28)]',
  warning: 'bg-[rgba(245,158,11,0.10)] text-[#F59E0B] border-[rgba(245,158,11,0.25)]',
  muted:   'bg-[rgba(255,255,255,0.04)] text-[#66778B] border-[rgba(255,255,255,0.08)]',
}

const dotColors: Record<BadgeVariant, string> = {
  orange: 'bg-[#FF8A1F]',
  cyan: 'bg-[#00E5FF]',
  green: 'bg-[#22C55E]',
  danger: 'bg-[#EF4444]',
  warning: 'bg-[#F59E0B]',
  muted: 'bg-[#66778B]',
}

export function Badge({ variant = 'muted', children, pulse, dot, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5',
      'px-2 py-0.5 rounded-[6px] border',
      'font-mono text-[9px] font-medium uppercase tracking-[0.13em]',
      'whitespace-nowrap',
      styles[variant],
      pulse && 'animate-pulse-orange',
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          dotColors[variant],
          pulse && 'animate-pulse-dot'
        )} />
      )}
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    critical: 'danger',
    high: 'orange',
    medium: 'warning',
    low: 'green',
    info: 'cyan',
  }
  return <Badge variant={map[severity] ?? 'muted'} dot>{severity}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    operational: 'green',
    degraded: 'warning',
    offline: 'danger',
    under_attack: 'danger',
    unknown: 'muted',
    active: 'danger',
    acknowledged: 'warning',
    assigned: 'cyan',
    resolved: 'green',
    escalated: 'orange',
    available: 'green',
    on_mission: 'cyan',
    charging: 'warning',
    maintenance: 'muted',
    connected: 'green',
    compliant: 'green',
    partial: 'warning',
    non_compliant: 'danger',
    pending_review: 'muted',
  }
  return <Badge variant={map[status] ?? 'muted'}>{status.replace(/_/g, ' ')}</Badge>
}
