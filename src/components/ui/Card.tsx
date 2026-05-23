import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  label?: string
  accent?: 'cyan' | 'orange' | 'danger' | 'green'
  onClick?: () => void
}

export function Card({ children, className, label, accent, onClick }: CardProps) {
  const accentBorder = {
    cyan: 'border-l-2 border-l-[#00E5FF]',
    orange: 'border-l-2 border-l-[#FF8A1F]',
    danger: 'border-l-2 border-l-[#EF4444]',
    green: 'border-l-2 border-l-[#22C55E]',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'glass rounded-[14px] p-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:bg-white/[0.04] hover:backdrop-blur-[14px]',
        accent && accentBorder[accent],
        className
      )}
    >
      {label && (
        <div className="text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-[#66778B] mb-3">
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  accent?: 'cyan' | 'orange' | 'danger' | 'green'
}) {
  const colors = {
    cyan: 'text-[#00E5FF]',
    orange: 'text-[#FF8A1F]',
    danger: 'text-[#EF4444]',
    green: 'text-[#22C55E]',
  }

  return (
    <Card accent={accent}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#66778B] mb-1">{label}</div>
      <div className={cn('text-2xl font-mono font-semibold', accent ? colors[accent] : 'text-[#E6EDF3]')}>
        {value}
        {unit && <span className="text-sm text-[#66778B] ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-[#66778B] mt-1">{sub}</div>}
    </Card>
  )
}
