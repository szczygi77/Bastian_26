import { cn } from '@/utils/cn'

type Accent = 'orange' | 'cyan' | 'green' | 'danger' | 'warning'

const trackFill: Record<Accent, string> = {
  orange:  'bg-[rgba(255,138,31,0.90)] shadow-[0_0_8px_rgba(255,138,31,0.40)]',
  cyan:    'bg-[rgba(0,229,255,0.85)] shadow-[0_0_8px_rgba(0,229,255,0.35)]',
  green:   'bg-[rgba(34,197,94,0.85)] shadow-[0_0_8px_rgba(34,197,94,0.35)]',
  danger:  'bg-[rgba(239,68,68,0.90)] shadow-[0_0_8px_rgba(239,68,68,0.40)]',
  warning: 'bg-[rgba(245,158,11,0.90)] shadow-[0_0_8px_rgba(245,158,11,0.35)]',
}

interface ProgressBarProps {
  value: number
  max?: number
  accent?: Accent
  label?: string
  showValue?: boolean
  className?: string
  thin?: boolean
}

export function ProgressBar({ value, max = 100, accent = 'orange', label, showValue, className, thin }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const autoAccent: Accent = pct > 80 ? 'danger' : pct > 60 ? 'warning' : accent

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="label-xs">{label}</span>}
          {showValue && (
            <span className="font-mono text-[10px] text-[#66778B]">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden',
        'border border-[rgba(255,255,255,0.06)]',
        thin ? 'h-[3px]' : 'h-[5px]'
      )}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', trackFill[autoAccent])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
