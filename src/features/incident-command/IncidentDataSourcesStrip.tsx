import { formatTimeAgo } from '@/utils/format'
import { Badge } from '@/components/ui/Badge'
import type { AuditEntry, PublicDataSourceStatus } from '@/types'

const STATUS_VARIANT: Record<PublicDataSourceStatus['status'], 'green' | 'cyan' | 'orange' | 'danger' | 'muted'> = {
  live: 'green',
  cached: 'cyan',
  stale: 'orange',
  offline: 'muted',
  error: 'danger',
  missing_key: 'orange',
  mock: 'muted',
}

export function IncidentDataSourcesStrip({
  sources,
  auditEntries,
}: {
  sources: PublicDataSourceStatus[]
  auditEntries: AuditEntry[]
}) {
  return (
    <div className="icm-strip">
      <div className="icm-strip__sources">
        <span className="icm-strip__label">PUBLIC API</span>
        {sources.map(source => (
          <div key={source.sourceId} className="icm-strip__source" title={source.errorMessage}>
            <span>{source.sourceName}</span>
            <Badge variant={STATUS_VARIANT[source.status]}>{source.status.toUpperCase()}</Badge>
            {source.lastSync && (
              <span className="icm-strip__sync">{formatTimeAgo(source.lastSync)}</span>
            )}
          </div>
        ))}
      </div>
      <div className="icm-strip__audit">
        <span className="icm-strip__label">AUDIT STREAM</span>
        {auditEntries.slice(0, 4).map(entry => (
          <div key={entry.id} className="icm-strip__audit-item">
            <span>{formatTimeAgo(entry.timestamp)}</span>
            <strong>{entry.action.replace(/_/g, ' ')}</strong>
            <span>{entry.details.slice(0, 80)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
