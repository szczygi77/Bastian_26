import { createContext, useCallback, useContext, useState } from 'react'
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastVariant = 'default' | 'success' | 'destructive' | 'warning'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  default: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  destructive: <AlertTriangle size={18} />,
  warning: <AlertTriangle size={18} />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setItems(prev => [...prev, { ...item, id }])
    setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const dismiss = (id: string) => setItems(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="bastion-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map(item => {
          const variant = item.variant ?? 'default'
          return (
            <div
              key={item.id}
              role="status"
              className={cn('bastion-toast animate-fade-in', `bastion-toast--${variant}`)}
            >
              <span className="bastion-toast__icon" aria-hidden>
                {VARIANT_ICON[variant]}
              </span>
              <div className="bastion-toast__body">
                <div className="bastion-toast__title">{item.title}</div>
                {item.description && (
                  <div className="bastion-toast__desc">{item.description}</div>
                )}
              </div>
              <button
                type="button"
                className="bastion-toast__close"
                aria-label="Zamknij powiadomienie"
                onClick={() => dismiss(item.id)}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
