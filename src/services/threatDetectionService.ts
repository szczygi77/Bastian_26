import { fetchFIRMSAlerts } from '@/adapters/firmsAdapter'
import { envConfig } from '@/config/env'
import type {
  CascadeResult,
  FIRMSAlert,
  IKObject,
  ScenarioRun,
  ThreatCategory,
  ThreatSignal,
  ThreatSignalStatus,
} from '@/types'
import { generateId } from '@/utils/format'

const EARTH_RADIUS_KM = 6371
const FIRE_RADIUS_KM = 15

const CATEGORY_LABELS: Record<ThreatCategory, string> = {
  fire_smoke: 'Dym / ogień',
  unauthorized_movement: 'Ruch nieautoryzowany',
  thermal_anomaly: 'Anomalia termiczna',
  infrastructure_change: 'Zmiana infrastruktury',
}

export { CATEGORY_LABELS as THREAT_CATEGORY_LABELS }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestIkToFire(objects: IKObject[], fire: FIRMSAlert): { obj: IKObject; distanceKm: number } | null {
  let best: { obj: IKObject; distanceKm: number } | null = null
  for (const obj of objects) {
    const distanceKm = haversineKm(obj.coordinates[0], obj.coordinates[1], fire.latitude, fire.longitude)
    if (!best || distanceKm < best.distanceKm) best = { obj, distanceKm }
  }
  return best
}

function makeSignal(
  category: ThreatCategory,
  status: ThreatSignalStatus,
  source: string,
  evidence: string[],
  confidence: number,
  ikObjectId?: string,
): ThreatSignal {
  return {
    id: `threat-${category}-${generateId()}`,
    category,
    status,
    source,
    ikObjectId,
    confidence,
    evidence,
    detectedAt: new Date(),
  }
}

export interface ThreatScanContext {
  ikObjects: IKObject[]
  cascadeResult: CascadeResult | null
  activeScenarioRun: ScenarioRun | null
  scenarioId?: string
  firmsAlerts?: FIRMSAlert[]
}

export async function scanThreats(ctx: ThreatScanContext): Promise<ThreatSignal[]> {
  const signals: ThreatSignal[] = []
  const scenarioId = ctx.scenarioId ?? ctx.activeScenarioRun?.scenarioId ?? ''
  const firms = ctx.firmsAlerts ?? await fetchFIRMSAlerts(envConfig.firmsApiKey).catch(() => [])

  for (const fire of firms) {
    const nearest = nearestIkToFire(ctx.ikObjects, fire)
    if (nearest && nearest.distanceKm <= FIRE_RADIUS_KM) {
      signals.push(makeSignal(
        'fire_smoke',
        'live',
        'NASA FIRMS',
        [
          `Hotspot ${fire.instrument} w odległości ${nearest.distanceKm.toFixed(1)} km od ${nearest.obj.shortName}`,
          `Jasność: ${fire.brightness.toFixed(0)}K · pewność: ${fire.confidence}%`,
        ],
        Math.min(98, 60 + fire.confidence * 0.35),
        nearest.obj.id,
      ))
    }
  }

  if (scenarioId === 'sc-fire' || scenarioId.includes('fire')) {
    const elc = ctx.ikObjects.find(o => o.id === 'elc') ?? ctx.ikObjects[0]
    signals.push(makeSignal(
      'fire_smoke',
      'live',
      'scenario_engine',
      ['Scenariusz pożarowy aktywny — reguła detekcji dymu/ognia'],
      92,
      elc?.id,
    ))
    signals.push(makeSignal(
      'thermal_anomaly',
      'live',
      'scenario_engine',
      ['Anomalia termiczna — przegrzanie infrastruktury energetycznej w scenariuszu'],
      88,
      elc?.id,
    ))
  }

  if (scenarioId === 'sc-cyber-ot' || scenarioId.includes('cyber') || scenarioId === 'sc-hsw') {
    const hsw = ctx.ikObjects.find(o => o.id === 'hsw') ?? ctx.ikObjects.find(o => o.category === 'military')
    signals.push(makeSignal(
      'unauthorized_movement',
      'monitoring',
      'simulated_cctv',
      ['Wykryto ruch w strefie ogrodzonej obiektu chronionego (reguła demo)'],
      76,
      hsw?.id,
    ))
  }

  if (scenarioId === 'sc-power-plant' || scenarioId === 'sc-blackout') {
    const elc = ctx.ikObjects.find(o => o.id === 'elc')
    if (elc) {
      signals.push(makeSignal(
        'thermal_anomaly',
        'monitoring',
        'simulated_thermal',
        ['Wzrost temperatury transformatora powyżej progu operacyjnego (reguła demo)'],
        81,
        elc.id,
      ))
    }
  }

  if (ctx.cascadeResult) {
    const degraded = ctx.ikObjects.filter(o => o.status === 'degraded' || o.status === 'under_attack')
    for (const obj of degraded) {
      const inCascade = ctx.cascadeResult.nodes.some(n => n.objectId === obj.id)
      if (inCascade) {
        signals.push(makeSignal(
          'infrastructure_change',
          obj.status === 'under_attack' ? 'live' : 'monitoring',
          'cascade_engine',
          [`Status obiektu ${obj.shortName}: ${obj.status} — propagacja kaskady`],
          obj.status === 'under_attack' ? 94 : 78,
          obj.id,
        ))
      }
    }
  }

  if (signals.length === 0) {
    return [
      makeSignal('fire_smoke', 'clear', 'threat_detection', ['Brak aktywnych sygnałów'], 0),
      makeSignal('unauthorized_movement', 'clear', 'threat_detection', ['Brak aktywnych sygnałów'], 0),
      makeSignal('thermal_anomaly', 'clear', 'threat_detection', ['Brak aktywnych sygnałów'], 0),
      makeSignal('infrastructure_change', 'clear', 'threat_detection', ['Brak aktywnych sygnałów'], 0),
    ]
  }

  const byCategory = new Map<ThreatCategory, ThreatSignal>()
  for (const sig of signals) {
    const prev = byCategory.get(sig.category)
    if (!prev || sig.confidence > prev.confidence) byCategory.set(sig.category, sig)
  }

  for (const cat of ['fire_smoke', 'unauthorized_movement', 'thermal_anomaly', 'infrastructure_change'] as ThreatCategory[]) {
    if (!byCategory.has(cat)) {
      byCategory.set(cat, makeSignal(cat, 'clear', 'threat_detection', ['Monitoring aktywny — brak anomalii'], 0))
    }
  }

  return [...byCategory.values()]
}

export function threatSignalToAlert(signal: ThreatSignal): import('@/types').Alert | null {
  if (signal.status === 'clear') return null

  const severity = signal.confidence >= 90 ? 'critical' as const
    : signal.confidence >= 75 ? 'high' as const
    : 'medium' as const

  return {
    id: `alert-${signal.id}`,
    title: `[AUTO-DETECT] ${CATEGORY_LABELS[signal.category]}`,
    description: signal.evidence.join(' · '),
    severity,
    source: 'threat_detection',
    timestamp: signal.detectedAt,
    affectedNodes: signal.ikObjectId ? [signal.ikObjectId] : [],
    confidence: signal.confidence,
    status: 'active',
    recommendedActions: [
      'Zweryfikuj podgląd kamery / mapy',
      'Uruchom analizę kaskadową',
      'Zatwierdź procedurę w module Decyzje',
    ],
    autoDetected: true,
    threatCategory: signal.category,
  }
}
