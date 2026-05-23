import { cn } from '@/utils/cn'

interface StatusDotProps {
  status: 'ok' | 'warn' | 'error' | 'offline' | 'active'
  label?: string
  size?: 'sm' | 'md'
}

const colors = {
  ok: 'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.6)]',
  warn: 'bg-[#F59E0B] shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  error: 'bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.7)]',
  offline: 'bg-[#66778B]',
  active: 'bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.6)] animate-pulse-cyan',
}

export function StatusDot({ status, label, size = 'md' }: StatusDotProps) {
  const sz = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <div className="flex items-center gap-2">
      <span className={cn('rounded-full flex-shrink-0', sz, colors[status])} />
      {label && <span className="text-[11px] font-mono text-[#94A3B8]">{label}</span>}
    </div>
  )
}
