import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
  danger?: boolean
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, danger }: ModalProps) {
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.20, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-[rgba(5,7,10,0.75)] backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'w-full rounded-[28px] overflow-hidden',
                'glass-strong flex flex-col',
                danger
                  ? 'border-[rgba(239,68,68,0.30)] shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.12)]'
                  : 'border-[rgba(255,138,31,0.15)] shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(255,138,31,0.06)]',
                sizes[size]
              )}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className={cn(
                  'flex items-start justify-between p-5 border-b',
                  danger ? 'border-[rgba(239,68,68,0.15)]' : 'border-[rgba(255,255,255,0.06)]'
                )}>
                  <div>
                    {subtitle && <div className="label-xs mb-1.5 text-[#66778B]">{subtitle}</div>}
                    <h2 className="font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-[#E6EDF3]">
                      {title}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-[#3D5060] hover:text-[#94A3B8] transition-colors p-1 -m-1 rounded-[6px]"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-3.5 flex items-center justify-end gap-2">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
