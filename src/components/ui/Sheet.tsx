import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  side?: 'right' | 'left'
  className?: string
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  side = 'right',
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(5,7,10,0.75)] backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={cn(
              'fixed top-0 bottom-0 z-50 w-[420px] max-w-[90vw] glass-strong',
              'border-border flex flex-col shadow-[var(--shadow-glass)]',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-5 border-b border-border">
                <div>
                  {subtitle && <div className="label-xs mb-1">{subtitle}</div>}
                  {title && (
                    <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground p-1 -m-1 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
