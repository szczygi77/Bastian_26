import { TacticalMap } from '@/features/map/TacticalMap'

export function IncidentMapPanel() {
  return (
    <div className="icm-map">
      <div className="icm-map__toolbar">
        <span className="icm-map__title">TACTICAL MAP — INCIDENT CONTEXT</span>
        <span className="icm-map__hint">Tylko obiekty dotknięte incydentem</span>
      </div>
      <div className="icm-map__canvas">
        <TacticalMap incidentMode />
      </div>
    </div>
  )
}
