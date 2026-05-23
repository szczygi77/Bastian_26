import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  variant?: 'cyan' | 'orange' | 'green'
}

const trackColors = {
  cyan: 'bg-[#00E5FF]/30 border-[#00E5FF]/50',
  orange: 'bg-[#FF8A1F]/30 border-[#FF8A1F]/50',
  green: 'bg-[#22C55E]/30 border-[#22C55E]/50',
}

const thumbColors = {
  cyan: 'bg-[#00E5FF]',
  orange: 'bg-[#FF8A1F]',
  green: 'bg-[#22C55E]',
}

export function Switch({ checked, onChange, label, disabled, variant = 'cyan' }: SwitchProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-40 cursor-not-allowed')}>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-[8px] border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]',
          checked ? trackColors[variant] : 'bg-white/5 border-white/15'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-[6px] transition-all duration-200 shadow-sm',
            checked ? `left-5 ${thumbColors[variant]}` : 'left-0.5 bg-[#66778B]'
          )}
        />
      </button>
      {label && (
        <span className="text-[12px] font-mono text-[#94A3B8]">{label}</span>
      )}
    </label>
  )
}
