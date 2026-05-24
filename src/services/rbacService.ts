export type RbacAction =
  | 'approve_recommendation'
  | 'escalate_alert'
  | 'export_audit'
  | 'abort_scenario'
  | 'export_report'

const MIN_CLEARANCE: Record<RbacAction, number> = {
  approve_recommendation: 4,
  escalate_alert: 3,
  export_audit: 2,
  abort_scenario: 4,
  export_report: 2,
}

const ACTION_LABELS: Record<RbacAction, string> = {
  approve_recommendation: 'zatwierdzenie rekomendacji',
  escalate_alert: 'eskalacja alertu',
  export_audit: 'eksport dziennika audytu',
  abort_scenario: 'przerwanie scenariusza',
  export_report: 'eksport raportu',
}

export function canPerformAction(clearanceLevel: number | undefined, action: RbacAction): boolean {
  const level = clearanceLevel ?? 0
  return level >= MIN_CLEARANCE[action]
}

export function getRequiredClearance(action: RbacAction): number {
  return MIN_CLEARANCE[action]
}

export function getRbacDeniedMessage(action: RbacAction, clearanceLevel: number | undefined): string {
  const required = MIN_CLEARANCE[action]
  const current = clearanceLevel ?? 0
  return `Wymagany poziom CL${required} (${ACTION_LABELS[action]}). Twój poziom: CL${current}.`
}
