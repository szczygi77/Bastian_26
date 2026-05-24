type Accent = 'orange' | 'cyan' | 'green' | 'danger' | 'warning'

const ACCENT_FILL: Record<Accent, { bg: string; shadow: string }> = {
  orange:  { bg: '#FF8A1F', shadow: '0 0 8px rgba(255,138,31,0.45)' },
  cyan:    { bg: '#00E5FF', shadow: '0 0 8px rgba(0,229,255,0.40)'  },
  green:   { bg: '#22C55E', shadow: '0 0 8px rgba(34,197,94,0.40)'  },
  danger:  { bg: '#EF4444', shadow: '0 0 8px rgba(239,68,68,0.45)'  },
  warning: { bg: '#F59E0B', shadow: '0 0 8px rgba(245,158,11,0.40)' },
}

interface ProgressBarProps {
  value: number
  max?: number
  accent?: Accent
  label?: string
  showValue?: boolean
  className?: string
  thin?: boolean
  /** Gdy true — nie zmienia koloru automatycznie przy wysokim % (np. postęp misji). */
  fixedAccent?: boolean
  /** Większy pasek (10px) dla paneli operacyjnych. */
  thick?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  accent = 'orange',
  label,
  showValue,
  thin,
  fixedAccent = false,
  thick = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const autoAccent: Accent = pct > 80 ? 'danger' : pct > 60 ? 'warning' : accent
  const fillAccent = fixedAccent ? accent : autoAccent
  const fill = ACCENT_FILL[fillAccent]
  const trackH = thin ? 3 : thick ? 10 : 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#66778B',
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: '#66778B',
              }}
            >
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: trackH,
          borderRadius: trackH,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: trackH,
            background: fill.bg,
            boxShadow: fill.shadow,
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
    </div>
  )
}
