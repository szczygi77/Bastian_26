import type { IKObject, Incident, NationalRegionSummary, PublicDataSourceStatus } from '@/types'
import { averageTrustScore } from '@/services/sourceTrustService'

/** Transparent synthetic baselines — non-live regions are labeled aggregated. */
const REGION_BASELINES: Omit<NationalRegionSummary, 'incidentCount' | 'openIncidents' | 'ikObjects' | 'degradedObjects' | 'trustScoreAvg' | 'threatLevel'>[] = [
  { id: 'lubelskie', name: 'Lubelskie', sector: 'Regional C2', isLiveRegion: true },
  { id: 'mazowieckie', name: 'Mazowieckie', sector: 'National Core', isLiveRegion: false },
  { id: 'malopolskie', name: 'Małopolskie', sector: 'Energy Belt', isLiveRegion: false },
  { id: 'slaskie', name: 'Śląskie', sector: 'Industrial Grid', isLiveRegion: false },
  { id: 'pomorskie', name: 'Pomorskie', sector: 'Port & Telecom', isLiveRegion: false },
  { id: 'wielkopolskie', name: 'Wielkopolskie', sector: 'Logistics Hub', isLiveRegion: false },
]

const SYNTHETIC_BASELINE: Record<string, { ik: number; degraded: number; incidents: number; open: number; threat: number }> = {
  mazowieckie: { ik: 842, degraded: 12, incidents: 3, open: 1, threat: 34 },
  malopolskie: { ik: 516, degraded: 8, incidents: 2, open: 0, threat: 28 },
  slaskie: { ik: 691, degraded: 19, incidents: 4, open: 2, threat: 41 },
  pomorskie: { ik: 378, degraded: 6, incidents: 1, open: 0, threat: 22 },
  wielkopolskie: { ik: 445, degraded: 9, incidents: 2, open: 1, threat: 31 },
}

export function buildNationalOverview(params: {
  ikObjects: IKObject[]
  incidents: Incident[]
  publicDataSources: PublicDataSourceStatus[]
}): NationalRegionSummary[] {
  const { ikObjects, incidents, publicDataSources } = params
  const trust = averageTrustScore(publicDataSources)
  const liveDegraded = ikObjects.filter(o => o.status !== 'operational').length
  const liveThreat = Math.min(100, liveDegraded * 12 + incidents.filter(i => i.status === 'open').length * 20)

  return REGION_BASELINES.map(region => {
    if (region.isLiveRegion) {
      return {
        ...region,
        ikObjects: ikObjects.length,
        degradedObjects: liveDegraded,
        incidentCount: incidents.length,
        openIncidents: incidents.filter(i => i.status === 'open').length,
        trustScoreAvg: trust,
        threatLevel: liveThreat,
      }
    }

    const base = SYNTHETIC_BASELINE[region.id] ?? { ik: 200, degraded: 3, incidents: 1, open: 0, threat: 20 }
    return {
      ...region,
      ikObjects: base.ik,
      degradedObjects: base.degraded,
      incidentCount: base.incidents,
      openIncidents: base.open,
      trustScoreAvg: Math.max(35, trust - 8),
      threatLevel: base.threat,
    }
  })
}

export function aggregateNationalThreat(regions: NationalRegionSummary[]): number {
  const live = regions.find(r => r.isLiveRegion)
  const synthetic = regions.filter(r => !r.isLiveRegion)
  const synthAvg = synthetic.reduce((s, r) => s + r.threatLevel, 0) / Math.max(synthetic.length, 1)
  return Math.round((live?.threatLevel ?? 0) * 0.55 + synthAvg * 0.45)
}
