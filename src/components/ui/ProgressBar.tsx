import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'cyan' | 'orange' | 'green' | 'danger'
  size?: 'sm' | 'md'
  label?: string
  showValue?: boolean
  className?: string
}

const colors = {
  cyan: 'bg-[#00E5FF]',
  orange: 'bg-[#FF8A1F]',
  green: 'bg-[#22C55E]',
  danger: 'bg-[#EF4444]',
}

export function ProgressBar({ value, max = 100, variant = 'cyan', size = 'sm', label, showValue, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const autoVariant = pct >= 75 ? (variant === 'cyan' ? 'danger' : variant) : pct >= 50 ? 'orange' : variant

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider">{label}</span>}
          {showValue && <span className="text-[10px] font-mono text-[#94A3B8]">{value.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-white/5 rounded-full overflow-hidden', size === 'sm' ? 'h-1' : 'h-1.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[autoVariant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
