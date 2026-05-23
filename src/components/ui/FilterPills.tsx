interface FilterPillsProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FilterPills({ options, value, onChange, className }: FilterPillsProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} className={className}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s ease',
            background: active ? 'rgba(255,138,31,0.10)' : 'transparent',
            color: active ? '#FF8A1F' : '#66778B',
            border: active ? '1px solid rgba(255,138,31,0.30)' : '1px solid rgba(255,255,255,0.06)',
          }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

export function ToggleGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: 3, gap: 2 }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: active ? 'rgba(255,138,31,0.15)' : 'transparent',
            color: active ? '#FF8A1F' : '#66778B',
          }}>{opt.label}</button>
        )
      })}
    </div>
  )
}
