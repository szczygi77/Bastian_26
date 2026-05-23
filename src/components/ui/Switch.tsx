import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
  accent?: 'orange' | 'green' | 'cyan'
  className?: string
}

export function Switch({ checked, onChange, label, disabled, accent = 'orange', className }: SwitchProps) {
  const trackOn = {
    orange: 'bg-[rgba(255,138,31,0.18)] border-[rgba(255,138,31,0.50)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_0_8px_rgba(255,138,31,0.20)]',
    green:  'bg-[rgba(34,197,94,0.18)] border-[rgba(34,197,94,0.50)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_0_8px_rgba(34,197,94,0.20)]',
    cyan:   'bg-[rgba(0,229,255,0.12)] border-[rgba(0,229,255,0.40)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_0_8px_rgba(0,229,255,0.18)]',
  }
  const thumbOn = {
    orange: 'bg-[#FF8A1F] shadow-[0_0_6px_rgba(255,138,31,0.60)]',
    green:  'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.55)]',
    cyan:   'bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.50)]',
  }

  return (
    <label className={cn(
      'inline-flex items-center gap-2.5 cursor-pointer select-none',
      disabled && 'opacity-40 cursor-not-allowed',
      className
    )}>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex w-10 h-5 rounded-[5px] border transition-all duration-200',
          checked
            ? trackOn[accent]
            : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]'
        )}
      >
        {/* Track notches */}
        <span className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex gap-[3px]">
          {[0,1,2,3].map(i => (
            <span
              key={i}
              className={cn(
                'h-[6px] w-px rounded-full transition-all duration-200',
                checked && i < 2
                  ? (accent === 'orange' ? 'bg-[rgba(255,138,31,0.5)]' : accent === 'green' ? 'bg-[rgba(34,197,94,0.5)]' : 'bg-[rgba(0,229,255,0.5)]')
                  : 'bg-[rgba(255,255,255,0.10)]'
              )}
            />
          ))}
        </span>
        {/* Thumb */}
        <span className={cn(
          'absolute top-[3px] w-3.5 h-3.5 rounded-[3px] transition-all duration-200',
          'border border-[rgba(0,0,0,0.3)]',
          checked
            ? cn('left-[calc(100%-18px)]', thumbOn[accent])
            : 'left-[3px] bg-[#3D5060] shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
        )} />
      </span>
      {label && (
        <span className="font-mono text-[10px] text-[#94A3B8] uppercase tracking-[0.10em]">{label}</span>
      )}
    </label>
  )
}
