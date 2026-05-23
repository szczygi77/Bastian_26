import { format, formatDistanceToNow } from 'date-fns'

export function formatTimestamp(date: Date): string {
  return format(date, 'HH:mm:ss dd.MM.yyyy')
}

export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatImpactScore(score: number): string {
  return score.toFixed(1)
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-[#EF4444]'
    case 'high': return 'text-[#FF8A1F]'
    case 'medium': return 'text-[#F59E0B]'
    case 'low': return 'text-[#22C55E]'
    case 'info': return 'text-[#00E5FF]'
    default: return 'text-[#94A3B8]'
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'operational': return '#22C55E'
    case 'degraded': return '#F59E0B'
    case 'offline': return '#EF4444'
    case 'under_attack': return '#EF4444'
    case 'unknown': return '#66778B'
    default: return '#66778B'
  }
}

export function criticalityLabel(level: number): string {
  switch (level) {
    case 5: return 'KRYTYCZNA'
    case 4: return 'WYSOKA'
    case 3: return 'ŚREDNIA'
    case 2: return 'NISKA'
    case 1: return 'MINIMALNA'
    default: return 'NIEZNANA'
  }
}

export function agencyLabel(agency: string): string {
  switch (agency) {
    case 'police': return 'POLICJA'
    case 'psp': return 'PSP'
    case 'osp': return 'OSP'
    case 'crisis_unit': return 'JEDN. KRYZYS.'
    default: return agency.toUpperCase()
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
