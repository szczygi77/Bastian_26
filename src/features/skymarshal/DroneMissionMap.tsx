import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { DroneMission, DroneUnit, IKObject } from '@/types'
import { MAP_LAYERS } from '@/config/mapLayers'

export function DroneMissionMap({
  mission,
  drone,
  target,
}: {
  mission: DroneMission
  drone: DroneUnit
  target: IKObject | null
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const droneMarkerRef = useRef<L.Marker | null>(null)
  const routeRef = useRef<L.Polyline | null>(null)
  const targetMarkerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: mission.currentPosition,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer(MAP_LAYERS.tacticalDark.url, {
      maxZoom: MAP_LAYERS.tacticalDark.maxZoom,
    }).addTo(map)

    mapInstance.current = map
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [mission.id])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    routeRef.current?.remove()
    targetMarkerRef.current?.remove()
    droneMarkerRef.current?.remove()

    routeRef.current = L.polyline(
      [mission.routeOrigin, mission.targetCoordinates],
      { color: 'rgba(0,229,255,0.45)', weight: 2, dashArray: '6 8' },
    ).addTo(map)

    targetMarkerRef.current = L.circleMarker(mission.targetCoordinates, {
      radius: 10,
      fillColor: '#FF8A1F',
      color: '#FF8A1F',
      weight: 2,
      fillOpacity: 0.35,
    })
      .addTo(map)
      .bindTooltip(target?.shortName ?? mission.targetObjectId, {
        className: 'leaflet-bastion-tooltip',
        direction: 'top',
        opacity: 1,
      })

    const droneIcon = L.divIcon({
      html: `<div class="map-drone-marker">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>`,
      className: 'map-drone-marker-wrap',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })

    droneMarkerRef.current = L.marker(mission.currentPosition, { icon: droneIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(`${drone.model} · ${mission.progressPercent.toFixed(0)}%`, {
        className: 'leaflet-bastion-tooltip',
        direction: 'top',
        opacity: 1,
      })

    const bounds = L.latLngBounds([mission.routeOrigin, mission.targetCoordinates, mission.currentPosition])
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 })
    requestAnimationFrame(() => map.invalidateSize())
  }, [mission, drone.model, target?.shortName])

  useEffect(() => {
    const map = mapInstance.current
    const container = mapRef.current
    if (!map || !container) return

    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [mission.id])

  useEffect(() => {
    if (!droneMarkerRef.current) return
    droneMarkerRef.current.setLatLng(mission.currentPosition)
    droneMarkerRef.current.setTooltipContent(`${drone.model} · ${mission.progressPercent.toFixed(0)}%`)
  }, [mission.currentPosition, mission.progressPercent, drone.model])

  return (
    <div className="skymarshal-map">
      <div className="skymarshal-map__header">MAPA MISJI — TRASA I POZYCJA DRONA</div>
      <div ref={mapRef} className="skymarshal-map__canvas" />
      <div className="skymarshal-map__legend">
        <span><i className="skymarshal-map__dot skymarshal-map__dot--drone" /> Dron ({drone.id})</span>
        <span><i className="skymarshal-map__dot skymarshal-map__dot--target" /> Cel ({target?.shortName ?? mission.targetObjectId})</span>
        <span>Postęp trasy: {mission.progressPercent.toFixed(0)}%</span>
      </div>
    </div>
  )
}
