import { cn } from '@/utils/cn'

type DotColor = 'orange' | 'cyan' | 'green' | 'danger' | 'warning' | 'muted'

const dotStyles: Record<DotColor, string> = {
  orange:  'bg-[#FF8A1F] shadow-[0_0_6px_rgba(255,138,31,0.6)]',
  cyan:    'bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.5)]',
  green:   'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.5)]',
  danger:  'bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  warning: 'bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.5)]',
  muted:   'bg-[#3D5060]',
}

interface StatusDotProps {
  color?: DotColor
  pulse?: boolean
  size?: 'xs' | 'sm' | 'md'
  label?: string
  className?: string
}

export function StatusDot({ color = 'muted', pulse, size = 'sm', label, className }: StatusDotProps) {
  const sizeMap = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5' }
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(
        'rounded-full flex-shrink-0',
        sizeMap[size],
        dotStyles[color],
        pulse && 'animate-pulse-dot'
      )} />
      {label && <span className="font-mono text-[10px] text-[#94A3B8]">{label}</span>}
    </span>
  )
}

export function OperationalStatus({ status }: { status: string }) {
  const map: Record<string, DotColor> = {
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
  }
  const color = map[status] ?? 'muted'
  const shouldPulse = ['active', 'under_attack', 'danger'].includes(status)
  return (
    <StatusDot
      color={color}
      pulse={shouldPulse}
      label={status.replace(/_/g, ' ')}
    />
  )
}
