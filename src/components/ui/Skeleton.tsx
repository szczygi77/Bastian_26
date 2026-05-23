import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'rounded-[8px] animate-shimmer',
      'bg-[rgba(255,255,255,0.04)]',
      className
    )} />
  )
}

export function SkeletonCard({ lines = 3 }: SkeletonProps) {
  return (
    <div className="glass-panel rounded-[14px] p-4 space-y-3">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-7 w-16" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <Skeleton key={i} className="h-2 w-full" />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-2.5 glass rounded-[8px]">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-2.5 flex-1', c === 0 && 'max-w-[80px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}
