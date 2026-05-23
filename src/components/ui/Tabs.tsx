import { createContext, useContext, useState } from 'react'

interface TabsContextValue { value: string; setValue: (v: string) => void }
const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({ defaultValue, value: controlled, onValueChange, children, className }: {
  defaultValue: string; value?: string; onValueChange?: (v: string) => void
  children: React.ReactNode; className?: string
}) {
  const [internal, setInternal] = useState(defaultValue)
  const value = controlled ?? internal
  const setValue = (v: string) => { setInternal(v); onValueChange?.(v) }
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: 4, borderRadius: 14,
      background: 'rgba(32,40,50,0.5)', border: '1px solid rgba(255,255,255,0.06)',
    }}>{children}</div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)!
  const active = ctx.value === value
  return (
    <button type="button" onClick={() => ctx.setValue(value)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.10em', textTransform: 'uppercase', transition: 'all 0.15s ease',
      background: active ? 'rgba(13,15,18,0.9)' : 'transparent',
      color: active ? '#E6EDF3' : '#66778B',
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
    }}>{children}</button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)!
  if (ctx.value !== value) return null
  return <div className={className} style={{ animation: 'fade-in 0.32s ease-out forwards' }}>{children}</div>
}
