import type { IKObject, Incident, NationalRegionSummary, PublicDataSourceStatus } from '@/types'
import { LIVE_VOIVODESHIP_ID } from '@/data/voivodeshipBranding'
import { averageTrustScore } from '@/services/sourceTrustService'

/** Transparent synthetic baselines — non-live regions are labeled aggregated. */
const REGION_BASELINES: Omit<NationalRegionSummary, 'incidentCount' | 'openIncidents' | 'ikObjects' | 'degradedObjects' | 'trustScoreAvg' | 'threatLevel'>[] = [
  { id: 'podkarpackie', name: 'Podkarpackie', sector: 'Regional C2', isLiveRegion: true },
  { id: 'dolnoslaskie', name: 'Dolnośląskie', sector: 'Industrial West', isLiveRegion: false },
  { id: 'kujawsko-pomorskie', name: 'Kujawsko-pomorskie', sector: 'Central Belt', isLiveRegion: false },
  { id: 'lodzkie', name: 'Łódzkie', sector: 'Logistics Core', isLiveRegion: false },
  { id: 'lubelskie', name: 'Lubelskie', sector: 'Adjacent Grid', isLiveRegion: false },
  { id: 'lubuskie', name: 'Lubuskie', sector: 'Border West', isLiveRegion: false },
  { id: 'malopolskie', name: 'Małopolskie', sector: 'Energy Belt', isLiveRegion: false },
  { id: 'mazowieckie', name: 'Mazowieckie', sector: 'National Core', isLiveRegion: false },
  { id: 'opolskie', name: 'Opolskie', sector: 'Cross-border Grid', isLiveRegion: false },
  { id: 'podlaskie', name: 'Podlaskie', sector: 'Eastern Perimeter', isLiveRegion: false },
  { id: 'pomorskie', name: 'Pomorskie', sector: 'Port & Telecom', isLiveRegion: false },
  { id: 'slaskie', name: 'Śląskie', sector: 'Industrial Grid', isLiveRegion: false },
  { id: 'swietokrzyskie', name: 'Świętokrzyskie', sector: 'Mining Belt', isLiveRegion: false },
  { id: 'warminsko-mazurskie', name: 'Warmińsko-mazurskie', sector: 'Northern Lakes', isLiveRegion: false },
  { id: 'wielkopolskie', name: 'Wielkopolskie', sector: 'Logistics Hub', isLiveRegion: false },
  { id: 'zachodniopomorskie', name: 'Zachodniopomorskie', sector: 'Baltic Coast', isLiveRegion: false },
]

const SYNTHETIC_BASELINE: Record<string, { ik: number; degraded: number; incidents: number; open: number; threat: number }> = {
  dolnoslaskie: { ik: 534, degraded: 11, incidents: 2, open: 1, threat: 33 },
  'kujawsko-pomorskie': { ik: 389, degraded: 7, incidents: 2, open: 0, threat: 24 },
  lodzkie: { ik: 467, degraded: 10, incidents: 2, open: 1, threat: 29 },
  lubelskie: { ik: 412, degraded: 7, incidents: 2, open: 0, threat: 26 },
  lubuskie: { ik: 248, degraded: 4, incidents: 1, open: 0, threat: 18 },
  malopolskie: { ik: 516, degraded: 8, incidents: 2, open: 0, threat: 28 },
  mazowieckie: { ik: 842, degraded: 12, incidents: 3, open: 1, threat: 34 },
  opolskie: { ik: 198, degraded: 3, incidents: 1, open: 0, threat: 17 },
  podlaskie: { ik: 276, degraded: 5, incidents: 1, open: 0, threat: 20 },
  pomorskie: { ik: 378, degraded: 6, incidents: 1, open: 0, threat: 22 },
  slaskie: { ik: 691, degraded: 19, incidents: 4, open: 2, threat: 41 },
  swietokrzyskie: { ik: 312, degraded: 6, incidents: 1, open: 0, threat: 23 },
  'warminsko-mazurskie': { ik: 334, degraded: 5, incidents: 1, open: 0, threat: 21 },
  wielkopolskie: { ik: 445, degraded: 9, incidents: 2, open: 1, threat: 31 },
  zachodniopomorskie: { ik: 356, degraded: 6, incidents: 1, open: 0, threat: 22 },
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
    if (region.id === LIVE_VOIVODESHIP_ID) {
      return {
        ...region,
        isLiveRegion: true,
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
      isLiveRegion: false,
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
  const live = regions.find(r => r.id === LIVE_VOIVODESHIP_ID)
  const synthetic = regions.filter(r => r.id !== LIVE_VOIVODESHIP_ID)
  const synthAvg = synthetic.reduce((s, r) => s + r.threatLevel, 0) / Math.max(synthetic.length, 1)
  return Math.round((live?.threatLevel ?? 0) * 0.55 + synthAvg * 0.45)
}
