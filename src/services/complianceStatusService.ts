import { COMPLIANCE_REQUIREMENTS } from '@/data/compliance'
import type { ComplianceRequirement, ComplianceStatus } from '@/types'

/** Dynamiczna ocena statusów zgodności na podstawie stanu aplikacji (demo). */
export function getEffectiveComplianceRequirements(options?: {
  pdfExportAvailable?: boolean
  humanApprovalEnforced?: boolean
}): ComplianceRequirement[] {
  const pdfReady = options?.pdfExportAvailable ?? false
  const humanLoop = options?.humanApprovalEnforced ?? true

  return COMPLIANCE_REQUIREMENTS.map(req => {
    if (req.id === 'nis2-2') {
      return {
        ...req,
        status: pdfReady ? ('compliant' as ComplianceStatus) : ('partial' as ComplianceStatus),
        actionNeeded: pdfReady
          ? undefined
          : 'Włączyć eksport PDF raportu incydentu (NIS2 Art. 23)',
      }
    }
    if (req.id === 'eu-ai-act-1' && humanLoop) {
      return {
        ...req,
        status: 'partial' as ComplianceStatus,
        risk: 'Średnie — human-in-the-loop aktywny; wymagana rejestracja EU AI database przed komercjalizacją',
        actionNeeded: 'Rejestracja w EU AI database + conformity assessment przed komercjalizacją',
      }
    }
    return req
  })
}
