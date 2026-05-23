import React, { createContext, useContext, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const AccordionContext = createContext<{
  open: string | null; toggle: (v: string) => void; collapsible: boolean
} | null>(null)

const ItemContext = createContext<string>('')

export function Accordion({ collapsible = true, defaultValue, children, className }: {
  collapsible?: boolean; defaultValue?: string; children: React.ReactNode; className?: string
}) {
  const [open, setOpen] = useState<string | null>(defaultValue ?? null)
  const toggle = (value: string) => {
    setOpen(prev => (prev === value ? (collapsible ? null : prev) : value))
  }
  return (
    <AccordionContext.Provider value={{ open, toggle, collapsible }}>
      <div className={className} style={{ width: '100%' }}>{children}</div>
    </AccordionContext.Provider>
  )
}

export function AccordionItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <ItemContext.Provider value={value}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</div>
    </ItemContext.Provider>
  )
}

export function AccordionTrigger({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AccordionContext)!
  const value = useContext(ItemContext)
  const isOpen = ctx.open === value
  return (
    <button type="button" onClick={() => ctx.toggle(value)} style={{
      display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E6EDF3',
      transition: 'color 0.15s ease',
    }}>
      {children}
      <ChevronDown size={16} style={{
        color: '#66778B', transition: 'transform 0.2s ease',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }} />
    </button>
  )
}

export function AccordionContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AccordionContext)!
  const value = useContext(ItemContext)
  if (ctx.open !== value) return null
  return (
    <div style={{
      padding: '0 4px 16px', fontFamily: 'var(--font-sans)', fontSize: 13,
      color: '#94A3B8', lineHeight: 1.6,
    }}>{children}</div>
  )
}
