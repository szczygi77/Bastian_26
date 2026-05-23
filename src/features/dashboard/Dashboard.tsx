import { useEffect } from 'react'
import { GitBranch, Activity, AlertTriangle, Cpu, Radio, Zap, Server, Wifi } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { StatCard, SectionHeader } from '@/components/ui/Card'
import { Badge, SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusDot } from '@/components/ui/StatusDot'
import { formatTimeAgo, statusColor, criticalityLabel } from '@/utils/format'

/* ── Threat gauge ──────────────────────────────────────────────────────────── */
function ThreatGauge({ level }: { level: number }) {
  const label =
    level >= 80 ? 'KRYTYCZNY' :
    level >= 60 ? 'WYSOKI' :
    level >= 40 ? 'PODWYŻSZONY' :
    level >= 20 ? 'UMIARKOWANY' : 'NORMALNY'

  const color =
    level >= 80 ? '#EF4444' :
    level >= 60 ? '#FF8A1F' :
    level >= 40 ? '#F59E0B' : '#22C55E'

  const r = 46
  const circ = 2 * Math.PI * r

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#66778B',
        }}
      >
        THREAT LEVEL
      </div>

      <div style={{ position: 'relative', width: 130, height: 130 }}>
        <svg
          viewBox="0 0 120 120"
          style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}
        >
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
          {/* Dashed guide */}
          <circle
            cx="60" cy="60" r={r} fill="none"
            strokeWidth="1.5" stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 9"
          />
          {/* Fill */}
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${(level / 100) * circ} ${circ}`}
            style={{
              filter: `drop-shadow(0 0 10px ${color}95)`,
              transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease',
            }}
          />
        </svg>

        {/* Center readout */}
        <div
          style={{
            position: 'absolute',
            inset: 16,
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,7,10,0.82)',
            border: `1px solid ${color}22`,
            boxShadow: `inset 0 0 24px ${color}09`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1,
              color,
              textShadow: `0 0 16px ${color}80`,
            }}
          >
            {level}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: '#3D5060',
              marginTop: 2,
            }}
          >
            /100
          </span>
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color,
          textShadow: `0 0 10px ${color}60`,
        }}
      >
        {label}
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */
export function Dashboard() {
  const { alerts, ikObjects, cascadeResult, systemHealth, refreshSystemHealth, drones, missions } = useAppStore()

  useEffect(() => {
    refreshSystemHealth()
    const t = setInterval(refreshSystemHealth, 30000)
    return () => clearInterval(t)
  }, [refreshSystemHealth])

  const activeAlerts    = alerts.filter(a => a.status === 'active')
  const criticalAlerts  = activeAlerts.filter(a => a.severity === 'critical')
  const degradedObjects = ikObjects.filter(o => o.status !== 'operational')
  const activeMissions  = missions.filter(m => m.status !== 'completed')
  const availDrones     = drones.filter(d => d.availability)

  const threatLevel = Math.min(100, criticalAlerts.length * 25 + degradedObjects.length * 10)
  const infraHealth = Math.round(
    ((ikObjects.length - degradedObjects.length) / Math.max(1, ikObjects.length)) * 100
  )

  const criticalObjects = ikObjects
    .filter(o => o.criticality >= 4)
    .sort((a, b) => b.criticality - a.criticality)

  const sysChecks = [
    { label: 'Hot Standby',  ok: systemHealth.hotStandbyActive },
    { label: 'Watchdog',     ok: systemHealth.watchdogActive },
    { label: 'UPS',          ok: systemHealth.upsActive },
    { label: 'Encryption',   ok: systemHealth.encryptionActive },
    { label: 'Local DB',     ok: systemHealth.localDbStatus === 'healthy' },
    { label: 'RCB Link',     ok: systemHealth.rcbLinkStatus === 'connected' },
    { label: 'TETRA',        ok: systemHealth.tetraLinkStatus === 'connected' },
    { label: 'GSM Fallback', ok: systemHealth.gsmFallbackStatus !== 'offline' },
  ]

  return (
    <div
      className="tactical-grid"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 3,
              height: 32,
              borderRadius: 2,
              background: 'linear-gradient(180deg, #FF8A1F 0%, rgba(255,138,31,0.15) 100%)',
              boxShadow: '0 0 10px rgba(255,138,31,0.55)',
              flexShrink: 0,
            }}
          />
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#E6EDF3',
                lineHeight: 1,
              }}
            >
              COMMAND DASHBOARD
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: '#3D5060',
                marginTop: 5,
                letterSpacing: '0.12em',
              }}
            >
              STALOWA WOLA · IK AWARENESS · {ikObjects.length} OBIEKTÓW ·{' '}
              {new Date().toLocaleString('pl-PL', { hour12: false })}
            </p>
          </div>
        </div>

        <Badge variant={systemHealth.online ? 'green' : 'orange'} dot pulse={!systemHealth.online}>
          {systemHealth.online ? 'SYSTEM ONLINE' : 'TRYB DEGRADED'}
        </Badge>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {/* Threat gauge panel */}
        <div
          className="glass-panel"
          style={{
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(threatLevel >= 60 && {
              borderColor: 'rgba(239,68,68,0.18)',
              boxShadow: '0 0 24px rgba(239,68,68,0.07)',
            }),
          }}
        >
          <ThreatGauge level={threatLevel} />
        </div>

        <StatCard
          label="Active Alerts"
          value={activeAlerts.length}
          sub={`${criticalAlerts.length} krytycznych`}
          accent={criticalAlerts.length > 0 ? 'danger' : undefined}
          icon={<AlertTriangle size={14} />}
        />
        <StatCard
          label="Infra Health"
          value={infraHealth}
          unit="%"
          sub={`${degradedObjects.length} degraded / offline`}
          accent={infraHealth < 80 ? 'orange' : 'green'}
          icon={<Activity size={14} />}
        />
        <StatCard
          label="Drone Readiness"
          value={`${availDrones.length}/${drones.length}`}
          sub={`${activeMissions.length} aktywnych misji`}
          accent="cyan"
          icon={<Radio size={14} />}
        />
        <StatCard
          label="Sync Queue"
          value={systemHealth.syncQueueLength}
          sub={systemHealth.lastSync ? `Sync: ${formatTimeAgo(systemHealth.lastSync)}` : 'Oczekuje'}
          accent={systemHealth.syncQueueLength > 0 ? 'orange' : undefined}
          icon={<Wifi size={14} />}
        />
      </div>

      {/* ── Public data sync row ─────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{ borderRadius: 16, padding: '18px 20px' }}
      >
        <SectionHeader
          label="Public Data Sync"
          icon={<Activity size={10} />}
          accent="cyan"
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }}
        >
          {Object.entries(systemHealth.publicDataSyncStatus).map(([key, sync]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#66778B',
                  }}
                >
                  {key}
                </span>
                <StatusDot
                  color={
                    sync.status === 'synced'   ? 'green'  :
                    sync.status === 'syncing'  ? 'cyan'   :
                    sync.status === 'error'    ? 'danger' : 'muted'
                  }
                  pulse={sync.status === 'syncing'}
                  size="xs"
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: '#94A3B8',
                }}
              >
                {sync.lastSync ? formatTimeAgo(sync.lastSync) : '—'}
              </div>
              <ProgressBar value={Math.max(0, 100 - sync.dataAge)} accent="cyan" thin />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom 3-col grid ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          flex: '1 0 auto',
        }}
      >
        {/* Active alerts */}
        <div
          className="glass-panel"
          style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}
        >
          <SectionHeader
            label="Active Alerts"
            icon={<AlertTriangle size={10} />}
            count={activeAlerts.length}
            accent="danger"
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              overflowY: 'auto',
              maxHeight: 260,
            }}
          >
            {activeAlerts.length === 0 ? (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: '#3D5060',
                  padding: '24px 0',
                  textAlign: 'center',
                }}
              >
                Brak aktywnych alertów
              </div>
            ) : activeAlerts.slice(0, 10).map(alert => (
              <div
                key={alert.id}
                className="data-row"
                style={{
                  borderLeft: `2px solid ${
                    alert.severity === 'critical' ? 'rgba(239,68,68,0.55)' :
                    alert.severity === 'high'     ? 'rgba(255,138,31,0.55)' :
                                                    'rgba(245,158,11,0.45)'
                  }`,
                  paddingLeft: 12,
                }}
              >
                <SeverityBadge severity={alert.severity} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: '#E6EDF3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {alert.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: '#3D5060',
                      marginTop: 2,
                    }}
                  >
                    {formatTimeAgo(alert.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical objects */}
        <div
          className="glass-panel"
          style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}
        >
          <SectionHeader
            label="Obiekty krytyczne"
            icon={<GitBranch size={10} />}
            accent="orange"
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: 'auto',
              maxHeight: 260,
            }}
          >
            {criticalObjects.map(obj => (
              <div
                key={obj.id}
                className="data-row"
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: statusColor(obj.status),
                    boxShadow: `0 0 6px ${statusColor(obj.status)}80`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: '#E6EDF3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {obj.shortName}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: '#3D5060',
                      marginTop: 2,
                    }}
                  >
                    {criticalityLabel(obj.criticality)}
                  </div>
                </div>
                <StatusBadge status={obj.status} />
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div
          className="glass-panel"
          style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}
        >
          <SectionHeader
            label="System Status"
            icon={<Cpu size={10} />}
            accent="cyan"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sysChecks.map(({ label, ok }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: ok ? 'rgba(34,197,94,0.035)' : 'rgba(239,68,68,0.035)',
                  border: `1px solid ${ok ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)'}`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: ok ? '#66778B' : '#94A3B8',
                  }}
                >
                  {label}
                </span>
                <StatusDot color={ok ? 'green' : 'danger'} pulse={!ok} size="xs" />
              </div>
            ))}
          </div>

          {cascadeResult && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Server size={10} style={{ color: '#FF8A1F' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: '#FF8A1F',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                  }}
                >
                  CASCADE PROPAGATION
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: '#94A3B8',
                }}
              >
                {cascadeResult.affectedCount} obiektów · Impact:{' '}
                {cascadeResult.totalImpactScore.toFixed(0)}/100
              </div>
              <ProgressBar value={cascadeResult.totalImpactScore} accent="danger" thin />
            </div>
          )}

          {/* Infra health bar */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={10} style={{ color: infraHealth < 80 ? '#FF8A1F' : '#22C55E' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: '#66778B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                INFRA HEALTH
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: infraHealth < 80 ? '#FF8A1F' : '#22C55E',
                  marginLeft: 'auto',
                  fontWeight: 600,
                }}
              >
                {infraHealth}%
              </span>
            </div>
            <ProgressBar value={infraHealth} accent={infraHealth < 80 ? 'orange' : 'green'} thin />
          </div>
        </div>
      </div>
    </div>
  )
}
