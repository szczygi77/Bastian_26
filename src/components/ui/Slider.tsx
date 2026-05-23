import { cn } from '@/utils/cn'

interface SliderProps {
  value: number
  onValueChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('relative w-full', className)}>
      <div className="h-2 w-full rounded-full bg-muted border border-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary shadow-[var(--glow-primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}
