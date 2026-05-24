import type { DroneAssignmentScore, DroneUnit, IKObject, MissionType } from '@/types'
import { scoreDrones, assignBestDrone } from '@/services/skymarshalEngine'

export interface AssetRecommendation {
  drone: DroneUnit
  score: DroneAssignmentScore
  missionType: MissionType
  target: IKObject
  etaMin: number
  reasons: string[]
  risks: string[]
}

const MISSION_FOR_INCIDENT: MissionType = 'reconnaissance'

export function recommendResponseAsset(
  drones: DroneUnit[],
  target: IKObject,
  missionType: MissionType = MISSION_FOR_INCIDENT,
): AssetRecommendation | null {
  const scores = scoreDrones(drones, missionType, target.coordinates)
  const best = scores
    .filter(s => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)[0]

  if (!best) return null

  const drone = drones.find(d => d.id === best.droneId)
  if (!drone) return null

  const reasons: string[] = []
  if (best.distanceScore >= 70) reasons.push('Optymalna odległość od obiektu')
  if (best.batteryScore >= 60) reasons.push(`Bateria ${drone.battery}%`)
  if (best.payloadScore >= 70) reasons.push('Dopasowany payload misji')
  if (best.availabilityScore >= 80) reasons.push('Zasób dostępny natychmiast')

  const risks: string[] = []
  if (drone.battery < 40) risks.push('Niski poziom baterii')
  if (best.distanceScore < 50) risks.push('Duża odległość od bazy')
  if (drone.status !== 'available') risks.push(`Status: ${drone.status}`)

  const distanceKm = Math.max(0, (100 - best.distanceScore) / 100) * drone.range
  const etaMin = Math.max(2, Math.ceil((distanceKm / 60) * 60))

  return {
    drone,
    score: best,
    missionType,
    target,
    etaMin,
    reasons,
    risks,
  }
}

export function dispatchRecommendedAsset(
  drones: DroneUnit[],
  target: IKObject,
  incidentId: string,
  operatorId: string,
  missionType: MissionType = MISSION_FOR_INCIDENT,
) {
  return assignBestDrone(drones, missionType, target, incidentId, operatorId)
}

export { scoreDrones, assignBestDrone }
