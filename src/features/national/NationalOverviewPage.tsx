import { useEffect } from 'react'
import { Globe, MapPin, AlertTriangle, Shield } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { aggregateNationalThreat } from '@/services/nationalOverviewService'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'

export function NationalOverviewPage() {
  const {
    nationalRegions,
    refreshNationalOverview,
    refreshPublicDataSources,
    openIncidentCommand,
    incidents,
  } = useAppStore()

  useEffect(() => {
    refreshPublicDataSources()
    refreshNationalOverview()
  }, [refreshNationalOverview, refreshPublicDataSources])

  const nationalThreat = aggregateNationalThreat(nationalRegions)
  const liveRegion = nationalRegions.find(r => r.isLiveRegion)

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-[#00E5FF]" />
          <div>
            <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.15em] text-[#E6EDF3]">
              NATIONAL OVERVIEW
            </h1>
            <p className="text-[11px] font-mono text-[#66778B]">
              Skala strategiczna · Lubelskie LIVE · pozostałe regiony = syntetyczna agregacja baseline
            </p>
          </div>
        </div>
        {liveRegion && liveRegion.openIncidents > 0 && (
          <Button variant="primary" size="sm" onClick={() => openIncidentCommand(incidents.find(i => i.status === 'open')?.id)}>
            Regional Command — {liveRegion.name}
          </Button>
        )}
      </div>

      <Card accent="orange">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono text-[#66778B] uppercase">National Threat Index</div>
            <div className="text-3xl font-mono font-bold text-[#FF8A1F]">{nationalThreat}/100</div>
          </div>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
            <ProgressBar value={nationalThreat} accent="orange" />
          </div>
        </div>
      </Card>

      <div className="ui-grid ui-grid-3">
        {nationalRegions.map(region => (
          <Card key={region.id} accent={region.isLiveRegion ? 'cyan' : undefined}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-[11px] font-mono font-bold text-[#E6EDF3]">{region.name}</div>
                <div className="text-[10px] font-mono text-[#66778B]">{region.sector}</div>
              </div>
              <Badge variant={region.isLiveRegion ? 'cyan' : 'muted'}>
                {region.isLiveRegion ? 'LIVE' : 'AGGREGATED'}
              </Badge>
            </div>
            <div className="ui-stack" style={{ gap: 8 }}>
              <div className="flex justify-between text-[10px] font-mono text-[#94A3B8]">
                <span>Obiekty IK</span><strong>{region.ikObjects}</strong>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#94A3B8]">
                <span>Degraded</span><strong>{region.degradedObjects}</strong>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#94A3B8]">
                <span>Incydenty</span><strong>{region.openIncidents}/{region.incidentCount}</strong>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#94A3B8]">
                <span>Trust avg</span><strong>{region.trustScoreAvg}</strong>
              </div>
              <ProgressBar value={region.threatLevel} accent={region.threatLevel >= 60 ? 'danger' : 'orange'} label="Threat" showValue />
            </div>
            {region.isLiveRegion && region.openIncidents > 0 && (
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#F59E0B]">
                <AlertTriangle size={12} />
                Aktywny incydent operacyjny
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card label="SECTOR AGGREGATION">
        <div className="flex flex-wrap gap-3">
          {['Energy', 'Water', 'Telecom', 'Transport', 'Emergency', 'Government'].map(sector => (
            <div key={sector} className="ui-panel" style={{ padding: '10px 14px', minWidth: 140 }}>
              <div className="text-[9px] font-mono text-[#66778B] uppercase">{sector}</div>
              <div className="flex items-center gap-2 mt-1">
                <Shield size={11} className="text-[#94A3B8]" />
                <span className="text-[11px] font-mono text-[#E6EDF3]">Monitorowany</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-[#66778B] mt-3">
          <MapPin size={10} className="inline mr-1" />
          Drill-down: tylko Lubelskie posiada pełne dane operacyjne w tej instancji Bastion.
        </p>
      </Card>
    </PageShell>
  )
}
