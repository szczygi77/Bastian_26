import { cn } from '@/utils/cn'

interface AvatarProps {
  initials: string
  className?: string
  variant?: 'primary' | 'muted'
}

export function Avatar({ initials, className, variant = 'primary' }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-xs font-semibold font-mono',
        variant === 'primary' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {initials}
    </div>
  )
}

export function AvatarGroup({
  avatars,
  overflow,
  className,
}: {
  avatars: string[]
  overflow?: number
  className?: string
}) {
  return (
    <div className={cn('flex -space-x-3', className)}>
      {avatars.map(initials => (
        <Avatar key={initials} initials={initials} />
      ))}
      {overflow !== undefined && overflow > 0 && (
        <Avatar initials={`+${overflow}`} variant="muted" />
      )}
    </div>
  )
}

export function OperatorChip({
  label,
  icon,
  active = true,
  className,
}: {
  label: string
  icon?: React.ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-0.5',
        'font-mono text-[10px] uppercase tracking-wider',
        active ? 'text-foreground' : 'text-muted-foreground opacity-60',
        className,
      )}
    >
      {icon}
      {label}
    </span>
  )
}
