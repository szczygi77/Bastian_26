import type { DroneUnit, MissionType, DroneAssignmentScore, DroneMission, IKObject } from '@/types'
import { generateId } from '@/utils/format'
import { initializeMissionActivities } from '@/services/missionSimulation'

const MISSION_PAYLOAD_MAP: Record<MissionType, string[]> = {
  reconnaissance: ['RGB camera', 'zoom lens'],
  thermal_inspection: ['thermal camera'],
  perimeter_monitoring: ['RGB camera', 'spotlight'],
  communication_relay: ['speaker'],
  fire_assessment: ['thermal camera', 'RGB camera'],
  medical_delivery: [],
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function scorePayload(drone: DroneUnit, mission: MissionType): number {
  const needed = MISSION_PAYLOAD_MAP[mission]
  if (needed.length === 0) return 80
  const matches = needed.filter(p => drone.payload.some(dp => dp.toLowerCase().includes(p.toLowerCase())))
  return Math.round((matches.length / needed.length) * 100)
}

export function scoreDrones(
  drones: DroneUnit[],
  missionType: MissionType,
  targetCoords: [number, number]
): DroneAssignmentScore[] {
  return drones.map(drone => {
    if (!drone.availability || drone.status === 'on_mission' || drone.status === 'maintenance') {
      return {
        droneId: drone.id,
        totalScore: 0,
        distanceScore: 0,
        batteryScore: 0,
        payloadScore: 0,
        availabilityScore: 0,
        recommended: false,
      }
    }

    const distanceKm = haversineKm(drone.coordinates, targetCoords)
    const distanceScore = Math.max(0, 100 - (distanceKm / drone.range) * 100)

    const batteryScore = drone.battery >= 30 ? drone.battery : 0

    const payloadScore = scorePayload(drone, missionType)

    const availabilityScore = drone.status === 'available' ? 100 : 50

    const totalScore = Math.round(
      distanceScore * 0.35 + batteryScore * 0.30 + payloadScore * 0.25 + availabilityScore * 0.10
    )

    return {
      droneId: drone.id,
      totalScore,
      distanceScore: Math.round(distanceScore),
      batteryScore,
      payloadScore,
      availabilityScore,
      recommended: totalScore >= 60,
    }
  })
}

export function assignBestDrone(
  drones: DroneUnit[],
  missionType: MissionType,
  targetObject: IKObject,
  incidentId: string,
  operatorId: string
): { mission: DroneMission; drone: DroneUnit } | null {
  const scores = scoreDrones(drones, missionType, targetObject.coordinates)
  const best = scores
    .filter(s => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)[0]

  if (!best || best.totalScore === 0) return null

  const drone = drones.find(d => d.id === best.droneId)!
  const distanceKm = haversineKm(drone.coordinates, targetObject.coordinates)
  const speedKmh = 60
  const estimatedArrivalMin = Math.max(2, Math.ceil((distanceKm / speedKmh) * 60))

  const mission: DroneMission = initializeMissionActivities({
    id: `mission-${generateId()}`,
    droneId: drone.id,
    type: missionType,
    targetObjectId: targetObject.id,
    targetName: targetObject.name,
    targetShortName: targetObject.shortName,
    targetCoordinates: targetObject.coordinates,
    assignedAt: new Date(),
    estimatedArrivalMin,
    status: 'dispatched',
    incidentId,
    operatorId,
    routeOrigin: [...drone.coordinates],
    currentPosition: [...drone.coordinates],
    progressPercent: 0,
    onSiteTicks: 0,
  }, targetObject)

  return { mission, drone }
}
