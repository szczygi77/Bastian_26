import { cn } from '@/utils/cn'

export function PageShell({
  children,
  className,
  fixed,
}: {
  children: React.ReactNode
  className?: string
  fixed?: boolean
}) {
  return (
    <div className={cn('page-content', fixed && 'page-content--fixed', className)}>
      {children}
    </div>
  )
}

export function PageSplit({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('page-split', className)}>
      {children}
    </div>
  )
}

export function PageSplitSidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('page-split-sidebar', className)}>
      {children}
    </div>
  )
}

export function PageSplitMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('page-split-main', className)}>
      {children}
    </div>
  )
}
