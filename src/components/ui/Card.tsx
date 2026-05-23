import { cn } from '@/utils/cn'

type Accent = 'orange' | 'cyan' | 'danger' | 'green' | 'warning'

const ACCENT_COLORS: Record<Accent, { color: string; glow: string; bg: string; border: string }> = {
  orange:  { color: '#FF8A1F', glow: 'rgba(255,138,31,0.4)',  bg: 'rgba(255,138,31,0.06)',  border: 'rgba(255,138,31,0.16)' },
  cyan:    { color: '#00E5FF', glow: 'rgba(0,229,255,0.35)',   bg: 'rgba(0,229,255,0.05)',   border: 'rgba(0,229,255,0.14)'  },
  danger:  { color: '#EF4444', glow: 'rgba(239,68,68,0.40)',   bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.18)'  },
  green:   { color: '#22C55E', glow: 'rgba(34,197,94,0.35)',   bg: 'rgba(34,197,94,0.05)',   border: 'rgba(34,197,94,0.14)'  },
  warning: { color: '#F59E0B', glow: 'rgba(245,158,11,0.35)',  bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.14)' },
}

interface CardProps {
  children: React.ReactNode
  className?: string
  label?: string
  accent?: Accent
  onClick?: () => void
  interactive?: boolean
  noPad?: boolean
}

export function Card({ children, className, label, accent, onClick, interactive, noPad }: CardProps) {
  const accentStyle = accent ? ACCENT_COLORS[accent] : null

  return (
    <div
      onClick={onClick}
      className={cn('glass-panel', className)}
      style={{
        borderRadius: 16,
        padding: noPad ? 0 : 20,
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick || interactive ? 'pointer' : undefined,
        transition: 'all 0.18s ease',
        ...(accent && accentStyle
          ? {
              borderLeft: `2px solid ${accentStyle.color}`,
              paddingLeft: noPad ? 0 : 22,
            }
          : {}),
      }}
      onMouseEnter={
        onClick || interactive
          ? e => {
              e.currentTarget.style.background =
                'linear-gradient(145deg, rgba(22,32,44,0.88) 0%, rgba(13,20,28,0.95) 100%)'
            }
          : undefined
      }
      onMouseLeave={
        onClick || interactive
          ? e => {
              e.currentTarget.style.background = ''
            }
          : undefined
      }
    >
      {/* Left accent bar */}
      {accent && accentStyle && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: '12%',
            bottom: '12%',
            width: 2,
            borderRadius: '0 2px 2px 0',
            background: `linear-gradient(180deg, ${accentStyle.color} 0%, ${accentStyle.color}40 100%)`,
            boxShadow: `0 0 8px ${accentStyle.glow}`,
          }}
        />
      )}

      {label && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#66778B',
            marginBottom: 14,
          }}
        >
          {label}
        </div>
      )}

      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  accent?: Accent
  icon?: React.ReactNode
}) {
  const accentStyle = accent ? ACCENT_COLORS[accent] : null

  return (
    <Card accent={accent}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#66778B',
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              color: accentStyle?.color ?? '#66778B',
              opacity: 0.7,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: accentStyle?.color ?? '#E6EDF3',
            textShadow: accentStyle ? `0 0 20px ${accentStyle.glow}` : undefined,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#66778B',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {sub && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#3D5060',
            marginTop: 8,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </Card>
  )
}

/* Panel section header */
export function SectionHeader({
  label,
  icon,
  count,
  accent,
}: {
  label: string
  icon?: React.ReactNode
  count?: number
  accent?: Accent
}) {
  const accentStyle = accent ? ACCENT_COLORS[accent] : null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
      }}
    >
      {icon && (
        <span style={{ color: accentStyle?.color ?? '#66778B', flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#66778B',
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#3D5060',
            marginLeft: 2,
          }}
        >
          ({count})
        </span>
      )}
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.05)',
        }}
      />
    </div>
  )
}
