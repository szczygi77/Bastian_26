import { getImpactTimeline } from '@/services/cascadeEngine'
import { SeverityBadge } from '@/components/ui/Badge'
import type { CascadeResult, IKObject } from '@/types'

export function IncidentTimeline({
  cascadeResult,
  objects,
}: {
  cascadeResult: CascadeResult | null
  objects: IKObject[]
}) {
  if (!cascadeResult) {
    return (
      <div className="icm-timeline icm-timeline--empty">
        Brak aktywnej kaskady — uruchom scenariusz lub wybierz incydent.
      </div>
    )
  }

  const root = objects.find(o => o.id === cascadeResult.incidentObjectId)
  const timeline = getImpactTimeline(cascadeResult, objects)

  return (
    <div className="icm-timeline">
      <div className="icm-timeline__head">
        <span>IMPACT TIMELINE</span>
        <span>{cascadeResult.affectedCount} obiektów · {cascadeResult.timelineMinutes} min</span>
      </div>
      <div className="icm-timeline__track">
        <div className="icm-timeline__event icm-timeline__event--root">
          <span className="icm-timeline__time">T+0</span>
          <strong>{root?.shortName ?? cascadeResult.incidentObjectId}</strong>
          <span>root cause</span>
        </div>
        {timeline.map(item => (
          <div key={`${item.time}-${item.objectId}`} className="icm-timeline__event">
            <span className="icm-timeline__time">T+{item.time}</span>
            <strong>{item.name}</strong>
            <SeverityBadge severity={item.severity} />
          </div>
        ))}
      </div>
    </div>
  )
}
