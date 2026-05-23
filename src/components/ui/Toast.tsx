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
  default: <Info className="w-4 h-4 text-primary" />,
  success: <CheckCircle2 className="w-4 h-4 text-[#78d99a]" />,
  destructive: <AlertTriangle className="w-4 h-4 text-destructive" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'border-primary/30 bg-card/90',
  success: 'border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.1)]',
  destructive: 'border-destructive/40 bg-destructive/10',
  warning: 'border-[rgba(238,180,0,0.4)] bg-[rgba(238,180,0,0.1)]',
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
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]">
        {items.map(item => (
          <div
            key={item.id}
            className={cn(
              'glass-strong rounded-xl border p-4 shadow-lg animate-fade-in flex gap-3',
              VARIANT_CLASSES[item.variant ?? 'default'],
            )}
          >
            {VARIANT_ICON[item.variant ?? 'default']}
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-semibold text-foreground">{item.title}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
