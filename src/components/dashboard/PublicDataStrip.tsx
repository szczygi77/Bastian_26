import { formatTimeAgo } from '@/utils/format'
import { Badge } from '@/components/ui/Badge'
import type { PublicDataSourceStatus } from '@/types'

const STATUS_VARIANT: Record<PublicDataSourceStatus['status'], 'green' | 'cyan' | 'orange' | 'danger' | 'muted'> = {
  live: 'green',
  cached: 'cyan',
  stale: 'orange',
  offline: 'muted',
  error: 'danger',
  missing_key: 'orange',
  mock: 'muted',
  degraded: 'orange',
}

export function PublicDataStrip({ sources }: { sources: PublicDataSourceStatus[] }) {
  return (
    <div className="public-data-strip">
      <span className="public-data-strip__label">PUBLIC DATA SOURCES</span>
      {sources.map(source => (
        <div key={source.sourceId} className="public-data-strip__item" title={source.errorMessage ?? source.fallbackMode}>
          <span>{source.sourceName}</span>
          <Badge variant={STATUS_VARIANT[source.status] ?? 'muted'}>{source.status.toUpperCase()}</Badge>
          <span className="public-data-strip__trust">T{source.trustScore}</span>
          {source.lastSync && <span className="public-data-strip__sync">{formatTimeAgo(source.lastSync)}</span>}
        </div>
      ))}
    </div>
  )
}
