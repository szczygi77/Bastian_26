import type {
  Alert,
  AuditEntry,
  DroneMission,
  IKObject,
  Incident,
  Recommendation,
  ScenarioRun,
} from '@/types'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export function toIso(value: Date | string | undefined): string | undefined {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export function fromIso(value: string | Date | undefined): Date {
  if (!value) return new Date()
  return value instanceof Date ? value : new Date(value)
}

export function serializeAuditEntry(entry: AuditEntry): Record<string, JsonValue> {
  return {
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    operator: entry.operator,
    action: entry.action,
    details: entry.details,
    mode: entry.mode,
    severity: entry.severity,
    affected_object: entry.affectedObject ?? null,
    incident_id: entry.incidentId ?? null,
    alert_id: entry.alertId ?? null,
    export_hash: entry.exportHash ?? null,
    payload: JSON.parse(JSON.stringify(entry)) as JsonValue,
  }
}

export function deserializeAuditEntry(row: Record<string, unknown>): AuditEntry {
  const payload = (row.payload ?? row) as AuditEntry
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    timestamp: fromIso(String(row.timestamp ?? payload.timestamp)),
    operator: String(row.operator ?? payload.operator),
    action: payload.action,
    details: String(row.details ?? payload.details),
    mode: payload.mode,
    severity: payload.severity,
    affectedObject: (row.affected_object as string | undefined) ?? payload.affectedObject,
    incidentId: (row.incident_id as string | undefined) ?? payload.incidentId,
    alertId: (row.alert_id as string | undefined) ?? payload.alertId,
    exportHash: (row.export_hash as string | undefined) ?? payload.exportHash,
  }
}

export function serializeAlert(alert: Alert): Record<string, JsonValue> {
  return {
    id: alert.id,
    title: alert.title,
    severity: alert.severity,
    status: alert.status,
    source: alert.source,
    timestamp: alert.timestamp.toISOString(),
    payload: JSON.parse(JSON.stringify(alert)) as JsonValue,
  }
}

export function deserializeAlert(row: Record<string, unknown>): Alert {
  const payload = (row.payload ?? row) as Alert
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    timestamp: fromIso(String(row.timestamp ?? payload.timestamp)),
    acknowledgedAt: payload.acknowledgedAt ? fromIso(payload.acknowledgedAt as unknown as string) : undefined,
    resolvedAt: payload.resolvedAt ? fromIso(payload.resolvedAt as unknown as string) : undefined,
    escalatedAt: payload.escalatedAt ? fromIso(payload.escalatedAt as unknown as string) : undefined,
  }
}

export function serializeIncident(incident: Incident): Record<string, JsonValue> {
  return {
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    started_at: incident.startedAt.toISOString(),
    payload: JSON.parse(JSON.stringify(incident)) as JsonValue,
  }
}

export function deserializeIncident(row: Record<string, unknown>): Incident {
  const payload = (row.payload ?? row) as Incident
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    startedAt: fromIso(String(row.started_at ?? payload.startedAt)),
    resolvedAt: payload.resolvedAt ? fromIso(payload.resolvedAt as unknown as string) : undefined,
  }
}

export function serializeMission(mission: DroneMission): Record<string, JsonValue> {
  return {
    id: mission.id,
    drone_id: mission.droneId,
    target_object_id: mission.targetObjectId,
    mission_type: mission.type,
    status: mission.status,
    assigned_at: mission.assignedAt.toISOString(),
    payload: JSON.parse(JSON.stringify(mission)) as JsonValue,
  }
}

export function deserializeMission(row: Record<string, unknown>): DroneMission {
  const payload = (row.payload ?? row) as DroneMission
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    droneId: String(row.drone_id ?? payload.droneId),
    targetObjectId: String(row.target_object_id ?? payload.targetObjectId),
    type: (row.mission_type as DroneMission['type']) ?? payload.type,
    status: (row.status as DroneMission['status']) ?? payload.status,
    assignedAt: fromIso(String(row.assigned_at ?? payload.assignedAt)),
    findings: payload.findings?.map(f => ({ ...f, timestamp: fromIso(f.timestamp as unknown as string) })),
    result: payload.result
      ? { ...payload.result, completedAt: fromIso(payload.result.completedAt as unknown as string) }
      : undefined,
  }
}

export function serializeScenarioRun(run: ScenarioRun): Record<string, JsonValue> {
  return {
    id: run.id,
    scenario_id: run.scenarioId,
    status: run.status,
    started_at: run.startedAt.toISOString(),
    payload: JSON.parse(JSON.stringify(run)) as JsonValue,
  }
}

export function deserializeScenarioRun(row: Record<string, unknown>): ScenarioRun {
  const payload = (row.payload ?? row) as ScenarioRun
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    scenarioId: String(row.scenario_id ?? payload.scenarioId),
    startedAt: fromIso(String(row.started_at ?? payload.startedAt)),
    endedAt: payload.endedAt ? fromIso(payload.endedAt as unknown as string) : undefined,
    cascadeResult: payload.cascadeResult
      ? { ...payload.cascadeResult, computedAt: fromIso(payload.cascadeResult.computedAt as unknown as string) }
      : undefined,
  }
}

export function serializeRecommendation(rec: Recommendation): Record<string, JsonValue> {
  return {
    id: rec.id,
    incident_id: rec.incidentId ?? null,
    priority: rec.riskLevel,
    payload: JSON.parse(JSON.stringify(rec)) as JsonValue,
  }
}

export function deserializeRecommendation(row: Record<string, unknown>): Recommendation {
  const payload = (row.payload ?? row) as Recommendation
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    generatedAt: fromIso(payload.generatedAt as unknown as string),
  }
}

export function serializeIkState(object: Pick<IKObject, 'id' | 'status' | 'coordinates'>): Record<string, JsonValue> {
  return {
    id: object.id,
    status: object.status,
    coordinates: object.coordinates,
    payload: { status: object.status, coordinates: object.coordinates },
  }
}
