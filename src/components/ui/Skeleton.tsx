import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-shimmer rounded-[8px] bg-white/[0.04]', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-[14px] p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2 w-32" />
    </div>
  )
}
