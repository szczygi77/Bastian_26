import type { DroneMission, DroneUnit, IKObject } from '@/types'
import {
  buildMissionResult,
  createFindingForStep,
  getMissionActivityPlan,
  totalOnSiteTicks,
} from '@/services/missionActivities'

export function interpolateCoords(
  origin: [number, number],
  target: [number, number],
  progress: number,
): [number, number] {
  const t = Math.min(1, Math.max(0, progress / 100))
  return [
    origin[0] + (target[0] - origin[0]) * t,
    origin[1] + (target[1] - origin[1]) * t,
  ]
}

function orbitPosition(center: [number, number], radiusDeg: number, angle: number): [number, number] {
  return [
    center[0] + Math.cos(angle) * radiusDeg,
    center[1] + Math.sin(angle) * radiusDeg,
  ]
}

function targetSnapshot(target: Pick<IKObject, 'id' | 'name' | 'shortName' | 'category' | 'criticality' | 'status'>) {
  return {
    id: target.id,
    name: target.name,
    shortName: target.shortName,
    category: target.category,
    criticality: target.criticality,
    status: target.status,
  }
}

function advanceOnSiteActivity(
  mission: DroneMission,
  target: Pick<IKObject, 'id' | 'name' | 'shortName' | 'category' | 'criticality' | 'status'>,
): DroneMission {
  const steps = mission.activitySteps ?? getMissionActivityPlan(mission.type)
  const totalTicks = totalOnSiteTicks(steps)
  const onSiteTicks = (mission.onSiteTicks ?? 0) + 1
  let activityIndex = mission.currentActivityIndex ?? 0
  let activityTick = (mission.activityTick ?? 0) + 1
  const findings = [...(mission.findings ?? [])]

  const currentStep = steps[activityIndex]
  if (currentStep && activityTick >= currentStep.durationTicks) {
    findings.push(createFindingForStep(mission.id, currentStep, activityIndex, target, mission.type))
    activityIndex += 1
    activityTick = 0
  }

  const activeStep = steps[activityIndex]
  const completedSteps = steps.slice(0, activityIndex)
  const ticksInCurrent = completedSteps.reduce((s, step) => s + step.durationTicks, 0) + activityTick
  const activityProgress = Math.min(100, Math.round((ticksInCurrent / totalTicks) * 100))

  let next: DroneMission = {
    ...mission,
    activitySteps: steps,
    onSiteTicks,
    currentActivityIndex: activityIndex,
    activityTick,
    activityLabel: activeStep?.label ?? 'Finalizacja pracy',
    activityProgress,
    findings,
    currentPosition: mission.targetCoordinates,
  }

  if (mission.type === 'perimeter_monitoring') {
    const angle = (onSiteTicks / totalTicks) * Math.PI * 2
    next.currentPosition = orbitPosition(mission.targetCoordinates, 0.00018, angle)
  }

  if (onSiteTicks >= totalTicks || activityIndex >= steps.length) {
    next.status = 'returning'
    next.progressPercent = 100
    next.activityLabel = 'Powrót na bazę'
    next.activityProgress = 100
    if (!next.result) {
      next.result = buildMissionResult(mission.type, targetSnapshot(target), findings)
    }
  }

  return next
}

export function tickMissionState(
  mission: DroneMission,
  drone: DroneUnit,
  target?: Pick<IKObject, 'id' | 'name' | 'shortName' | 'category' | 'criticality' | 'status'>,
): { mission: DroneMission; drone: Partial<DroneUnit> | null } {
  if (mission.status === 'completed') {
    return { mission, drone: null }
  }

  const increment = Math.max(4, 100 / Math.max(mission.estimatedArrivalMin * 3, 8))
  let next: DroneMission = { ...mission }
  let dronePatch: Partial<DroneUnit> | null = null
  const targetInfo = target ?? {
    id: mission.targetObjectId,
    name: mission.targetName ?? mission.targetObjectId,
    shortName: mission.targetShortName ?? mission.targetObjectId,
    category: 'government' as const,
    criticality: 3 as const,
    status: 'operational' as const,
  }

  switch (mission.status) {
    case 'dispatched':
      next.status = 'en_route'
      next.progressPercent = Math.min(100, mission.progressPercent + increment * 0.5)
      next.currentPosition = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, next.progressPercent)
      next.activityLabel = 'Start misji — wznoszenie i kurs na cel'
      dronePatch = { coordinates: next.currentPosition, status: 'on_mission' }
      break

    case 'en_route': {
      const progress = Math.min(100, mission.progressPercent + increment)
      next.progressPercent = progress
      next.currentPosition = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, progress)
      next.activityLabel = `Lot do ${mission.targetShortName} — ${progress.toFixed(0)}% trasy`
      dronePatch = { coordinates: next.currentPosition, status: 'on_mission' }
      if (progress >= 100) {
        next.status = 'on_site'
        next.onSiteTicks = 0
        next.currentActivityIndex = 0
        next.activityTick = 0
        next.findings = []
        next.activitySteps = mission.activitySteps ?? getMissionActivityPlan(mission.type)
        const firstStep = next.activitySteps[0]
        next.activityLabel = firstStep?.label ?? 'Praca na miejscu'
        next.currentPosition = mission.targetCoordinates
      }
      break
    }

    case 'on_site': {
      next = advanceOnSiteActivity(mission, targetInfo)
      dronePatch = { coordinates: next.currentPosition, status: 'on_mission' }
      break
    }

    case 'returning': {
      const progress = Math.max(0, mission.progressPercent - increment)
      next.progressPercent = progress
      next.currentPosition = interpolateCoords(mission.routeOrigin, mission.targetCoordinates, progress)
      next.activityLabel = `Powrót na bazę — ${(100 - progress).toFixed(0)}% drogi`
      dronePatch = { coordinates: next.currentPosition, status: 'on_mission' }
      if (progress <= 0) {
        next.status = 'completed'
        next.progressPercent = 0
        next.currentPosition = mission.routeOrigin
        next.activityLabel = 'Misja zakończona'
        if (!next.result && (mission.findings?.length ?? 0) > 0) {
          next.result = buildMissionResult(mission.type, targetSnapshot(targetInfo), mission.findings ?? [])
        }
        dronePatch = {
          coordinates: mission.routeOrigin,
          status: 'available',
          availability: true,
          mission: undefined,
        }
      }
      break
    }
  }

  return { mission: next, drone: dronePatch }
}

export function initializeMissionActivities(
  mission: DroneMission,
  target: Pick<IKObject, 'name' | 'shortName'>,
): DroneMission {
  const steps = getMissionActivityPlan(mission.type)
  return {
    ...mission,
    targetName: target.name,
    targetShortName: target.shortName,
    activitySteps: steps,
    activityLabel: 'Przygotowanie do startu',
    activityProgress: 0,
    findings: [],
  }
}
