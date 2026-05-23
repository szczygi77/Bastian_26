import { cn } from '@/utils/cn'

type Accent = 'orange' | 'cyan' | 'danger' | 'green' | 'warning'

const accentBar: Record<Accent, string> = {
  orange:  'before:bg-gradient-to-b before:from-[#FF8A1F] before:to-[rgba(255,138,31,0.2)] before:shadow-[0_0_8px_rgba(255,138,31,0.4)]',
  cyan:    'before:bg-gradient-to-b before:from-[#00E5FF] before:to-[rgba(0,229,255,0.2)] before:shadow-[0_0_8px_rgba(0,229,255,0.3)]',
  danger:  'before:bg-gradient-to-b before:from-[#EF4444] before:to-[rgba(239,68,68,0.2)] before:shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  green:   'before:bg-gradient-to-b before:from-[#22C55E] before:to-[rgba(34,197,94,0.2)] before:shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  warning: 'before:bg-gradient-to-b before:from-[#F59E0B] before:to-[rgba(245,158,11,0.2)] before:shadow-[0_0_8px_rgba(245,158,11,0.3)]',
}

interface CardProps {
  children: React.ReactNode
  className?: string
  label?: string
  accent?: Accent
  onClick?: () => void
  interactive?: boolean
}

export function Card({ children, className, label, accent, onClick, interactive }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-panel rounded-[14px] p-4 relative overflow-hidden',
        accent && 'pl-5 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[2px] before:rounded-r-full',
        accent && accentBar[accent],
        (onClick || interactive) && 'cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.025)]',
        className
      )}
    >
      {label && (
        <div className="label-sm mb-3">{label}</div>
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
  accent?: Accent
}) {
  const valueColors: Record<Accent, string> = {
    orange: 'text-[#FF8A1F]',
    cyan: 'text-[#00E5FF]',
    danger: 'text-[#EF4444]',
    green: 'text-[#22C55E]',
    warning: 'text-[#F59E0B]',
  }

  return (
    <Card accent={accent}>
      <div className="label-sm mb-2">{label}</div>
      <div className={cn(
        'font-mono text-[28px] font-semibold leading-none',
        accent ? valueColors[accent] : 'text-[#E6EDF3]'
      )}>
        {value}
        {unit && <span className="text-[14px] text-[#66778B] ml-1">{unit}</span>}
      </div>
      {sub && <div className="font-mono text-[10px] text-[#66778B] mt-1.5 leading-snug">{sub}</div>}
    </Card>
  )
}
