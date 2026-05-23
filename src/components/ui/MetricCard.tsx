import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  detail?: string
  icon?: LucideIcon
  accent?: string
}

export function MetricCard({ label, value, detail, icon: Icon, accent = '#FF8A1F' }: MetricCardProps) {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#66778B',
        }}>{label}</span>
        {Icon && <Icon size={16} style={{ color: accent }} />}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700,
        color: '#E6EDF3', lineHeight: 1, letterSpacing: '-0.02em',
        textShadow: `0 0 20px ${accent}40`,
      }}>{value}</div>
      {detail && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#66778B', marginTop: 8 }}>{detail}</div>
      )}
    </div>
  )
}
